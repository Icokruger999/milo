// Interactive Gantt Chart Roadmap

let roadmapData = {
    releases: [],
    milestones: [],
    tasks: []
};
let currentViewMode = 'days'; // days, weeks, months (default to days)
let timelineStartDate = null;
let timelineEndDate = null;
let currentDatePosition = 0;
let draggedBar = null;
let dragOffset = { x: 0, y: 0 };

// Timeline panning state
let isPanningTimeline = false;
let panStartX = 0;
let panStartScrollLeft = 0;

// Initialize roadmap
document.addEventListener('DOMContentLoaded', function() {
    if (!authService.isAuthenticated()) {
        window.location.href = 'milo-login.html';
        return;
    }

    // Set user avatars
    const user = authService.getCurrentUser();
    if (user) {
        const nameParts = (user.name || user.email || 'User').trim().split(' ');
        let initials = 'U';
        if (nameParts.length >= 2) {
            initials = (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase();
        } else if (nameParts.length === 1) {
            initials = nameParts[0].substring(0, 2).toUpperCase();
        }
        document.getElementById('globalUserAvatar').textContent = initials;
        document.getElementById('sidebarUserAvatar').textContent = initials;
    }

    // Load project info
    const currentProject = projectSelector.getCurrentProject();
    if (currentProject) {
        document.getElementById('projectName').textContent = currentProject.name;
        document.getElementById('projectIcon').textContent = (currentProject.key || currentProject.name).substring(0, 1).toUpperCase();
        document.getElementById('projectTitle').textContent = currentProject.name;
    } else {
        window.location.href = 'milo-select-project.html';
        return;
    }

    // Initialize timeline (show from beginning of last year to end of next year for scrollable view)
    const now = new Date();
    timelineStartDate = new Date(now.getFullYear() - 1, 0, 1); // January 1st of last year
    timelineEndDate = new Date(now.getFullYear() + 2, 0, 1); // January 1st two years from now (3 years total)
    
    // Load roadmap data
    loadRoadmapData();

    // Enable mouse drag panning on the timeline
    setupTimelinePanning();
});

// Load roadmap data
async function loadRoadmapData() {
    try {
        const currentProject = projectSelector.getCurrentProject();
        if (!currentProject) return;

        const response = await apiClient.get(`/tasks?projectId=${currentProject.id}`);
        if (response.ok) {
            const tasks = await response.json();
            
            // Organize tasks by type
            roadmapData.tasks = tasks.map(task => ({
                id: task.id,
                taskId: task.taskId || `TASK-${task.id}`,
                title: task.title,
                type: task.taskType || 'Task',
                status: task.status,
                startDate: task.startDate ? new Date(task.startDate) : (task.createdAt ? new Date(task.createdAt) : new Date()),
                endDate: task.dueDate ? new Date(task.dueDate) : null,
                assigneeId: task.assigneeId,
                assignee: task.assignee,
                parentTaskId: task.parentTaskId,
                priority: task.priority
            }));

            // Create releases and milestones from parent tasks
            roadmapData.releases = roadmapData.tasks.filter(t => t.type === 'Epic' && !t.parentTaskId);
            roadmapData.milestones = []; // Can be added later

            renderRoadmap();
        }
    } catch (error) {
        console.error('Error loading roadmap:', error);
    }
}

// Set view mode
function setViewMode(mode) {
    currentViewMode = mode;
    document.getElementById('viewDays').classList.toggle('active', mode === 'days');
    document.getElementById('viewWeeks').classList.toggle('active', mode === 'weeks');
    document.getElementById('viewMonths').classList.toggle('active', mode === 'months');
    renderTimeline();
}

// Apply filters
function applyFilters() {
    renderRoadmap();
}

// Render roadmap
function renderRoadmap() {
    renderTree();
    renderTimeline();
}

// Render tree panel
function renderTree() {
    const typeFilter = document.getElementById('typeFilter').value;
    
    // Filter tasks
    let filteredTasks = roadmapData.tasks;
    if (typeFilter) {
        filteredTasks = filteredTasks.filter(t => t.type === typeFilter);
    }

    // Render releases
    const releasesTree = document.getElementById('releasesTree');
    releasesTree.innerHTML = roadmapData.releases.map(release => `
        <div class="tree-item" data-id="${release.id}" data-type="release">
            <div class="tree-item-icon epic"></div>
            <div class="tree-item-content">
                <div>
                    <span class="tree-item-id">${release.taskId}</span>
                    <span class="tree-item-title">${release.title}</span>
                </div>
                <div class="tree-item-meta">
                    <span class="tree-item-status ${release.status}">${getStatusLabel(release.status)}</span>
                </div>
            </div>
        </div>
    `).join('');

    // Render milestones
    const milestonesTree = document.getElementById('milestonesTree');
    milestonesTree.innerHTML = roadmapData.milestones.map(milestone => `
        <div class="tree-item" data-id="${milestone.id}" data-type="milestone">
            <div class="tree-item-icon epic"></div>
            <div class="tree-item-content">
                <div>
                    <span class="tree-item-id">${milestone.taskId}</span>
                    <span class="tree-item-title">${milestone.title}</span>
                </div>
            </div>
        </div>
    `).join('');

    // Render tasks
    const tasksTree = document.getElementById('tasksTree');
    tasksTree.innerHTML = filteredTasks.map(task => {
        const assigneeCount = task.assignee ? 1 : 0;
        return `
            <div class="tree-item" data-id="${task.id}" data-type="${task.type.toLowerCase()}">
                <div class="tree-item-icon ${task.type.toLowerCase()}"></div>
                <div class="tree-item-content">
                    <div>
                        <span class="tree-item-id">${task.taskId}</span>
                        <span class="tree-item-title">${task.title}</span>
                    </div>
                    <div class="tree-item-meta">
                        <span class="tree-item-status ${task.status}">${getStatusLabel(task.status)}</span>
                        ${assigneeCount > 0 ? `<div class="tree-item-assignees"><span class="tree-item-assignee-count">${assigneeCount}</span></div>` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Render timeline
function renderTimeline() {
    renderTimelineHeader();
    renderTimelineBody();
    updateCurrentDateLine();
    
    // Auto-scroll to Today on initial load (only if not already scrolled)
    const timelineArea = document.getElementById('timelineArea');
    if (timelineArea && timelineArea.scrollLeft === 0) {
        // Small delay to ensure layout is complete
        setTimeout(() => {
            scrollToToday();
        }, 100);
    }
}

// Get cell width based on view mode
function getCellWidth() {
    if (currentViewMode === 'days') return 60;
    if (currentViewMode === 'weeks') return 120;
    if (currentViewMode === 'months') return 150;
    return 120;
}

// Render timeline header
function renderTimelineHeader() {
    const header = document.getElementById('timelineHeader');
    const dates = generateTimelineDates();
    const cellWidth = getCellWidth();
    const timelineWidth = dates.length * cellWidth;
    
    const cells = dates.map(date => {
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
        const label = formatDateLabel(date);
        return `<div class="timeline-header-cell ${isWeekend ? 'weekend' : ''}" style="min-width: ${cellWidth}px; width: ${cellWidth}px;">${label}</div>`;
    }).join('');
    
    header.innerHTML = `<div class="timeline-header-row" style="width: ${timelineWidth}px; display: flex;">${cells}</div>`;
}

// Generate timeline dates based on view mode
function generateTimelineDates() {
    const dates = [];
    const current = new Date(timelineStartDate);
    const end = new Date(timelineEndDate);
    
    if (currentViewMode === 'days') {
        while (current <= end) {
            dates.push(new Date(current));
            current.setDate(current.getDate() + 1);
        }
    } else if (currentViewMode === 'weeks') {
        // Start from Monday of the week
        const dayOfWeek = current.getDay();
        const diff = current.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        current.setDate(diff);
        
        while (current <= end) {
            dates.push(new Date(current));
            current.setDate(current.getDate() + 7);
        }
    } else if (currentViewMode === 'months') {
        while (current <= end) {
            dates.push(new Date(current));
            current.setMonth(current.getMonth() + 1);
        }
    }
    
    return dates;
}

// Format date label
function formatDateLabel(date) {
    if (currentViewMode === 'days') {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } else if (currentViewMode === 'weeks') {
        const weekStart = new Date(date);
        const weekEnd = new Date(date);
        weekEnd.setDate(weekEnd.getDate() + 6);
        return `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    } else if (currentViewMode === 'months') {
        return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    }
    return date.toLocaleDateString();
}

// Render timeline body
function renderTimelineBody() {
    const body = document.getElementById('timelineBody');
    const rows = document.getElementById('timelineRows');
    const dates = generateTimelineDates();
    const typeFilter = document.getElementById('typeFilter').value;
    
    // Filter tasks
    let filteredTasks = roadmapData.tasks;
    if (typeFilter) {
        filteredTasks = filteredTasks.filter(t => t.type === typeFilter);
    }

    // Calculate cell width based on view mode
    const cellWidth = getCellWidth();
    const timelineWidth = dates.length * cellWidth;
    
    // Set width on both rows container and body to ensure scrolling works
    rows.style.width = timelineWidth + 'px';
    rows.style.minWidth = timelineWidth + 'px';
    if (body) {
        body.style.width = timelineWidth + 'px';
        body.style.minWidth = timelineWidth + 'px';
    }
    
    // Clear existing rows
    rows.innerHTML = '';

    // Render releases
    roadmapData.releases.forEach(release => {
        const row = createTimelineRow(release, 'release', dates, timelineWidth);
        rows.appendChild(row);
    });

    // Render milestones
    roadmapData.milestones.forEach(milestone => {
        const row = createTimelineRow(milestone, 'milestone', dates, timelineWidth);
        rows.appendChild(row);
    });

    // Render tasks
    filteredTasks.forEach(task => {
        const row = createTimelineRow(task, task.type.toLowerCase(), dates, timelineWidth);
        rows.appendChild(row);
    });
}

// Create timeline row
function createTimelineRow(item, type, dates, timelineWidth) {
    const row = document.createElement('div');
    row.className = `timeline-row ${type}`;
    row.dataset.itemId = item.id;
    
    // Calculate bar position and width
    const startDate = item.startDate || new Date();
    const endDate = item.endDate || new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000); // Default 7 days
    
    const firstDate = dates[0];
    const lastDate = dates[dates.length - 1];
    if (currentViewMode === 'weeks') {
        lastDate.setDate(lastDate.getDate() + 6);
    } else if (currentViewMode === 'months') {
        lastDate.setMonth(lastDate.getMonth() + 1);
        lastDate.setDate(0);
    }
    
    const totalDays = Math.ceil((lastDate - firstDate) / (1000 * 60 * 60 * 24));
    const startDays = Math.max(0, Math.ceil((startDate - firstDate) / (1000 * 60 * 60 * 24)));
    const durationDays = Math.max(1, Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)));
    
    const left = (startDays / totalDays) * timelineWidth;
    const width = (durationDays / totalDays) * timelineWidth;
    
    // Adjust minimum bar width based on view mode
    const minBarWidth = currentViewMode === 'days' ? 30 : 60;
    
    const bar = document.createElement('div');
    bar.className = `timeline-bar ${type}`;
    bar.style.left = left + 'px';
    bar.style.width = Math.max(minBarWidth, width) + 'px';
    bar.dataset.itemId = item.id;
    bar.dataset.startDate = startDate.toISOString();
    bar.dataset.endDate = endDate.toISOString();
    
    const title = item.title.length > 30 ? item.title.substring(0, 30) + '...' : item.title;
    
    // Add resize handles and title
    bar.innerHTML = `
        <div class="resize-handle resize-handle-left" data-item-id="${item.id}"></div>
        <span class="timeline-bar-title">${item.taskId} ${title}</span>
        <div class="resize-handle resize-handle-right" data-item-id="${item.id}"></div>
    `;
    
    // Add mouse down handler for dragging entire bar
    bar.addEventListener('mousedown', handleBarMouseDown);
    
    // Add resize handlers
    const leftHandle = bar.querySelector('.resize-handle-left');
    const rightHandle = bar.querySelector('.resize-handle-right');
    
    leftHandle.addEventListener('mousedown', handleLeftResizeStart);
    rightHandle.addEventListener('mousedown', handleRightResizeStart);
    
    row.appendChild(bar);
    
    return row;
}

