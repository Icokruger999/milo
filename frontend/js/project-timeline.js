// Project Timeline - Gantt Chart View

let tasks = [];
let subProjects = [];
let currentProject = null;
let currentView = 'weeks'; // days, weeks, months
let currentDate = new Date();
let dayWidth = 30;
let isDragging = false;
let startX = 0;
let scrollLeft = 0;

const taskColors = ['blue', 'green', 'orange', 'purple'];

// Initialize
document.addEventListener('DOMContentLoaded', async function() {
    if (!authService.isAuthenticated()) {
        window.location.href = 'milo-login.html';
        return;
    }

    // Set user avatar
    const user = authService.getCurrentUser();
    if (user) {
        const nameParts = (user.name || user.email || 'User').trim().split(' ');
        let initials = 'U';
        if (nameParts.length >= 2) {
            initials = (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase();
        } else if (nameParts.length === 1) {
            initials = nameParts[0].substring(0, 2).toUpperCase();
        }
        const avatar = document.getElementById('userAvatar');
        if (avatar) avatar.textContent = initials;
    }

    // Load project
    currentProject = projectSelector.getCurrentProject();
    if (!currentProject) {
        const stored = localStorage.getItem('milo_current_project');
        if (stored) {
            try {
                currentProject = JSON.parse(stored);
                projectSelector.setCurrentProject(currentProject);
            } catch (e) {}
        }
    }

    if (!currentProject && user) {
        try {
            await projectSelector.loadProjects(user.id);
            currentProject = projectSelector.getCurrentProject();
            if (!currentProject && projectSelector.projects && projectSelector.projects.length > 0) {
                currentProject = projectSelector.projects[0];
                projectSelector.setCurrentProject(currentProject);
            }
        } catch (error) {}
    }

    if (!currentProject) {
        window.location.href = 'milo-select-project.html';
        return;
    }

    document.getElementById('projectTitle').textContent = currentProject.name + ' Timeline';

    // Setup drag to scroll
    setupDragScroll();

    // Setup modal handlers
    setupModalHandlers();

    // Load sub-projects and tasks
    await loadSubProjects();
    await loadTasks();
    renderTimeline();
    setTimeout(goToToday, 100);
});

// Setup modal event handlers
function setupModalHandlers() {
    const modal = document.getElementById('addTaskModal');
    const modalContent = modal.querySelector('.modal');
    
    // Close on overlay click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeAddTaskModal();
        }
    });
    
    // Prevent modal content clicks from closing
    if (modalContent) {
        modalContent.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }
    
    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            closeAddTaskModal();
        }
    });
    
    // Submit on Enter in task name field
    const taskNameInput = document.getElementById('modalTaskName');
    if (taskNameInput) {
        taskNameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                createTaskFromModal();
            }
        });
    }
}

// Setup drag to scroll on gantt panel
function setupDragScroll() {
    const panel = document.getElementById('ganttPanel');
    
    panel.addEventListener('mousedown', (e) => {
        // Only start drag if clicking on the panel itself, not on bars
        if (e.target.closest('.gantt-bar')) return;
        
        isDragging = true;
        startX = e.pageX;
        scrollLeft = panel.scrollLeft;
        panel.style.cursor = 'grabbing';
        panel.style.userSelect = 'none';
    });

    // Use document level events to handle mouse leaving the panel
    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            panel.style.cursor = 'grab';
            panel.style.userSelect = '';
        }
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        e.preventDefault();
        const x = e.pageX;
        const walk = (startX - x) * 1.5; // Scroll in opposite direction of drag
        panel.scrollLeft = scrollLeft + walk;
    });

    // Also handle mouse wheel for horizontal scroll
    panel.addEventListener('wheel', (e) => {
        if (e.deltaY !== 0) {
            e.preventDefault();
            panel.scrollLeft += e.deltaY;
        }
    }, { passive: false });
}

// Load sub-projects from API
async function loadSubProjects() {
    try {
        const response = await apiClient.get(`/subprojects?projectId=${currentProject.id}`);
        if (!response.ok) {
            subProjects = [];
            return;
        }

        subProjects = await response.json();
        console.log(`Loaded ${subProjects.length} sub-projects`);
    } catch (error) {
        console.error('Error loading sub-projects:', error);
        subProjects = [];
    }
}

