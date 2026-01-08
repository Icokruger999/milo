// Flakes functionality - Confluence-like wiki/documentation

let flakes = [];
let currentFlake = null;

// Initialize flakes
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

    // Setup user menu dropdown
    setupUserMenu();

    // Load project info
    const currentProject = projectSelector.getCurrentProject();
    if (currentProject) {
        document.getElementById('projectName').textContent = currentProject.name;
        document.getElementById('projectIcon').textContent = (currentProject.key || currentProject.name).substring(0, 1).toUpperCase();
    } else {
        window.location.href = 'milo-select-project.html';
        return;
    }

    // Load flakes
    loadFlakes();
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

// Load flakes from API
async function loadFlakes() {
    try {
        const currentProject = projectSelector.getCurrentProject();
        if (!currentProject) return;

        const response = await apiClient.get(`/flakes?projectId=${currentProject.id}`);
        if (response.ok) {
            flakes = await response.json();
            renderFlakes();
        } else {
            // If endpoint doesn't exist yet, show empty state
            flakes = [];
            renderFlakes();
        }
    } catch (error) {
        console.error('Failed to load flakes:', error);
        flakes = [];
        renderFlakes();
    }
}

// Render flakes list
function renderFlakes() {
    const container = document.getElementById('flakesContent');
    if (!container) return;

    if (flakes.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📄</div>
                <div class="empty-state-title">No flakes yet</div>
                <div class="empty-state-text">Create your first flake to start documenting your project</div>
                <button class="btn-primary" onclick="showCreateFlakeModal()">Create Flake</button>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div class="flakes-list">
            ${flakes.map(flake => `
                <div class="flake-card">
                    <div onclick="openFlake(${flake.id})" style="cursor: pointer;">
                        <div class="flake-card-title">${flake.title || 'Untitled'}</div>
                        <div class="flake-card-meta">
                            Updated ${new Date(flake.updatedAt || flake.createdAt).toLocaleDateString()} by ${flake.authorName || 'Unknown'}
                        </div>
                        <div class="flake-card-preview">${(flake.content || '').substring(0, 150)}${(flake.content || '').length > 150 ? '...' : ''}</div>
                    </div>
                    <div class="flake-card-actions">
                        <button onclick="event.stopPropagation(); shareFlakeByEmail(${flake.id})" title="Email" class="flake-action-btn">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                                <polyline points="22,6 12,13 2,6"></polyline>
                            </svg>
                        </button>
                        <button onclick="event.stopPropagation(); shareFlakeToBoard(${flake.id})" title="Share to Board" class="flake-action-btn">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                <line x1="3" y1="9" x2="21" y2="9"></line>
                                <line x1="9" y1="21" x2="9" y2="9"></line>
                            </svg>
                        </button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// Show create flake modal
function showCreateFlakeModal() {
    const modal = document.getElementById('createFlakeModal');
    if (modal) {
        modal.style.display = 'flex';
        document.getElementById('flakeTitle').focus();
    }
}

// Close create flake modal
function closeCreateFlakeModal() {
    const modal = document.getElementById('createFlakeModal');
    if (modal) {
        modal.style.display = 'none';
        document.getElementById('createFlakeForm').reset();
    }
}

// Handle create flake
async function handleCreateFlake(event) {
    event.preventDefault();
    
    const title = document.getElementById('flakeTitle').value.trim();
    const content = document.getElementById('flakeContent').value.trim();
    
    if (!title) {
        alert('Title is required');
        return;
    }

    try {
        const currentProject = projectSelector.getCurrentProject();
        const user = authService.getCurrentUser();
        
        const response = await apiClient.post('/flakes', {
            title: title,
            content: content,
            projectId: currentProject ? currentProject.id : null,
            authorId: user ? user.id : null
        });

        if (response.ok) {
            closeCreateFlakeModal();
            await loadFlakes();
        } else {
            try {
                const error = await response.json();
                alert(error.message || 'Failed to create flake');
            } catch (parseError) {
                // If response is not JSON (e.g., 404 HTML page), show generic error
                alert(`Failed to create flake (${response.status}). Please ensure the API server is running.`);
            }
        }
    } catch (error) {
        console.error('Error creating flake:', error);
        alert('Failed to create flake. Please check your connection and try again.');
    }
}

// Open flake for viewing/editing
function openFlake(flakeId) {
    window.location.href = `milo-flake-view.html?id=${flakeId}`;
}

// Share flake by email - show modal
let currentShareFlakeId = null;

function shareFlakeByEmail(flakeId) {
    currentShareFlakeId = flakeId;
    const modal = document.getElementById('shareEmailModal');
    modal.style.display = 'flex';
    document.getElementById('shareEmailInput').value = '';
    document.getElementById('shareEmailInput').focus();
}

function closeShareEmailModal() {
    const modal = document.getElementById('shareEmailModal');
    modal.style.display = 'none';
    currentShareFlakeId = null;
}

async function confirmShareEmail() {
    const toEmail = document.getElementById('shareEmailInput').value.trim();
    
    if (!toEmail || !toEmail.includes('@')) {
        alert('Please enter a valid email address');
        return;
    }

    const user = authService.getCurrentUser();
    if (!user) {
        alert('You must be logged in to share flakes');
        return;
    }

    try {
        const response = await apiClient.post(`/flakes/${currentShareFlakeId}/share/email`, {
            toEmail: toEmail,
            email: user.email,
            baseUrl: window.location.origin
        });

        if (response.ok) {
            closeShareEmailModal();
            alert(`Flake shared successfully to ${toEmail}`);
        } else {
            try {
                const error = await response.json();
                alert(error.message || 'Failed to share flake');
            } catch (parseError) {
                alert(`Failed to share flake (${response.status}). Please ensure the API server is running.`);
            }
        }
    } catch (error) {
        console.error('Error sharing flake:', error);
        alert('Failed to share flake. Please try again.');
    }
}

// Share flake to board - show task picker
let currentLinkFlakeId = null;
let allTasks = [];

async function shareFlakeToBoard(flakeId) {
    currentLinkFlakeId = flakeId;
    const modal = document.getElementById('linkTaskModal');
    modal.style.display = 'flex';
    
    // Load all tasks
    await loadTasksForLinking();
}

function closeLinkTaskModal() {
    const modal = document.getElementById('linkTaskModal');
    modal.style.display = 'none';
    currentLinkFlakeId = null;
    allTasks = [];
}

async function loadTasksForLinking() {
    try {
        const currentProject = projectSelector.getCurrentProject();
        if (!currentProject) return;

        const response = await apiClient.get(`/tasks?projectId=${currentProject.id}`);
        if (response.ok) {
            allTasks = await response.json();
            renderTaskList(allTasks);
        } else {
            document.getElementById('taskSearchResults').innerHTML = '<div style="text-align: center; color: #E2372D; padding: 40px;">Failed to load tasks</div>';
        }
    } catch (error) {
        console.error('Error loading tasks:', error);
        document.getElementById('taskSearchResults').innerHTML = '<div style="text-align: center; color: #E2372D; padding: 40px;">Error loading tasks</div>';
    }
}

function searchTasks() {
    const searchTerm = document.getElementById('taskSearchInput').value.toLowerCase();
    
    if (!searchTerm) {
        renderTaskList(allTasks);
        return;
    }
    
    const filtered = allTasks.filter(task => 
        (task.title && task.title.toLowerCase().includes(searchTerm)) ||
        (task.taskId && task.taskId.toLowerCase().includes(searchTerm)) ||
        (task.description && task.description.toLowerCase().includes(searchTerm))
    );
    
    renderTaskList(filtered);
}

function renderTaskList(tasks) {
    const container = document.getElementById('taskSearchResults');
    
    if (!tasks || tasks.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: #6B778C; padding: 40px;">No tasks found</div>';
        return;
    }
    
    container.innerHTML = tasks.map(task => `
        <div style="padding: 12px; border-bottom: 1px solid #DFE1E6; cursor: pointer; transition: background 0.15s;" 
             onmouseover="this.style.background='#F4F5F7'"
             onmouseout="this.style.background='white'"
             onclick="linkFlakeToTask(${task.id})">
            <div style="display: flex; justify-content: space-between; align-items: start;">
                <div style="flex: 1;">
                    <div style="font-weight: 500; color: #172B4D; margin-bottom: 4px;">
                        ${task.taskId || `TASK-${task.id}`}: ${task.title || 'Untitled'}
                    </div>
                    <div style="font-size: 12px; color: #6B778C;">
                        ${task.status || 'todo'} • ${task.assigneeName || 'Unassigned'}
                    </div>
                </div>
                <div style="padding: 2px 8px; background: #DFE1E6; border-radius: 3px; font-size: 11px; color: #42526E; text-transform: uppercase;">
                    ${task.priority === 1 ? 'High' : task.priority === 2 ? 'Medium' : 'Low'}
                </div>
            </div>
        </div>
    `).join('');
}

async function linkFlakeToTask(taskId) {
    try {
        const response = await apiClient.post(`/flakes/${currentLinkFlakeId}/share/board`, {
            taskId: taskId,
            baseUrl: window.location.origin
        });

        if (response.ok) {
            const result = await response.json();
            closeLinkTaskModal();
            alert(result.message || 'Flake linked to task successfully!');
            if (confirm('Would you like to view the task on the board?')) {
                window.location.href = 'milo-board.html';
            }
        } else {
            try {
                const error = await response.json();
                alert(error.message || 'Failed to link flake to task');
            } catch (parseError) {
                alert(`Failed to link flake (${response.status}). Please ensure the API server is running.`);
            }
        }
    } catch (error) {
        console.error('Error linking flake:', error);
        alert('Failed to link flake. Please try again.');
    }
}

async function createNewTaskFromFlake() {
    try {
        const response = await apiClient.post(`/flakes/${currentLinkFlakeId}/share/board`, {
            baseUrl: window.location.origin
        });

        if (response.ok) {
            const result = await response.json();
            closeLinkTaskModal();
            alert(result.message || 'Task created from flake successfully!');
            if (confirm('Would you like to view the task on the board?')) {
                window.location.href = 'milo-board.html';
            }
        } else {
            try {
                const error = await response.json();
                alert(error.message || 'Failed to create task');
            } catch (parseError) {
                alert(`Failed to create task (${response.status}). Please ensure the API server is running.`);
            }
        }
    } catch (error) {
        console.error('Error creating task:', error);
        alert('Failed to create task. Please try again.');
    }
}

// Make functions globally available
window.showCreateFlakeModal = showCreateFlakeModal;
window.closeCreateFlakeModal = closeCreateFlakeModal;
window.handleCreateFlake = handleCreateFlake;
window.openFlake = openFlake;
window.loadFlakes = loadFlakes;
window.shareFlakeByEmail = shareFlakeByEmail;
window.shareFlakeToBoard = shareFlakeToBoard;
window.closeShareEmailModal = closeShareEmailModal;
window.confirmShareEmail = confirmShareEmail;
window.closeLinkTaskModal = closeLinkTaskModal;
window.searchTasks = searchTasks;
window.linkFlakeToTask = linkFlakeToTask;
window.createNewTaskFromFlake = createNewTaskFromFlake;

