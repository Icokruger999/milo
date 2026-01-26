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
            console.warn('SubProjects API returned error, continuing without sub-projects');
            subProjects = [];
            return;
        }

        const data = await response.json();
        subProjects = Array.isArray(data) ? data : [];
        console.log(`Loaded ${subProjects.length} sub-projects`);
    } catch (error) {
        console.error('Error loading sub-projects:', error);
        subProjects = [];
        // Don't throw - continue without sub-projects
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
                    <div style="display: flex; align-items: center; gap: 8px; flex: 1;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                        </svg>
                        <span class="subproject-name">${escapeHtml(group.name)}</span>
                        <span class="subproject-count">${group.tasks.length}</span>
                    </div>
                    <button onclick="deleteSubProject(${subProjectId}, '${escapeHtml(group.name).replace(/'/g, "\\'")}', event)" 
                            title="Delete Sub-Project" 
                            style="background: none; border: none; color: #DE350B; cursor: pointer; padding: 4px; display: flex; align-items: center; opacity: 0.7; transition: opacity 0.2s;"
                            onmouseover="this.style.opacity='1'" 
                            onmouseout="this.style.opacity='0.7'">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
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
        html = '<div class="empty-state" style="padding: 40px; text-align: center; color: #666;">No tasks or sub-projects yet. Click "Add Task" or "Create Sub-Project" to get started.</div>';
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
        dayWidth = 60;
    } else if (currentView === 'weeks') {
        start.setDate(1);
        // Show current month + next month to ensure all tasks are visible
        const end = new Date(start.getFullYear(), start.getMonth() + 2, 0);
        days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
        dayWidth = 40;
    } else {
        start.setDate(1);
        const end = new Date(start.getFullYear(), start.getMonth() + 3, 0);
        days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
        dayWidth = 18;
    }

    // Extend range to include all task dates
    tasks.forEach(task => {
        if (task.endDate) {
            const taskEnd = new Date(task.endDate);
            const daysSinceStart = Math.ceil((taskEnd - start) / (1000 * 60 * 60 * 24));
            if (daysSinceStart > days) {
                days = daysSinceStart + 7; // Add 7 days buffer
            }
        }
    });

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
                        <span class="gantt-bar-label">${escapeHtml(task.name)} ${task.progress > 0 ? task.progress + '%' : ''}</span>
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
    
    // Populate sub-projects dropdown for both forms
    const subProjectSelect = document.getElementById('modalSubProject');
    const subProjectSelectLink = document.getElementById('modalSubProjectLink');
    
    [subProjectSelect, subProjectSelectLink].forEach(select => {
        select.innerHTML = '<option value="">No Sub-Project</option>';
        subProjects.forEach(sp => {
            const option = document.createElement('option');
            option.value = sp.id;
            option.textContent = sp.name;
            select.appendChild(option);
        });
    });
    
    // Reset to "Create New" tab
    switchTaskTab('create');
    
    // Load existing tasks for linking
    loadExistingTasksForLinking();
    
    modal.classList.add('active');
    document.getElementById('modalTaskName').focus();
}

// Switch between Create New and Link Existing tabs
let currentTaskMode = 'create';
let selectedTaskForLink = null;

function switchTaskTab(mode) {
    currentTaskMode = mode;
    selectedTaskForLink = null;
    
    const tabCreate = document.getElementById('tabCreateNew');
    const tabLink = document.getElementById('tabLinkExisting');
    const formCreate = document.getElementById('createTaskForm');
    const formLink = document.getElementById('linkTaskForm');
    const submitBtn = document.getElementById('addTaskSubmitBtn');
    
    if (mode === 'create') {
        tabCreate.style.borderBottom = '3px solid #0052CC';
        tabCreate.style.color = '#0052CC';
        tabCreate.style.fontWeight = '600';
        tabLink.style.borderBottom = '3px solid transparent';
        tabLink.style.color = '#666';
        tabLink.style.fontWeight = '500';
        formCreate.style.display = 'block';
        formLink.style.display = 'none';
        submitBtn.textContent = 'Add Task';
    } else {
        tabLink.style.borderBottom = '3px solid #0052CC';
        tabLink.style.color = '#0052CC';
        tabLink.style.fontWeight = '600';
        tabCreate.style.borderBottom = '3px solid transparent';
        tabCreate.style.color = '#666';
        tabCreate.style.fontWeight = '500';
        formCreate.style.display = 'none';
        formLink.style.display = 'block';
        submitBtn.textContent = 'Link Task';
    }
}

