// Flakes functionality - Confluence-like wiki/documentation

let flakes = [];
let currentFlake = null;
let collapsedGroups = new Set(); // Track collapsed date groups

// Toggle date group visibility
function toggleDateGroup(index) {
    const content = document.getElementById(`content-${index}`);
    const toggle = document.getElementById(`toggle-${index}`);
    
    if (!content || !toggle) return;
    
    if (collapsedGroups.has(index)) {
        // Expand
        content.classList.remove('collapsed');
        toggle.classList.remove('collapsed');
        collapsedGroups.delete(index);
    } else {
        // Collapse
        content.classList.add('collapsed');
        toggle.classList.add('collapsed');
        collapsedGroups.add(index);
    }
}

// Toast notification function
function showToast(message, type = 'info') {
    // Remove any existing toasts
    const existing = document.getElementById('flakeToast');
    if (existing) existing.remove();
    
    // Create toast element
    const toast = document.createElement('div');
    toast.id = 'flakeToast';
    toast.textContent = message;
    
    // Style based on type
    const colors = {
        success: '#36B37E',
        error: '#DE350B',
        info: '#0052CC',
        warning: '#FF991F'
    };
    
    toast.style.cssText = `
        position: fixed;
        top: 70px;
        right: 20px;
        background: ${colors[type] || colors.info};
        color: white;
        padding: 16px 24px;
        border-radius: 3px;
        box-shadow: 0 4px 8px rgba(9, 30, 66, 0.25);
        z-index: 10000;
        font-size: 14px;
        font-weight: 500;
        max-width: 400px;
        animation: slideIn 0.3s ease-out;
    `;
    
    document.body.appendChild(toast);
    
    // Auto-remove after 4 seconds
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// Add animation styles
if (!document.getElementById('toastStyles')) {
    const style = document.createElement('style');
    style.id = 'toastStyles';
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(400px); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(400px); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
}

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

// Helper function to format date for grouping
function getDateGroupKey(date) {
    const d = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    d.setHours(0, 0, 0, 0);
    
    if (d.getTime() === today.getTime()) {
        return { key: 'today', label: 'Today', sort: 0 };
    } else if (d.getTime() === yesterday.getTime()) {
        return { key: 'yesterday', label: 'Yesterday', sort: 1 };
    } else if (d >= weekAgo) {
        return { key: 'this-week', label: 'This Week', sort: 2 };
    } else {
        // Format as "Month Day, Year"
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                       'July', 'August', 'September', 'October', 'November', 'December'];
        return { 
            key: `date-${d.getTime()}`, 
            label: `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`,
            sort: 3 + d.getTime()
        };
    }
}

