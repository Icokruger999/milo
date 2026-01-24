// Project Timeline - Gantt Chart View
// Displays tasks in a project management timeline format

let timelineTasks = [];
let phases = [];
let dayWidth = 40; // pixels per day
let startDate = null;
let endDate = null;
let currentProject = null;

// Phase colors
const phaseColors = ['blue', 'green', 'orange', 'purple', 'gray'];
let colorIndex = 0;

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

    // Load timeline data
    await loadTimelineData();

    // Scroll to today
    setTimeout(scrollToToday, 100);
});

// Load timeline data from API
async function loadTimelineData() {
    try {
        const response = await apiClient.get(`/tasks?projectId=${currentProject.id}`);
        if (!response.ok) {
            console.error('Failed to load tasks');
            return;
        }

        const tasks = await response.json();
        
        // Process tasks into phases and subtasks
        processTasksIntoPhases(tasks);
        
        // Calculate date range
        calculateDateRange();
        
        // Render the timeline
        renderTimeline();
    } catch (error) {
        console.error('Error loading timeline:', error);
    }
}

// Process tasks into phases based on labels or parent tasks
function processTasksIntoPhases(tasks) {
    phases = [];
    const phaseMap = new Map();
    
    // Group tasks by label (as phases)
    tasks.forEach(task => {
        const phaseName = task.label || 'Uncategorized';
        
        if (!phaseMap.has(phaseName)) {
            phaseMap.set(phaseName, {
                id: `phase-${phaseMap.size + 1}`,
                name: phaseName,
                color: phaseColors[phaseMap.size % phaseColors.length],
                tasks: [],
                wbs: phaseMap.size + 1,
                startDate: null,
                endDate: null,
                expanded: true
            });
        }
        
        const phase = phaseMap.get(phaseName);
        const taskIndex = phase.tasks.length + 1;
        
        // Calculate progress based on status
        let progress = 0;
        if (task.status === 'done') progress = 100;
        else if (task.status === 'review') progress = 75;
        else if (task.status === 'progress') progress = 50;
        else if (task.status === 'todo') progress = 0;
        
        const processedTask = {
            id: task.id,
            name: task.title || 'Untitled Task',
            wbs: `${phase.wbs}.${taskIndex}`,
            startDate: task.startDate ? new Date(task.startDate) : (task.createdAt ? new Date(task.createdAt) : new Date()),
            endDate: task.dueDate ? new Date(task.dueDate) : null,
            progress: progress,
            assignee: task.assignee ? task.assignee.name : null,
            status: task.status,
            color: phase.color
        };
        
        // If no end date, default to 7 days after start
        if (!processedTask.endDate) {
            processedTask.endDate = new Date(processedTask.startDate);
            processedTask.endDate.setDate(processedTask.endDate.getDate() + 7);
        }
        
        phase.tasks.push(processedTask);
        
        // Update phase dates
        if (!phase.startDate || processedTask.startDate < phase.startDate) {
            phase.startDate = new Date(processedTask.startDate);
        }
        if (!phase.endDate || processedTask.endDate > phase.endDate) {
            phase.endDate = new Date(processedTask.endDate);
        }
    });
    
    // Calculate phase progress
    phaseMap.forEach(phase => {
        if (phase.tasks.length > 0) {
            const totalProgress = phase.tasks.reduce((sum, t) => sum + t.progress, 0);
            phase.progress = Math.round(totalProgress / phase.tasks.length);
        } else {
            phase.progress = 0;
        }
    });
    
    phases = Array.from(phaseMap.values());
    
    // Sort phases by WBS
    phases.sort((a, b) => a.wbs - b.wbs);
}

// Calculate the date range for the timeline
function calculateDateRange() {
    const now = new Date();
    
    // Find min and max dates from all tasks
    let minDate = new Date(now);
    let maxDate = new Date(now);
    
    phases.forEach(phase => {
        if (phase.startDate && phase.startDate < minDate) {
            minDate = new Date(phase.startDate);
        }
        if (phase.endDate && phase.endDate > maxDate) {
            maxDate = new Date(phase.endDate);
        }
    });
    
    // Add padding: 2 weeks before and 4 weeks after
    startDate = new Date(minDate);
    startDate.setDate(startDate.getDate() - 14);
    
    endDate = new Date(maxDate);
    endDate.setDate(endDate.getDate() + 28);
}