window.switchTaskTab = switchTaskTab;

// Load existing tasks from board for linking
async function loadExistingTasksForLinking() {
    try {
        const response = await apiClient.get(`/tasks?projectId=${currentProject.id}`);
        if (response.ok) {
            const allTasks = await response.json();
            
            // Show ALL tasks from the board (don't filter out timeline tasks)
            // Filter out deleted tasks only
            const availableTasks = allTasks.filter(t => !t.isDeleted);
            
            renderExistingTasksList(availableTasks);
        }
    } catch (error) {
        console.error('Error loading existing tasks:', error);
    }
}

// Render existing tasks list
function renderExistingTasksList(availableTasks) {
    const container = document.getElementById('existingTasksList');
    const searchInput = document.getElementById('taskSearchInput');
    
    if (availableTasks.length === 0) {
        container.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">No tasks found in this project</div>';
        return;
    }
    
    const renderFiltered = (searchTerm = '') => {
        const filtered = availableTasks.filter(task => 
            task.title.toLowerCase().includes(searchTerm.toLowerCase())
        );
        
        if (filtered.length === 0) {
            container.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">No tasks found</div>';
            return;
        }
        
        container.innerHTML = filtered.map(task => `
            <div class="existing-task-item" data-task-id="${task.id}" onclick="selectTaskForLink(${task.id}, '${escapeHtml(task.title).replace(/'/g, "\\'")}', event)" 
                 style="padding: 12px; border-bottom: 1px solid #E8E8E8; cursor: pointer; transition: background 0.15s;"
                 onmouseover="this.style.background='#F4F5F7'" 
                 onmouseout="if(!this.classList.contains('selected')) this.style.background='white'">
                <div style="font-weight: 500; font-size: 14px; margin-bottom: 4px;">${escapeHtml(task.title)}</div>
                <div style="font-size: 12px; color: #666;">
                    <span style="display: inline-block; padding: 2px 8px; background: #DFE1E6; border-radius: 3px; margin-right: 8px;">${task.status || 'todo'}</span>
                    ${task.assigneeName ? `<span>Assigned to: ${escapeHtml(task.assigneeName)}</span>` : '<span>Unassigned</span>'}
                </div>
            </div>
        `).join('');
    };
    
    searchInput.oninput = (e) => renderFiltered(e.target.value);
    renderFiltered();
}

// Select task for linking
function selectTaskForLink(taskId, taskTitle, event) {
    selectedTaskForLink = taskId;
    
    // Update UI
    document.querySelectorAll('.existing-task-item').forEach(item => {
        item.classList.remove('selected');
        item.style.background = 'white';
    });
    
    event.currentTarget.classList.add('selected');
    event.currentTarget.style.background = '#DEEBFF';
}

window.selectTaskForLink = selectTaskForLink;

// Close add task modal
function closeAddTaskModal() {
    const modal = document.getElementById('addTaskModal');
    modal.classList.remove('active');
}

