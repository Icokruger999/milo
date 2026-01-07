// Backlog Page Functionality
let backlogTasks = [];
let hasUnsavedChanges = false;
let originalTaskStates = {};

// Initialize backlog page
document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    if (!authService.isAuthenticated()) {
        window.location.href = 'milo-login.html';
        return;
    }

    // Check password change requirement
    if (authService.requiresPasswordChange()) {
        const user = authService.getCurrentUser();
        if (user && user.email) {
            window.location.href = `milo-change-password.html?email=${encodeURIComponent(user.email)}`;
            return;
        }
    }

    // Setup project selector
    setupProjectSelector();
    
    // Set user avatars
    const user = authService.getCurrentUser();
    if (user) {
        const userName = user.name || user.email || 'User';
        let initials = 'U';
        const nameParts = userName.trim().split(' ');
        if (nameParts.length >= 2) {
            initials = (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase();
        } else if (nameParts.length === 1) {
            initials = nameParts[0].substring(0, 2).toUpperCase();
        }
        
        const userAvatarEl = document.getElementById('globalUserAvatar');
        const sidebarUserAvatarEl = document.getElementById('sidebarUserAvatar');
        if (userAvatarEl) userAvatarEl.textContent = initials;
        if (sidebarUserAvatarEl) sidebarUserAvatarEl.textContent = initials;
    }

    // Load backlog tasks after a short delay to ensure project is loaded
    setTimeout(() => {
        loadBacklogTasks();
    }, 500);

    // Setup user menu
    setupUserMenu();
});

function setupProjectSelector() {
    const user = authService.getCurrentUser();
    if (!user || !user.id) {
        window.location.href = 'milo-login.html';
        return;
    }

    projectSelector.loadProjects(user.id).then(projects => {
        const currentProject = projectSelector.getCurrentProject();
        if (!currentProject && projects.length > 0) {
            projectSelector.setCurrentProject(projects[0]);
        }

        const projectNameEl = document.getElementById('projectName');
        const projectIconEl = document.getElementById('projectIcon');
        const displayProject = projectSelector.getCurrentProject() || projects[0];
        
        if (projectNameEl && displayProject) {
            projectNameEl.textContent = displayProject.name;
        }
        if (projectIconEl && displayProject) {
            projectIconEl.textContent = (displayProject.key || displayProject.name).substring(0, 1).toUpperCase();
        }
    });
}

function setupUserMenu() {
    const userMenu = document.getElementById('userMenu');
    const globalUserAvatar = document.getElementById('globalUserAvatar');
    
    if (globalUserAvatar) {
        globalUserAvatar.addEventListener('click', function(e) {
            e.stopPropagation();
            if (userMenu) {
                userMenu.classList.toggle('show');
            }
        });
    }

    document.addEventListener('click', function(e) {
        if (userMenu && !userMenu.contains(e.target) && !globalUserAvatar.contains(e.target)) {
            userMenu.classList.remove('show');
        }
    });
}

function toggleUserMenu() {
    const userMenu = document.getElementById('userMenu');
    if (userMenu) {
        userMenu.classList.toggle('show');
    }
}

function logout() {
    if (typeof authService !== 'undefined' && authService.logout) {
        authService.logout();
    } else {
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = 'milo-login.html';
    }
}