// Render the complete timeline
function renderTimeline() {
    renderGanttHeader();
    renderTaskTable();
    renderGanttBody();
}

// Render Gantt header with months and days
function renderGanttHeader() {
    const header = document.getElementById('ganttHeader');
    if (!header || !startDate || !endDate) return;
    
    const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Group days by month
    const months = [];
    let currentMonth = null;
    
    for (let i = 0; i < totalDays; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        
        const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
        
        if (!currentMonth || currentMonth.key !== monthKey) {
            currentMonth = {
                key: monthKey,
                label: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }).toUpperCase(),
                days: []
            };
            months.push(currentMonth);
        }
        
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
        const isToday = date.getTime() === today.getTime();
        
        currentMonth.days.push({
            date: new Date(date),
            dayOfWeek: date.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0),
            dayOfMonth: date.getDate(),
            isWeekend,
            isToday
        });
    }
    
    // Render month row
    let monthRowHTML = '<div class="gantt-month-row">';
    months.forEach(month => {
        const width = month.days.length * dayWidth;
        monthRowHTML += `<div class="gantt-month-cell" style="min-width: ${width}px; width: ${width}px;">${month.label}</div>`;
    });
    monthRowHTML += '</div>';
    
    // Render day row
    let dayRowHTML = '<div class="gantt-header-row">';
    months.forEach(month => {
        month.days.forEach(day => {
            let classes = 'gantt-header-cell';
            if (day.isWeekend) classes += ' weekend';
            if (day.isToday) classes += ' today';
            dayRowHTML += `<div class="${classes}" style="min-width: ${dayWidth}px;">
                <div>${day.dayOfWeek}</div>
                <div>${day.dayOfMonth}</div>
            </div>`;
        });
    });
    dayRowHTML += '</div>';
    
    header.innerHTML = monthRowHTML + dayRowHTML;
    
    // Set wrapper width
    const wrapper = document.getElementById('ganttWrapper');
    if (wrapper) {
        wrapper.style.width = `${totalDays * dayWidth}px`;
    }
}

// Render task table (left panel)
function renderTaskTable() {
    const tbody = document.getElementById('taskTableBody');
    if (!tbody) return;
    
    let html = '';
    let rowIndex = 0;
    
    phases.forEach((phase, phaseIndex) => {
        // Phase row
        html += `
            <tr class="phase-row" data-phase-id="${phase.id}" data-row="${rowIndex}">
                <td>
                    <span class="phase-indicator ${phase.color}"></span>
                </td>
                <td>
                    <div class="task-name">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="cursor: pointer;" onclick="togglePhase('${phase.id}')">
                            <polyline points="${phase.expanded ? '6 9 12 15 18 9' : '9 6 15 12 9 18'}"></polyline>
                        </svg>
                        ${escapeHtml(phase.name)}
                    </div>
                </td>
                <td class="wbs-number">${phase.wbs}</td>
                <td class="date-cell">${formatDate(phase.startDate)}</td>
                <td class="date-cell">${formatDate(phase.endDate)}</td>
            </tr>
        `;
        rowIndex++;
        
        // Task rows (if phase is expanded)
        if (phase.expanded) {
            phase.tasks.forEach(task => {
                html += `
                    <tr data-task-id="${task.id}" data-row="${rowIndex}">
                        <td></td>
                        <td>
                            <div class="task-name task-indent">
                                ${escapeHtml(task.name)}
                            </div>
                        </td>
                        <td class="wbs-number">${task.wbs}</td>
                        <td class="date-cell">${formatDate(task.startDate)}</td>
                        <td class="date-cell">${formatDate(task.endDate)}</td>
                    </tr>
                `;
                rowIndex++;
            });
        }
    });
    
    tbody.innerHTML = html;
}

