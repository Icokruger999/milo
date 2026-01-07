// Board Filters and Search Functionality
let currentFilters = {
    search: '',
    epic: '',
    type: '',
    priority: '',
    label: '',
    assignee: '',
    groupBy: 'none'
};

let allTasks = [];
let filteredTasks = [];

// Search functionality
function handleSearch(event) {
    if (event.key === 'Enter' || event.type === 'keyup') {
        currentFilters.search = event.target.value.toLowerCase();
        applyFilters();
    }
}

// Apply all filters
function applyFilters() {
    currentFilters.epic = document.getElementById('epicFilter')?.value || '';
    currentFilters.type = document.getElementById('typeFilter')?.value || '';
    currentFilters.priority = document.getElementById('priorityFilter')?.value || '';
    currentFilters.label = document.getElementById('labelFilter')?.value || '';
    currentFilters.assignee = document.getElementById('assigneeFilter')?.value || '';
    
    // Reload tasks from API with assignee filter if set
    if (typeof loadTasksFromAPI === 'function') {
        loadTasksFromAPI();
    } else {
        filterTasks();
    }
}

// Filter tasks based on current filters
function filterTasks() {
    filteredTasks = {
        todo: [],
        progress: [],
        review: [],
        done: []
    };
    
    // Get all tasks from the board state
    const allBoardTasks = [];
    if (typeof tasks !== 'undefined') {
        allBoardTasks.push(...tasks.todo, ...tasks.progress, ...tasks.review, ...tasks.done);
    }
    
    allBoardTasks.forEach(task => {
        // Apply search filter
        if (currentFilters.search) {
            const searchLower = currentFilters.search.toLowerCase();
            if (!task.title.toLowerCase().includes(searchLower) && 
                !(task.description || '').toLowerCase().includes(searchLower) &&
                !(task.id || '').toLowerCase().includes(searchLower)) {
                return; // Skip this task
            }
        }
        
        // Apply label filter
        if (currentFilters.label && task.label !== currentFilters.label) {
            return;
        }
        
        // Apply priority filter
        if (currentFilters.priority && task.priority !== parseInt(currentFilters.priority)) {
            return;
        }
        
        // Apply assignee filter
        if (currentFilters.assignee) {
            if (currentFilters.assignee === 'unassigned') {
                // Show only unassigned tasks
                if (task.assigneeId) {
                    return; // Skip assigned tasks
                }
            } else {
                // Show only tasks assigned to selected user
                const filterAssigneeId = parseInt(currentFilters.assignee);
                if (!task.assigneeId || task.assigneeId !== filterAssigneeId) {
                    return; // Skip tasks not assigned to this user
                }
            }
        }
        
        // Add to appropriate column
        const status = task.status || 'todo';
        if (filteredTasks[status]) {
            filteredTasks[status].push(task);
        } else {
            filteredTasks.todo.push(task);
        }
    });
    
    // Re-render board with filtered tasks
    renderFilteredBoard();
}

// Render board with filtered tasks
function renderFilteredBoard() {
    // Temporarily replace tasks with filtered tasks
    const originalTasks = tasks;
    tasks = filteredTasks;
    renderBoard();
    tasks = originalTasks; // Restore original
}

// Group By functionality
function applyGroupBy() {
    currentFilters.groupBy = document.getElementById('groupByFilter')?.value || 'none';
    // Group by logic will be implemented based on selected option
    if (currentFilters.groupBy !== 'none') {
        // TODO: Implement grouping
        console.log('Group by:', currentFilters.groupBy);
    } else {
        // Reset to normal view
        filterTasks();
    }
}

// Load project members for avatars
async function loadProjectMembers() {
    try {
        const currentProject = projectSelector.getCurrentProject();
        if (!currentProject) return;
        
        const response = await apiClient.get(`/projects/${currentProject.id}/members`);
        if (response.ok) {
            const members = await response.json();
            const avatarsContainer = document.getElementById('boardUserAvatars');
            
            if (members.length === 0) {
                avatarsContainer.innerHTML = '';
                return;
            }
            
            // Show up to 4 members, then +X
            const displayMembers = members.slice(0, 4);
            const remainingCount = members.length - 4;
            
            avatarsContainer.innerHTML = displayMembers.map((member, index) => {
                const initials = (member.name || member.email || 'U').split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
                const colors = ['#DE350B', '#36B37E', '#0052CC', '#6554C0', '#FFAB00'];
                return `<div class="user-avatar-small" style="background: ${colors[index % colors.length]};" title="${member.name || member.email}">${initials}</div>`;
            }).join('') + (remainingCount > 0 ? `<div class="user-avatar-more">+${remainingCount}</div>` : '');
            
            // Also populate assignee filter
            const assigneeFilter = document.getElementById('assigneeFilter');
            if (assigneeFilter) {
                const currentValue = assigneeFilter.value;
                assigneeFilter.innerHTML = '<option value="">Assignee</option><option value="unassigned">Unassigned</option>';
                members.forEach(member => {
                    const option = document.createElement('option');
                    option.value = member.id;
                    option.textContent = member.name || member.email;
                    assigneeFilter.appendChild(option);
                });
                assigneeFilter.value = currentValue; // Restore selection
            }
        }
    } catch (error) {
        console.error('Failed to load project members:', error);
    }
}

// Load labels for filter dropdown
async function loadLabelsForFilter() {
    try {
        const currentProject = projectSelector.getCurrentProject();
        let url = '/labels';
        if (currentProject && currentProject.id) {
            url += `?projectId=${currentProject.id}`;
        }
        
        const response = await apiClient.get(url);
        if (response.ok) {
            const labels = await response.json();
            const labelFilter = document.getElementById('labelFilter');
            if (labelFilter) {
                const currentValue = labelFilter.value;
                labelFilter.innerHTML = '<option value="">Label</option>';
                
                labels.forEach(label => {
                    const option = document.createElement('option');
                    option.value = label.name.toLowerCase();
                    option.textContent = label.name;
                    labelFilter.appendChild(option);
                });
                
                labelFilter.value = currentValue; // Restore selection
            }
        }
    } catch (error) {
        console.error('Failed to load labels for filter:', error);
    }
}

