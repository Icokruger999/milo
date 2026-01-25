// Roadmap functionality - JIRA-style roadmap with timeline

let roadmapTasks = [];
let subProjects = [];
let selectedTask = null;
let timelineMonths = [];
let currentDatePosition = 0;

// Initialize roadmap
document.addEventListener('DOMContentLoaded', async function() {
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
        const globalAvatar = document.getElementById('globalUserAvatar');
        const sidebarAvatar = document.getElementById('sidebarUserAvatar');
        if (globalAvatar) globalAvatar.textContent = initials;
        if (sidebarAvatar) sidebarAvatar.textContent = initials;
    }

    // Setup user menu dropdown
    setupUserMenu();

    // Load project info - try multiple sources
    let currentProject = projectSelector.getCurrentProject();
    
    // If not in memory, try localStorage
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
    
    // If still no project, try loading from API
    if (!currentProject && user) {
        try {
            await projectSelector.loadProjects(user.id);
            currentProject = projectSelector.getCurrentProject();
            
            // If still no project but we have projects, use the first one
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

    // Update UI with project info
    const projectNameEl = document.getElementById('projectName');
    const projectIconEl = document.getElementById('projectIcon');
    if (projectNameEl) projectNameEl.textContent = currentProject.name;
    if (projectIconEl) projectIconEl.textContent = (currentProject.key || currentProject.name).substring(0, 1).toUpperCase();

    // NOTE: Timeline initialization is handled by roadmap-gantt.js
    // Only initialize timeline if roadmap-gantt.js is NOT loaded
    if (typeof window.loadRoadmapData === 'undefined') {
        // Initialize simple timeline (fallback)
        initializeTimeline();
        
        // Load sub-projects and roadmap data
        await loadSubProjects();
        await loadRoadmap();
        
        // Auto-refresh every 30 seconds
        setInterval(async () => {
            await loadRoadmap();
        }, 30000);
    }
    // If roadmap-gantt.js is loaded, it will handle everything
});

// Setup user menu with dropdown
function setupUserMenu() {
    const userMenu = document.getElementById('globalUserAvatar');
    if (!userMenu) return;
    
    // Create dropdown menu
    const dropdown = document.createElement('div');
    dropdown.className = 'user-dropdown-menu';
    dropdown.style.cssText = 'display: none; position: fixed; background: white; border: 1px solid #DFE1E6; border-radius: 4px; box-shadow: 0 4px 8px rgba(9, 30, 66, 0.15); z-index: 1000; min-width: 160px;';
    dropdown.innerHTML = `
        <div style="padding: 8px 12px; cursor: pointer; font-size: 14px; color: #172B4D; transition: background 0.15s;" 
             onmouseover="this.style.background='#F4F5F7'" 
             onmouseout="this.style.background='white'"
             onclick="window.logout()">Logout</div>
    `;
    document.body.appendChild(dropdown);

    // Toggle dropdown on avatar click
    userMenu.addEventListener('click', function(e) {
        e.stopPropagation();
        const isVisible = dropdown.style.display === 'block';
        dropdown.style.display = isVisible ? 'none' : 'block';
        
        if (!isVisible) {
            const rect = userMenu.getBoundingClientRect();
            dropdown.style.top = (rect.bottom + 4) + 'px';
            dropdown.style.right = (window.innerWidth - rect.right) + 'px';
        }
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
        if (!userMenu.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.style.display = 'none';
        }
    });
}

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
    
    // Render month headers with explicit horizontal layout
    const monthsContainer = document.getElementById('timelineMonths') || document.getElementById('timelineHeader');
    if (monthsContainer) {
        // Create a wrapper div with horizontal flex layout
        const wrapperHTML = `<div style="display: flex; flex-direction: row; flex-wrap: nowrap; min-width: 100%; width: max-content;">${
            months.map(m => 
                `<div class="timeline-month" style="flex: 0 0 auto; min-width: 150px; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 12px; color: #42526E; border-right: 1px solid #DFE1E6; padding: 12px 0;">${m.label}</div>`
            ).join('')
        }</div>`;
        monthsContainer.innerHTML = wrapperHTML;
    }
    
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
    if (!timelineMonths || timelineMonths.length === 0) return;
    
    const now = new Date();
    const firstMonth = timelineMonths[0];
    const lastMonth = timelineMonths[timelineMonths.length - 1];
    
    const firstDate = new Date(firstMonth.date.getFullYear(), firstMonth.date.getMonth(), 1);
    const lastDate = new Date(lastMonth.date.getFullYear(), lastMonth.date.getMonth() + 1, 0);
    
    const totalDays = Math.ceil((lastDate - firstDate) / (1000 * 60 * 60 * 24));
    const daysFromStart = Math.ceil((now - firstDate) / (1000 * 60 * 60 * 24));
    
    const timelineElement = document.getElementById('timelineMonths') || document.getElementById('timelineHeader');
    if (!timelineElement) return;
    
    const timelineWidth = timelineElement.offsetWidth || 600; // Fallback width
    currentDatePosition = (daysFromStart / totalDays) * timelineWidth;
    
    const currentDateLine = document.getElementById('currentDateLine');
    if (currentDateLine) {
        currentDateLine.style.left = currentDatePosition + 'px';
        currentDateLine.style.position = 'absolute';
        currentDateLine.style.top = '0';
        currentDateLine.style.bottom = '0';
        currentDateLine.style.width = '2px';
        currentDateLine.style.background = '#FF5630';
        currentDateLine.style.zIndex = '10';
        currentDateLine.style.pointerEvents = 'none';
    }
}

