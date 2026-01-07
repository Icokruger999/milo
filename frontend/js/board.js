// Milo Board functionality

// Sample tasks data
let tasks = {
    todo: [
        { id: 'NUC-344', title: 'Optimize experience for mobile web', label: 'billing', assignee: 'OJ' },
        { id: 'NUC-360', title: 'Onboard workout options (OWO)', label: 'accounts', assignee: 'BL' },
        { id: 'NUC-337', title: 'Multi-dest search UI mobileweb', label: 'accounts', assignee: 'TE' }
    ],
    progress: [
        { id: 'NUC-342', title: 'Fast trip search', label: 'accounts', assignee: 'YE' },
        { id: 'NUC-335', title: 'Affelite links integration - frontend', label: 'billing', assignee: 'GR' }
    ],
    review: [
        { id: 'NUC-367', title: 'Revise and streamline booking flow', label: 'accounts', assignee: 'YE' },
        { id: 'NUC-358', title: 'Travel suggestion experiments', label: 'accounts', assignee: 'TE' }
    ],
    done: [
        { id: 'NUC-344', title: 'Customers reporting shopping cart purchasing issues', label: 'accounts', assignee: 'OJ' },
        { id: 'NUC-360', title: 'Shopping cart purchasing issues with the BG web store', label: 'accounts', assignee: 'BL' }
    ]
};

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
            <div class="task-assignee">${task.assignee}</div>
        </div>
    `;

    // Add drag and drop
    card.addEventListener('dragstart', handleDragStart);
    card.addEventListener('dragend', handleDragEnd);
    
    // Make card clickable to view/edit
    card.addEventListener('click', function() {
        viewTask(task);
    });

    return card;
}

// View/Edit Task Modal
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
    
    const modal = document.createElement('div');
    modal.id = 'viewTaskModal';
    modal.style.cssText = 'display: flex; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 2000; align-items: center; justify-content: center;';
    
    modal.innerHTML = `
        <div style="background: white; border-radius: 8px; padding: 24px; width: 90%; max-width: 600px; max-height: 90vh; overflow-y: auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="margin: 0; font-size: 20px; font-weight: 600;">${fullTask.title}</h2>
                <button onclick="closeViewTaskModal()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #666;">&times;</button>
            </div>
            <div style="margin-bottom: 16px;">
                <span class="task-label ${fullTask.label}">${(fullTask.label || 'accounts').toUpperCase()}</span>
                <span style="margin-left: 8px; color: #6B778C; font-size: 12px; font-family: monospace;">${fullTask.id}</span>
            </div>
            ${fullTask.description ? `<div style="margin-bottom: 16px; padding: 12px; background: #F4F5F7; border-radius: 4px;"><strong>Description:</strong><br>${fullTask.description}</div>` : ''}
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
                <div>
                    <strong style="font-size: 12px; color: #6B778C; text-transform: uppercase;">Status</strong>
                    <div style="margin-top: 4px;">${(fullTask.status || 'todo').toUpperCase()}</div>
                </div>
                <div>
                    <strong style="font-size: 12px; color: #6B778C; text-transform: uppercase;">Assignee</strong>
                    <div style="margin-top: 4px;">${(fullTask.assignee && fullTask.assignee.name) || fullTask.assigneeName || 'Unassigned'}</div>
                </div>
                <div>
                    <strong style="font-size: 12px; color: #6B778C; text-transform: uppercase;">Priority</strong>
                    <div style="margin-top: 4px;">${['Low', 'Medium', 'High'][fullTask.priority || 0]}</div>
                </div>
                ${fullTask.dueDate ? `<div>
                    <strong style="font-size: 12px; color: #6B778C; text-transform: uppercase;">Due Date</strong>
                    <div style="margin-top: 4px;">${new Date(fullTask.dueDate).toLocaleDateString()}</div>
                </div>` : ''}
            </div>
            <div style="display: flex; gap: 12px; justify-content: flex-end; margin-top: 24px;">
                <button onclick="closeViewTaskModal()" style="padding: 10px 20px; border: 1px solid #ddd; background: white; border-radius: 4px; cursor: pointer; font-size: 14px;">Close</button>
                <button onclick="editTask('${fullTask.id}')" style="padding: 10px 20px; background: #0052CC; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; font-weight: 500;">Edit Task</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
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