// Render Gantt body with bars
function renderGanttBody() {
    const body = document.getElementById('ganttBody');
    if (!body || !startDate || !endDate) return;
    
    const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let html = '';
    
    // Create grid cells for each row
    phases.forEach((phase, phaseIndex) => {
        // Phase row
        html += renderGanttRow(phase, true, totalDays, today);
        
        // Task rows (if expanded)
        if (phase.expanded) {
            phase.tasks.forEach(task => {
                html += renderGanttRow(task, false, totalDays, today);
            });
        }
    });
    
    // Add today line
    const todayOffset = Math.ceil((today - startDate) / (1000 * 60 * 60 * 24));
    if (todayOffset >= 0 && todayOffset <= totalDays) {
        html += `<div class="today-line" style="left: ${todayOffset * dayWidth}px;"></div>`;
    }
    
    body.innerHTML = html;
}

// Render a single Gantt row
function renderGanttRow(item, isPhase, totalDays, today) {
    let html = `<div class="gantt-row ${isPhase ? 'phase-row' : ''}">`;
    
    // Background cells
    for (let i = 0; i < totalDays; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
        html += `<div class="gantt-cell ${isWeekend ? 'weekend' : ''}"></div>`;
    }
    
    // Calculate bar position
    if (item.startDate && item.endDate) {
        const barStart = Math.max(0, Math.ceil((item.startDate - startDate) / (1000 * 60 * 60 * 24)));
        const barEnd = Math.ceil((item.endDate - startDate) / (1000 * 60 * 60 * 24));
        const barWidth = Math.max(dayWidth, (barEnd - barStart) * dayWidth);
        const barLeft = barStart * dayWidth;
        
        const progress = item.progress || 0;
        const progressWidth = (progress / 100) * barWidth;
        
        // Build label
        let label = '';
        if (isPhase) {
            label = `${item.name} ${progress}%`;
        } else {
            label = `${item.name} ${progress}%`;
            if (item.assignee) {
                label += ` <span class="gantt-bar-assignee">${item.assignee}</span>`;
            }
        }
        
        html += `
            <div class="gantt-bar-container" style="left: ${barLeft}px; width: ${barWidth}px;">
                <div class="gantt-bar ${item.color}" style="width: 100%;" onclick="openTaskDetail(${item.id})" title="${escapeHtml(item.name)} - ${progress}% complete">
                    <div class="gantt-bar-progress" style="width: ${progressWidth}px;"></div>
                    <div class="gantt-bar-label">${label}</div>
                </div>
            </div>
        `;
    }
    
    html += '</div>';
    return html;
}

// Format date for display
function formatDate(date) {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
}

// Escape HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Toggle phase expansion
function togglePhase(phaseId) {
    const phase = phases.find(p => p.id === phaseId);
    if (phase) {
        phase.expanded = !phase.expanded;
        renderTaskTable();
        renderGanttBody();
    }
}

// Scroll to today
function scrollToToday() {
    const container = document.getElementById('ganttContainer');
    if (!container || !startDate) return;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayOffset = Math.ceil((today - startDate) / (1000 * 60 * 60 * 24));
    const scrollPosition = Math.max(0, (todayOffset * dayWidth) - (container.clientWidth / 2));
    
    container.scrollLeft = scrollPosition;
}

// Zoom in
function zoomIn() {
    dayWidth = Math.min(80, dayWidth + 10);
    renderTimeline();
}

// Zoom out
function zoomOut() {
    dayWidth = Math.max(20, dayWidth - 10);
    renderTimeline();
}

// Add new phase
function addPhase() {
    const name = prompt('Enter phase name:');
    if (!name) return;
    
    colorIndex = (colorIndex + 1) % phaseColors.length;
    
    const newPhase = {
        id: `phase-${Date.now()}`,
        name: name,
        color: phaseColors[colorIndex],
        tasks: [],
        wbs: phases.length + 1,
        startDate: new Date(),
        endDate: new Date(),
        progress: 0,
        expanded: true
    };
    
    phases.push(newPhase);
    renderTimeline();
}

// Add new task
async function addTask() {
    // Redirect to board to create task
    window.location.href = 'milo-board.html';
}

// Open task detail
function openTaskDetail(taskId) {
    // Could open a modal or redirect to task detail
    console.log('Open task:', taskId);
}

// Make functions global
window.togglePhase = togglePhase;
window.scrollToToday = scrollToToday;
window.zoomIn = zoomIn;
window.zoomOut = zoomOut;
window.addPhase = addPhase;
window.addTask = addTask;
window.openTaskDetail = openTaskDetail;