// Load sub-projects from API
async function loadSubProjects() {
    try {
        const currentProject = projectSelector.getCurrentProject();
        if (!currentProject) {
            subProjects = [];
            return;
        }
        
        const response = await apiClient.get(`/subprojects?projectId=${currentProject.id}`);
        if (!response.ok) {
            subProjects = [];
            return;
        }

        subProjects = await response.json();
        console.log(`Loaded ${subProjects.length} sub-projects for roadmap`);
    } catch (error) {
        console.error('Error loading sub-projects:', error);
        subProjects = [];
    }
}

// Load roadmap tasks - optimized for fast loading
async function loadRoadmap() {
    try {
        const currentProject = projectSelector.getCurrentProject();
        if (!currentProject) {
            const epicList = document.getElementById('epicList');
            if (epicList) epicList.innerHTML = '<div style="color: #6B778C; font-size: 13px; padding: 16px; text-align: center;">Loading project...</div>';
            return;
        }

        // Show loading state
        const tasksTree = document.getElementById('tasksTree');
        const timelineRows = document.getElementById('timelineRows');
        if (tasksTree) tasksTree.innerHTML = '<div style="color: #6B778C; font-size: 13px; padding: 16px; text-align: center;">Loading tasks...</div>';
        if (timelineRows) timelineRows.innerHTML = '';

        const statusFilter = document.getElementById('statusFilter')?.value || '';
        let url = `/tasks?projectId=${currentProject.id}`;
        if (statusFilter) {
            url += `&status=${statusFilter}`;
        }

        const response = await apiClient.get(url);
        if (response.ok) {
            roadmapTasks = await response.json();
            console.log(`✓ Roadmap loaded: ${roadmapTasks.length} tasks`);
            renderRoadmap();
        } else {
            console.error('Failed to load roadmap tasks:', response.status);
            const tasksTree = document.getElementById('tasksTree');
            if (tasksTree) tasksTree.innerHTML = '<div style="color: #DE350B; padding: 16px; text-align: center;">Failed to load tasks. <button onclick="loadRoadmap()" style="margin-top: 8px; padding: 6px 12px; background: #0052CC; color: white; border: none; border-radius: 3px; cursor: pointer;">Retry</button></div>';
        }
    } catch (error) {
        console.error('Error loading roadmap:', error);
        const tasksTree = document.getElementById('tasksTree');
        if (tasksTree) tasksTree.innerHTML = '<div style="color: #DE350B; padding: 16px; text-align: center;">Error loading roadmap. <button onclick="loadRoadmap()" style="margin-top: 8px; padding: 6px 12px; background: #0052CC; color: white; border: none; border-radius: 3px; cursor: pointer;">Retry</button></div>';
    }
}

// Render roadmap
function renderRoadmap() {
    renderEpicList();
    renderTimeline();
}