// Drag and resize variables
let isDragging = false;
let isResizing = false;
let resizeMode = null; // 'left' or 'right'
let currentBar = null;
let startX = 0;
let startLeft = 0;
let startWidth = 0;

// Handle bar mouse down for dragging
function handleBarMouseDown(e) {
    // Don't drag if clicking on resize handle
    if (e.target.classList.contains('resize-handle')) {
        return;
    }
    
    e.preventDefault();
    isDragging = true;
    currentBar = this;
    startX = e.clientX;
    startLeft = parseInt(currentBar.style.left) || 0;
    
    currentBar.classList.add('dragging');
    
    document.addEventListener('mousemove', handleBarDrag);
    document.addEventListener('mouseup', handleBarDragEnd);
}

// Handle bar dragging
function handleBarDrag(e) {
    if (!isDragging || !currentBar) return;
    
    e.preventDefault();
    const deltaX = e.clientX - startX;
    const newLeft = startLeft + deltaX;
    
    // Constrain to timeline bounds
    if (newLeft >= 0) {
        currentBar.style.left = newLeft + 'px';
    }
}

// Handle bar drag end
function handleBarDragEnd(e) {
    if (!isDragging || !currentBar) return;
    
    isDragging = false;
    currentBar.classList.remove('dragging');
    
    // Save new position
    saveTaskPosition(currentBar);
    
    currentBar = null;
    document.removeEventListener('mousemove', handleBarDrag);
    document.removeEventListener('mouseup', handleBarDragEnd);
}

