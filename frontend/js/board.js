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
        document.getElementById('userName').textContent = userName;
        const initials = userName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
        document.getElementById('userAvatar').textContent = initials;
    }

    // Setup user menu
    setupUserMenu();

    // Render board
    renderBoard();

    // Load tasks from API (when available)
    loadTasks();
});

function setupUserMenu() {
    const userMenu = document.getElementById('userMenu');
    const dropdown = document.createElement('div');
    dropdown.className = 'dropdown-menu';
    dropdown.innerHTML = `
        <div class="dropdown-item" onclick="authService.logout()">Logout</div>
    `;
    document.body.appendChild(dropdown);

    userMenu.addEventListener('click', function(e) {
        e.stopPropagation();
        dropdown.classList.toggle('show');
        
        const rect = userMenu.getBoundingClientRect();
        dropdown.style.top = (rect.bottom + 4) + 'px';
        dropdown.style.right = (window.innerWidth - rect.right) + 'px';
    });

    document.addEventListener('click', function() {
        dropdown.classList.remove('show');
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

    return card;
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
    modal.dataset.taskId = task ? task.id : '';
    
    if (task) {
        document.getElementById('taskTitle').value = task.title || '';
        document.getElementById('taskDescription').value = task.description || '';
        document.getElementById('taskLabel').value = task.label || 'accounts';
        document.getElementById('taskAssignee').value = task.assigneeId || '';
        document.getElementById('taskProduct').value = task.productId || '';
        document.getElementById('taskPriority').value = task.priority || 0;
        document.getElementById('taskDueDate').value = task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '';
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
                        <label style="display: block; margin-bottom: 6px; font-weight: 500; font-size: 14px;">Label</label>
                        <select id="taskLabel" name="label" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; box-sizing: border-box;">
                            <option value="accounts">Accounts</option>
                            <option value="billing">Billing</option>
                            <option value="forms">Forms</option>
                            <option value="feedback">Feedback</option>
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
    } catch (error) {
        console.error('Failed to load users/products:', error);
    }
}

async function handleTaskSubmit(event) {
    event.preventDefault();
    
    const modal = document.getElementById('taskModal');
    const column = modal.dataset.column;
    const taskId = modal.dataset.taskId;
    
    const taskData = {
        title: document.getElementById('taskTitle').value,
        description: document.getElementById('taskDescription').value,
        status: column,
        label: document.getElementById('taskLabel').value,
        assigneeId: document.getElementById('taskAssignee').value ? parseInt(document.getElementById('taskAssignee').value) : null,
        productId: document.getElementById('taskProduct').value ? parseInt(document.getElementById('taskProduct').value) : null,
        priority: parseInt(document.getElementById('taskPriority').value),
        dueDate: document.getElementById('taskDueDate').value || null
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
                    id: task.taskId || `TASK-${task.id}`,
                    title: task.title,
                    description: task.description,
                    label: task.label || 'accounts',
                    assignee: task.assignee ? task.assignee.name.substring(0, 2).toUpperCase() : 'UN',
                    assigneeId: task.assigneeId,
                    assigneeEmail: task.assignee ? task.assignee.email : null,
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

