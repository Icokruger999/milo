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
    
    card.innerHTML = `
        <div class="task-title">${task.title}</div>
        <div class="task-meta">
            <span class="task-label ${task.label}">${task.label.toUpperCase()}</span>
            <span class="task-id">${task.id}</span>
        </div>
        <div class="task-footer">
            <div class="task-assignee">${task.assignee}</div>
            <div class="task-icons">
                <svg class="task-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"></path>
                </svg>
            </div>
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
    const title = prompt('Enter task title:');
    if (!title) return;

    const newTask = {
        id: 'NUC-' + Math.floor(Math.random() * 1000),
        title: title,
        label: 'accounts',
        assignee: 'ME'
    };

    tasks[column === 'todo' ? 'todo' : column === 'progress' ? 'progress' : column === 'review' ? 'review' : 'done'].push(newTask);
    renderBoard();
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

// Add drop zones
document.addEventListener('DOMContentLoaded', function() {
    const columns = ['todoItems', 'progressItems', 'reviewItems', 'doneItems'];
    
    columns.forEach(columnId => {
        const column = document.getElementById(columnId);
        column.addEventListener('dragover', handleDragOver);
        column.addEventListener('drop', handleDrop);
    });
});

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
}

function handleDrop(e) {
    e.preventDefault();
    
    if (!draggedElement) return;

    const taskId = draggedElement.querySelector('.task-id').textContent;
    const taskTitle = draggedElement.querySelector('.task-title').textContent;
    const taskLabel = draggedElement.querySelector('.task-label').textContent.toLowerCase();
    const taskAssignee = draggedElement.querySelector('.task-assignee').textContent;

    // Remove from old column
    const oldColumn = draggedElement.closest('.column-items').id.replace('Items', '');
    tasks[oldColumn] = tasks[oldColumn].filter(t => t.id !== taskId);

    // Add to new column
    const newColumn = e.currentTarget.id.replace('Items', '');
    tasks[newColumn].push({
        id: taskId,
        title: taskTitle,
        label: taskLabel,
        assignee: taskAssignee
    });

    renderBoard();
}

async function loadTasks() {
    // TODO: Load tasks from API when backend is ready
    // try {
    //     const response = await apiClient.get('/api/tasks');
    //     if (response.ok) {
    //         const data = await response.json();
    //         tasks = data;
    //         renderBoard();
    //     }
    // } catch (error) {
    //     console.error('Failed to load tasks:', error);
    // }
}