// Handle left resize start
function handleLeftResizeStart(e) {
    e.preventDefault();
    e.stopPropagation();
    
    isResizing = true;
    resizeMode = 'left';
    currentBar = e.target.closest('.timeline-bar');
    startX = e.clientX;
    startLeft = parseInt(currentBar.style.left) || 0;
    startWidth = currentBar.offsetWidth;
    
    document.addEventListener('mousemove', handleResize);
    document.addEventListener('mouseup', handleResizeEnd);
}

// Handle right resize start
function handleRightResizeStart(e) {
    e.preventDefault();
    e.stopPropagation();
    
    isResizing = true;
    resizeMode = 'right';
    currentBar = e.target.closest('.timeline-bar');
    startX = e.clientX;
    startWidth = currentBar.offsetWidth;
    
    document.addEventListener('mousemove', handleResize);
    document.addEventListener('mouseup', handleResizeEnd);
}

// Handle resize
function handleResize(e) {
    if (!isResizing || !currentBar) return;
    
    e.preventDefault();
    const deltaX = e.clientX - startX;
    
    if (resizeMode === 'left') {
        // Resize from left (change start date)
        const newLeft = startLeft + deltaX;
        const newWidth = startWidth - deltaX;
        
        if (newLeft >= 0 && newWidth >= 60) {
            currentBar.style.left = newLeft + 'px';
            currentBar.style.width = newWidth + 'px';
        }
    } else if (resizeMode === 'right') {
        // Resize from right (change end date)
        const newWidth = startWidth + deltaX;
        
        if (newWidth >= 60) {
            currentBar.style.width = newWidth + 'px';
        }
    }
}

