// Roadmap functionality - JIRA-style roadmap with timeline

let roadmapTasks = [];
let selectedTask = null;
let timelineMonths = [];
let currentDatePosition = 0;

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
    } else {
        window.location.href = 'milo-select-project.html';
        return;
    }

    // Initialize timeline
    initializeTimeline();
    
    // Load roadmap data
    loadRoadmap();
});

// Initialize timeline with months
function initializeTimeline() {
    const now = new Date();
    const months = [];
    
    // Show 6 months: 3 past, current, 2 future
    for (let i = -3; i <= 2; i++) {
        const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
        months.push({
            date: date,
            label: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toUpperCase(),
            startDay: getDayOfYear(date),
            daysInMonth: new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
        });
    }
    
    timelineMonths = months;
    
    // Render month headers
    const monthsContainer = document.getElementById('timelineMonths');
    monthsContainer.innerHTML = months.map(m => 
        `<div class="timeline-month">${m.label}</div>`
    ).join('');
    
    // Calculate current date position
    updateCurrentDateLine();
}

// Get day of year (1-365)
function getDayOfYear(date) {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date - start;
    return Math.floor(diff / (1000 * 60 * 60 * 24));
}

// Update current date line position
function updateCurrentDateLine() {
    const now = new Date();
    const firstMonth = timelineMonths[0];
    const lastMonth = timelineMonths[timelineMonths.length - 1];
    
    const firstDate = new Date(firstMonth.date.getFullYear(), firstMonth.date.getMonth(), 1);
    const lastDate = new Date(lastMonth.date.getFullYear(), lastMonth.date.getMonth() + 1, 0);
    
    const totalDays = Math.ceil((lastDate - firstDate) / (1000 * 60 * 60 * 24));
    const daysFromStart = Math.ceil((now - firstDate) / (1000 * 60 * 60 * 24));
    
    const timelineWidth = document.getElementById('timelineMonths').offsetWidth;
    currentDatePosition = (daysFromStart / totalDays) * timelineWidth;
    
    const currentDateLine = document.getElementById('currentDateLine');
    if (currentDateLine) {
        currentDateLine.style.left = currentDatePosition + 'px';
    }
}

// Load roadmap tasks
async function loadRoadmap() {
    try {
        const currentProject = projectSelector.getCurrentProject();
        if (!currentProject) {
            window.location.href = 'milo-select-project.html';
            return;
        }

        const statusFilter = document.getElementById('statusFilter')?.value || '';
        let url = `/tasks?projectId=${currentProject.id}`;
        if (statusFilter) {
            url += `&status=${statusFilter}`;
        }

        const response = await apiClient.get(url);
        if (response.ok) {
            roadmapTasks = await response.json();
            renderRoadmap();
        } else {
            console.error('Failed to load roadmap tasks');
            document.getElementById('epicList').innerHTML = '<div style="color: #DE350B;">Failed to load tasks</div>';
        }
    } catch (error) {
        console.error('Error loading roadmap:', error);
        document.getElementById('epicList').innerHTML = '<div style="color: #DE350B;">Error loading roadmap</div>';
    }
}

// Render roadmap
function renderRoadmap() {
    renderEpicList();
    renderTimeline();
}

// Render epic list (left column)
function renderEpicList() {
    const epicList = document.getElementById('epicList');
    
    if (roadmapTasks.length === 0) {
        epicList.innerHTML = '<div style="color: #6B778C; font-size: 13px; padding: 16px; text-align: center;">No tasks found</div>';
        return;
    }

    epicList.innerHTML = roadmapTasks.map(task => `
        <div class="epic-item ${selectedTask && selectedTask.id === task.id ? 'selected' : ''}" 
             onclick="selectTask(${task.id})">
            <div class="epic-icon"></div>
            <div class="epic-title">${task.title || 'Untitled Task'}</div>
        </div>
    `).join('');
}