// Load tasks from API
async function loadTasks() {
    try {
        const response = await apiClient.get(`/tasks?projectId=${currentProject.id}`);
        if (!response.ok) {
            tasks = [];
            return;
        }

        const rawTasks = await response.json();
        
        // Ensure rawTasks is an array
        if (!Array.isArray(rawTasks)) {
            console.error('Tasks response is not an array:', rawTasks);
            tasks = [];
            return;
        }
        
        tasks = rawTasks
            .filter(task => !task.isDeleted) // Filter out deleted tasks
            .map((task, index) => {
                let progress = 0;
                if (task.status === 'done') progress = 100;
                else if (task.status === 'review') progress = 75;
                else if (task.status === 'progress') progress = 50;

                return {
                    id: task.id,
                    name: task.title || 'Untitled',
                    wbs: (index + 1).toString(),
                    startDate: task.startDate ? new Date(task.startDate) : new Date(task.createdAt || Date.now()),
                    endDate: task.dueDate ? new Date(task.dueDate) : null,
                    progress: progress,
                    color: taskColors[index % taskColors.length],
                    status: task.status,
                    subProjectId: task.subProjectId,
                    subProjectName: task.subProject?.name || null
                };
            });

        tasks.forEach(task => {
            if (!task.endDate) {
                task.endDate = new Date(task.startDate);
                task.endDate.setDate(task.endDate.getDate() + 7);
            }
        });
        
        console.log(`Loaded ${tasks.length} tasks for timeline`);
    } catch (error) {
        console.error('Error loading tasks:', error);
        tasks = [];
    }
}

// Render timeline
function renderTimeline() {
    renderTaskList();
    renderGanttChart();
    updatePeriodLabel();
}

// Render task list (with sub-project grouping)
function renderTaskList() {
    const container = document.getElementById('taskList');
    if (!container) return;

    let html = '';

    // Group tasks by sub-project
    const grouped = {};
    const noSubProject = [];
    
    // Initialize groups for all sub-projects (even empty ones)
    subProjects.forEach(sp => {
        grouped[sp.id] = {
            name: sp.name,
            color: sp.color || '#0052CC',
            tasks: []
        };
    });
    
    tasks.forEach(task => {
        if (task.subProjectId && grouped[task.subProjectId]) {
            grouped[task.subProjectId].tasks.push(task);
        } else {
            noSubProject.push(task);
        }
    });
    
    // Render sub-project groups first (including empty ones)
    Object.keys(grouped).forEach(subProjectId => {
        const group = grouped[subProjectId];
        html += `
            <div class="subproject-group">
                <div class="subproject-header" style="border-left: 3px solid ${group.color};">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                    </svg>
                    <span class="subproject-name">${escapeHtml(group.name)}</span>
                    <span class="subproject-count">${group.tasks.length}</span>
                </div>
        `;
        
        if (group.tasks.length === 0) {
            html += `<div class="empty-subproject">No tasks yet</div>`;
        } else {
            group.tasks.forEach(task => {
                html += `
                    <div class="task-row subproject-task" data-task-id="${task.id}">
                        <div class="task-name">
                            <div class="color-bar ${task.color}"></div>
                            <span title="${escapeHtml(task.name)}">${escapeHtml(task.name)}</span>
                        </div>
                        <div class="wbs-cell">${task.wbs}</div>
                        <div class="date-cell">${formatDateShort(task.startDate)}</div>
                        <div class="date-cell">${formatDateShort(task.endDate)}</div>
                    </div>
                `;
            });
        }
        
        html += '</div>';
    });
    
    // Render tasks without sub-project
    if (noSubProject.length > 0) {
        html += `<div class="no-subproject-section">`;
        noSubProject.forEach(task => {
            html += `
                <div class="task-row" data-task-id="${task.id}">
                    <div class="task-name">
                        <div class="color-bar ${task.color}"></div>
                        <span title="${escapeHtml(task.name)}">${escapeHtml(task.name)}</span>
                    </div>
                    <div class="wbs-cell">${task.wbs}</div>
                    <div class="date-cell">${formatDateShort(task.startDate)}</div>
                    <div class="date-cell">${formatDateShort(task.endDate)}</div>
                </div>
            `;
        });
        html += `</div>`;
    }
    
    if (tasks.length === 0 && subProjects.length === 0) {
        html = '<div class="empty-state">No tasks yet. Click "Add Task" to create one.</div>';
    }

    container.innerHTML = html;
}

