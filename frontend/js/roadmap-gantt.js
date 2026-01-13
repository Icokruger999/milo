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
let selectedTask = null; // Track selected task for detail panel

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
        const globalUserAvatar = document.getElementById('globalUserAvatar');
        const sidebarUserAvatar = document.getElementById('sidebarUserAvatar');
        if (globalUserAvatar) globalUserAvatar.textContent = initials;
        if (sidebarUserAvatar) sidebarUserAvatar.textContent = initials;
    }

    // Load project info
    const currentProject = projectSelector.getCurrentProject();
    if (currentProject) {
        const projectName = document.getElementById('projectName');
        const projectIcon = document.getElementById('projectIcon');
        const projectTitle = document.getElementById('projectTitle');
        if (projectName) projectName.textContent = currentProject.name;
        if (projectIcon) projectIcon.textContent = (currentProject.key || currentProject.name).substring(0, 1).toUpperCase();
        if (projectTitle) projectTitle.textContent = currentProject.name;
    } else {
        window.location.href = 'milo-select-project.html';
        return;
    }

    // Initialize timeline (show from beginning of last year to end of next year for scrollable view)
    // This ensures we have enough range to scroll, but we'll default to showing today
    const now = new Date();
    timelineStartDate = new Date(now.getFullYear() - 1, 0, 1); // January 1st of last year
    timelineEndDate = new Date(now.getFullYear() + 2, 0, 1); // January 1st two years from now (3 years total)
    
    console.log('Timeline initialized:', {
        start: timelineStartDate.toISOString(),
        end: timelineEndDate.toISOString(),
        today: now.toISOString()
    });
    
    // Set default view mode to "Days" and update UI
    setViewMode('days');
    
    // Load roadmap data - this will call renderRoadmap() which calls scrollToToday()
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
            // Default to today for tasks without startDate so they're visible on the roadmap
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Set to start of today
            
            roadmapData.tasks = tasks.map(task => {
                // If no startDate, default to today (not createdAt) so tasks are visible
                let startDate = null;
                if (task.startDate) {
                    startDate = new Date(task.startDate);
                } else {
                    // Default to today for visibility
                    startDate = new Date(today);
                }
                
                // If no dueDate, default to 7 days from startDate
                let endDate = null;
                if (task.dueDate) {
                    endDate = new Date(task.dueDate);
                } else if (startDate) {
                    // Default to 7 days from start date
                    endDate = new Date(startDate);
                    endDate.setDate(endDate.getDate() + 7);
                }
                
                return {
                    id: task.id,
                    taskId: task.taskId || `TASK-${task.id}`,
                    title: task.title,
                    type: task.taskType || 'Task',
                    status: task.status,
                    startDate: startDate,
                    endDate: endDate,
                    assigneeId: task.assigneeId,
                    assignee: task.assignee,
                    parentTaskId: task.parentTaskId,
                    priority: task.priority
                };
            });

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
    
    // Always auto-scroll to Today after rendering (with delay for layout)
    // Use multiple attempts to ensure timeline is fully rendered
    // Also ensure view mode is set to Days
    setTimeout(() => {
        // Make sure Days view is active
        const viewDaysBtn = document.getElementById('viewDays');
        if (viewDaysBtn && !viewDaysBtn.classList.contains('active')) {
            setViewMode('days');
        }
        scrollToToday();
    }, 100);
    setTimeout(() => {
        scrollToToday();
    }, 300);
    setTimeout(() => {
        scrollToToday();
    }, 600);
    setTimeout(() => {
        scrollToToday();
    }, 1000);
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
    if (!header) {
        console.error('Timeline header element not found');
        return;
    }
    
    const dates = generateTimelineDates();
    const cellWidth = getCellWidth();
    const timelineWidth = dates.length * cellWidth;
    
    const cells = dates.map(date => {
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
        const label = formatDateLabel(date);
        return `<div class="timeline-header-cell ${isWeekend ? 'weekend' : ''}" style="min-width: ${cellWidth}px; width: ${cellWidth}px; flex-shrink: 0;">${label}</div>`;
    }).join('');
    
    // Force horizontal layout with explicit flex properties
    header.innerHTML = `<div class="timeline-header-row" style="width: ${timelineWidth}px; min-width: ${timelineWidth}px; display: flex; flex-direction: row; flex-wrap: nowrap;">${cells}</div>`;
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
    
    if (!rows) {
        console.error('Timeline rows element not found');
        return;
    }
    
    const dates = generateTimelineDates();
    const typeFilterEl = document.getElementById('typeFilter');
    const typeFilter = typeFilterEl ? typeFilterEl.value : '';
    
    // Filter tasks
    let filteredTasks = roadmapData.tasks || [];
    if (typeFilter) {
        filteredTasks = filteredTasks.filter(t => t.type === typeFilter);
    }

    // Calculate cell width based on view mode
    const cellWidth = getCellWidth();
    const timelineWidth = dates.length * cellWidth;
    
    // Set width on both rows container and body to ensure scrolling works properly
    rows.style.width = timelineWidth + 'px';
    rows.style.minWidth = timelineWidth + 'px';
    rows.style.position = 'relative';
    
    if (body) {
        body.style.width = timelineWidth + 'px';
        body.style.minWidth = timelineWidth + 'px';
        body.style.position = 'relative';
    }
    
    // Clear existing rows
    rows.innerHTML = '';

    // Render releases
    if (roadmapData.releases && roadmapData.releases.length > 0) {
        roadmapData.releases.forEach(release => {
            const row = createTimelineRow(release, 'release', dates, timelineWidth);
            rows.appendChild(row);
        });
    }

    // Render milestones
    if (roadmapData.milestones && roadmapData.milestones.length > 0) {
        roadmapData.milestones.forEach(milestone => {
            const row = createTimelineRow(milestone, 'milestone', dates, timelineWidth);
            rows.appendChild(row);
        });
    }

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
    
    // Add status-based class for coloring
    const status = (item.status || '').toLowerCase();
    if (status === 'backlog' || !status) {
        bar.classList.add('status-backlog');
    } else if (status === 'todo') {
        bar.classList.add('status-todo');
    } else if (status === 'progress' || status === 'in-progress' || status === 'inprogress') {
        bar.classList.add('status-progress');
    } else if (status === 'review' || status === 'in-review' || status === 'inreview') {
        bar.classList.add('status-review');
    } else if (status === 'done' || status === 'completed' || status === 'complete') {
        bar.classList.add('status-done');
    }
    
    const title = item.title.length > 30 ? item.title.substring(0, 30) + '...' : item.title;
    const fullTitle = `${item.taskId}: ${item.title}`;
    
    // Add title attribute for hover tooltip
    bar.setAttribute('title', fullTitle);
    
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
    
    // Track initial position to detect click vs drag
    window.mouseDownX = e.clientX;
    window.mouseDownY = e.clientY;
    
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
    
    // Detect if this was a click (mouse didn't move much)
    const deltaX = Math.abs(e.clientX - (window.mouseDownX || 0));
    const deltaY = Math.abs(e.clientY - (window.mouseDownY || 0));
    const wasClick = deltaX < 5 && deltaY < 5; // Threshold of 5px
    
    if (wasClick) {
        // This was a click, not a drag - open detail panel
        const taskId = parseInt(currentBar.dataset.itemId);
        if (taskId) {
            selectTask(taskId);
        }
    } else {
        // This was a drag - save new position
        saveTaskPosition(currentBar);
    }
    
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

