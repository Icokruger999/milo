// Project Timeline - Gantt Chart View
// Fully functional timeline with days/weeks/months view

let tasks = [];
let currentProject = null;
let currentView = 'weeks'; // days, weeks, months
let currentDate = new Date();
let dayWidth = 40;

// Colors for tasks
const taskColors = ['blue', 'green', 'orange', 'purple', 'red'];

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
            } catch (e) {
                console.error('Error parsing stored project:', e);
            }
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
        } catch (error) {
            console.error('Failed to load projects:', error);
        }
    }

    if (!currentProject) {
        window.location.href = 'milo-select-project.html';
        return;
    }

    // Update project title
    const titleEl = document.getElementById('projectTitle');
    if (titleEl) titleEl.textContent = currentProject.name + ' Timeline';

    // Set default dates for new task inputs
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    document.getElementById('newTaskStart').value = formatDateForInput(today);
    document.getElementById('newTaskEnd').value = formatDateForInput(nextWeek);

    // Load tasks
    await loadTasks();

    // Render timeline
    renderTimeline();

    // Scroll to today
    setTimeout(goToToday, 100);
});

// Load tasks from API
async function loadTasks() {
    try {
        const response = await apiClient.get(`/tasks?projectId=${currentProject.id}`);
        if (!response.ok) {
            console.error('Failed to load tasks');
            return;
        }

        const rawTasks = await response.json();
        
        // Process tasks
        tasks = rawTasks.map((task, index) => {
            // Calculate progress based on status
            let progress = 0;
            if (task.status === 'done') progress = 100;
            else if (task.status === 'review') progress = 75;
            else if (task.status === 'progress') progress = 50;
            else progress = 0;

            return {
                id: task.id,
                name: task.title || 'Untitled',
                wbs: (index + 1).toString(),
                startDate: task.startDate ? new Date(task.startDate) : new Date(task.createdAt || Date.now()),
                endDate: task.dueDate ? new Date(task.dueDate) : null,
                progress: progress,
                color: taskColors[index % taskColors.length],
                status: task.status,
                assignee: task.assignee ? task.assignee.name : null,
                label: task.label
            };
        });

        // Set default end date if missing
        tasks.forEach(task => {
            if (!task.endDate) {
                task.endDate = new Date(task.startDate);
                task.endDate.setDate(task.endDate.getDate() + 7);
            }
        });

        console.log(`Loaded ${tasks.length} tasks`);
    } catch (error) {
        console.error('Error loading tasks:', error);
    }
}

// Render the complete timeline
function renderTimeline() {
    renderTaskList();
    renderGanttChart();
    updatePeriodLabel();
}