// Render timeline with bars
function renderTimeline() {
    const timelineRows = document.getElementById('timelineRows');
    const timelineBody = document.getElementById('timelineBody');
    
    if (roadmapTasks.length === 0) {
        timelineRows.innerHTML = '<div style="color: #6B778C; padding: 24px; text-align: center;">No tasks to display</div>';
        return;
    }

    // Calculate timeline width
    const timelineWidth = document.getElementById('timelineMonths').offsetWidth;
    const firstMonth = timelineMonths[0];
    const lastMonth = timelineMonths[timelineMonths.length - 1];
    const firstDate = new Date(firstMonth.date.getFullYear(), firstMonth.date.getMonth(), 1);
    const lastDate = new Date(lastMonth.date.getFullYear(), lastMonth.date.getMonth() + 1, 0);
    const totalDays = Math.ceil((lastDate - firstDate) / (1000 * 60 * 60 * 24));

    timelineRows.innerHTML = roadmapTasks.map((task, index) => {
        // Calculate bar position and width
        const startDate = task.startDate ? new Date(task.startDate) : (task.createdAt ? new Date(task.createdAt) : new Date());
        const endDate = task.dueDate ? new Date(task.dueDate) : new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000); // Default 30 days
        
        const daysFromStart = Math.max(0, Math.ceil((startDate - firstDate) / (1000 * 60 * 60 * 24)));
        const duration = Math.max(1, Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)));
        
        const left = (daysFromStart / totalDays) * timelineWidth;
        const width = (duration / totalDays) * timelineWidth;
        
        const taskId = task.taskId || `TASK-${task.id}`;
        const truncatedTitle = (task.title || 'Untitled').length > 30 
            ? (task.title || 'Untitled').substring(0, 30) + '...' 
            : (task.title || 'Untitled');
        
        return `
            <div class="timeline-row" style="min-height: 48px;">
                <div class="timeline-bar" 
                     style="left: ${left}px; width: ${width}px;"
                     onclick="selectTask(${task.id})"
                     title="${task.title || 'Untitled'}">
                    ${truncatedTitle}
                </div>
            </div>
        `;
    }).join('');
}

// Select task and show detail panel
async function selectTask(taskId) {
    const task = roadmapTasks.find(t => t.id === taskId);
    if (!task) return;

    selectedTask = task;
    
    // Update epic list selection
    renderEpicList();
    
    // Load full task details
    await loadTaskDetails(taskId);
    
    // Show detail panel
    const detailPanel = document.getElementById('detailPanel');
    detailPanel.classList.add('open');
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
    title.textContent = `${taskId} - ${task.title || 'Untitled'}`;
    
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
                <div class="detail-field-value">${task.description || 'No description'}</div>
            </div>
            
            <div class="detail-field">
                <div class="detail-field-label">Assignee</div>
                <div class="detail-field-value" style="display: flex; align-items: center; gap: 8px;">
                    ${task.assignee ? `
                        <div class="assignee-avatar">${assigneeInitials}</div>
                        <span>${task.assignee.name}</span>
                    ` : '<span style="color: #6B778C;">Unassigned</span>'}
                </div>
            </div>
            
            ${task.label ? `
            <div class="detail-field">
                <div class="detail-field-label">Label</div>
                <div class="detail-field-value">
                    <span style="padding: 2px 6px; background: #DFE1E6; border-radius: 3px; font-size: 12px;">${task.label}</span>
                </div>
            </div>
            ` : ''}
        </div>
        
        <div class="detail-section">
            <div class="detail-section-title">Child issues</div>
            ${childTasks.length > 0 ? `
                <ul class="issue-list">
                    ${childTasks.map(child => `
                        <li class="issue-item" onclick="selectTask(${child.id})">
                            <span class="issue-id">${child.taskId || `TASK-${child.id}`}</span>
                            <span class="issue-title">${child.title || 'Untitled'}</span>
                            <span class="issue-status">${getStatusLabel(child.status)}</span>
                        </li>
                    `).join('')}
                </ul>
            ` : '<div style="color: #6B778C; font-size: 13px;">No child issues</div>'}
        </div>
        
        <div class="detail-section">
            <div class="detail-section-title">Linked issues</div>
            ${linkedTasks.length > 0 ? `
                <ul class="issue-list">
                    ${linkedTasks.map(linked => `
                        <li class="issue-item" onclick="selectTask(${linked.id})">
                            <span class="issue-id">${linked.taskId || `TASK-${linked.id}`}</span>
                            <span class="issue-title">${linked.title || 'Untitled'}</span>
                            <span class="issue-status">${getStatusLabel(linked.status)}</span>
                        </li>
                    `).join('')}
                </ul>
            ` : '<div style="color: #6B778C; font-size: 13px;">No linked issues</div>'}
        </div>
        
        <div class="detail-section">
            <div class="detail-section-title">Comments</div>
            <div id="taskCommentsList">
                ${comments.length > 0 ? comments.map(comment => `
                    <div class="comment-item">
                        <div class="comment-author">${comment.authorName || 'Unknown'}</div>
                        <div class="comment-text">${comment.text}</div>
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

// Update task status
async function updateTaskStatus(taskId, newStatus) {
    try {
        const response = await apiClient.put(`/tasks/${taskId}`, { status: newStatus });
        if (response.ok) {
            // Reload roadmap
            await loadRoadmap();
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
    detailPanel.classList.remove('open');
    selectedTask = null;
    renderEpicList();
}

// Show create task modal (from board.js)
function showCreateTaskModal() {
    if (typeof window.showCreateTaskModal === 'function') {
        window.showCreateTaskModal('todo');
    } else {
        window.location.href = 'milo-board.html';
    }
}

// Make functions globally available
window.selectTask = selectTask;
window.updateTaskStatus = updateTaskStatus;
window.addComment = addComment;
window.closeDetailPanel = closeDetailPanel;
window.loadRoadmap = loadRoadmap;