// Create task from modal
async function createTaskFromModal() {
    if (currentTaskMode === 'link') {
        // Link existing task
        if (!selectedTaskForLink) {
            showToast('Please select a task to link');
            return;
        }
        
        const subProjectId = document.getElementById('modalSubProjectLink').value;
        
        try {
            // Update the task with subProjectId
            const updateData = {};
            if (subProjectId) {
                updateData.subProjectId = parseInt(subProjectId);
            }
            
            const response = await apiClient.put(`/tasks/${selectedTaskForLink}`, updateData);
            
            if (response.ok) {
                closeAddTaskModal();
                await loadTasks();
                renderTimeline();
                showToast('Task linked successfully!');
            } else {
                showToast('Failed to link task');
            }
        } catch (error) {
            console.error('Error linking task:', error);
            showToast('Error linking task. Please try again.');
        }
        return;
    }
    
    // Create new task
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
            showToast('Task created successfully!');
        } else {
            const errorData = await response.json().catch(() => ({ message: 'Failed to create task' }));
            console.error('Failed to create task:', response.status, errorData);
            showToast('Failed to create task');
        }
    } catch (error) {
        console.error('Error creating task:', error);
        showToast('Error creating task. Please try again.');
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

// Create Sub-Project Modal Functions
function openCreateSubProjectModal() {
    const modal = document.getElementById('createSubProjectModal');
    document.getElementById('subProjectName').value = '';
    document.getElementById('subProjectDescription').value = '';
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
    const errorDiv = document.getElementById('subProjectError');
    const submitBtn = document.getElementById('createSubProjectBtn');
    
    errorDiv.style.display = 'none';
    
    if (!name) {
        errorDiv.textContent = 'Sub-project name is required';
        errorDiv.style.display = 'block';
        return;
    }
    
    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating...';
    
    try {
        const response = await apiClient.post('/subprojects', {
            Name: name,
            Description: description || null,
            ProjectId: currentProject.id
        });
        
        if (response.ok) {
            closeCreateSubProjectModal();
            
            // Re-enable button for next use
            submitBtn.disabled = false;
            submitBtn.textContent = 'Create Sub-Project';
            
            // Reload sub-projects and tasks
            await loadSubProjects();
            await loadTasks();
            renderTimeline();
            showToast('Sub-project created successfully!');
        } else {
            const error = await response.json().catch(() => ({ message: 'Failed to create sub-project' }));
            errorDiv.textContent = error.message || 'Failed to create sub-project';
            errorDiv.style.display = 'block';
            submitBtn.disabled = false;
            submitBtn.textContent = 'Create Sub-Project';
        }
    } catch (error) {
        errorDiv.textContent = 'Error creating sub-project: ' + error.message;
        errorDiv.style.display = 'block';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create Sub-Project';
    }
}

// Expose sub-project functions to window
window.openCreateSubProjectModal = openCreateSubProjectModal;
window.closeCreateSubProjectModal = closeCreateSubProjectModal;
window.createSubProjectFromModal = createSubProjectFromModal;

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

// Delete Sub-Project
async function deleteSubProject(subProjectId, subProjectName, event) {
    event.stopPropagation();
    
    // Create custom confirmation dialog (no popup)
    const confirmDialog = document.createElement('div');
    confirmDialog.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
    `;
    
    confirmDialog.innerHTML = `
        <div style="background: white; border-radius: 8px; padding: 24px; max-width: 400px; box-shadow: 0 8px 24px rgba(0,0,0,0.2);">
            <h3 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600;">Delete Sub-Project?</h3>
            <p style="margin: 0 0 20px 0; color: #666; font-size: 14px; line-height: 1.5;">
                Are you sure you want to delete "${subProjectName}"?<br><br>
                Tasks will NOT be deleted, they'll be moved to "No Sub-Project".
            </p>
            <div style="display: flex; gap: 12px; justify-content: flex-end;">
                <button id="cancelDelete" style="padding: 8px 16px; border: 1px solid #ddd; background: white; border-radius: 4px; cursor: pointer; font-size: 14px;">Cancel</button>
                <button id="confirmDelete" style="padding: 8px 16px; background: #DE350B; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; font-weight: 500;">Delete</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(confirmDialog);
    
    document.getElementById('cancelDelete').onclick = () => confirmDialog.remove();
    document.getElementById('confirmDelete').onclick = async () => {
        confirmDialog.remove();
        
        try {
            const response = await apiClient.delete(`/subprojects/${subProjectId}`);
            
            if (response.ok) {
                showToast(`Sub-project "${subProjectName}" deleted successfully!`);
                
                // Reload sub-projects and tasks
                await loadSubProjects();
                await loadTasks();
                renderTimeline();
            } else {
                const error = await response.json();
                showToast(`Failed to delete: ${error.message || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Error deleting sub-project:', error);
            showToast('Error deleting sub-project. Please try again.');
        }
    };
}

window.deleteSubProject = deleteSubProject;
