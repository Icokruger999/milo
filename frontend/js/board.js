// Milo Board functionality

// Tasks data - initialized as empty, will be loaded from API
let tasks = {
    todo: [],
    progress: [],
    review: [],
    done: []
};

// Get consistent color for assignee based on ID or name
function getAssigneeColor(assigneeId, assigneeName) {
    if (!assigneeId && !assigneeName) {
        return { bg: '#DFE1E6', text: '#42526E' }; // Unassigned - gray
    }
    
    // Use ID if available, otherwise use name
    const seed = assigneeId ? assigneeId.toString() : (assigneeName || '');
    
    // Generate consistent hash from seed
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        hash = seed.charCodeAt(i) + ((hash << 5) - hash);
        hash = hash & hash; // Convert to 32bit integer
    }
    
    // Color palette - green and red variations for visibility
    const colors = [
        { bg: '#36B37E', text: '#FFFFFF' }, // Green
        { bg: '#DE350B', text: '#FFFFFF' }, // Red
        { bg: '#0052CC', text: '#FFFFFF' }, // Blue
        { bg: '#FFAB00', text: '#172B4D' }, // Orange
        { bg: '#6554C0', text: '#FFFFFF' }, // Purple
        { bg: '#00B8D9', text: '#FFFFFF' }, // Cyan
        { bg: '#36B37E', text: '#FFFFFF' }, // Green again
        { bg: '#DE350B', text: '#FFFFFF' }, // Red again
    ];
    
    // Use absolute value of hash to get index
    const index = Math.abs(hash) % colors.length;
    return colors[index];
}

// Initialize board
document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    if (!authService.requireAuth()) {
        return;
    }

    // Load user info
    const user = authService.getCurrentUser();
    if (user) {
        const userName = user.name || user.email || 'User';
        const userNameEl = document.getElementById('userName');
        if (userNameEl) {
            userNameEl.textContent = userName;
        }
        const initials = userName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
        const userAvatarEl = document.getElementById('userAvatar');
        if (userAvatarEl) {
            userAvatarEl.textContent = initials;
        }
    }

    // Setup user menu
    setupUserMenu();

    // Render board
    renderBoard();

    // Load tasks from API (when available)
    loadTasks();
    
    // Listen for status changes from backlog page
    setInterval(() => {
        const needsRefresh = localStorage.getItem('boardNeedsRefresh');
        const refreshTime = localStorage.getItem('boardRefreshTime');
        if (needsRefresh === 'true' && refreshTime) {
            const timeDiff = Date.now() - parseInt(refreshTime);
            // Only refresh if signal is recent (within last 5 seconds)
            if (timeDiff < 5000) {
                localStorage.removeItem('boardNeedsRefresh');
                localStorage.removeItem('boardRefreshTime');
                // Reload tasks and re-render board
                loadTasksFromAPI().then(() => {
                    renderBoard();
                });
            }
        }
    }, 1000); // Check every second
});

function setupUserMenu() {
    // Use globalUserAvatar as the clickable user menu element
    const userMenu = document.getElementById('globalUserAvatar') || 
                     document.getElementById('userMenu') || 
                     document.getElementById('sidebarUserAvatar');
    if (!userMenu) {
        // Silently fail - user menu is optional
        return;
    }
    
    // Make it look clickable
    userMenu.style.cursor = 'pointer';
    
    const dropdown = document.createElement('div');
    dropdown.className = 'dropdown-menu';
    dropdown.style.cssText = 'display: none; position: fixed; background: white; border: 1px solid #DFE1E6; border-radius: 4px; box-shadow: 0 4px 8px rgba(9, 30, 66, 0.15); z-index: 1000; min-width: 160px;';
    dropdown.innerHTML = `
        <div class="dropdown-item" style="padding: 8px 12px; cursor: pointer; font-size: 14px; color: #172B4D;" onclick="window.logout()">Logout</div>
    `;
    document.body.appendChild(dropdown);

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

    document.addEventListener('click', function(e) {
        if (!userMenu.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.style.display = 'none';
        }
    });
}

function renderBoard() {
    renderColumn('todo', tasks.todo);
    renderColumn('progress', tasks.progress);
    renderColumn('review', tasks.review);
    renderColumn('done', tasks.done);

    updateCounts();
}

function renderColumn(columnId, items) {
    const container = document.getElementById(columnId + 'Items');
    container.innerHTML = '';

    items.forEach(task => {
        const card = createTaskCard(task);
        container.appendChild(card);
    });
}

function createTaskCard(task) {
    const card = document.createElement('div');
    card.className = 'task-card';
    card.draggable = true;
    card.dataset.taskId = task.id;
    
    // Get assignee color consistently
    const assigneeColor = getAssigneeColor(task.assigneeId, task.assigneeName);
    
    card.innerHTML = `
        <div style="display: flex; align-items: flex-start; gap: 8px; margin-bottom: 8px;">
            <div class="task-type-icon"></div>
            <div style="flex: 1;">
                <div class="task-title">${task.title}</div>
                <div class="task-meta">
                    <span class="task-label ${task.label}">${task.label.toUpperCase()}</span>
                    <span class="task-id">${task.id}</span>
                </div>
            </div>
        </div>
        <div class="task-footer">
            <div class="task-icons-left">
                ${task.subtasks ? `<span style="font-size: 11px; color: #6B778C; margin-right: 4px;">${task.subtasks}</span>` : ''}
                <svg class="task-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 14px; height: 14px; color: #6B778C;">
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"></path>
                </svg>
                <svg class="task-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 14px; height: 14px; color: #6B778C;">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
            </div>
            <div class="task-assignee" title="${task.assigneeName || 'Unassigned'}" style="width: 24px; height: 24px; border-radius: 50%; background: ${assigneeColor.bg}; color: ${assigneeColor.text}; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 600; cursor: pointer;">${task.assignee || 'UN'}</div>
        </div>
    `;

    // Add drag and drop
    card.addEventListener('dragstart', handleDragStart);
    card.addEventListener('dragend', handleDragEnd);
    
    // Make card clickable - open in edit mode directly (unified modal)
    card.addEventListener('click', function(e) {
        // Don't trigger if clicking on drag handle or other interactive elements
        if (e.target.closest('.task-assignee') || e.target.closest('.task-icon')) {
            return;
        }
        // Open task in edit mode directly (unified modal)
        showTaskModal(task.status || 'todo', task);
    });

    return card;
}