async function loadBacklogTasks() {
    try {
        const currentProject = projectSelector.getCurrentProject();
        if (!currentProject) {
            window.location.href = 'milo-select-project.html';
            return;
        }

        const filter = document.getElementById('backlogFilter')?.value || 'backlog';
        // Get all tasks for the project (no status filter on API)
        let queryUrl = `/tasks?projectId=${currentProject.id}`;

        const response = await apiClient.get(queryUrl);
        if (response.ok) {
            let apiTasks = await response.json();
            
            // Filter tasks based on selected filter
            if (filter === 'backlog') {
                // Show only backlog tasks (todo, backlog - not in progress, review, or done)
                const beforeFilter = apiTasks.length;
                apiTasks = apiTasks.filter(task => {
                    const status = task.status?.toLowerCase() || '';
                    return status === 'todo' || 
                           status === 'backlog' ||
                           (status !== 'progress' && 
                            status !== 'in-progress' && 
                            status !== 'review' && 
                            status !== 'in-review' && 
                            status !== 'done' && 
                            status !== 'completed');
                });
                console.log(`Filtered to backlog: ${beforeFilter} -> ${apiTasks.length} tasks`);
            } else if (filter === 'all') {
                // Show backlog (todo/backlog) and in-progress tasks
                const beforeFilter = apiTasks.length;
                apiTasks = apiTasks.filter(task => {
                    const status = task.status?.toLowerCase() || '';
                    return status === 'todo' || 
                           status === 'backlog' || 
                           status === 'progress' || 
                           status === 'in-progress';
                });
                console.log(`Filtered to all: ${beforeFilter} -> ${apiTasks.length} tasks`);
            }

            backlogTasks = apiTasks.map(task => ({
                id: task.id,
                taskId: task.taskId || `TASK-${task.id}`,
                title: task.title,
                description: task.description,
                status: task.status,
                label: task.label || 'accounts',
                assigneeId: task.assigneeId,
                assignee: task.assignee ? {
                    id: task.assignee.id,
                    name: task.assignee.name,
                    email: task.assignee.email
                } : null,
                priority: task.priority || 0,
                dueDate: task.dueDate,
                productId: task.productId
            }));

            // Store original states for change tracking
            originalTaskStates = {};
            backlogTasks.forEach(task => {
                originalTaskStates[task.id] = JSON.parse(JSON.stringify(task));
            });

            renderBacklog();
        } else {
            const errorText = await response.text().catch(() => 'Unknown error');
            console.error('Failed to load backlog tasks: API returned', response.status, errorText);
            const container = document.getElementById('backlogList');
            if (container) {
                container.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">⚠️</div>
                        <div class="empty-state-text">Failed to load backlog tasks (${response.status})</div>
                    </div>
                `;
            }
        }
    } catch (error) {
        console.error('Failed to load backlog tasks:', error);
        const container = document.getElementById('backlogList');
        if (container) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">⚠️</div>
                    <div class="empty-state-text">Failed to load backlog tasks: ${error.message || 'Unknown error'}</div>
                </div>
            `;
        }
    }
}

function renderBacklog() {
    const container = document.getElementById('backlogList');
    if (!container) {
        console.error('Backlog list container not found');
        return;
    }

    console.log('Rendering backlog with', backlogTasks.length, 'tasks');
    
    if (backlogTasks.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📋</div>
                <div class="empty-state-text">No tasks in backlog. Click "Create Task" to add one.</div>
            </div>
        `;
        return;
    }

    container.innerHTML = backlogTasks.map(task => {
        const assigneeInitials = task.assignee 
            ? (task.assignee.name || 'UN').substring(0, 2).toUpperCase()
            : 'UN';
        
        const priorityLabels = ['Low', 'Medium', 'High'];
        const priorityLabel = priorityLabels[task.priority] || 'Low';
        
        return `
            <div class="backlog-item" onclick="openTaskModal(${task.id})">
                <div class="backlog-item-header">
                    <div class="backlog-item-icon"></div>
                    <div class="backlog-item-content">
                        <div class="backlog-item-title">${task.title}</div>
                        <div class="backlog-item-meta">
                            <span class="backlog-item-label" style="background: #DFE1E6; color: #42526E;">${(task.label || 'accounts').toUpperCase()}</span>
                            <span>${task.taskId}</span>
                            <span>•</span>
                            <span>Priority: ${priorityLabel}</span>
                            ${task.dueDate ? `<span>•</span><span>Due: ${new Date(task.dueDate).toLocaleDateString()}</span>` : ''}
                        </div>
                        ${task.description ? `<div style="margin-top: 8px; font-size: 13px; color: #6B778C;">${task.description.substring(0, 100)}${task.description.length > 100 ? '...' : ''}</div>` : ''}
                    </div>
                </div>
                <div class="backlog-item-footer">
                    <div class="backlog-item-actions">
                        <select onchange="changeTaskStatus(${task.id}, this.value)" onclick="event.stopPropagation()" style="padding: 4px 8px; border: 1px solid #DFE1E6; border-radius: 3px; font-size: 12px;">
                            <option value="todo" ${task.status === 'todo' || task.status === 'backlog' ? 'selected' : ''}>Backlog</option>
                            <option value="progress" ${task.status === 'progress' || task.status === 'in-progress' ? 'selected' : ''}>In Progress</option>
                        </select>
                        <select onchange="changeTaskAssignee(${task.id}, this.value)" onclick="event.stopPropagation()" style="padding: 4px 8px; border: 1px solid #DFE1E6; border-radius: 3px; font-size: 12px;">
                            <option value="">Unassigned</option>
                        </select>
                    </div>
                    <div class="backlog-item-assignee" title="${task.assignee ? task.assignee.name : 'Unassigned'}">${assigneeInitials}</div>
                </div>
            </div>
        `;
    }).join('');

    // Populate assignee dropdowns
    loadAssigneesForDropdowns();
}

async function loadAssigneesForDropdowns() {
    try {
        const response = await apiClient.get('/auth/users');
        if (response.ok) {
            const users = await response.json();
            const assigneeSelects = document.querySelectorAll('.backlog-item-actions select:last-child');
            assigneeSelects.forEach(select => {
                const taskId = parseInt(select.getAttribute('onchange').match(/\d+/)[0]);
                const currentAssigneeId = backlogTasks.find(t => t.id === taskId)?.assigneeId;
                
                users.forEach(user => {
                    const option = document.createElement('option');
                    option.value = user.id;
                    option.textContent = user.name;
                    if (user.id === currentAssigneeId) {
                        option.selected = true;
                    }
                    select.appendChild(option);
                });
            });
        }
    } catch (error) {
        console.error('Failed to load users:', error);
    }
}

function changeTaskStatus(taskId, newStatus) {
    const task = backlogTasks.find(t => t.id === taskId);
    if (!task) return;

    const originalStatus = originalTaskStates[taskId]?.status;
    task.status = newStatus;
    
    // Mark as changed if different from original
    if (originalStatus !== newStatus) {
        hasUnsavedChanges = true;
        updateSaveButton();
    }
}

function changeTaskAssignee(taskId, assigneeId) {
    const task = backlogTasks.find(t => t.id === taskId);
    if (!task) return;

    const originalAssigneeId = originalTaskStates[taskId]?.assigneeId;
    task.assigneeId = assigneeId ? parseInt(assigneeId) : null;
    
    // Load assignee details if assigned
    if (task.assigneeId) {
        loadAssigneeDetails(task, task.assigneeId);
    } else {
        task.assignee = null;
    }
    
    // Mark as changed if different from original
    if (originalAssigneeId !== task.assigneeId) {
        hasUnsavedChanges = true;
        updateSaveButton();
    }
    
    // Re-render to update assignee avatar
    renderBacklog();
}

async function loadAssigneeDetails(task, assigneeId) {
    try {
        const response = await apiClient.get(`/auth/users`);
        if (response.ok) {
            const users = await response.json();
            const assignee = users.find(u => u.id === assigneeId);
            if (assignee) {
                task.assignee = assignee;
            }
        }
    } catch (error) {
        console.error('Failed to load assignee details:', error);
    }
}

function updateSaveButton() {
    const saveButton = document.getElementById('saveButton');
    if (saveButton) {
        if (hasUnsavedChanges) {
            saveButton.classList.add('has-changes');
        } else {
            saveButton.classList.remove('has-changes');
        }
    }
}

async function saveAllChanges() {
    if (!hasUnsavedChanges) return;

    const saveButton = document.getElementById('saveButton');
    if (saveButton) {
        saveButton.disabled = true;
        saveButton.textContent = 'Saving...';
    }

    try {
        const changedTasks = backlogTasks.filter(task => {
            const original = originalTaskStates[task.id];
            return original && (
                original.status !== task.status ||
                original.assigneeId !== task.assigneeId
            );
        });

        // Save all changed tasks
        const savePromises = changedTasks.map(task => {
            return apiClient.put(`/tasks/${task.id}`, {
                status: task.status,
                assigneeId: task.assigneeId
            });
        });

        await Promise.all(savePromises);

        // Update original states
        backlogTasks.forEach(task => {
            originalTaskStates[task.id] = JSON.parse(JSON.stringify(task));
        });

        hasUnsavedChanges = false;
        updateSaveButton();

        if (saveButton) {
            saveButton.disabled = false;
            saveButton.textContent = 'Save Changes';
        }

        // Show success message
        alert('All changes saved successfully!');
    } catch (error) {
        console.error('Failed to save changes:', error);
        alert('Failed to save some changes. Please try again.');
        
        if (saveButton) {
            saveButton.disabled = false;
            saveButton.textContent = 'Save Changes';
        }
    }
}

function applyBacklogFilter() {
    loadBacklogTasks();
}

function openTaskModal(taskId) {
    const task = backlogTasks.find(t => t.id === taskId);
    if (task && typeof showTaskModal === 'function') {
        showTaskModal(task.status || 'todo', task);
    }
}

function showCreateTaskModal() {
    if (typeof window.showCreateTaskModal === 'function') {
        // Create task with 'backlog' status when created from backlog page
        // Store a flag to reload backlog after task creation
        window.location.hash = 'backlog';
        window.showCreateTaskModal('backlog');
        
        // Override the task creation success handler to reload backlog
        const originalHandler = window.handleTaskSubmit;
        if (originalHandler) {
            // The task creation will be handled by board.js, but we'll reload backlog after
            setTimeout(() => {
                if (window.location.hash === '#backlog' || window.location.pathname.includes('backlog')) {
                    loadBacklogTasks();
                }
            }, 1000);
        }
    }
}

// Make functions globally accessible
window.changeTaskStatus = changeTaskStatus;
window.changeTaskAssignee = changeTaskAssignee;
window.saveAllChanges = saveAllChanges;
window.applyBacklogFilter = applyBacklogFilter;
window.openTaskModal = openTaskModal;
window.showCreateTaskModal = showCreateTaskModal;
window.logout = logout;
window.toggleUserMenu = toggleUserMenu;

