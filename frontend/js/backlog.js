// Backlog Page Functionality
console.log('Backlog.js script loaded');

let backlogTasks = []; // Currently displayed tasks (may be filtered)
let allTasks = []; // All tasks loaded from API (unfiltered)
let hasUnsavedChanges = false;
let originalTaskStates = {};

// Performance: Cache data for 30 seconds (like dashboard)
let backlogDataCache = {
    tasks: null,
    timestamp: 0,
    duration: 30000 // 30 seconds
};

// Performance: Cache users and products for 5 minutes (like board)
let backlogUsersProductsCache = {
    users: null,
    products: null,
    timestamp: 0
};
const BACKLOG_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Initialize backlog page
document.addEventListener('DOMContentLoaded', function() {
    console.log('Backlog page DOMContentLoaded fired');
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
        console.log('Starting to load backlog tasks...');
        try {
            loadBacklogTasks();
        } catch (error) {
            console.error('Error in loadBacklogTasks:', error);
            const container = document.getElementById('backlogList');
            if (container) {
                container.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">⚠️</div>
                        <div class="empty-state-text">Error loading backlog: ${error.message}</div>
                    </div>
                `;
            }
        }
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
        console.log('Loading backlog tasks...');
        const currentProject = projectSelector.getCurrentProject();
        if (!currentProject) {
            console.log('No project selected, redirecting to project selector');
            window.location.href = 'milo-select-project.html';
            return;
        }

        console.log('Current project:', currentProject.id, currentProject.name);
        const filterSelect = document.getElementById('backlogFilter');
        const filterValue = filterSelect ? filterSelect.value : 'all';
        console.log('Current filter value:', filterValue);
        
        // Check cache first (performance optimization)
        const now = Date.now();
        if (backlogDataCache.tasks && (now - backlogDataCache.timestamp < backlogDataCache.duration)) {
            console.log('Using cached backlog data');
            let apiTasks = backlogDataCache.tasks;
            
            // Ensure apiTasks is an array (handle both old and new cache formats)
            if (!Array.isArray(apiTasks)) {
                apiTasks = apiTasks.tasks || [];
            }
            
            // Map cached tasks
            allTasks = apiTasks.map(task => ({
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

            // Apply filter
            applyCurrentFilter();
            return;
        }
        
        // Get all tasks for the project (no status filter on API)
        let queryUrl = `/tasks?projectId=${currentProject.id}`;
        console.log('Fetching tasks from:', queryUrl);

        const response = await apiClient.get(queryUrl);
        if (response.ok) {
            const data = await response.json();
            // Handle both paginated and non-paginated responses for backwards compatibility
            let apiTasks = data.tasks || data;
            
            // Ensure apiTasks is an array
            if (!Array.isArray(apiTasks)) {
                console.error('API did not return an array. Response:', data);
                apiTasks = [];
            }
            
            // Cache the data
            backlogDataCache.tasks = apiTasks;
            backlogDataCache.timestamp = now;
            
            console.log(`Loaded ${apiTasks.length} tasks from API`);
            console.log('API Tasks:', apiTasks);
            
            if (apiTasks.length === 0) {
                console.warn('No tasks returned from API. Check project ID and task status.');
            }

            // Store all tasks (unfiltered)
            allTasks = apiTasks.map(task => ({
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

            // Apply filter to get displayed tasks
            applyCurrentFilter();

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
        console.error('Backlog list container not found - checking DOM...');
        // Try to find it with a delay in case DOM isn't ready
        setTimeout(() => {
            const retryContainer = document.getElementById('backlogList');
            if (retryContainer) {
                console.log('Found container on retry');
                renderBacklog();
            } else {
                console.error('Container still not found after retry');
            }
        }, 100);
        return;
    }

    console.log('Rendering backlog with', backlogTasks.length, 'tasks');
    console.log('Tasks data:', backlogTasks);
    console.log('Container found:', container);
    
    if (backlogTasks.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📋</div>
                <div class="empty-state-text">No tasks in backlog. Click "Create Task" to add one.</div>
            </div>
        `;
        return;
    }

    // Group tasks by status for better organization
    const tasksByStatus = {
        backlog: backlogTasks.filter(t => t.status === 'backlog' || !t.status || t.status === ''),
        todo: backlogTasks.filter(t => t.status === 'todo'),
        progress: backlogTasks.filter(t => t.status === 'progress' || t.status === 'in-progress'),
        review: backlogTasks.filter(t => t.status === 'review' || t.status === 'in-review'),
        done: backlogTasks.filter(t => t.status === 'done' || t.status === 'completed')
    };
    
    // Render all tasks in a Jira-style list
    container.innerHTML = backlogTasks.map((task, index) => {
        const assigneeInitials = task.assignee 
            ? (task.assignee.name || 'UN').substring(0, 2).toUpperCase()
            : 'UN';
        
        const priorityLabels = ['Low', 'Medium', 'High'];
        const priorityLabel = priorityLabels[task.priority] || 'Low';
        const priorityColors = ['#36B37E', '#FFAB00', '#DE350B'];
        const priorityColor = priorityColors[task.priority] || '#36B37E';
        
        // Get label color based on label name
        const labelColors = {
            'billing': '#0052CC',
            'accounts': '#36B37E',
            'aws spike': '#DE350B',
            'feedback': '#FFAB00',
            'forms': '#6554C0',
            'sorbet': '#00B8D9'
        };
        const labelName = (task.label || 'accounts').toLowerCase();
        const labelColor = labelColors[labelName] || '#DFE1E6';
        const labelTextColor = labelName in labelColors ? '#FFFFFF' : '#42526E';
        
        // Status display
        const statusDisplay = task.status === 'backlog' ? 'Backlog' :
                             task.status === 'todo' ? 'To Do' :
                             task.status === 'progress' ? 'In Progress' :
                             task.status === 'review' ? 'In Review' :
                             task.status === 'done' ? 'Done' : 'Backlog';
        
        return `
            <div class="backlog-item" data-task-id="${task.id}" onclick="openTaskModal(${task.id})">
                <div class="backlog-item-left">
                    <div class="backlog-item-icon" style="color: ${priorityColor};">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                            <path d="M2 17l10 5 10-5"></path>
                            <path d="M2 12l10 5 10-5"></path>
                        </svg>
                    </div>
                    <div class="backlog-item-content">
                        <div class="backlog-item-title-row">
                            <span class="backlog-item-key">${task.taskId}</span>
                            <span class="backlog-item-title">${task.title || 'Untitled Task'}</span>
                        </div>
                        ${task.description ? `<div class="backlog-item-description">${task.description.substring(0, 150)}${task.description.length > 150 ? '...' : ''}</div>` : ''}
                        <div class="backlog-item-meta">
                            <span class="backlog-item-label" style="background: ${labelColor}; color: ${labelTextColor};">
                                ${(task.label || 'ACCOUNTS').toUpperCase()}
                            </span>
                            <span class="backlog-item-priority" style="color: ${priorityColor};">
                                ${task.priority + 1}
                            </span>
                            ${task.dueDate ? `<span class="backlog-item-due">Due: ${new Date(task.dueDate).toLocaleDateString()}</span>` : ''}
                        </div>
                    </div>
                </div>
                <div class="backlog-item-right">
                    <select class="backlog-status-select" onchange="changeTaskStatus(${task.id}, this.value)" onclick="event.stopPropagation()">
                        <option value="backlog" ${task.status === 'backlog' || !task.status ? 'selected' : ''}>Backlog</option>
                        <option value="todo" ${task.status === 'todo' ? 'selected' : ''}>To Do</option>
                        <option value="progress" ${task.status === 'progress' || task.status === 'in-progress' ? 'selected' : ''}>In Progress</option>
                        <option value="review" ${task.status === 'review' || task.status === 'in-review' ? 'selected' : ''}>In Review</option>
                        <option value="blocked" ${task.status === 'blocked' ? 'selected' : ''}>Blocked</option>
                        <option value="done" ${task.status === 'done' || task.status === 'completed' ? 'selected' : ''}>Done</option>
                    </select>
                    <div class="backlog-item-assignee" title="${task.assignee ? task.assignee.name : 'Unassigned'}" style="background: ${task.assignee ? '#0052CC' : '#DFE1E6'}; color: ${task.assignee ? '#FFFFFF' : '#42526E'};">
                        ${assigneeInitials}
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // No need to load assignees on every render - they're shown as avatars
}

// Removed inefficient loadAssigneesForDropdowns function that was called on every render

async function changeTaskStatus(taskId, newStatus) {
    const task = backlogTasks.find(t => t.id === taskId);
    if (!task) return;

    const originalStatus = originalTaskStates[taskId]?.status;
    
    // If status hasn't changed, do nothing
    if (originalStatus === newStatus) return;
    
    // Update task status immediately in both arrays
    task.status = newStatus;
    
    // Also update in allTasks array
    const allTask = allTasks.find(t => t.id === taskId);
    if (allTask) {
        allTask.status = newStatus;
    }
    
    // Save immediately to backend
    try {
        const response = await apiClient.put(`/tasks/${taskId}`, {
            status: newStatus
        });
        
        if (response.ok) {
            // Update original state
            originalTaskStates[taskId].status = newStatus;
            
            // If status changed to "in progress", refresh the board (if board page is open)
            if (newStatus === 'progress' || newStatus === 'in-progress') {
                // Check if board page is open in another tab/window and refresh it
                // We'll use localStorage to signal board refresh
                localStorage.setItem('boardNeedsRefresh', 'true');
                localStorage.setItem('boardRefreshTime', Date.now().toString());
            }
            
            // Re-apply filter in case task should be shown/hidden based on new status
            applyCurrentFilter();
        } else {
            // Revert on error
            task.status = originalStatus;
            console.error('Failed to update task status');
        }
    } catch (error) {
        // Revert on error
        task.status = originalStatus;
        console.error('Error updating task status:', error);
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

        // Success - changes saved
        console.log('All changes saved successfully!');
    } catch (error) {
        console.error('Failed to save changes:', error);
        
        if (saveButton) {
            saveButton.disabled = false;
            saveButton.textContent = 'Save Changes';
        }
    }
}

function applyCurrentFilter() {
    const filterSelect = document.getElementById('backlogFilter');
    const filterValue = filterSelect ? filterSelect.value : 'all';
    
    console.log('Applying filter:', filterValue);
    console.log('All tasks before filter:', allTasks.length, allTasks.map(t => ({ id: t.id, title: t.title, status: t.status })));
    
    if (filterValue === 'backlog') {
        // Show only backlog tasks
        backlogTasks = allTasks.filter(t => 
            t.status === 'backlog' || !t.status || t.status === ''
        );
        console.log(`Filtered to ${backlogTasks.length} backlog tasks from ${allTasks.length} total`);
        console.log('Backlog tasks:', backlogTasks.map(t => ({ id: t.id, title: t.title, status: t.status })));
    } else {
        // Show all tasks
        backlogTasks = [...allTasks];
        console.log(`Showing all ${backlogTasks.length} tasks`);
    }
    }
    
    renderBacklog();
}

function applyBacklogFilter() {
    applyCurrentFilter();
}

function openTaskModal(taskId) {
    const task = backlogTasks.find(t => t.id === taskId);
    if (task && typeof showTaskModal === 'function') {
        showTaskModal(task.status || 'todo', task);
    }
}

// Wrapper function for creating tasks from backlog page
// This ensures tasks are created with 'backlog' status
function showCreateTaskModal() {
    // Check if board.js has loaded and has the showTaskModal function
    if (typeof showTaskModal === 'function') {
        // Create task with 'backlog' status when created from backlog page
        showTaskModal('backlog');
        
        // Listen for task creation completion to reload backlog
        // Use a more efficient approach: listen for storage event or use a one-time listener
        let checkCount = 0;
        const maxChecks = 150; // 30 seconds max (150 * 200ms)
        const checkForNewTask = setInterval(() => {
            checkCount++;
            // Check if modal is closed (task was created)
            const modal = document.getElementById('taskModal');
            if (!modal || modal.style.display === 'none') {
                clearInterval(checkForNewTask);
                // Reload backlog after a short delay to ensure task is saved
                setTimeout(() => {
                    loadBacklogTasks();
                }, 500);
            } else if (checkCount >= maxChecks) {
                // Clear interval after max checks to prevent infinite loop
                clearInterval(checkForNewTask);
            }
        }, 200);
    } else {
        console.error('showTaskModal function not found. Make sure board.js is loaded.');
    }
}

// Make functions globally accessible
window.changeTaskStatus = changeTaskStatus;
window.changeTaskAssignee = changeTaskAssignee;
window.saveAllChanges = saveAllChanges;
window.applyBacklogFilter = applyBacklogFilter;
window.openTaskModal = openTaskModal;
// Override board.js showCreateTaskModal for backlog page to default to 'backlog' status
window.showCreateTaskModal = showCreateTaskModal;
window.logout = logout;
window.toggleUserMenu = toggleUserMenu;