// View/Edit Task Modal - Unified Create/Edit View
function viewTask(task) {
    // Find the actual task object with full details
    let fullTask = null;
    for (const status in tasks) {
        fullTask = tasks[status].find(t => t.id === task.id || t.taskId === task.id);
        if (fullTask) break;
    }
    
    if (!fullTask) {
        console.error('Task not found:', task);
        return;
    }
    
    // Open the unified task modal in edit mode
    showTaskModal(fullTask.status || 'todo', fullTask);
}

function closeViewTaskModal() {
    const modal = document.getElementById('viewTaskModal');
    if (modal) {
        modal.remove();
    }
}

function editTask(taskId) {
    closeViewTaskModal();
    // Find task and open edit modal
    let task = null;
    for (const status in tasks) {
        task = tasks[status].find(t => t.id == taskId || t.taskId == taskId);
        if (task) {
            // Open task modal in edit mode
            const column = task.status || status;
            showTaskModal(column, task);
            break;
        }
    }
}

function updateCounts() {
    document.getElementById('todoCount').textContent = tasks.todo.length;
    document.getElementById('progressCount').textContent = tasks.progress.length;
    document.getElementById('reviewCount').textContent = tasks.review.length;
    document.getElementById('doneCount').textContent = tasks.done.length;
}

function addTask(column) {
    showTaskModal(column);
}

// Store comments for current task
let currentTaskComments = [];
let currentTaskId = null;

async function showTaskModal(column, task = null) {
    let modal = document.getElementById('taskModal');
    if (!modal) {
        createTaskModal();
        modal = document.getElementById('taskModal');
    }
    
    modal.dataset.column = column;
    const taskIdValue = task ? (task.id || task.taskId) : '';
    modal.dataset.taskId = taskIdValue;
    currentTaskId = task ? task.id : null;
    
    // Set hidden input field for delete button
    const taskIdInput = document.getElementById('taskId');
    if (taskIdInput) {
        taskIdInput.value = taskIdValue || '';
    }
    
    // Update form title and button
    const formTitle = document.getElementById('taskModalTitle');
    const submitButton = document.getElementById('taskSubmitBtn');
    const deleteButton = document.getElementById('deleteTaskBtn');
    
    if (formTitle) {
        formTitle.textContent = task ? 'Edit Task' : 'Create Task';
    }
    if (submitButton) {
        submitButton.textContent = 'Save';
    }
    if (deleteButton) {
        deleteButton.style.display = task ? 'block' : 'none';
    }
    
    // Show modal immediately for better UX
    modal.style.display = 'flex';
    
    // Load data in parallel for better performance
    await Promise.all([
        loadUsersAndProducts(),
        loadLabels()
    ]);
    
    if (task) {
        // Set all form values AFTER dropdowns are populated
        document.getElementById('taskTitle').value = task.title || '';
        document.getElementById('taskDescription').value = task.description || '';
        
        // Update description preview if description exists
        if (task.description && task.description.trim()) {
            updateDescriptionPreview();
        }
        
        // Set status BEFORE other dropdowns
        const statusSelect = document.getElementById('taskStatus');
        if (statusSelect) {
            statusSelect.value = task.status || column || 'todo';
        }
        
        // Set assignee
        const assigneeSelect = document.getElementById('taskAssignee');
        if (assigneeSelect && task.assigneeId) {
            assigneeSelect.value = task.assigneeId;
        }
        
        // Set label
        const labelSelect = document.getElementById('taskLabel');
        if (labelSelect && task.label) {
            labelSelect.value = task.label.toLowerCase();
        }
        
        // Set product
        const productSelect = document.getElementById('taskProduct');
        if (productSelect && task.productId) {
            productSelect.value = task.productId;
        }
        
        // Set priority
        document.getElementById('taskPriority').value = task.priority !== undefined ? task.priority : 0;
        
        // Set start date
        if (task.startDate) {
            const startDate = new Date(task.startDate);
            document.getElementById('taskStartDate').value = startDate.toISOString().split('T')[0];
        } else {
            document.getElementById('taskStartDate').value = '';
        }
        
        // Set due date
        if (task.dueDate) {
            const dueDate = new Date(task.dueDate);
            document.getElementById('taskDueDate').value = dueDate.toISOString().split('T')[0];
        } else {
            document.getElementById('taskDueDate').value = '';
        }
        
        // Load comments asynchronously (non-blocking)
        loadTaskComments(task.id).catch(err => console.error('Error loading comments:', err));
        
        // Load checklist if exists
        const checklistDiv = document.getElementById('taskChecklist');
        let checklist = task.checklist;
        
        // Parse checklist if it's a string (JSON)
        if (typeof checklist === 'string' && checklist.trim()) {
            try {
                checklist = JSON.parse(checklist);
            } catch (e) {
                console.error('Failed to parse checklist:', e);
                checklist = null;
            }
        }
        
        if (checklist && Array.isArray(checklist) && checklist.length > 0) {
            checklistDiv.innerHTML = '';
            checklist.forEach((item, idx) => {
                const itemDiv = document.createElement('div');
                itemDiv.style.cssText = 'display: flex; align-items: center; gap: 8px; margin-bottom: 8px; padding: 6px; background: white; border-radius: 3px;';
                itemDiv.innerHTML = `
                    <input type="checkbox" ${item.completed ? 'checked' : ''} style="cursor: pointer;">
                    <input type="text" value="${(item.text || '').replace(/"/g, '&quot;')}" style="flex: 1; padding: 4px 8px; border: 1px solid #ddd; border-radius: 3px; font-size: 13px;">
                    <button onclick="removeChecklistItemFromModal(this)" style="background: none; border: none; color: #DE350B; cursor: pointer; font-size: 16px; padding: 0 8px;">×</button>
                `;
                checklistDiv.appendChild(itemDiv);
            });
        } else {
            checklistDiv.innerHTML = '<div style="color: #6B778C; font-size: 12px; text-align: center; padding: 8px;">No checklist items yet</div>';
        }
    } else {
        document.getElementById('taskForm').reset();
        const statusSelect = document.getElementById('taskStatus');
        if (statusSelect) {
            // Default new tasks to "backlog" status
            statusSelect.value = column === 'backlog' ? 'backlog' : (column || 'backlog');
        }
        currentTaskComments = [];
        document.getElementById('taskCommentsList').innerHTML = '<div style="color: #6B778C; font-size: 13px; text-align: center; padding: 8px;">No comments yet</div>';
        document.getElementById('taskChecklist').innerHTML = '<div style="color: #6B778C; font-size: 12px; text-align: center; padding: 8px;">No checklist items yet</div>';
    }
}