// Render Gantt chart
function renderGanttChart() {
    const { startDate: viewStart, days: totalDays } = getViewDateRange();
    renderGanttHeader(viewStart, totalDays);
    renderGanttBody(viewStart, totalDays);
}

// Get date range based on view
function getViewDateRange() {
    const start = new Date(currentDate);
    let days = 0;

    if (currentView === 'days') {
        start.setDate(start.getDate() - 7);
        days = 21;
        dayWidth = 50;
    } else if (currentView === 'weeks') {
        start.setDate(1);
        const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
        days = end.getDate();
        dayWidth = 30;
    } else {
        start.setDate(1);
        const end = new Date(start.getFullYear(), start.getMonth() + 3, 0);
        days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
        dayWidth = 12;
    }

    return { startDate: start, days: days };
}

// Render Gantt header
function renderGanttHeader(viewStart, totalDays) {
    const header = document.getElementById('ganttHeader');
    if (!header) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const months = [];
    let currentMonth = null;

    for (let i = 0; i < totalDays; i++) {
        const date = new Date(viewStart);
        date.setDate(date.getDate() + i);
        const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
        
        if (!currentMonth || currentMonth.key !== monthKey) {
            currentMonth = {
                key: monthKey,
                label: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
                days: []
            };
            months.push(currentMonth);
        }

        currentMonth.days.push({
            date: new Date(date),
            dayName: date.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0),
            dayNum: date.getDate(),
            isWeekend: date.getDay() === 0 || date.getDay() === 6,
            isToday: date.getTime() === today.getTime()
        });
    }

    let monthsHTML = '<div class="gantt-months-row">';
    months.forEach(month => {
        const width = month.days.length * dayWidth;
        monthsHTML += `<div class="gantt-month-cell" style="min-width: ${width}px; width: ${width}px;">${month.label}</div>`;
    });
    monthsHTML += '</div>';

    let daysHTML = '<div class="gantt-days-row">';
    months.forEach(month => {
        month.days.forEach(day => {
            let classes = 'gantt-day-cell';
            if (day.isWeekend) classes += ' weekend';
            if (day.isToday) classes += ' today';
            daysHTML += `<div class="${classes}" style="min-width: ${dayWidth}px; width: ${dayWidth}px;">
                <span class="gantt-day-name">${day.dayName}</span>
                <span class="gantt-day-num">${day.dayNum}</span>
            </div>`;
        });
    });
    daysHTML += '</div>';

    header.innerHTML = monthsHTML + daysHTML;

    const wrapper = document.getElementById('ganttWrapper');
    if (wrapper) wrapper.style.width = `${totalDays * dayWidth}px`;
}

// Render Gantt body
function renderGanttBody(viewStart, totalDays) {
    const body = document.getElementById('ganttBody');
    if (!body) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let html = '';

    // Rows for tasks
    tasks.forEach(task => {
        html += '<div class="gantt-row">';
        
        for (let i = 0; i < totalDays; i++) {
            const date = new Date(viewStart);
            date.setDate(date.getDate() + i);
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
            html += `<div class="gantt-cell ${isWeekend ? 'weekend' : ''}" style="min-width: ${dayWidth}px; width: ${dayWidth}px;"></div>`;
        }

        if (task.startDate && task.endDate) {
            const barStart = Math.max(0, Math.ceil((task.startDate - viewStart) / (1000 * 60 * 60 * 24)));
            const barEnd = Math.ceil((task.endDate - viewStart) / (1000 * 60 * 60 * 24));
            
            if (barEnd > 0 && barStart < totalDays) {
                const left = barStart * dayWidth;
                const width = Math.max(dayWidth, (barEnd - barStart) * dayWidth);
                const progressWidth = (task.progress / 100) * width;

                html += `
                    <div class="gantt-bar ${task.color}" style="left: ${left}px; width: ${width}px;" title="${escapeHtml(task.name)} - ${task.progress}%">
                        <div class="gantt-bar-progress" style="width: ${progressWidth}px;"></div>
                        <span class="gantt-bar-label">${escapeHtml(task.name)} ${task.progress}%</span>
                    </div>
                `;
            }
        }

        html += '</div>';
    });

    // Empty row for add task
    html += '<div class="gantt-row">';
    for (let i = 0; i < totalDays; i++) {
        const date = new Date(viewStart);
        date.setDate(date.getDate() + i);
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
        html += `<div class="gantt-cell ${isWeekend ? 'weekend' : ''}" style="min-width: ${dayWidth}px; width: ${dayWidth}px;"></div>`;
    }
    html += '</div>';

    // Today line
    const todayOffset = Math.ceil((today - viewStart) / (1000 * 60 * 60 * 24));
    if (todayOffset >= 0 && todayOffset <= totalDays) {
        html += `<div class="today-line" style="left: ${todayOffset * dayWidth}px;"></div>`;
    }

    body.innerHTML = html;
}