// Render epic list (left column) with sub-project grouping
function renderEpicList() {
    const tasksTree = document.getElementById('tasksTree');
    const timelineRows = document.getElementById('timelineRows');
    
    if (roadmapTasks.length === 0) {
        if (tasksTree) tasksTree.innerHTML = '<div style="color: #6B778C; font-size: 13px; padding: 16px; text-align: center;">No tasks found for this project</div>';
        if (timelineRows) timelineRows.innerHTML = '<div style="color: #6B778C; padding: 24px; text-align: center;">No tasks to display</div>';
        return;
    }

    if (tasksTree) {
        // Group tasks by sub-project
        const grouped = {};
        const noSubProject = [];
        
        roadmapTasks.forEach(task => {
            if (task.subProjectId) {
                if (!grouped[task.subProjectId]) {
                    const subProject = subProjects.find(sp => sp.id === task.subProjectId);
                    grouped[task.subProjectId] = {
                        name: subProject ? subProject.name : 'Unknown Sub-Project',
                        tasks: []
                    };
                }
                grouped[task.subProjectId].tasks.push(task);
            } else {
                noSubProject.push(task);
            }
        });
        
        let html = '';
        
        // Render tasks without sub-project first
        noSubProject.forEach(task => {
            const isSelected = selectedTask && selectedTask.id === task.id;
            const taskId = task.taskId || `TASK-${task.id}`;
            html += `
            <div class="epic-item ${isSelected ? 'selected' : ''}" 
                 onclick="selectTask(${task.id})"
                 style="padding: 8px 12px; cursor: pointer; border-radius: 3px; margin-bottom: 4px; ${isSelected ? 'background: #DEEBFF;' : ''}">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <div class="epic-icon" style="width: 8px; height: 8px; border-radius: 2px; background: #0052CC;"></div>
                    <div style="flex: 1; font-size: 13px; color: #172B4D;">${escapeHtml(task.title || 'Untitled Task')} <span style="color: #6B778C; font-size: 11px;">(${taskId})</span></div>
                </div>
            </div>
            `;
        });
        
        // Render sub-project groups
        Object.keys(grouped).forEach(subProjectId => {
            const group = grouped[subProjectId];
            html += `
                <div class="subproject-group" style="margin: 12px 0;">
                    <div class="subproject-header" style="display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: #DEEBFF; border-left: 3px solid #0052CC; font-weight: 600; font-size: 13px; color: #0052CC; margin-bottom: 4px;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                        </svg>
                        <span style="flex: 1;">${escapeHtml(group.name)}</span>
                        <span style="background: #0052CC; color: white; padding: 2px 8px; border-radius: 10px; font-size: 11px;">${group.tasks.length}</span>
                    </div>
            `;
            
            group.tasks.forEach(task => {
                const isSelected = selectedTask && selectedTask.id === task.id;
                const taskId = task.taskId || `TASK-${task.id}`;
                html += `
                <div class="epic-item ${isSelected ? 'selected' : ''}" 
                     onclick="selectTask(${task.id})"
                     style="padding: 8px 12px 8px 32px; cursor: pointer; border-radius: 3px; margin-bottom: 4px; background: #F9FAFB; ${isSelected ? 'background: #DEEBFF;' : ''}">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <div class="epic-icon" style="width: 8px; height: 8px; border-radius: 2px; background: #0052CC;"></div>
                        <div style="flex: 1; font-size: 13px; color: #172B4D;">${escapeHtml(task.title || 'Untitled Task')} <span style="color: #6B778C; font-size: 11px;">(${taskId})</span></div>
                    </div>
                </div>
                `;
            });
            
            html += '</div>';
        });
        
        tasksTree.innerHTML = html;
    }
}