// Scroll to today - center the view on today's date
function scrollToToday() {
    const timelineArea = document.getElementById('timelineArea');
    if (!timelineArea) return;
    
    // Recalculate current date position in case timeline was just rendered
    updateCurrentDateLine();
    
    if (currentDatePosition > 0) {
        // Center today's date in the viewport
        const viewportWidth = timelineArea.offsetWidth;
        const scrollPosition = Math.max(0, currentDatePosition - (viewportWidth / 2));
        timelineArea.scrollLeft = scrollPosition;
        console.log('Scrolled to today:', scrollPosition, 'currentDatePosition:', currentDatePosition);
    } else {
        // If position not calculated yet, try again after a short delay
        console.log('Timeline not ready yet, currentDatePosition:', currentDatePosition);
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

// ========== DETAIL PANEL FUNCTIONALITY ==========

// Select task and show detail panel
async function selectTask(taskId) {
    const task = roadmapData.tasks.find(t => t.id === taskId);
    if (!task) return;

    selectedTask = task;
    
    // Load full task details
    await loadTaskDetails(taskId);
    
    // Show detail panel
    const detailPanel = document.getElementById('detailPanel');
    if (detailPanel) {
        detailPanel.classList.add('open');
    }
}

// Load full task details
async function loadTaskDetails(taskId) {
    try {
        const response = await apiClient.get(`/tasks/${taskId}`);
        if (!response.ok) {
            console.error('Failed to load task details');
            return;
        }

        const task = await response.json();
        
        // Load child tasks
        const childTasks = await loadChildTasks(taskId);
        
        // Load linked tasks
        const linkedTasks = await loadLinkedTasks(taskId);
        
        // Load comments
        const comments = await loadTaskComments(taskId);
        
        // Render detail panel
        renderDetailPanel(task, childTasks, linkedTasks, comments);
    } catch (error) {
        console.error('Error loading task details:', error);
    }
}

// Load child tasks
async function loadChildTasks(parentTaskId) {
    try {
        const response = await apiClient.get(`/tasks?parentTaskId=${parentTaskId}`);
        if (response.ok) {
            return await response.json();
        }
    } catch (error) {
        console.error('Error loading child tasks:', error);
    }
    return [];
}

// Load linked tasks
async function loadLinkedTasks(taskId) {
    try {
        // For now, return empty - we'll implement task links later
        // const response = await apiClient.get(`/tasks/${taskId}/links`);
        return [];
    } catch (error) {
        console.error('Error loading linked tasks:', error);
    }
    return [];
}

// Load task comments
async function loadTaskComments(taskId) {
    try {
        const response = await apiClient.get(`/comments/task/${taskId}`);
        if (response.ok) {
            return await response.json();
        }
    } catch (error) {
        console.error('Error loading comments:', error);
    }
    return [];
}

// Render detail panel
function renderDetailPanel(task, childTasks, linkedTasks, comments) {
    const content = document.getElementById('detailPanelContent');
    const title = document.getElementById('detailPanelTitle');
    
    const taskId = task.taskId || `TASK-${task.id}`;
    if (title) title.textContent = `${taskId} - ${task.title || 'Untitled'}`;
    
    // Calculate assignee initials
    let assigneeInitials = 'UN';
    if (task.assignee && task.assignee.name) {
        const nameParts = task.assignee.name.trim().split(' ');
        if (nameParts.length >= 2) {
            assigneeInitials = (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase();
        } else if (nameParts.length === 1) {
            assigneeInitials = nameParts[0].substring(0, 2).toUpperCase();
        }
    }
    
    if (content) {
        content.innerHTML = `
            <div class="detail-section">
                <div class="detail-field">
                    <div class="detail-field-label">Status</div>
                    <select class="detail-select" id="taskStatusSelect" onchange="updateTaskStatus(${task.id}, this.value)">
                        <option value="todo" ${task.status === 'todo' ? 'selected' : ''}>Backlog</option>
                        <option value="progress" ${task.status === 'progress' ? 'selected' : ''}>In Progress</option>
                        <option value="review" ${task.status === 'review' ? 'selected' : ''}>In Review</option>
                        <option value="done" ${task.status === 'done' ? 'selected' : ''}>Done</option>
                    </select>
                </div>
                
                <div class="detail-field">
                    <div class="detail-field-label">Description</div>
                    <div class="detail-field-value">${escapeHtml(task.description || 'No description')}</div>
                </div>
                
                <div class="detail-field">
                    <div class="detail-field-label">Assignee</div>
                    <div class="detail-field-value" style="display: flex; align-items: center; gap: 8px;">
                        ${task.assignee ? `
                            <div class="assignee-avatar">${assigneeInitials}</div>
                            <span>${escapeHtml(task.assignee.name)}</span>
                        ` : '<span style="color: #6B778C;">Unassigned</span>'}
                    </div>
                </div>
                
                ${task.label ? `
                <div class="detail-field">
                    <div class="detail-field-label">Label</div>
                    <div class="detail-field-value">
                        <span style="padding: 2px 6px; background: #DFE1E6; border-radius: 3px; font-size: 12px;">${escapeHtml(task.label)}</span>
                    </div>
                </div>
                ` : ''}

                <div class="detail-field">
                    <div class="detail-field-label">Start Date</div>
                    <div class="detail-field-value">${task.startDate ? new Date(task.startDate).toLocaleDateString() : 'Not set'}</div>
                </div>

                <div class="detail-field">
                    <div class="detail-field-label">Due Date</div>
                    <div class="detail-field-value">${task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'Not set'}</div>
                </div>
            </div>
            
            <div class="detail-section">
                <div class="detail-section-title">Child tasks</div>
                ${childTasks.length > 0 ? `
                    <ul class="issue-list">
                        ${childTasks.map(child => `
                            <li class="issue-item" onclick="selectTask(${child.id})">
                                <span class="issue-id">${child.taskId || `TASK-${child.id}`}</span>
                                <span class="issue-title">${escapeHtml(child.title || 'Untitled')}</span>
                                <span class="issue-status">${getStatusLabel(child.status)}</span>
                            </li>
                        `).join('')}
                    </ul>
                ` : '<div style="color: #6B778C; font-size: 13px;">No child tasks</div>'}
            </div>
            
            <div class="detail-section">
                <div class="detail-section-title">Linked tasks</div>
                ${linkedTasks.length > 0 ? `
                    <ul class="issue-list">
                        ${linkedTasks.map(linked => `
                            <li class="issue-item" onclick="selectTask(${linked.id})">
                                <span class="issue-id">${linked.taskId || `TASK-${linked.id}`}</span>
                                <span class="issue-title">${escapeHtml(linked.title || 'Untitled')}</span>
                                <span class="issue-status">${getStatusLabel(linked.status)}</span>
                            </li>
                        `).join('')}
                    </ul>
                ` : '<div style="color: #6B778C; font-size: 13px;">No linked tasks</div>'}
            </div>
            
            <div class="detail-section">
                <div class="detail-section-title">Comments</div>
                <div id="taskCommentsList">
                    ${comments.length > 0 ? comments.map(comment => `
                        <div class="comment-item">
                            <div class="comment-author">${escapeHtml(comment.authorName || 'Unknown')}</div>
                            <div class="comment-text">${escapeHtml(comment.text)}</div>
                            <div class="comment-date">${new Date(comment.createdAt).toLocaleString()}</div>
                        </div>
                    `).join('') : '<div style="color: #6B778C; font-size: 13px; margin-bottom: 12px;">No comments yet</div>'}
                </div>
                <div class="comment-section">
                    <textarea class="comment-input" id="newCommentInput" placeholder="Add a comment..."></textarea>
                    <button class="comment-button" onclick="addComment(${task.id})">Post</button>
                </div>
            </div>
        `;
    }
}

// Escape HTML helper
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Update task status
async function updateTaskStatus(taskId, newStatus) {
    try {
        const response = await apiClient.put(`/tasks/${taskId}`, { status: newStatus });
        if (response.ok) {
            console.log('Task status updated');
            // Reload roadmap to reflect changes
            await loadRoadmapData();
            // Reload task details if this task is selected
            if (selectedTask && selectedTask.id === taskId) {
                await loadTaskDetails(taskId);
            }
        }
    } catch (error) {
        console.error('Error updating task status:', error);
    }
}

// Add comment
async function addComment(taskId) {
    const input = document.getElementById('newCommentInput');
    if (!input) return;
    
    const text = input.value.trim();
    if (!text) return;

    try {
        const user = authService.getCurrentUser();
        const response = await apiClient.post('/comments', {
            taskId: taskId,
            authorId: user ? user.id : null,
            text: text
        });
        
        if (response.ok) {
            input.value = '';
            // Reload task details to show new comment
            await loadTaskDetails(taskId);
        }
    } catch (error) {
        console.error('Error adding comment:', error);
    }
}

// Close detail panel
function closeDetailPanel() {
    const detailPanel = document.getElementById('detailPanel');
    if (detailPanel) {
        detailPanel.classList.remove('open');
    }
    selectedTask = null;
}

// Make functions globally available
window.setViewMode = setViewMode;
window.applyFilters = applyFilters;
window.scrollToToday = scrollToToday;
window.showCreateTaskModal = showCreateTaskModal;
window.loadRoadmapData = loadRoadmapData;
window.selectTask = selectTask;
window.updateTaskStatus = updateTaskStatus;
window.addComment = addComment;
window.closeDetailPanel = closeDetailPanel;