// Render task list (left panel)
function renderTaskList() {
    const container = document.getElementById('taskList');
    if (!container) return;

    if (tasks.length === 0) {
        container.innerHTML = `
            <div style="padding: 40px 20px; text-align: center; color: #6B778C;">
                <p>No tasks yet. Add your first task below.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = tasks.map(task => `
        <div class="task-row" data-task-id="${task.id}">
            <div class="task-color">
                <div class="color-dot ${task.color}"></div>
            </div>
            <div class="task-name">
                ${escapeHtml(task.name)}
            </div>
            <div class="wbs-cell">${task.wbs}</div>
            <div class="date-cell">${formatDateShort(task.startDate)}</div>
            <div class="date-cell">${formatDateShort(task.endDate)}</div>
        </div>
    `).join('');
}

// Render Gantt chart (right panel)
function renderGanttChart() {
    const { startDate: viewStart, endDate: viewEnd, days } = getViewDateRange();
    
    renderGanttHeader(viewStart, days);
    renderGanttBody(viewStart, days);
}

// Get date range based on current view
function getViewDateRange() {
    const start = new Date(currentDate);
    let days = 0;

    if (currentView === 'days') {
        // Show 2 weeks centered on current date
        start.setDate(start.getDate() - 7);
        days = 14;
        dayWidth = 60;
    } else if (currentView === 'weeks') {
        // Show current month
        start.setDate(1);
        const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
        days = end.getDate();
        dayWidth = 40;
    } else if (currentView === 'months') {
        // Show 3 months
        start.setDate(1);
        const end = new Date(start.getFullYear(), start.getMonth() + 3, 0);
        days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
        dayWidth = 15;
    }

    const endDate = new Date(start);
    endDate.setDate(endDate.getDate() + days);

    return { startDate: start, endDate: endDate, days: days };
}

// Render Gantt header
function renderGanttHeader(viewStart, totalDays) {
    const header = document.getElementById('ganttHeader');
    if (!header) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Group days by month
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

        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
        const isToday = date.getTime() === today.getTime();

        currentMonth.days.push({
            date: new Date(date),
            dayName: date.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0),
            dayNum: date.getDate(),
            isWeekend,
            isToday
        });
    }

    // Render months row
    let monthsHTML = '<div class="gantt-months-row">';
    months.forEach(month => {
        const width = month.days.length * dayWidth;
        monthsHTML += `<div class="gantt-month-cell" style="min-width: ${width}px; width: ${width}px;">${month.label}</div>`;
    });
    monthsHTML += '</div>';

    // Render days row
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

    // Set wrapper width
    const wrapper = document.getElementById('ganttWrapper');
    if (wrapper) {
        wrapper.style.width = `${totalDays * dayWidth}px`;
    }
}

// Render Gantt body with bars
function renderGanttBody(viewStart, totalDays) {
    const body = document.getElementById('ganttBody');
    if (!body) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let html = '';

    // Render rows for each task
    tasks.forEach(task => {
        html += '<div class="gantt-row">';
        
        // Background cells
        for (let i = 0; i < totalDays; i++) {
            const date = new Date(viewStart);
            date.setDate(date.getDate() + i);
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
            html += `<div class="gantt-cell ${isWeekend ? 'weekend' : ''}" style="min-width: ${dayWidth}px; width: ${dayWidth}px;"></div>`;
        }

        // Task bar
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

    // Add empty row for new task
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
        const start = new Date(currentDate);
        start.setDate(start.getDate() - 7);
        const end = new Date(currentDate);
        end.setDate(end.getDate() + 7);
        label.textContent = `${formatDateShort(start)} - ${formatDateShort(end)}`;
    } else if (currentView === 'weeks') {
        label.textContent = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } else {
        const start = new Date(currentDate);
        const end = new Date(start.getFullYear(), start.getMonth() + 3, 0);
        label.textContent = `${start.toLocaleDateString('en-US', { month: 'short' })} - ${end.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;
    }
}

// Set view mode
function setView(view) {
    currentView = view;
    
    // Update buttons
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
    
    // Scroll to today in gantt
    const panel = document.getElementById('ganttPanel');
    const { startDate: viewStart } = getViewDateRange();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayOffset = Math.ceil((today - viewStart) / (1000 * 60 * 60 * 24));
    const scrollPos = Math.max(0, (todayOffset * dayWidth) - (panel.clientWidth / 2));
    panel.scrollLeft = scrollPos;
}

// Handle keypress on new task input
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
    const colorSelect = document.getElementById('newTaskColor');

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
            // Clear inputs
            nameInput.value = '';
            
            // Set new default dates
            const today = new Date();
            const nextWeek = new Date(today);
            nextWeek.setDate(nextWeek.getDate() + 7);
            startInput.value = formatDateForInput(today);
            endInput.value = formatDateForInput(nextWeek);

            // Reload tasks
            await loadTasks();
            renderTimeline();
            
            console.log('Task created successfully');
        } else {
            console.error('Failed to create task');
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

function formatDateForInput(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Make functions global
window.setView = setView;
window.navigatePeriod = navigatePeriod;
window.goToToday = goToToday;
window.handleTaskKeypress = handleTaskKeypress;
window.createTask = createTask;