// Render flakes list with date grouping
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

    // Group flakes by creation date
    const grouped = {};
    flakes.forEach(flake => {
        const createdAt = flake.createdAt || flake.updatedAt;
        const dateGroup = getDateGroupKey(createdAt);
        if (!grouped[dateGroup.key]) {
            grouped[dateGroup.key] = {
                label: dateGroup.label,
                sort: dateGroup.sort,
                flakes: []
            };
        }
        grouped[dateGroup.key].flakes.push(flake);
    });

    // Sort groups by sort order (today first, then yesterday, then this week, then dates)
    const sortedGroups = Object.values(grouped).sort((a, b) => a.sort - b.sort);

    container.innerHTML = `
        <div class="flakes-list">
            ${sortedGroups.map((group, index) => `
                <div class="flakes-date-group" data-group-index="${index}">
                    <div class="flakes-date-header" onclick="toggleDateGroup(${index})">
                        <div class="flakes-date-toggle" id="toggle-${index}">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="6 9 12 15 18 9"></polyline>
                            </svg>
                        </div>
                        <span class="flakes-date-label">${group.label} (${group.flakes.length})</span>
                        <div class="flakes-date-line"></div>
                    </div>
                    <div class="flakes-group-content" id="content-${index}">
                        ${group.flakes.map(flake => `
                            <div class="flake-card day-${index % 7}">
                                <div onclick="openFlake(${flake.id})" style="cursor: pointer;">
                                    <div class="flake-card-title">${escapeHtml(flake.title || 'Untitled')}</div>
                                    <div class="flake-card-meta">
                                        <span class="flake-meta-date">Created ${formatDate(flake.createdAt)}</span>
                                        ${flake.updatedAt && flake.updatedAt !== flake.createdAt ? 
                                            `<span class="flake-meta-separator">•</span>
                                             <span class="flake-meta-updated">Updated ${formatDate(flake.updatedAt)}</span>` : ''}
                                        <span class="flake-meta-separator">•</span>
                                        <span class="flake-meta-author">by ${escapeHtml(flake.authorName || 'Unknown')}</span>
                                    </div>
                                    <div class="flake-card-preview">${escapeHtml((flake.content || '').substring(0, 150))}${(flake.content || '').length > 150 ? '...' : ''}</div>
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
                </div>
            `).join('')}
        </div>
    `;
}

// Helper function to format date nicely
function formatDate(dateString) {
    if (!dateString) return 'Unknown date';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
        return 'today';
    } else if (diffDays === 1) {
        return 'yesterday';
    } else if (diffDays < 7) {
        return `${diffDays} days ago`;
    } else {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
    }
}

// Helper function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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
        showToast('Title is required', 'error');
        return;
    }
    
    // Warn if creating without content
    if (!content || content === '') {
        showToast('Tip: You can add content to this flake later by clicking the edit button', 'info');
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
                console.error(error.message || 'Failed to create flake');
            } catch (parseError) {
                // If response is not JSON (e.g., 404 HTML page), show generic error
                console.error(`Failed to create flake (${response.status}). Please ensure the API server is running.`);
            }
        }
    } catch (error) {
        console.error('Error creating flake:', error);
    }
}

// Open flake for viewing/editing
function openFlake(flakeId) {
    window.location.href = `milo-flake-view.html?id=${flakeId}`;
}

// Open flake for editing (use rich editor)
function editFlake(flakeId) {
    window.location.href = `milo-flake-edit-rich.html?id=${flakeId}`;
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
        showToast('Please enter a valid email address', 'error');
        return;
    }

    const user = authService.getCurrentUser();
    if (!user) {
        showToast('You must be logged in to share flakes', 'error');
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
            showToast(`Flake shared successfully to ${toEmail}`, 'success');
        } else {
            try {
                const error = await response.json();
                showToast(error.message || 'Failed to share flake', 'error');
            } catch (parseError) {
                showToast(`Failed to share flake (${response.status})`, 'error');
            }
        }
    } catch (error) {
        console.error('Error sharing flake:', error);
        showToast('Failed to share flake. Please try again.', 'error');
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
    const container = document.getElementById('taskSearchResults');
    container.innerHTML = '<div style="text-align: center; color: #6B778C; padding: 40px;">Loading tasks...</div>';
    
    try {
        const currentProject = projectSelector.getCurrentProject();
        if (!currentProject) {
            container.innerHTML = '<div style="text-align: center; color: #E2372D; padding: 40px;">No project selected</div>';
            return;
        }

        console.log('Loading tasks for project:', currentProject.id);
        const response = await apiClient.get(`/tasks?projectId=${currentProject.id}`);
        
        console.log('Tasks response status:', response.status);
        
        if (response.ok) {
            const data = await response.json();
            console.log('Tasks loaded:', data);
            
            // Handle both array response and object with tasks property
            allTasks = Array.isArray(data) ? data : (data.tasks || []);
            
            console.log('Total tasks:', allTasks.length);
            
            if (allTasks.length === 0) {
                container.innerHTML = '<div style="text-align: center; color: #6B778C; padding: 40px;">No tasks in this project yet.<br><br>Create your first task!</div>';
            } else {
                renderTaskList(allTasks);
            }
        } else {
            const errorText = await response.text();
            console.error('Failed to load tasks:', response.status, errorText);
            container.innerHTML = '<div style="text-align: center; color: #E2372D; padding: 40px;">Failed to load tasks<br><small>' + response.status + '</small></div>';
        }
    } catch (error) {
        console.error('Error loading tasks:', error);
        container.innerHTML = '<div style="text-align: center; color: #E2372D; padding: 40px;">Error loading tasks<br><small>' + error.message + '</small></div>';
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
        container.innerHTML = '<div style="text-align: center; color: #6B778C; padding: 40px;">No tasks match your search</div>';
        return;
    }
    
    console.log('Rendering tasks:', tasks.length);
    
    container.innerHTML = tasks.map(task => {
        // Get assignee name from different possible properties
        const assigneeName = task.assigneeName || 
                            (task.assignee && task.assignee.name) || 
                            'Unassigned';
        
        // Handle priority display
        let priorityLabel = 'Low';
        let priorityColor = '#DFE1E6';
        if (task.priority === 1 || task.priority === '1') {
            priorityLabel = 'High';
            priorityColor = '#FFEBE6';
        } else if (task.priority === 2 || task.priority === '2') {
            priorityLabel = 'Medium';
            priorityColor = '#FFF0B3';
        }
        
        return `
            <div style="padding: 12px; border-bottom: 1px solid #DFE1E6; cursor: pointer; transition: background 0.15s;" 
                 onmouseover="this.style.background='#F4F5F7'"
                 onmouseout="this.style.background='white'"
                 onclick="linkFlakeToTask(${task.id})">
                <div style="display: flex; justify-content: space-between; align-items: start; gap: 12px;">
                    <div style="flex: 1; min-width: 0;">
                        <div style="font-weight: 500; color: #172B4D; margin-bottom: 4px;">
                            ${task.taskId || `TASK-${task.id}`}: ${task.title || 'Untitled'}
                        </div>
                        <div style="font-size: 12px; color: #6B778C;">
                            ${task.status || 'todo'} • ${assigneeName}
                        </div>
                    </div>
                    <div style="padding: 2px 8px; background: ${priorityColor}; border-radius: 3px; font-size: 11px; color: #42526E; text-transform: uppercase; white-space: nowrap;">
                        ${priorityLabel}
                    </div>
                </div>
            </div>
        `;
    }).join('');
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
            showToast(result.message || 'Flake linked to task successfully!', 'success');
        } else {
            try {
                const error = await response.json();
                showToast(error.message || 'Failed to link flake to task', 'error');
            } catch (parseError) {
                showToast(`Failed to link flake (${response.status})`, 'error');
            }
        }
    } catch (error) {
        console.error('Error linking flake:', error);
        showToast('Failed to link flake. Please try again.', 'error');
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
            showToast(result.message || 'Task created from flake successfully!', 'success');
            
            // Show link to view on board after 1 second
            setTimeout(() => {
                showToast('Click here to view on board', 'info');
                const toast = document.getElementById('flakeToast');
                if (toast) {
                    toast.style.cursor = 'pointer';
                    toast.onclick = () => window.location.href = 'milo-board.html';
                }
            }, 1500);
        } else {
            try {
                const error = await response.json();
                showToast(error.message || 'Failed to create task', 'error');
            } catch (parseError) {
                showToast(`Failed to create task (${response.status})`, 'error');
            }
        }
    } catch (error) {
        console.error('Error creating task:', error);
        showToast('Failed to create task. Please try again.', 'error');
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



// Image upload functions
function insertImageToFlake() {
    document.getElementById('flakeImageInput').click();
}

function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Check file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
        showToast('Image too large. Maximum size is 2MB.', 'error');
        return;
    }
    
    // Check file type
    if (!file.type.startsWith('image/')) {
        showToast('Please select an image file.', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const base64Image = e.target.result;
        const textarea = document.getElementById('flakeContent');
        const cursorPos = textarea.selectionStart;
        const textBefore = textarea.value.substring(0, cursorPos);
        const textAfter = textarea.value.substring(cursorPos);
        
        // Insert markdown image syntax with base64
        const imageMarkdown = `\n![Image](${base64Image})\n`;
        textarea.value = textBefore + imageMarkdown + textAfter;
        
        // Move cursor after inserted image
        textarea.selectionStart = textarea.selectionEnd = cursorPos + imageMarkdown.length;
        textarea.focus();
        
        showToast('Image inserted successfully!', 'success');
    };
    
    reader.onerror = function() {
        showToast('Failed to read image file.', 'error');
    };
    
    reader.readAsDataURL(file);
    
    // Reset input so same file can be selected again
    event.target.value = '';
}