function showTaskModal(column, task = null) {
    let modal = document.getElementById('taskModal');
    if (!modal) {
        createTaskModal();
        modal = document.getElementById('taskModal');
    }
    
    modal.dataset.column = column;
    modal.dataset.taskId = task ? (task.id || task.taskId) : '';
    
    // Update form title and button
    const formTitle = modal.querySelector('h2');
    if (formTitle) {
        formTitle.textContent = task ? 'Edit Task' : 'Create Task';
    }
    const submitButton = modal.querySelector('button[type="submit"]');
    if (submitButton) {
        submitButton.textContent = task ? 'Update Task' : 'Create Task';
    }
    
    if (task) {
        document.getElementById('taskTitle').value = task.title || '';
        document.getElementById('taskDescription').value = task.description || '';
        document.getElementById('taskLabel').value = task.label || '';
        document.getElementById('taskAssignee').value = task.assigneeId || '';
        document.getElementById('taskProduct').value = task.productId || '';
        document.getElementById('taskPriority').value = task.priority || 0;
        if (task.dueDate) {
            const dueDate = new Date(task.dueDate);
            document.getElementById('taskDueDate').value = dueDate.toISOString().split('T')[0];
        } else {
            document.getElementById('taskDueDate').value = '';
        }
    } else {
        document.getElementById('taskForm').reset();
        document.getElementById('taskColumn').value = column;
    }
    
    modal.style.display = 'flex';
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
    modal.style.cssText = 'display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 1000; align-items: center; justify-content: center;';
    
    modal.innerHTML = `
        <div style="background: white; border-radius: 8px; padding: 24px; width: 90%; max-width: 500px; max-height: 90vh; overflow-y: auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="margin: 0; font-size: 20px; font-weight: 600;">Create Task</h2>
                <button onclick="closeTaskModal()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #666;">&times;</button>
            </div>
            <form id="taskForm" onsubmit="handleTaskSubmit(event)">
                <input type="hidden" id="taskColumn" name="column">
                <input type="hidden" id="taskId" name="taskId">
                
                <div style="margin-bottom: 16px;">
                    <label style="display: block; margin-bottom: 6px; font-weight: 500; font-size: 14px;">Title *</label>
                    <input type="text" id="taskTitle" name="title" required style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; box-sizing: border-box;">
                </div>
                
                <div style="margin-bottom: 16px;">
                    <label style="display: block; margin-bottom: 6px; font-weight: 500; font-size: 14px;">Description</label>
                    <textarea id="taskDescription" name="description" rows="3" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; box-sizing: border-box; resize: vertical;"></textarea>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
                    <div>
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
                            <label style="display: block; font-weight: 500; font-size: 14px;">Label</label>
                            <button type="button" onclick="showCreateLabelModal()" style="background: none; border: none; color: #0052CC; font-size: 12px; cursor: pointer; padding: 0;">+ New Label</button>
                        </div>
                        <select id="taskLabel" name="label" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; box-sizing: border-box;">
                            <option value="">No Label</option>
                        </select>
                    </div>
                    
                    <div>
                        <label style="display: block; margin-bottom: 6px; font-weight: 500; font-size: 14px;">Priority</label>
                        <select id="taskPriority" name="priority" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; box-sizing: border-box;">
                            <option value="0">Low</option>
                            <option value="1">Medium</option>
                            <option value="2">High</option>
                        </select>
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
                    <div>
                        <label style="display: block; margin-bottom: 6px; font-weight: 500; font-size: 14px;">Assignee</label>
                        <select id="taskAssignee" name="assigneeId" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; box-sizing: border-box;">
                            <option value="">Unassigned</option>
                        </select>
                    </div>
                    
                    <div>
                        <label style="display: block; margin-bottom: 6px; font-weight: 500; font-size: 14px;">Product</label>
                        <select id="taskProduct" name="productId" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; box-sizing: border-box;">
                            <option value="">General</option>
                        </select>
                    </div>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 6px; font-weight: 500; font-size: 14px;">Due Date</label>
                    <input type="date" id="taskDueDate" name="dueDate" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; box-sizing: border-box;">
                </div>
                
                <div style="display: flex; gap: 12px; justify-content: flex-end;">
                    <button type="button" onclick="closeTaskModal()" style="padding: 10px 20px; border: 1px solid #ddd; background: white; border-radius: 4px; cursor: pointer; font-size: 14px;">Cancel</button>
                    <button type="submit" style="padding: 10px 20px; background: #0052CC; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; font-weight: 500;">Create Task</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Load users and products
    loadUsersAndProducts();
}

async function loadUsersAndProducts() {
    try {
        // Load users
        const usersResponse = await apiClient.get('/auth/users');
        if (usersResponse.ok) {
            const users = await usersResponse.json();
            const assigneeSelect = document.getElementById('taskAssignee');
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
        
        // Load products
        const productsResponse = await apiClient.get('/products');
        if (productsResponse.ok) {
            const products = await productsResponse.json();
            const productSelect = document.getElementById('taskProduct');
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
        
        // Load labels
        await loadLabels();
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
    
    // Convert date to ISO 8601 format with UTC timezone
    let dueDate = null;
    const dueDateInput = document.getElementById('taskDueDate').value;
    if (dueDateInput) {
        // HTML date input gives YYYY-MM-DD format
        // Convert to ISO 8601 with UTC timezone (midnight UTC)
        const date = new Date(dueDateInput + 'T00:00:00Z');
        dueDate = date.toISOString();
    }
    
    const taskData = {
        title: document.getElementById('taskTitle').value,
        description: document.getElementById('taskDescription').value,
        status: column,
        label: document.getElementById('taskLabel').value,
        assigneeId: document.getElementById('taskAssignee').value ? parseInt(document.getElementById('taskAssignee').value) : null,
        productId: document.getElementById('taskProduct').value ? parseInt(document.getElementById('taskProduct').value) : null,
        priority: parseInt(document.getElementById('taskPriority').value),
        dueDate: dueDate
    };
    
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
            response = await apiClient.post('/tasks', taskData);
        }
        
        if (response.ok) {
            closeTaskModal();
            await loadTasksFromAPI();
            renderBoard();
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
            return;
        }

        // Load tasks filtered by project
        const response = await apiClient.get(`/tasks?projectId=${currentProject.id}`);
        if (response.ok) {
            const apiTasks = await response.json();
            
            // Convert API tasks to board format
            tasks = {
                todo: [],
                progress: [],
                review: [],
                done: []
            };
            
            apiTasks.forEach(task => {
                const taskObj = {
                    id: task.id, // Use numeric ID for editing
                    taskId: task.taskId || `TASK-${task.id}`, // Display ID
                    title: task.title,
                    description: task.description,
                    status: task.status,
                    label: task.label || 'accounts',
                    assignee: task.assignee ? task.assignee.name.substring(0, 2).toUpperCase() : 'UN', // For avatar display
                    assigneeName: task.assignee ? task.assignee.name : null, // Full name for display
                    assigneeId: task.assigneeId,
                    assigneeEmail: task.assignee ? task.assignee.email : null,
                    assignee: task.assignee, // Store full assignee object
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
                else boardStatus = 'todo';
                
                if (tasks[boardStatus]) {
                    tasks[boardStatus].push(taskObj);
                } else {
                    tasks.todo.push(taskObj);
                }
            });
            
            renderBoard();
        }
    } catch (error) {
        console.error('Failed to load tasks:', error);
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
    
    if (!draggedElement) return;

    const taskId = draggedElement.dataset.taskId;
    if (!taskId) return;

    // Get new status from column
    const newColumnId = e.currentTarget.id;
    let newStatus = 'todo';
    if (newColumnId === 'progressItems') newStatus = 'progress';
    else if (newColumnId === 'reviewItems') newStatus = 'review';
    else if (newColumnId === 'doneItems') newStatus = 'done';

    // Find task in current tasks
    let task = null;
    for (const status in tasks) {
        task = tasks[status].find(t => (t.id === taskId || t.taskId === taskId));
        if (task) break;
    }

    if (!task) return;

    // Update task status via API
    try {
        // Extract numeric ID from taskId (e.g., "NUC-344" -> find task with that taskId)
        const response = await apiClient.get('/tasks');
        if (response.ok) {
            const allTasks = await response.json();
            const apiTask = allTasks.find(t => t.taskId === taskId || t.id.toString() === taskId.replace('TASK-', ''));
            
            if (apiTask) {
                const updateResponse = await apiClient.put(`/tasks/${apiTask.id}`, {
                    status: newStatus
                });

                if (updateResponse.ok) {
                    // Reload tasks from API
                    await loadTasksFromAPI();
                    renderBoard();
                } else {
                    console.error('Failed to update task status');
                    // Revert visual change
                    renderBoard();
                }
            }
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

// Make functions globally accessible
window.showCreateTaskModal = function(column = 'todo') {
    showTaskModal(column);
};
window.closeTaskModal = closeTaskModal;
window.handleTaskSubmit = handleTaskSubmit;
window.viewTask = viewTask;
window.showCreateLabelModal = showCreateLabelModal;
window.closeCreateLabelModal = closeCreateLabelModal;
window.handleCreateLabel = handleCreateLabel;