// Handle resize end
function handleResizeEnd(e) {
    if (!isResizing || !currentBar) return;
    
    isResizing = false;
    
    // Save new dates
    saveTaskDates(currentBar);
    
    resizeMode = null;
    currentBar = null;
    document.removeEventListener('mousemove', handleResize);
    document.removeEventListener('mouseup', handleResizeEnd);
}

// Save task position (drag)
async function saveTaskPosition(bar) {
    const itemId = parseInt(bar.dataset.itemId);
    const task = roadmapData.tasks.find(t => t.id === itemId);
    if (!task) return;
    
    const left = parseInt(bar.style.left);
    const dates = generateTimelineDates();
    const cellWidth = getCellWidth();
    const timelineWidth = dates.length * cellWidth;
    
    const firstDate = dates[0];
    const lastDate = dates[dates.length - 1];
    if (currentViewMode === 'weeks') {
        lastDate.setDate(lastDate.getDate() + 6);
    } else if (currentViewMode === 'months') {
        lastDate.setMonth(lastDate.getMonth() + 1);
        lastDate.setDate(0);
    }
    
    const totalDays = Math.ceil((lastDate - firstDate) / (1000 * 60 * 60 * 24));
    const daysFromStart = (left / timelineWidth) * totalDays;
    
    const newStartDate = new Date(firstDate);
    newStartDate.setDate(newStartDate.getDate() + Math.round(daysFromStart));
    
    // Calculate duration to maintain it
    const duration = task.endDate ? Math.ceil((task.endDate - task.startDate) / (1000 * 60 * 60 * 24)) : 7;
    const newEndDate = new Date(newStartDate);
    newEndDate.setDate(newEndDate.getDate() + duration);
    
    task.startDate = newStartDate;
    task.endDate = newEndDate;
    
    await saveTaskDates(bar);
}