async function loadTaskComments(taskId) {
    try {
        const response = await apiClient.get(`/comments/task/${taskId}`);
        if (response.ok) {
            currentTaskComments = await response.json();
            renderTaskComments();
        }
    } catch (error) {
        console.error('Failed to load comments:', error);
        currentTaskComments = [];
        renderTaskComments();
    }
}

function renderTaskComments() {
    const commentsDiv = document.getElementById('taskCommentsList');
    if (!commentsDiv) return;
    
    if (currentTaskComments.length === 0) {
        commentsDiv.innerHTML = '<div style="color: #6B778C; font-size: 13px; text-align: center; padding: 8px;">No comments yet</div>';
        return;
    }
    
    commentsDiv.innerHTML = currentTaskComments.map(comment => {
        const authorName = comment.author ? comment.author.name : 'Unknown';
        const initials = authorName.substring(0, 2).toUpperCase();
        return `
            <div style="margin-bottom: 12px; padding: 10px; background: white; border-radius: 4px; border-left: 3px solid #0052CC;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                    <div style="width: 24px; height: 24px; border-radius: 50%; background: #0052CC; color: white; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 600;">
                        ${initials}
                    </div>
                    <div>
                        <div style="font-weight: 600; font-size: 13px; color: #172B4D;">${authorName}</div>
                        <div style="font-size: 11px; color: #6B778C;">${new Date(comment.createdAt).toLocaleString()}</div>
                    </div>
                </div>
                <div style="font-size: 14px; color: #42526E; line-height: 1.5;">${comment.text}</div>
            </div>
        `;
    }).join('');
}

async function addCommentToTaskModal() {
    const input = document.getElementById('newCommentInput');
    if (!input || !input.value.trim()) return;
    
    if (!currentTaskId) {
        console.warn('Cannot add comment: task must be saved first');
        // Silently prevent comment if task not saved
        return;
    }
    
    const commentText = input.value.trim();
    const originalValue = input.value; // Store original value in case of error
    
    try {
        const user = authService.getCurrentUser();
        if (!user || !user.id) {
            console.warn('Cannot add comment: user not logged in');
            // Silently prevent comment if not logged in
            return;
        }
        
        // Clear input immediately for better UX
        input.value = '';
        
        const response = await apiClient.post('/comments', {
            taskId: currentTaskId,
            text: commentText,
            authorId: user.id
        });
        
        if (response.ok) {
            const newComment = await response.json();
            currentTaskComments.push(newComment);
            renderTaskComments();
        } else {
            // Restore input value on error
            input.value = originalValue;
            const error = await response.json().catch(() => ({ message: 'Failed to add comment' }));
            console.error('Failed to add comment:', error.message || 'Unknown error');
            // Silently fail - no popup
        }
    } catch (error) {
        // Restore input value on error
        input.value = originalValue;
        console.error('Error adding comment:', error);
        // Silently fail - no popup
    }
}

function deleteTaskFromModal() {
    const modal = document.getElementById('taskModal');
    if (!modal) return;
    
    // Get taskId from modal dataset (set when opening modal)
    const taskId = modal.dataset.taskId || currentTaskId;
    
    if (taskId) {
        // Close modal first, then delete
        closeTaskModal();
        deleteTask(taskId);
    } else {
        console.warn('Cannot delete: No task ID found');
    }
}