// Escape HTML helper
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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
    const timelineElement = document.getElementById('timelineMonths') || document.getElementById('timelineHeader');
    const timelineWidth = timelineElement ? timelineElement.offsetWidth : 600;
    
    if (!timelineMonths || timelineMonths.length === 0) {
        if (timelineRows) timelineRows.innerHTML = '<div style="color: #6B778C; padding: 24px; text-align: center;">Timeline not initialized</div>';
        return;
    }
    
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
        const barWidth = Math.max(100, (duration / totalDays) * timelineWidth);
        
        const taskId = task.taskId || `TASK-${task.id}`;
        const truncatedTitle = (task.title || 'Untitled').length > 30 
            ? (task.title || 'Untitled').substring(0, 30) + '...' 
            : (task.title || 'Untitled');
        
        // Get status color
        const statusColors = {
            'todo': '#6B778C',
            'progress': '#0052CC',
            'review': '#FFAB00',
            'done': '#36B37E'
        };
        const barColor = statusColors[task.status] || '#6B778C';
        
        return `
            <div class="timeline-row" style="position: relative; min-height: 40px; margin-bottom: 8px; padding: 8px 0;">
                <div class="timeline-bar" 
                     style="position: absolute; left: ${left}px; width: ${barWidth}px; height: 24px; background: ${barColor}; color: white; padding: 4px 8px; border-radius: 3px; cursor: pointer; font-size: 12px; line-height: 16px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; z-index: 5;"
                     onclick="selectTask(${task.id})"
                     title="${escapeHtml(task.title || 'Untitled')}">
                    ${escapeHtml(truncatedTitle)}
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

// Render detail panel with edit functionality
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
    
    // Format dates for input fields
    const formatDateForInput = (date) => {
        if (!date) return '';
        const d = new Date(date);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };
    
    content.innerHTML = `
        <div class="detail-section">
            <div class="detail-field">
                <div class="detail-field-label">Title</div>
                <input type="text" class="detail-input" id="taskTitleInput" value="${escapeHtml(task.title || '')}" onchange="updateTaskField(${task.id}, 'title', this.value)" />
            </div>
            
            <div class="detail-field">
                <div class="detail-field-label">Status</div>
                <select class="detail-select" id="taskStatusSelect" onchange="updateTaskField(${task.id}, 'status', this.value)">
                    <option value="todo" ${task.status === 'todo' ? 'selected' : ''}>Backlog</option>
                    <option value="progress" ${task.status === 'progress' ? 'selected' : ''}>In Progress</option>
                    <option value="review" ${task.status === 'review' ? 'selected' : ''}>In Review</option>
                    <option value="done" ${task.status === 'done' ? 'selected' : ''}>Done</option>
                </select>
            </div>
            
            <div class="detail-field">
                <div class="detail-field-label">Sub-Project</div>
                <select class="detail-select" id="taskSubProjectSelect" onchange="updateTaskField(${task.id}, 'subProjectId', this.value)">
                    <option value="">No Sub-Project</option>
                    ${subProjects.map(sp => `
                        <option value="${sp.id}" ${task.subProjectId === sp.id ? 'selected' : ''}>${escapeHtml(sp.name)}</option>
                    `).join('')}
                </select>
            </div>
            
            <div class="detail-field">
                <div class="detail-field-label">Description</div>
                <textarea class="detail-textarea" id="taskDescriptionInput" onchange="updateTaskField(${task.id}, 'description', this.value)" rows="4">${escapeHtml(task.description || '')}</textarea>
            </div>
            
            <div class="detail-field">
                <div class="detail-field-label">Start Date</div>
                <input type="date" class="detail-input" id="taskStartDateInput" value="${formatDateForInput(task.startDate)}" onchange="updateTaskField(${task.id}, 'startDate', this.value)" />
            </div>
            
            <div class="detail-field">
                <div class="detail-field-label">Due Date</div>
                <input type="date" class="detail-input" id="taskDueDateInput" value="${formatDateForInput(task.dueDate)}" onchange="updateTaskField(${task.id}, 'dueDate', this.value)" />
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
            <div class="detail-section-title">Child tasks</div>
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
            ` : '<div style="color: #6B778C; font-size: 13px;">No child tasks</div>'}
        </div>
        
        <div class="detail-section">
            <div class="detail-section-title">Linked tasks</div>
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
            ` : '<div style="color: #6B778C; font-size: 13px;">No linked tasks</div>'}
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

// Update task field (generic function for all fields)
async function updateTaskField(taskId, field, value) {
    try {
        const updateData = {};
        
        // Handle different field types
        if (field === 'subProjectId') {
            updateData[field] = value ? parseInt(value) : null;
        } else if (field === 'startDate' || field === 'dueDate') {
            updateData[field] = value ? new Date(value).toISOString() : null;
        } else {
            updateData[field] = value;
        }
        
        console.log('Updating task field:', field, value, updateData);
        
        const response = await apiClient.put(`/tasks/${taskId}`, updateData);
        if (response.ok) {
            console.log('Task updated successfully');
            // Reload roadmap to reflect changes
            await loadRoadmap();
            // Reload task details if this task is selected
            if (selectedTask && selectedTask.id === taskId) {
                await loadTaskDetails(taskId);
            }
        } else {
            console.error('Failed to update task:', response.status);
            alert('Failed to update task. Please try again.');
        }
    } catch (error) {
        console.error('Error updating task field:', error);
        alert('Error updating task. Please try again.');
    }
}

// Update task status (kept for backward compatibility)
async function updateTaskStatus(taskId, newStatus) {
    await updateTaskField(taskId, 'status', newStatus);
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
window.updateTaskField = updateTaskField;
window.updateTaskStatus = updateTaskStatus;
window.addComment = addComment;
window.closeDetailPanel = closeDetailPanel;
window.loadRoadmap = loadRoadmap;