// Save task dates (resize or drag)
async function saveTaskDates(bar) {
    const itemId = parseInt(bar.dataset.itemId);
    const task = roadmapData.tasks.find(t => t.id === itemId);
    if (!task) return;
    
    const left = parseInt(bar.style.left);
    const width = bar.offsetWidth;
    
    const dates = generateTimelineDates();
    const cellWidth = getCellWidth();
    const timelineWidth = dates.length * cellWidth;
    
    const firstDate = dates[0];
    const lastDate = dates[dates.length - 1];
    if (currentViewMode === 'weeks') {
        lastDate.setDate(lastDate.getDate() + 6);
    } else if (currentViewMode === 'months') {
        lastDate.setMonth(lastDate.getMonth() + 1);
        lastDate.setDate(0);
    }
    
    const totalDays = Math.ceil((lastDate - firstDate) / (1000 * 60 * 60 * 24));
    const daysFromStart = (left / timelineWidth) * totalDays;
    const durationDays = (width / timelineWidth) * totalDays;
    
    const newStartDate = new Date(firstDate);
    newStartDate.setDate(newStartDate.getDate() + Math.round(daysFromStart));
    
    const newEndDate = new Date(newStartDate);
    newEndDate.setDate(newEndDate.getDate() + Math.round(durationDays));
    
    task.startDate = newStartDate;
    task.endDate = newEndDate;
    
    // Save to API
    try {
        const response = await apiClient.put(`/tasks/${task.id}`, {
            startDate: task.startDate.toISOString(),
            dueDate: task.endDate.toISOString()
        });
        if (response.ok) {
            console.log('Task dates updated');
        }
    } catch (error) {
        console.error('Error updating task dates:', error);
    }
}


// Update current date line
function updateCurrentDateLine() {
    const now = new Date();
    const dates = generateTimelineDates();
    const firstDate = dates[0];
    const lastDate = dates[dates.length - 1];
    if (currentViewMode === 'weeks') {
        lastDate.setDate(lastDate.getDate() + 6);
    } else if (currentViewMode === 'months') {
        lastDate.setMonth(lastDate.getMonth() + 1);
        lastDate.setDate(0);
    }
    
    const totalDays = Math.ceil((lastDate - firstDate) / (1000 * 60 * 60 * 24));
    const daysFromStart = Math.ceil((now - firstDate) / (1000 * 60 * 60 * 24));
    
    const cellWidth = getCellWidth();
    const timelineWidth = dates.length * cellWidth;
    currentDatePosition = (daysFromStart / totalDays) * timelineWidth;
    
    const currentDateLine = document.getElementById('currentDateLine');
    if (currentDateLine) {
        currentDateLine.style.left = currentDatePosition + 'px';
    }
}

// Scroll to today
function scrollToToday() {
    const timelineArea = document.getElementById('timelineArea');
    if (timelineArea) {
        timelineArea.scrollLeft = currentDatePosition - 200;
    }
}

// Enable mouse drag panning for the entire timeline
function setupTimelinePanning() {
    const timelineArea = document.getElementById('timelineArea');
    if (!timelineArea) return;

    timelineArea.addEventListener('mousedown', (e) => {
        // Only left mouse button and avoid starting pan when dragging a task bar
        if (e.button !== 0) return;
        if (e.target.closest('.timeline-bar')) return;

        isPanningTimeline = true;
        panStartX = e.clientX;
        panStartScrollLeft = timelineArea.scrollLeft;
        timelineArea.classList.add('timeline-panning');
    });

    window.addEventListener('mousemove', (e) => {
        if (!isPanningTimeline) return;
        const dx = e.clientX - panStartX;
        timelineArea.scrollLeft = panStartScrollLeft - dx;
    });

    window.addEventListener('mouseup', () => {
        if (!isPanningTimeline) return;
        isPanningTimeline = false;
        const timelineArea = document.getElementById('timelineArea');
        if (timelineArea) {
            timelineArea.classList.remove('timeline-panning');
        }
    });
}

// Get status label
function getStatusLabel(status) {
    const labels = {
        'todo': 'TO DO',
        'progress': 'IN PROGRESS',
        'review': 'IN REVIEW',
        'done': 'DONE'
    };
    return labels[status] || status.toUpperCase();
}

// Show create task modal
function showCreateTaskModal() {
    if (typeof window.showCreateTaskModal === 'function') {
        window.showCreateTaskModal('todo');
    } else {
        window.location.href = 'milo-board.html';
    }
}

// Make functions globally available
window.setViewMode = setViewMode;
window.applyFilters = applyFilters;
window.scrollToToday = scrollToToday;
window.showCreateTaskModal = showCreateTaskModal;

