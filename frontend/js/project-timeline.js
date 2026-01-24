// Project Timeline - Gantt Chart View

let tasks = [];
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

    // Load and render
    await loadTasks();
    renderTimeline();
    setTimeout(goToToday, 100);
});

// Setup drag to scroll on gantt panel
function setupDragScroll() {
    const panel = document.getElementById('ganttPanel');
    
    panel.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.pageX - panel.offsetLeft;
        scrollLeft = panel.scrollLeft;
        panel.style.cursor = 'grabbing';
    });

    panel.addEventListener('mouseleave', () => {
        isDragging = false;
        panel.style.cursor = 'grab';
    });

    panel.addEventListener('mouseup', () => {
        isDragging = false;
        panel.style.cursor = 'grab';
    });

    panel.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        e.preventDefault();
        const x = e.pageX - panel.offsetLeft;
        const walk = (x - startX) * 2;
        panel.scrollLeft = scrollLeft - walk;
    });
}

// Load tasks from API
async function loadTasks() {
    try {
        const response = await apiClient.get(`/tasks?projectId=${currentProject.id}`);
        if (!response.ok) return;

        const rawTasks = await response.json();
        
        tasks = rawTasks.map((task, index) => {
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
                status: task.status
            };
        });

        tasks.forEach(task => {
            if (!task.endDate) {
                task.endDate = new Date(task.startDate);
                task.endDate.setDate(task.endDate.getDate() + 7);
            }
        });
    } catch (error) {
        console.error('Error loading tasks:', error);
    }
}

// Render timeline
function renderTimeline() {
    renderTaskList();
    renderGanttChart();
    updatePeriodLabel();
}

// Render task list with inline add
function renderTaskList() {
    const container = document.getElementById('taskList');
    if (!container) return;

    let html = '';

    // Render existing tasks
    tasks.forEach(task => {
        html += `
            <div class="task-row" data-task-id="${task.id}">
                <div class="task-name">
                    <div class="color-bar ${task.color}"></div>
                    <span>${escapeHtml(task.name)}</span>
                </div>
                <div class="wbs-cell">${task.wbs}</div>
                <div class="date-cell">${formatDateShort(task.startDate)}</div>
                <div class="date-cell">${formatDateShort(task.endDate)}</div>
            </div>
        `;
    });

    // Add new task row
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    html += `
        <div class="add-task-row">
            <div>
                <input type="text" class="add-task-input" id="newTaskName" placeholder="+ Add new task..." onkeypress="handleTaskKeypress(event)">
            </div>
            <div></div>
            <div>
                <input type="date" class="date-input" id="newTaskStart" value="${formatDateInput(today)}">
            </div>
            <div>
                <input type="date" class="date-input" id="newTaskEnd" value="${formatDateInput(nextWeek)}">
            </div>
        </div>
    `;

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

// Create new task
async function createTask() {
    const nameInput = document.getElementById('newTaskName');
    const startInput = document.getElementById('newTaskStart');
    const endInput = document.getElementById('newTaskEnd');

    const name = nameInput.value.trim();
    if (!name) return;

    const startDate = startInput.value ? new Date(startInput.value) : new Date();
    const endDate = endInput.value ? new Date(endInput.value) : new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);

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