function closeTaskModal() {
    const modal = document.getElementById('taskModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function createTaskModal() {
    const modal = document.createElement('div');
    modal.id = 'taskModal';
    modal.style.cssText = 'display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); z-index: 1000; align-items: center; justify-content: center; backdrop-filter: blur(2px);';
    
    modal.innerHTML = `
        <div style="background: white; border-radius: 8px; padding: 32px; width: 95%; max-width: 1200px; max-height: 95vh; overflow-y: auto; box-shadow: 0 8px 24px rgba(0,0,0,0.2);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid #DFE1E6;">
                <h2 id="taskModalTitle" style="margin: 0; font-size: 24px; font-weight: 600; color: #172B4D;">Create Task</h2>
                <button onclick="closeTaskModal()" style="background: none; border: none; font-size: 28px; cursor: pointer; color: #6B778C; padding: 4px 8px; line-height: 1;">&times;</button>
            </div>
            <form id="taskForm" onsubmit="handleTaskSubmit(event)">
                <input type="hidden" id="taskColumn" name="column">
                <input type="hidden" id="taskId" name="taskId">
                
                <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 32px; margin-bottom: 24px;">
                    <!-- Left Column - Main Content -->
                    <div>
                        <div style="margin-bottom: 20px;">
                            <label style="display: block; margin-bottom: 8px; font-weight: 600; font-size: 14px; color: #172B4D;">Title *</label>
                            <input type="text" id="taskTitle" name="title" required style="width: 100%; padding: 10px 12px; border: 2px solid #DFE1E6; border-radius: 4px; font-size: 15px; box-sizing: border-box; transition: border-color 0.2s;" onfocus="this.style.borderColor='#0052CC'" onblur="this.style.borderColor='#DFE1E6'">
                        </div>
                        
                        <div style="margin-bottom: 20px;">
                            <label style="display: block; margin-bottom: 8px; font-weight: 600; font-size: 14px; color: #172B4D;">Description</label>
                            <!-- Description Preview (read-only with rendered links) -->
                            <div id="taskDescriptionPreview" style="display: none; width: 100%; padding: 12px; border: 2px solid #DFE1E6; border-radius: 4px; font-size: 14px; background: #FAFBFC; line-height: 1.6; white-space: pre-wrap; word-wrap: break-word; margin-bottom: 8px;"></div>
                            <textarea id="taskDescription" name="description" rows="8" style="width: 100%; padding: 10px 12px; border: 2px solid #DFE1E6; border-radius: 4px; font-size: 14px; box-sizing: border-box; resize: vertical; font-family: inherit; line-height: 1.5; transition: border-color 0.2s;" onfocus="this.style.borderColor='#0052CC'; document.getElementById('taskDescriptionPreview').style.display='none'; this.style.display='block';" onblur="this.style.borderColor='#DFE1E6'; updateDescriptionPreview();"></textarea>
                            <button type="button" onclick="editDescription()" id="editDescriptionBtn" style="display: none; font-size: 12px; color: #0052CC; background: none; border: none; cursor: pointer; margin-top: 4px;">Edit description</button>
                        </div>
                        
                        <div style="margin-bottom: 20px;">
                            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                                <label style="display: block; font-weight: 600; font-size: 14px; color: #172B4D;">Checklist</label>
                                <button type="button" onclick="addChecklistItem()" style="background: none; border: none; color: #0052CC; font-size: 13px; cursor: pointer; padding: 4px 8px; font-weight: 500;">+ Add Item</button>
                            </div>
                            <div id="taskChecklist" style="border: 2px solid #DFE1E6; border-radius: 4px; padding: 12px; min-height: 60px; background: #F4F5F7;">
                                <div style="color: #6B778C; font-size: 13px; text-align: center; padding: 8px;">No checklist items yet</div>
                            </div>
                        </div>
                        
                        <div style="margin-bottom: 20px;">
                            <label style="display: block; margin-bottom: 8px; font-weight: 600; font-size: 14px; color: #172B4D;">Comments</label>
                            <div id="taskCommentsList" style="border: 2px solid #DFE1E6; border-radius: 4px; padding: 12px; background: #F4F5F7; max-height: 250px; overflow-y: auto; margin-bottom: 12px;">
                                <div style="color: #6B778C; font-size: 13px; text-align: center; padding: 8px;">No comments yet</div>
                            </div>
                            <div style="display: flex; gap: 8px;">
                                <input type="text" id="newCommentInput" placeholder="Add a comment..." style="flex: 1; padding: 10px 12px; border: 2px solid #DFE1E6; border-radius: 4px; font-size: 14px; transition: border-color 0.2s;" onfocus="this.style.borderColor='#0052CC'" onblur="this.style.borderColor='#DFE1E6'">
                                <button type="button" onclick="addCommentToTaskModal()" style="padding: 10px 20px; background: #0052CC; color: white; border: none; border-radius: 4px; font-size: 14px; font-weight: 500; cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='#0065FF'" onmouseout="this.style.background='#0052CC'">Post</button>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Right Column - Sidebar Fields -->
                    <div style="border-left: 1px solid #DFE1E6; padding-left: 24px;">
                        <div style="margin-bottom: 20px;">
                            <label style="display: block; margin-bottom: 8px; font-weight: 600; font-size: 14px; color: #172B4D;">Status *</label>
                            <select id="taskStatus" name="status" required style="width: 100%; padding: 10px 12px; border: 2px solid #DFE1E6; border-radius: 4px; font-size: 14px; box-sizing: border-box; background: white; cursor: pointer; transition: border-color 0.2s;" onfocus="this.style.borderColor='#0052CC'" onblur="this.style.borderColor='#DFE1E6'">
                                <option value="backlog">Backlog</option>
                                <option value="todo">To Do</option>
                                <option value="progress">In Progress</option>
                                <option value="review">In Review</option>
                                <option value="done">Done</option>
                            </select>
                        </div>
                        
                        <div style="margin-bottom: 20px;">
                            <label style="display: block; margin-bottom: 8px; font-weight: 600; font-size: 14px; color: #172B4D;">Assignee</label>
                            <select id="taskAssignee" name="assigneeId" style="width: 100%; padding: 10px 12px; border: 2px solid #DFE1E6; border-radius: 4px; font-size: 14px; box-sizing: border-box; background: white; cursor: pointer; transition: border-color 0.2s;" onfocus="this.style.borderColor='#0052CC'" onblur="this.style.borderColor='#DFE1E6'">
                                <option value="">Unassigned</option>
                            </select>
                        </div>
                        
                        <div style="margin-bottom: 20px;">
                            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                                <label style="display: block; font-weight: 600; font-size: 14px; color: #172B4D;">Label</label>
                                <button type="button" onclick="showCreateLabelModal()" style="background: none; border: none; color: #0052CC; font-size: 13px; cursor: pointer; padding: 4px 8px; font-weight: 500;">+ New Label</button>
                            </div>
                            <select id="taskLabel" name="label" style="width: 100%; padding: 10px 12px; border: 2px solid #DFE1E6; border-radius: 4px; font-size: 14px; box-sizing: border-box; background: white; cursor: pointer; transition: border-color 0.2s;" onfocus="this.style.borderColor='#0052CC'" onblur="this.style.borderColor='#DFE1E6'">
                                <option value="">No Label</option>
                            </select>
                        </div>
                        
                        <div style="margin-bottom: 20px;">
                            <label style="display: block; margin-bottom: 8px; font-weight: 600; font-size: 14px; color: #172B4D;">Priority</label>
                            <select id="taskPriority" name="priority" style="width: 100%; padding: 10px 12px; border: 2px solid #DFE1E6; border-radius: 4px; font-size: 14px; box-sizing: border-box; background: white; cursor: pointer; transition: border-color 0.2s;" onfocus="this.style.borderColor='#0052CC'" onblur="this.style.borderColor='#DFE1E6'">
                                <option value="0">Low</option>
                                <option value="1">Medium</option>
                                <option value="2">High</option>
                            </select>
                        </div>
                        
                        <div style="margin-bottom: 20px;">
                            <label style="display: block; margin-bottom: 8px; font-weight: 600; font-size: 14px; color: #172B4D;">Product</label>
                            <select id="taskProduct" name="productId" style="width: 100%; padding: 10px 12px; border: 2px solid #DFE1E6; border-radius: 4px; font-size: 14px; box-sizing: border-box; background: white; cursor: pointer; transition: border-color 0.2s;" onfocus="this.style.borderColor='#0052CC'" onblur="this.style.borderColor='#DFE1E6'">
                                <option value="">General</option>
                            </select>
                        </div>
                        
                        <div style="margin-bottom: 20px;">
                            <label style="display: block; margin-bottom: 8px; font-weight: 600; font-size: 14px; color: #172B4D;">Start Date</label>
                            <input type="date" id="taskStartDate" name="startDate" style="width: 100%; padding: 10px 12px; border: 2px solid #DFE1E6; border-radius: 4px; font-size: 14px; box-sizing: border-box; transition: border-color 0.2s;" onfocus="this.style.borderColor='#0052CC'" onblur="this.style.borderColor='#DFE1E6'">
                        </div>
                        
                        <div style="margin-bottom: 20px;">
                            <label style="display: block; margin-bottom: 8px; font-weight: 600; font-size: 14px; color: #172B4D;">Due Date</label>
                            <input type="date" id="taskDueDate" name="dueDate" style="width: 100%; padding: 10px 12px; border: 2px solid #DFE1E6; border-radius: 4px; font-size: 14px; box-sizing: border-box; transition: border-color 0.2s;" onfocus="this.style.borderColor='#0052CC'" onblur="this.style.borderColor='#DFE1E6'">
                        </div>
                    </div>
                </div>
                
                <div style="display: flex; gap: 12px; justify-content: flex-end; border-top: 2px solid #DFE1E6; padding-top: 24px; margin-top: 24px;">
                    <button type="button" onclick="deleteTaskFromModal()" id="deleteTaskBtn" style="display: none; padding: 12px 24px; border: 2px solid #DE350B; background: white; color: #DE350B; border-radius: 4px; cursor: pointer; font-size: 14px; font-weight: 500; transition: all 0.2s;" onmouseover="this.style.background='#FFEBE6'" onmouseout="this.style.background='white'">Delete</button>
                    <button type="button" onclick="closeTaskModal()" style="padding: 12px 24px; border: 2px solid #DFE1E6; background: white; color: #172B4D; border-radius: 4px; cursor: pointer; font-size: 14px; font-weight: 500; transition: all 0.2s;" onmouseover="this.style.background='#F4F5F7'" onmouseout="this.style.background='white'">Cancel</button>
                    <button type="submit" id="taskSubmitBtn" style="padding: 12px 24px; background: #0052CC; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; font-weight: 600; transition: background 0.2s;" onmouseover="this.style.background='#0065FF'" onmouseout="this.style.background='#0052CC'">Save</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Load users and products
    loadUsersAndProducts();
}

// Cache for users and products (5 minute TTL)
let usersProductsCache = {
    users: null,
    products: null,
    timestamp: null,
    ttl: 5 * 60 * 1000 // 5 minutes
};

async function loadUsersAndProducts() {
    try {
        const now = Date.now();
        const assigneeSelect = document.getElementById('taskAssignee');
        const productSelect = document.getElementById('taskProduct');
        
        // Check cache first
        if (usersProductsCache.users && usersProductsCache.timestamp && 
            (now - usersProductsCache.timestamp) < usersProductsCache.ttl) {
            // Use cached data
            if (assigneeSelect) {
                assigneeSelect.innerHTML = '<option value="">Unassigned</option>';
                usersProductsCache.users.forEach(user => {
                    const option = document.createElement('option');
                    option.value = user.id;
                    option.textContent = user.name;
                    assigneeSelect.appendChild(option);
                });
            }
            if (productSelect) {
                productSelect.innerHTML = '<option value="">General</option>';
                usersProductsCache.products.forEach(product => {
                    const option = document.createElement('option');
                    option.value = product.id;
                    option.textContent = product.name;
                    productSelect.appendChild(option);
                });
            }
            return;
        }
        
        // Load users and products in parallel
        const [usersResponse, productsResponse] = await Promise.all([
            apiClient.get('/auth/users'),
            apiClient.get('/products')
        ]);
        
        if (usersResponse.ok) {
            const users = await usersResponse.json();
            usersProductsCache.users = users; // Cache users
            if (assigneeSelect) {
                assigneeSelect.innerHTML = '<option value="">Unassigned</option>';
                users.forEach(user => {
                    const option = document.createElement('option');
                    option.value = user.id;
                    option.textContent = user.name;
                    assigneeSelect.appendChild(option);
                });
            }
        }
        
        if (productsResponse.ok) {
            const products = await productsResponse.json();
            usersProductsCache.products = products; // Cache products
            if (productSelect) {
                productSelect.innerHTML = '<option value="">General</option>';
                products.forEach(product => {
                    const option = document.createElement('option');
                    option.value = product.id;
                    option.textContent = product.name;
                    productSelect.appendChild(option);
                });
            }
        }
        
        // Update cache timestamp
        usersProductsCache.timestamp = Date.now();
        
    } catch (error) {
        console.error('Failed to load users/products:', error);
    }
}

async function loadLabels() {
    try {
        const currentProject = projectSelector.getCurrentProject();
        let url = '/labels';
        if (currentProject && currentProject.id) {
            url += `?projectId=${currentProject.id}`;
        }
        
        const response = await apiClient.get(url);
        if (response.ok) {
            const labels = await response.json();
            const labelSelect = document.getElementById('taskLabel');
            if (labelSelect) {
                // Keep "No Label" option
                const noLabelOption = labelSelect.querySelector('option[value=""]');
                labelSelect.innerHTML = noLabelOption ? noLabelOption.outerHTML : '<option value="">No Label</option>';
                
                labels.forEach(label => {
                    const option = document.createElement('option');
                    option.value = label.name.toLowerCase();
                    option.textContent = label.name;
                    option.dataset.labelId = label.id;
                    option.dataset.labelColor = label.color || '#6B778C';
                    labelSelect.appendChild(option);
                });
            }
        }
    } catch (error) {
        console.error('Failed to load labels:', error);
    }
}

function showCreateLabelModal() {
    const modal = document.createElement('div');
    modal.id = 'createLabelModal';
    modal.style.cssText = 'display: flex; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 2000; align-items: center; justify-content: center;';
    
    modal.innerHTML = `
        <div style="background: white; border-radius: 8px; padding: 24px; width: 90%; max-width: 400px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="margin: 0; font-size: 20px; font-weight: 600;">Create New Label</h2>
                <button onclick="closeCreateLabelModal()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #666;">&times;</button>
            </div>
            <div id="createLabelError" style="display: none; background: #FFEBE6; border: 1px solid #DE350B; border-radius: 4px; padding: 12px; margin-bottom: 16px; color: #DE350B; font-size: 14px;"></div>
            <form id="createLabelForm" onsubmit="handleCreateLabel(event)">
                <div style="margin-bottom: 16px;">
                    <label style="display: block; margin-bottom: 6px; font-weight: 500; font-size: 14px;">Label Name *</label>
                    <input type="text" id="labelName" name="name" required style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; box-sizing: border-box;" placeholder="e.g., Bug, Feature, Enhancement">
                </div>
                <div style="margin-bottom: 16px;">
                    <label style="display: block; margin-bottom: 6px; font-weight: 500; font-size: 14px;">Color</label>
                    <input type="color" id="labelColor" name="color" value="#6B778C" style="width: 100%; padding: 4px; border: 1px solid #ddd; border-radius: 4px; height: 40px; cursor: pointer;">
                </div>
                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 6px; font-weight: 500; font-size: 14px;">Description (optional)</label>
                    <textarea id="labelDescription" name="description" rows="2" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; box-sizing: border-box; resize: vertical;"></textarea>
                </div>
                <div style="display: flex; gap: 12px; justify-content: flex-end;">
                    <button type="button" onclick="closeCreateLabelModal()" style="padding: 10px 20px; border: 1px solid #ddd; background: white; border-radius: 4px; cursor: pointer; font-size: 14px;">Cancel</button>
                    <button type="submit" style="padding: 10px 20px; background: #0052CC; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; font-weight: 500;">Create Label</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    document.getElementById('labelName').focus();
}

function closeCreateLabelModal() {
    const modal = document.getElementById('createLabelModal');
    if (modal) {
        modal.remove();
    }
}

async function handleCreateLabel(event) {
    event.preventDefault();
    const errorDiv = document.getElementById('createLabelError');
    errorDiv.style.display = 'none';
    
    const name = document.getElementById('labelName').value.trim();
    const color = document.getElementById('labelColor').value;
    const description = document.getElementById('labelDescription').value.trim();
    
    if (!name) {
        errorDiv.textContent = 'Label name is required';
        errorDiv.style.display = 'block';
        return;
    }
    
    try {
        const currentProject = projectSelector.getCurrentProject();
        const response = await apiClient.post('/labels', {
            name: name,
            color: color,
            description: description || null,
            projectId: currentProject && currentProject.id ? currentProject.id : null
        });
        
        if (response.ok) {
            const label = await response.json();
            
            // Add to label select dropdown
            const labelSelect = document.getElementById('taskLabel');
            if (labelSelect) {
                const option = document.createElement('option');
                option.value = label.name.toLowerCase();
                option.textContent = label.name;
                option.dataset.labelId = label.id;
                option.dataset.labelColor = label.color || '#6B778C';
                option.selected = true; // Select the newly created label
                labelSelect.appendChild(option);
            }
            
            // Close modal
            closeCreateLabelModal();
        } else {
            const error = await response.json();
            errorDiv.textContent = error.message || 'Failed to create label';
            errorDiv.style.display = 'block';
        }
    } catch (error) {
        console.error('Failed to create label:', error);
        errorDiv.textContent = 'Failed to create label. Please try again.';
        errorDiv.style.display = 'block';
    }
}

async function handleTaskSubmit(event) {
    event.preventDefault();
    
    const modal = document.getElementById('taskModal');
    const column = modal.dataset.column;
    const taskId = modal.dataset.taskId;
    
    // Convert dates to ISO 8601 format with UTC timezone
    let startDate = null;
    const startDateInput = document.getElementById('taskStartDate').value;
    if (startDateInput) {
        // HTML date input gives YYYY-MM-DD format
        // Convert to ISO 8601 with UTC timezone (midnight UTC)
        const date = new Date(startDateInput + 'T00:00:00Z');
        startDate = date.toISOString();
    }
    
    let dueDate = null;
    const dueDateInput = document.getElementById('taskDueDate').value;
    if (dueDateInput) {
        // HTML date input gives YYYY-MM-DD format
        // Convert to ISO 8601 with UTC timezone (midnight UTC)
        const date = new Date(dueDateInput + 'T00:00:00Z');
        dueDate = date.toISOString();
    }
    
    // Collect checklist items - improved selector to catch all checklist items
    const checklistItems = [];
    const checklistDiv = document.getElementById('taskChecklist');
    if (checklistDiv) {
        // Get all divs that contain a checkbox and text input (checklist items)
        const allDivs = checklistDiv.querySelectorAll('div');
        allDivs.forEach(item => {
            const checkbox = item.querySelector('input[type="checkbox"]');
            const textInput = item.querySelector('input[type="text"]');
            // Only process if it has both checkbox and text input (actual checklist item)
            if (checkbox && textInput && textInput.value.trim()) {
                checklistItems.push({
                    text: textInput.value.trim(),
                    completed: checkbox.checked || false
                });
            }
        });
    }
    
    // Get status from dropdown, fallback to column if not available
    const statusSelect = document.getElementById('taskStatus');
    const selectedStatus = statusSelect ? statusSelect.value : column;
    
    const taskData = {
        title: document.getElementById('taskTitle').value,
        description: document.getElementById('taskDescription').value,
        status: selectedStatus, // Use status from dropdown
        label: document.getElementById('taskLabel').value,
        assigneeId: document.getElementById('taskAssignee').value ? parseInt(document.getElementById('taskAssignee').value) : null,
        productId: document.getElementById('taskProduct').value ? parseInt(document.getElementById('taskProduct').value) : null,
        priority: parseInt(document.getElementById('taskPriority').value),
        startDate: startDate,
        dueDate: dueDate,
        checklist: checklistItems.length > 0 ? checklistItems : [] // Always send array, even if empty
    };
    
    console.log('Saving task with checklist items:', checklistItems.length, checklistItems);
    
    try {
        let response;
        if (taskId) {
            // Update existing task
            response = await apiClient.put(`/tasks/${taskId}`, taskData);
        } else {
            // Create new task
            const user = authService.getCurrentUser();
            if (user && user.id) {
                taskData.creatorId = user.id;
            }
            // Add current project ID
            const currentProject = projectSelector.getCurrentProject();
            if (currentProject && currentProject.id) {
                taskData.projectId = currentProject.id;
            }
            // New tasks default to "backlog" status
            if (!taskData.status || taskData.status === 'todo') {
                taskData.status = 'backlog';
            }
            response = await apiClient.post('/tasks', taskData);
        }
        
        if (response.ok) {
            const savedTask = await response.json();
            closeTaskModal();
            
            // Check if we're on the backlog page
            const isBacklogPage = window.location.pathname.includes('backlog') || window.location.hash === '#backlog';
            
            if (isBacklogPage && typeof loadBacklogTasks === 'function') {
                // Reload backlog if on backlog page
                loadBacklogTasks();
            } else {
                // Just reload the board - don't reopen the modal
                debouncedRender();
                setTimeout(() => loadTasksFromAPI(), 300);
            }
        } else {
            const error = await response.json();
            // Show error in modal instead of alert
            const errorDiv = document.createElement('div');
            errorDiv.style.cssText = 'background: #fee; color: #c33; padding: 12px; border-radius: 4px; margin-bottom: 16px;';
            errorDiv.textContent = error.message || 'Failed to save task';
            const form = document.getElementById('taskForm');
            form.insertBefore(errorDiv, form.firstChild);
            setTimeout(() => errorDiv.remove(), 5000);
        }
    } catch (error) {
        console.error('Error saving task:', error);
        // Show error in modal instead of alert
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = 'background: #fee; color: #c33; padding: 12px; border-radius: 4px; margin-bottom: 16px;';
        errorDiv.textContent = 'Failed to save task. Please try again.';
        const form = document.getElementById('taskForm');
        form.insertBefore(errorDiv, form.firstChild);
        setTimeout(() => errorDiv.remove(), 5000);
    }
}

async function loadTasksFromAPI() {
    try {
        // Get current project
        const currentProject = projectSelector.getCurrentProject();
        if (!currentProject) {
            // No project selected - redirect to project selector
            window.location.href = 'milo-select-project.html';
            return Promise.resolve();
        }

        // Build query with filters
        let queryUrl = `/tasks?projectId=${currentProject.id}`;
        
        // Check for assignee filter from dropdown
        const assigneeFilter = document.getElementById('assigneeFilter')?.value;
        if (assigneeFilter && assigneeFilter !== '' && assigneeFilter !== 'unassigned') {
            // Filter by specific assignee
            queryUrl += `&assigneeId=${assigneeFilter}`;
        }
        
        // Load tasks filtered by project and assignee
        const response = await apiClient.get(queryUrl);
        if (response.ok) {
            const apiTasks = await response.json();
            
            // Convert API tasks to board format
            tasks = {
                todo: [],
                progress: [],
                review: [],
                done: []
            };
            
            // Apply unassigned filter on frontend if needed
            const assigneeFilterValue = document.getElementById('assigneeFilter')?.value;
            let filteredApiTasks = apiTasks;
            if (assigneeFilterValue === 'unassigned') {
                filteredApiTasks = apiTasks.filter(task => !task.assigneeId || !task.assignee);
            }
            
            filteredApiTasks.forEach(task => {
                // Calculate assignee initials properly
                let assigneeInitials = 'UN';
                let assigneeName = null;
                if (task.assignee && task.assignee.name) {
                    assigneeName = task.assignee.name;
                    const nameParts = task.assignee.name.trim().split(' ');
                    if (nameParts.length >= 2) {
                        // First letter of first name + first letter of last name
                        assigneeInitials = (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase();
                    } else if (nameParts.length === 1) {
                        // Single name - use first 2 letters
                        assigneeInitials = nameParts[0].substring(0, 2).toUpperCase();
                    }
                }
                
                const taskObj = {
                    id: task.id, // Use numeric ID for editing
                    taskId: task.taskId || `TASK-${task.id}`, // Display ID
                    title: task.title,
                    description: task.description,
                    status: task.status,
                    label: task.label || 'accounts',
                    assignee: assigneeInitials, // Initials for avatar display
                    assigneeName: assigneeName, // Full name for display
                    assigneeId: task.assigneeId,
                    assigneeEmail: task.assignee ? task.assignee.email : null,
                    assigneeObject: task.assignee, // Store full assignee object (renamed to avoid conflict)
                    productId: task.productId,
                    priority: task.priority,
                    dueDate: task.dueDate,
                    subtasks: Math.floor(Math.random() * 5) + 1 // Mock subtask count - replace with actual when available
                };
                
                // Map API status to board columns
                let boardStatus = 'todo';
                if (task.status === 'progress' || task.status === 'in-progress') boardStatus = 'progress';
                else if (task.status === 'review' || task.status === 'in-review') boardStatus = 'review';
                else if (task.status === 'done' || task.status === 'completed') boardStatus = 'done';
                else if (task.status === 'backlog') boardStatus = 'todo'; // Backlog tasks show in todo column
                else boardStatus = 'todo';
                
                if (tasks[boardStatus]) {
                    tasks[boardStatus].push(taskObj);
                } else {
                    tasks.todo.push(taskObj);
                }
            });
            
                renderBoard();
                
                // Apply filters after loading tasks
                if (typeof filterTasks === 'function') {
                    filterTasks();
                }
                
                return Promise.resolve();
            }
        } catch (error) {
            console.error('Failed to load tasks:', error);
            return Promise.reject(error);
        }
    }

let draggedElement = null;

function handleDragStart(e) {
    draggedElement = this;
    this.style.opacity = '0.5';
}

function handleDragEnd(e) {
    this.style.opacity = '1';
    draggedElement = null;
}

// Add drop zones - wait for DOM to be ready
function setupDragAndDrop() {
    const columns = ['todoItems', 'progressItems', 'reviewItems', 'doneItems'];
    
    columns.forEach(columnId => {
        const column = document.getElementById(columnId);
        if (column) {
            column.addEventListener('dragover', handleDragOver);
            column.addEventListener('drop', handleDrop);
        }
    });
}

// Setup drag and drop when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupDragAndDrop);
} else {
    setupDragAndDrop();
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
}

async function handleDrop(e) {
    e.preventDefault();
    
    if (!draggedElement) {
        console.error('No dragged element');
        return;
    }

    const taskId = draggedElement.dataset.taskId;
    if (!taskId) {
        console.error('No task ID found on dragged element', draggedElement);
        return;
    }

    // Get new status from column
    const newColumnId = e.currentTarget.id;
    let newStatus = 'todo';
    if (newColumnId === 'progressItems') newStatus = 'progress';
    else if (newColumnId === 'reviewItems') newStatus = 'review';
    else if (newColumnId === 'doneItems') newStatus = 'done';

    console.log(`Moving task ${taskId} to status: ${newStatus}`);

    // Find task in current tasks
    let task = null;
    for (const status in tasks) {
        task = tasks[status].find(t => {
            // Match by numeric ID or taskId string
            return t.id == taskId || t.id.toString() === taskId || t.taskId === taskId;
        });
        if (task) break;
    }

    if (!task) {
        console.error('Task not found in local tasks:', taskId);
        // Try to update directly using the taskId as numeric ID
        try {
            const updateResponse = await apiClient.put(`/tasks/${taskId}`, {
                status: newStatus
            });

            if (updateResponse.ok) {
                await loadTasksFromAPI();
                renderBoard();
            } else {
                const error = await updateResponse.json();
                console.error('Failed to update task status:', error);
                renderBoard();
            }
        } catch (error) {
            console.error('Error updating task:', error);
            renderBoard();
        }
        return;
    }

    // Update task status via API using the numeric ID
    try {
        const updateResponse = await apiClient.put(`/tasks/${task.id}`, {
            status: newStatus
        });

                if (updateResponse.ok) {
                    // Update local task status immediately for better UX
                    task.status = newStatus;
                    // Move task to correct column
                    for (const status in tasks) {
                        const index = tasks[status].findIndex(t => t.id == task.id);
                        if (index !== -1) {
                            tasks[status].splice(index, 1);
                            break;
                        }
                    }
                    if (tasks[newStatus]) {
                        tasks[newStatus].push(task);
                    }
                    debouncedRender();
                    // Reload from API in background to ensure sync
                    setTimeout(() => loadTasksFromAPI(), 500);
                } else {
                    const error = await updateResponse.json();
                    console.error('Failed to update task status:', error);
                    // Revert visual change
                    renderBoard();
                }
    } catch (error) {
        console.error('Error updating task:', error);
        // Revert visual change
        renderBoard();
    }
}

async function loadTasks() {
    await loadTasksFromAPI();
}

// Delete task function
async function deleteTask(taskId) {
    try {
        const response = await apiClient.delete(`/tasks/${taskId}`);
        if (response.ok) {
            closeViewTaskModal();
            await loadTasksFromAPI();
            renderBoard();
        } else {
            const error = await response.json().catch(() => ({ message: 'Failed to delete task' }));
            console.error('Failed to delete task:', error.message || 'Unknown error');
            // Silently fail - no popup
        }
    } catch (error) {
        console.error('Error deleting task:', error);
        // Silently fail - no popup
    }
}

// Performance optimization: Debounce render calls
let renderTimeout = null;
function debouncedRender() {
    if (renderTimeout) {
        clearTimeout(renderTimeout);
    }
    renderTimeout = setTimeout(() => {
        renderBoard();
    }, 100); // Debounce by 100ms
}

// Checklist functions
function addChecklistItem() {
    const checklistDiv = document.getElementById('taskChecklist');
    if (!checklistDiv) return;
    
    // Clear "No checklist items yet" message
    if (checklistDiv.querySelector('div[style*="color: #6B778C"]')) {
        checklistDiv.innerHTML = '';
    }
    
    // Create new checklist item with inline input
    const itemDiv = document.createElement('div');
    itemDiv.style.cssText = 'display: flex; align-items: center; gap: 8px; margin-bottom: 8px; padding: 6px; background: white; border-radius: 3px;';
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.style.cursor = 'pointer';
    
    const textInput = document.createElement('input');
    textInput.type = 'text';
    textInput.placeholder = 'Enter checklist item...';
    textInput.style.cssText = 'flex: 1; padding: 4px 8px; border: 1px solid #ddd; border-radius: 3px; font-size: 13px;';
    
    const removeBtn = document.createElement('button');
    removeBtn.textContent = '×';
    removeBtn.onclick = function() { removeChecklistItemFromModal(this); };
    removeBtn.style.cssText = 'background: none; border: none; color: #DE350B; cursor: pointer; font-size: 16px; padding: 0 8px;';
    
    itemDiv.appendChild(checkbox);
    itemDiv.appendChild(textInput);
    itemDiv.appendChild(removeBtn);
    
    checklistDiv.appendChild(itemDiv);
    textInput.focus();
}

function removeChecklistItemFromModal(button) {
    button.parentElement.remove();
    const checklistDiv = document.getElementById('taskChecklist');
    if (checklistDiv && checklistDiv.children.length === 0) {
        checklistDiv.innerHTML = '<div style="color: #6B778C; font-size: 12px; text-align: center; padding: 8px;">No checklist items yet</div>';
    }
}

function addChecklistItemToView(taskId) {
    // This function is for view mode - can be implemented later if needed
    console.log('Adding checklist item to task', taskId);
    // TODO: Implement API call with inline input (no popup)
}

function toggleChecklistItem(taskId, index, completed) {
    console.log('Toggling checklist item', taskId, index, completed);
    // TODO: Implement API call
}

function removeChecklistItem(taskId, index) {
    // Remove without confirmation
    console.log('Removing checklist item', taskId, index);
    // TODO: Implement API call
}

// Comment functions
function addCommentToTask(taskId) {
    const input = document.getElementById('newCommentInput');
    if (!input || !input.value.trim()) return;
    
    const commentText = input.value.trim();
    input.value = '';
    
    console.log('Adding comment to task', taskId, commentText);
    // TODO: Implement API call
}

// Convert Markdown links to HTML
function renderMarkdownLinks(text) {
    if (!text) return '';
    
    // Convert Markdown links [text](url) to HTML links
    return text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" style="color: #0052CC; text-decoration: underline; cursor: pointer;">$1</a>');
}

// Update description preview
function updateDescriptionPreview() {
    const descriptionTextarea = document.getElementById('taskDescription');
    const descriptionPreview = document.getElementById('taskDescriptionPreview');
    const editBtn = document.getElementById('editDescriptionBtn');
    
    if (!descriptionTextarea || !descriptionPreview) return;
    
    const description = descriptionTextarea.value || '';
    
    if (description.trim()) {
        // Show preview with rendered Markdown links
        descriptionPreview.innerHTML = renderMarkdownLinks(description);
        descriptionPreview.style.display = 'block';
        descriptionTextarea.style.display = 'none';
        if (editBtn) editBtn.style.display = 'inline-block';
    } else {
        descriptionPreview.style.display = 'none';
        descriptionTextarea.style.display = 'block';
        if (editBtn) editBtn.style.display = 'none';
    }
}

// Edit description (switch from preview to edit mode)
function editDescription() {
    const descriptionTextarea = document.getElementById('taskDescription');
    const descriptionPreview = document.getElementById('taskDescriptionPreview');
    const editBtn = document.getElementById('editDescriptionBtn');
    
    if (descriptionTextarea && descriptionPreview) {
        descriptionPreview.style.display = 'none';
        descriptionTextarea.style.display = 'block';
        descriptionTextarea.focus();
        if (editBtn) editBtn.style.display = 'none';
    }
}

// Make functions globally accessible
window.showCreateTaskModal = function(column = 'todo') {
    showTaskModal(column);
};
window.closeTaskModal = closeTaskModal;
window.handleTaskSubmit = handleTaskSubmit;
window.viewTask = viewTask;
window.deleteTask = deleteTask;
window.updateDescriptionPreview = updateDescriptionPreview;
window.editDescription = editDescription;
window.showCreateLabelModal = showCreateLabelModal;
window.closeCreateLabelModal = closeCreateLabelModal;
window.handleCreateLabel = handleCreateLabel;
window.addChecklistItem = addChecklistItem;
window.removeChecklistItemFromModal = removeChecklistItemFromModal;
window.addChecklistItemToView = addChecklistItemToView;
window.toggleChecklistItem = toggleChecklistItem;
window.removeChecklistItem = removeChecklistItem;
window.addCommentToTask = addCommentToTask;
window.addCommentToTaskModal = addCommentToTaskModal;
window.deleteTaskFromModal = deleteTaskFromModal;
window.loadTaskComments = loadTaskComments;