// Update period label
function updatePeriodLabel() {
    const label = document.getElementById('currentPeriod');
    if (!label) return;

    if (currentView === 'days') {
        label.textContent = currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } else if (currentView === 'weeks') {
        label.textContent = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } else {
        const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 3, 0);
        label.textContent = `${currentDate.toLocaleDateString('en-US', { month: 'short' })} - ${end.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;
    }
}

// Set view mode
function setView(view) {
    currentView = view;
    document.querySelectorAll('.view-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`view${view.charAt(0).toUpperCase() + view.slice(1)}`).classList.add('active');
    renderTimeline();
}

// Navigate period
function navigatePeriod(direction) {
    if (currentView === 'days') {
        currentDate.setDate(currentDate.getDate() + (direction * 7));
    } else if (currentView === 'weeks') {
        currentDate.setMonth(currentDate.getMonth() + direction);
    } else {
        currentDate.setMonth(currentDate.getMonth() + (direction * 3));
    }
    renderTimeline();
}

// Go to today
function goToToday() {
    currentDate = new Date();
    renderTimeline();
    
    const panel = document.getElementById('ganttPanel');
    const { startDate: viewStart } = getViewDateRange();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayOffset = Math.ceil((today - viewStart) / (1000 * 60 * 60 * 24));
    panel.scrollLeft = Math.max(0, (todayOffset * dayWidth) - (panel.clientWidth / 2));
}

// Handle keypress for new task
async function handleTaskKeypress(event) {
    if (event.key === 'Enter') {
        await createTask();
    }
}

// Open add task modal
function openAddTaskModal() {
    const modal = document.getElementById('addTaskModal');
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    document.getElementById('modalTaskName').value = '';
    document.getElementById('modalTaskStart').value = formatDateInput(today);
    document.getElementById('modalTaskEnd').value = formatDateInput(nextWeek);
    
    // Populate sub-projects dropdown
    const subProjectSelect = document.getElementById('modalSubProject');
    subProjectSelect.innerHTML = '<option value="">No Sub-Project</option>';
    subProjects.forEach(sp => {
        const option = document.createElement('option');
        option.value = sp.id;
        option.textContent = sp.name;
        subProjectSelect.appendChild(option);
    });
    
    modal.classList.add('active');
    document.getElementById('modalTaskName').focus();
}

// Close add task modal
function closeAddTaskModal() {
    const modal = document.getElementById('addTaskModal');
    modal.classList.remove('active');
}

// Create task from modal
async function createTaskFromModal() {
    const name = document.getElementById('modalTaskName').value.trim();
    const startValue = document.getElementById('modalTaskStart').value;
    const endValue = document.getElementById('modalTaskEnd').value;
    const subProjectId = document.getElementById('modalSubProject').value;

    if (!name) {
        document.getElementById('modalTaskName').focus();
        return;
    }

    const startDate = startValue ? new Date(startValue) : new Date();
    const endDate = endValue ? new Date(endValue) : new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);

    try {
        const user = authService.getCurrentUser();
        
        const taskData = {
            title: name,
            projectId: currentProject.id,
            status: 'todo',
            startDate: startDate.toISOString(),
            dueDate: endDate.toISOString(),
            creatorId: user ? user.id : null
        };
        
        // Add subProjectId if selected
        if (subProjectId) {
            taskData.subProjectId = parseInt(subProjectId);
        }
        
        console.log('Creating task:', taskData);
        
        const response = await apiClient.post('/tasks', taskData);

        if (response.ok) {
            console.log('Task created successfully');
            closeAddTaskModal();
            await loadTasks();
            renderTimeline();
        } else {
            const errorData = await response.json().catch(() => ({ message: 'Failed to create task' }));
            console.error('Failed to create task:', response.status, errorData);
            alert('Failed to create task. Please try again.');
        }
    } catch (error) {
        console.error('Error creating task:', error);
        alert('Error creating task. Please try again.');
    }
}

// Create new task (legacy function)
async function createTask() {
    const nameInput = document.getElementById('newTaskName');
    const startInput = document.getElementById('newTaskStart');
    const endInput = document.getElementById('newTaskEnd');

    if (!nameInput) return;
    
    const name = nameInput.value.trim();
    if (!name) return;

    const startDate = startInput && startInput.value ? new Date(startInput.value) : new Date();
    const endDate = endInput && endInput.value ? new Date(endInput.value) : new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);

    try {
        const user = authService.getCurrentUser();
        
        const response = await apiClient.post('/tasks', {
            title: name,
            projectId: currentProject.id,
            status: 'todo',
            startDate: startDate.toISOString(),
            dueDate: endDate.toISOString(),
            creatorId: user ? user.id : null
        });

        if (response.ok) {
            nameInput.value = '';
            await loadTasks();
            renderTimeline();
        }
    } catch (error) {
        console.error('Error creating task:', error);
    }
}

// Helper functions
function formatDateShort(date) {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' });
}

function formatDateInput(date) {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Global functions
window.setView = setView;
window.navigatePeriod = navigatePeriod;
window.goToToday = goToToday;
window.handleTaskKeypress = handleTaskKeypress;
window.createTask = createTask;
window.openAddTaskModal = openAddTaskModal;
window.closeAddTaskModal = closeAddTaskModal;
window.createTaskFromModal = createTaskFromModal;
window.openCreateSubProjectModal = openCreateSubProjectModal;
window.closeCreateSubProjectModal = closeCreateSubProjectModal;
window.createSubProjectFromModal = createSubProjectFromModal;

// Create Sub-Project Modal Functions
function openCreateSubProjectModal() {
    const modal = document.getElementById('createSubProjectModal');
    document.getElementById('subProjectName').value = '';
    document.getElementById('subProjectDescription').value = '';
    document.getElementById('subProjectKey').value = '';
    document.getElementById('subProjectError').style.display = 'none';
    modal.classList.add('active');
    document.getElementById('subProjectName').focus();
}

function closeCreateSubProjectModal() {
    const modal = document.getElementById('createSubProjectModal');
    modal.classList.remove('active');
}

async function createSubProjectFromModal() {
    const name = document.getElementById('subProjectName').value.trim();
    const description = document.getElementById('subProjectDescription').value.trim();
    const key = document.getElementById('subProjectKey').value.trim();
    const errorDiv = document.getElementById('subProjectError');
    
    errorDiv.style.display = 'none';
    
    if (!name) {
        errorDiv.textContent = 'Sub-project name is required';
        errorDiv.style.display = 'block';
        document.getElementById('subProjectName').focus();
        return;
    }
    
    try {
        const response = await apiClient.post('/subprojects', {
            name: name,
            description: description || null,
            key: key || null,
            projectId: currentProject.id
        });
        
        if (response.ok) {
            const subProject = await response.json();
            console.log('Sub-project created:', subProject);
            
            closeCreateSubProjectModal();
            
            // Reload sub-projects and tasks
            await loadSubProjects();
            await loadTasks();
            renderTimeline();
            
            // Show success message (no popup)
            showToast(`Sub-project "${name}" created successfully!`);
        } else {
            const error = await response.json();
            errorDiv.textContent = error.message || 'Failed to create sub-project';
            errorDiv.style.display = 'block';
        }
    } catch (error) {
        console.error('Error creating sub-project:', error);
        errorDiv.textContent = 'Error creating sub-project. Please try again.';
        errorDiv.style.display = 'block';
    }
}


// Show toast notification (no popup)
function showToast(message, duration = 3000) {
    // Remove existing toast
    const existingToast = document.querySelector('.toast-notification');
    if (existingToast) existingToast.remove();
    
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: #36B37E;
        color: white;
        padding: 12px 24px;
        border-radius: 4px;
        font-size: 14px;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}
