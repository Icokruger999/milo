// Milo Board functionality

// Add this to the top of board.js
function showToast(message, type = 'info') {
    console.log(`[TOAST - ${type.toUpperCase()}]: ${message}`);
    // Optional: Create a simple visual element
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.position = 'fixed';
    toast.style.bottom = '20px';
    toast.style.right = '20px';
    toast.style.padding = '10px 20px';
    toast.style.background = type === 'error' ? '#ff4444' : '#333';
    toast.style.color = 'white';
    toast.style.borderRadius = '5px';
    toast.style.zIndex = '9999';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

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
    
    // Specific user color mappings (by name or ID)
    const name = (assigneeName || '').toLowerCase().trim();
    const id = assigneeId ? assigneeId.toString() : '';
    
    // Check for specific user mappings first
    if (name.includes('rn') || name.includes('robert') || id === '2' || id === '3') {
        return { bg: '#36B37E', text: '#FFFFFF' }; // Green for RN
    }
    if (name.includes('ik') || name.includes('ico') || id === '1') {
        return { bg: '#DE350B', text: '#FFFFFF' }; // Red for IK
    }
    
    // Use ID if available, otherwise use name
    const seed = id || name;
    
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

// Initialize board with faster loading
document.addEventListener('DOMContentLoaded', async function() {
    // Check authentication
    if (!authService.requireAuth()) {
        return;
    }

    // Load user info
    const user = authService.getCurrentUser();
    if (!user) {
        console.error('❌ No user found, redirecting to login');
        window.location.href = 'milo-login.html';
        return;
    }
    
    console.log('✅ User authenticated:', user.name || user.email, 'ID:', user.id);
    
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

    // ROBUST PROJECT LOADING with validation and retry logic
    let currentProject = null;
    let retryCount = 0;
    const MAX_RETRIES = 3;
    
    // Wait for project selector to be ready (ensure setupProjectSelectorEnhanced has been called)
    async function waitForProjectSelectorReady() {
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds max wait (50 * 100ms)
        
        while (attempts < maxAttempts) {
            // Check if projectSelector has projects loaded
            if (projectSelector && projectSelector.projects && projectSelector.projects.length > 0) {
                console.log('✅ Project selector ready with', projectSelector.projects.length, 'projects');
                return true;
            }
            
            // Check if we have a current project set
            const currentProj = projectSelector.getCurrentProject();
            if (currentProj) {
                console.log('✅ Current project already set:', currentProj.name);
                return true;
            }
            
            attempts++;
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        console.warn('⚠️ Project selector not ready after 5 seconds, proceeding anyway');
        return false;
    }
    
    // Wait for project selector to be ready
    await waitForProjectSelectorReady();
    
    async function loadAndValidateProject() {
        // Step 1: Always load fresh projects from API first (force refresh on page load)
        try {
            console.log('🔄 Loading projects from API for user ID:', user.id);
            console.log('🔄 API Base URL:', apiClient.baseURL);
            console.log('🔄 Full URL will be:', apiClient.baseURL + '/projects?userId=' + user.id);
            
            const projects = await projectSelector.loadProjects(user.id); // Use cache if available
            console.log('📦 Projects loaded:', projects.length, 'projects');
            console.log('📦 Projects data:', projects);
            
            // Step 2: Try to get stored project
            const stored = localStorage.getItem('milo_current_project');
            if (stored) {
                try {
                    const storedProject = JSON.parse(stored);
                    // Validate stored project still exists in user's projects
                    const isValidProject = projectSelector.projects.some(p => p.id === storedProject.id);
                    if (isValidProject) {
                        // Find the fresh project data (in case it was updated)
                        const freshProject = projectSelector.projects.find(p => p.id === storedProject.id);
                        currentProject = freshProject || storedProject;
                        projectSelector.setCurrentProject(currentProject);
                        console.log('✅ Using stored project:', currentProject.name);
                        return true;
                    } else {
                        console.warn('⚠️ Stored project no longer exists, clearing...');
                        localStorage.removeItem('milo_current_project');
                    }
                } catch (e) {
                    console.error('Failed to parse stored project:', e);
                    localStorage.removeItem('milo_current_project');
                }
            }
            
            // Step 3: If no stored project or invalid, use first available project
            if (!currentProject && projectSelector.projects && projectSelector.projects.length > 0) {
                currentProject = projectSelector.projects[0];
                projectSelector.setCurrentProject(currentProject);
                console.log('✅ Using first available project:', currentProject.name);
                return true;
            }
            
            // Step 4: No projects available
            if (!currentProject || projectSelector.projects.length === 0) {
                console.error('❌ No projects available for user');
                return false;
            }
            
            return true;
        } catch (error) {
            console.error('Failed to load projects:', error);
            retryCount++;
            
            // Retry with exponential backoff
            if (retryCount < MAX_RETRIES) {
                console.log(`Retrying project load (${retryCount}/${MAX_RETRIES})...`);
                await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
                return await loadAndValidateProject();
            }
            
            // Last resort: try using cached projects
            if (projectSelector.projectsCache.data && projectSelector.projectsCache.data.length > 0) {
                console.warn('Using stale cache as fallback');
                projectSelector.projects = projectSelector.projectsCache.data;
                const stored = localStorage.getItem('milo_current_project');
                if (stored) {
                    try {
                        currentProject = JSON.parse(stored);
                        const isValid = projectSelector.projects.some(p => p.id === currentProject.id);
                        if (isValid) {
                            projectSelector.setCurrentProject(currentProject);
                            return true;
                        }
                    } catch (e) {
                        // Ignore
                    }
                }
                if (!currentProject && projectSelector.projects.length > 0) {
                    currentProject = projectSelector.projects[0];
                    projectSelector.setCurrentProject(currentProject);
                    return true;
                }
            }
            
            return false;
        }
    }
    
    // Load and validate project
    const projectLoaded = await loadAndValidateProject();
    
    if (!projectLoaded || !currentProject) {
        console.error('❌ Failed to load project after retries, redirecting to project selector');
        window.location.href = 'milo-select-project.html';
        return;
    }
    
    console.log('✅ Project loaded successfully:', currentProject.name, 'ID:', currentProject.id);

    // Update project name in breadcrumb
    setTimeout(() => {
        const projectNameEl = document.getElementById('currentProjectName');
        console.log('🔍 Looking for currentProjectName element:', projectNameEl);
        if (projectNameEl) {
            if (currentProject && currentProject.name) {
                projectNameEl.textContent = currentProject.name;
                console.log('✅ Updated breadcrumb to:', currentProject.name);
            } else {
                projectNameEl.textContent = 'No Project Selected';
                console.warn('⚠️ No current project available');
            }
        } else {
            console.warn('⚠️ currentProjectName element not found');
        }
    }, 100);

    // Render board immediately with empty state
    renderBoard();

    // Load tasks from API asynchronously - AFTER project is loaded
    // Wait a bit to ensure project is fully set in projectSelector
    setTimeout(() => {
        loadTasks().catch(error => {
            console.error('Failed to load tasks:', error);
            // Only show error if it's a real failure (not timeout or network issues that might resolve)
            // Errors are already handled gracefully in loadTasksFromAPI - empty board is shown
            // Don't show toast here to avoid flash errors on page refresh
        });
    }, 300);
    
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

    // Handle hash changes for view switching
    handleHashChange();
});

// Handle hash-based view switching (Timeline, Dashboard, Board)
function handleHashChange() {
    const hash = window.location.hash.substring(1) || 'board'; // Default to board
    
    // Update sidebar active state
    const sidebarItems = document.querySelectorAll('.sidebar-item');
    sidebarItems.forEach(item => {
        item.classList.remove('active');
    });
    
    if (hash === 'timeline') {
        const timelineLink = document.getElementById('timelineLink');
        if (timelineLink) timelineLink.classList.add('active');
        showTimelineView();
    } else if (hash === 'dashboard') {
        const dashboardLink = document.getElementById('dashboardLink');
        if (dashboardLink) dashboardLink.classList.add('active');
        showDashboardView();
    } else {
        // Default to board view
        const boardLink = document.getElementById('boardLink');
        if (boardLink) boardLink.classList.add('active');
        showBoardView();
    }
}

// Listen for hash changes
window.addEventListener('hashchange', handleHashChange);

// Show board view
function showBoardView() {
    const boardContent = document.querySelector('.board-content');
    const dashboardView = document.getElementById('dashboardView');
    const timelineView = document.getElementById('timelineView');
    
    if (boardContent) boardContent.style.display = 'flex';
    if (dashboardView) dashboardView.style.display = 'none';
    if (timelineView) timelineView.style.display = 'none';
    
    renderBoard();
}

// Show dashboard view
function showDashboardView() {
    const boardContent = document.querySelector('.board-content');
    const dashboardView = document.getElementById('dashboardView');
    const timelineView = document.getElementById('timelineView');
    
    if (boardContent) boardContent.style.display = 'none';
    if (dashboardView) dashboardView.style.display = 'block';
    if (timelineView) timelineView.style.display = 'none';
    
    if (typeof loadDashboardData === 'function') {
        loadDashboardData();
    }
}

// Show timeline view
function showTimelineView() {
    const boardContent = document.querySelector('.board-content');
    const dashboardView = document.getElementById('dashboardView');
    const timelineView = document.getElementById('timelineView');
    
    if (boardContent) boardContent.style.display = 'none';
    if (dashboardView) dashboardView.style.display = 'none';
    if (timelineView) timelineView.style.display = 'flex';
    
    if (typeof loadTimelineData === 'function') {
        loadTimelineData();
    }
}

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

// Old renderBoard and renderColumn functions removed - now using renderBoardByAssignee

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

// Make createTaskCard available globally for board-grouping.js
window.createTaskCard = createTaskCard;

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
    document.getElementById('blockedCount').textContent = tasks.blocked.length;
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
    
    // Show modal immediately for better UX (don't wait for API calls)
    modal.style.display = 'flex';
    
    // FIX 1: Populate form immediately with cached task data for faster display
    const startDateInput = document.getElementById('taskStartDate');
    const dueDateInput = document.getElementById('taskDueDate');
    let preservedStartDateInputValue = '';
    
    if (task) {
        // Populate form immediately with cached data (don't wait for API)
        document.getElementById('taskTitle').value = task.title || '';
        document.getElementById('taskDescription').value = task.description || '';
        if (task.description && task.description.trim()) {
            updateDescriptionPreview();
        }
        
        const statusSelect = document.getElementById('taskStatus');
        if (statusSelect) {
            statusSelect.value = task.status || column || 'todo';
        }
        
        // Set start date immediately if available
        if (startDateInput && task.startDate) {
            try {
                const startDate = task.startDate instanceof Date ? task.startDate : new Date(task.startDate);
                if (!isNaN(startDate.getTime()) && startDate.getFullYear() > 1900) {
                    const year = startDate.getFullYear();
                    const month = String(startDate.getMonth() + 1).padStart(2, '0');
                    const day = String(startDate.getDate()).padStart(2, '0');
                    preservedStartDateInputValue = `${year}-${month}-${day}`;
                    startDateInput.value = preservedStartDateInputValue;
                }
            } catch (e) {
                console.error('Error parsing start date:', e);
            }
        }
        
        // Set due date immediately if available
        if (dueDateInput && task.dueDate) {
            try {
                const dueDate = task.dueDate instanceof Date ? task.dueDate : new Date(task.dueDate);
                if (!isNaN(dueDate.getTime()) && dueDate.getFullYear() > 1900) {
                    const year = dueDate.getFullYear();
                    const month = String(dueDate.getMonth() + 1).padStart(2, '0');
                    const day = String(dueDate.getDate()).padStart(2, '0');
                    dueDateInput.value = `${year}-${month}-${day}`;
                }
            } catch (e) {
                console.error('Error parsing due date:', e);
            }
        }
    }
    
    // Store the task's start date BEFORE any async operations that might reset it
    const originalStartDate = task?.startDate ? (task.startDate instanceof Date ? task.startDate : new Date(task.startDate)) : null;
    const originalDueDate = task?.dueDate ? (task.dueDate instanceof Date ? task.dueDate : new Date(task.dueDate)) : null;
    // Also preserve the actual input value
    if (startDateInput && !preservedStartDateInputValue) {
        preservedStartDateInputValue = startDateInput.value || '';
    }
    
    // OPTIMIZATION: Load task data first (critical), then dropdowns in parallel
    // This makes the modal appear faster with task data, then dropdowns populate
    let taskDataPromise = Promise.resolve(task);
    if (task && task.id) {
        // Fetch fresh task data immediately (critical path)
        taskDataPromise = apiClient.get(`/tasks/${task.id}`)
            .then(response => {
                if (response.ok) {
                    return response.json();
                }
                return task; // Fallback to cached task
            })
            .catch(error => {
                console.error('Error loading fresh task data:', error);
                return task; // Fallback to cached task
            });
    }
    
    // Load dropdowns in parallel with task fetch (non-blocking)
    const [freshTask, _] = await Promise.all([
        taskDataPromise,
        Promise.all([
            loadUsersAndProducts(),
            loadLabels()
        ])
    ]);
    
    // Use fresh task data if available
    if (freshTask) {
        task = freshTask;
        // FIX 4: Preserve original dates AND input values if fresh task doesn't have them
        if (originalStartDate && !task.startDate) {
            task.startDate = originalStartDate;
        }
        if (originalDueDate && !task.dueDate) {
            task.dueDate = originalDueDate;
        }
        
        // CRITICAL: Restore preserved start date value AFTER async operations complete
        // This ensures user-set values are not lost when dropdowns reload
        if (startDateInput && preservedStartDateInputValue && preservedStartDateInputValue.trim()) {
            // Always restore the preserved value if it exists
            setTimeout(() => {
                if (startDateInput && preservedStartDateInputValue) {
                    startDateInput.value = preservedStartDateInputValue;
                    console.log('Restored preserved start date after async operations:', preservedStartDateInputValue);
                }
            }, 100); // Small delay to ensure DOM is ready
        } else if (startDateInput && startDateInput.value && startDateInput.value.trim()) {
            // If input already has a value, preserve it
            const existingValue = startDateInput.value;
            setTimeout(() => {
                if (startDateInput && !startDateInput.value && existingValue) {
                    startDateInput.value = existingValue;
                    console.log('Restored existing start date value:', existingValue);
                }
            }, 100);
        }
    }
    
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
        
        // Set assignee - explicitly set to empty/unassigned if no assignee
        const assigneeSelect = document.getElementById('taskAssignee');
        if (assigneeSelect) {
            if (task.assigneeId) {
                assigneeSelect.value = task.assigneeId;
            } else {
                // Explicitly set to empty or "unassigned" option if it exists
                assigneeSelect.value = '';
            }
        }
        
        // Set label - explicitly set to empty/no label if no label
        const labelSelect = document.getElementById('taskLabel');
        if (labelSelect) {
            if (task.label && task.label.trim() !== '') {
                labelSelect.value = task.label.toLowerCase();
            } else {
                // Explicitly set to empty or "no label" option if it exists
                labelSelect.value = '';
            }
        }
        
        // Set product
        const productSelect = document.getElementById('taskProduct');
        if (productSelect && task.productId) {
            productSelect.value = task.productId;
        }
        
        // Set priority
        document.getElementById('taskPriority').value = task.priority !== undefined ? task.priority : 0;
        
        // Set start date - preserve existing value if already set, otherwise use task.startDate
        // Don't auto-populate with current date, and don't clear if already set
        const startDateInput = document.getElementById('taskStartDate');
        if (startDateInput) {
            // CRITICAL: Only set start date if:
            // 1. We have a preserved value from earlier (user set it), OR
            // 2. Task has a startDate and input is empty
            const currentInputValue = startDateInput.value || '';
            
            // If we have a preserved value, use it (don't overwrite)
            if (preservedStartDateInputValue && preservedStartDateInputValue.trim()) {
                startDateInput.value = preservedStartDateInputValue;
                console.log('Preserved start date input value:', preservedStartDateInputValue);
            } 
            // If input already has a value, don't overwrite it
            else if (currentInputValue && currentInputValue.trim()) {
                console.log('Start date input already has value, keeping it:', currentInputValue);
                // Don't change it
            }
            // Only set from task.startDate if input is empty
            else if (task.startDate) {
                try {
                    // Handle both string and Date objects
                    const startDate = task.startDate instanceof Date 
                        ? task.startDate 
                        : new Date(task.startDate);
                    
                    // Check if date is valid
                    if (!isNaN(startDate.getTime()) && startDate.getFullYear() > 1900) {
                        // Format as YYYY-MM-DD for HTML date input
                        const year = startDate.getFullYear();
                        const month = String(startDate.getMonth() + 1).padStart(2, '0');
                        const day = String(startDate.getDate()).padStart(2, '0');
                        startDateInput.value = `${year}-${month}-${day}`;
                        console.log('Set start date input to:', startDateInput.value, 'from task.startDate:', task.startDate);
                    } else {
                        console.warn('Invalid start date:', task.startDate);
                        // Don't clear if it already has a value
                        if (!currentInputValue) {
                            startDateInput.value = '';
                        }
                    }
                } catch (e) {
                    console.error('Error parsing start date:', e, 'task.startDate:', task.startDate);
                    // Don't clear if it already has a value
                    if (!currentInputValue) {
                        startDateInput.value = '';
                    }
                }
            }
            // Don't clear if it already has a value and task has no startDate
            // (user might have manually set it)
        }
        
        // Set due date - only if task has a dueDate, otherwise leave empty
        // Don't auto-populate with current date
        const dueDateInput = document.getElementById('taskDueDate');
        if (dueDateInput) {
            if (task.dueDate) {
                try {
                    // Handle both string and Date objects
                    const dueDate = task.dueDate instanceof Date 
                        ? task.dueDate 
                        : new Date(task.dueDate);
                    
                    // Check if date is valid
                    if (!isNaN(dueDate.getTime())) {
                        // Format as YYYY-MM-DD for HTML date input
                        const year = dueDate.getFullYear();
                        const month = String(dueDate.getMonth() + 1).padStart(2, '0');
                        const day = String(dueDate.getDate()).padStart(2, '0');
                        dueDateInput.value = `${year}-${month}-${day}`;
                        console.log('Set due date input to:', dueDateInput.value, 'from task.dueDate:', task.dueDate);
                    } else {
                        console.warn('Invalid due date:', task.dueDate);
                        dueDateInput.value = '';
                    }
                } catch (e) {
                    console.error('Error parsing due date:', e, 'task.dueDate:', task.dueDate);
                    dueDateInput.value = '';
                }
            } else {
                console.log('No due date in task');
                dueDateInput.value = '';
            }
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

// Helper function to populate task form (extracted for reuse)
function populateTaskForm(task) {
    // Set all form values
    const titleInput = document.getElementById('taskTitle');
    if (titleInput) titleInput.value = task.title || '';
    
    const descInput = document.getElementById('taskDescription');
    if (descInput) {
        descInput.value = task.description || '';
        // Update description preview if description exists
        if (task.description && task.description.trim()) {
            updateDescriptionPreview();
        }
    }
    
    // Set status BEFORE other dropdowns
    const statusSelect = document.getElementById('taskStatus');
    if (statusSelect) {
        statusSelect.value = task.status || 'todo';
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
    const priorityInput = document.getElementById('taskPriority');
    if (priorityInput) {
        priorityInput.value = task.priority !== undefined ? task.priority : 0;
    }
    
    // Set start date - ONLY if task has a valid startDate, otherwise leave EMPTY
    const startDateInput = document.getElementById('taskStartDate');
    if (startDateInput) {
        // Clear first to ensure it's empty
        startDateInput.value = '';
        
        if (task.startDate) {
            try {
                // Handle both string and Date objects
                const startDate = task.startDate instanceof Date 
                    ? task.startDate 
                    : new Date(task.startDate);
                
                // Check if date is valid and not a default/invalid date
                if (!isNaN(startDate.getTime()) && startDate.getFullYear() > 1900) {
                    // Format as YYYY-MM-DD for HTML date input
                    const year = startDate.getFullYear();
                    const month = String(startDate.getMonth() + 1).padStart(2, '0');
                    const day = String(startDate.getDate()).padStart(2, '0');
                    startDateInput.value = `${year}-${month}-${day}`;
                    console.log('Set start date input to:', startDateInput.value, 'from task.startDate:', task.startDate);
                } else {
                    console.warn('Invalid start date:', task.startDate);
                    startDateInput.value = '';
                }
            } catch (e) {
                console.error('Error parsing start date:', e, 'task.startDate:', task.startDate);
                startDateInput.value = '';
            }
        } else {
            // Explicitly set to empty string (not null or undefined)
            startDateInput.value = '';
        }
    }
    
    // Set due date - ONLY if task has a valid dueDate, otherwise leave EMPTY
    const dueDateInput = document.getElementById('taskDueDate');
    if (dueDateInput) {
        // Clear first to ensure it's empty
        dueDateInput.value = '';
        
        if (task.dueDate) {
            try {
                // Handle both string and Date objects
                const dueDate = task.dueDate instanceof Date 
                    ? task.dueDate 
                    : new Date(task.dueDate);
                
                // Check if date is valid and not a default/invalid date
                if (!isNaN(dueDate.getTime()) && dueDate.getFullYear() > 1900) {
                    // Format as YYYY-MM-DD for HTML date input
                    const year = dueDate.getFullYear();
                    const month = String(dueDate.getMonth() + 1).padStart(2, '0');
                    const day = String(dueDate.getDate()).padStart(2, '0');
                    dueDateInput.value = `${year}-${month}-${day}`;
                    console.log('Set due date input to:', dueDateInput.value, 'from task.dueDate:', task.dueDate);
                } else {
                    console.warn('Invalid due date:', task.dueDate);
                    dueDateInput.value = '';
                }
            } catch (e) {
                console.error('Error parsing due date:', e, 'task.dueDate:', task.dueDate);
                dueDateInput.value = '';
            }
        } else {
            // Explicitly set to empty string (not null or undefined)
            dueDateInput.value = '';
        }
    }
    
    // Load checklist if exists
    const checklistDiv = document.getElementById('taskChecklist');
    if (checklistDiv) {
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
    }
    
    // Load comments asynchronously (non-blocking)
    if (task.id) {
        loadTaskComments(task.id).catch(err => console.error('Error loading comments:', err));
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
    
    // FIX 2: Removed duplicate loadUsersAndProducts() call - it's already called in showTaskModal()
    // This prevents duplicate assignees in the dropdown
}

// Cache for users and products (5 minute TTL)
let usersProductsCache = {
    users: null,
    products: null,
    timestamp: null,
    ttl: 5 * 60 * 1000 // 5 minutes
};

// Flag to prevent concurrent loading
let isLoadingUsersAndProducts = false;

async function loadUsersAndProducts() {
    // Prevent concurrent calls
    if (isLoadingUsersAndProducts) {
        console.log('loadUsersAndProducts already in progress, skipping...');
        return;
    }
    try {
        isLoadingUsersAndProducts = true;
        const now = Date.now();
        const assigneeSelect = document.getElementById('taskAssignee');
        const productSelect = document.getElementById('taskProduct');
        
        // Helper function to deduplicate users by ID, email, and name
        const deduplicateUsers = (users) => {
            if (!Array.isArray(users)) return [];
            
            // First deduplicate by ID (primary key) - most reliable
            const byId = new Map();
            users.forEach(user => {
                if (user && user.id) {
                    // Only keep the first occurrence of each ID
                    if (!byId.has(user.id)) {
                        byId.set(user.id, user);
                    }
                }
            });
            
            // Then deduplicate by email (in case same email has different IDs somehow)
            const byEmail = new Map();
            Array.from(byId.values()).forEach(user => {
                const email = (user.email || '').toLowerCase().trim();
                if (email && !byEmail.has(email)) {
                    byEmail.set(email, user);
                } else if (!email) {
                    // If no email, keep by ID only
                    byEmail.set(`no-email-${user.id}`, user);
                }
            });
            
            // Finally deduplicate by name+email combination to catch any remaining duplicates
            const byNameEmail = new Map();
            Array.from(byEmail.values()).forEach(user => {
                const name = (user.name || '').toLowerCase().trim();
                const email = (user.email || '').toLowerCase().trim();
                const key = `${name}::${email}`;
                
                // Only add if we haven't seen this name+email combination
                if (!byNameEmail.has(key)) {
                    byNameEmail.set(key, user);
                }
            });
            
            // Sort by name for consistent display
            return Array.from(byNameEmail.values()).sort((a, b) => {
                const nameA = (a.name || a.email || '').toLowerCase();
                const nameB = (b.name || b.email || '').toLowerCase();
                return nameA.localeCompare(nameB);
            });
        };
        
        // Helper function to populate assignee dropdown
        const populateAssigneeDropdown = (users) => {
            if (!assigneeSelect) return;
            
            // Store current selection before clearing
            const currentValue = assigneeSelect.value;
            
            // FIX 3: Preserve start date input value when repopulating dropdown
            const startDateInput = document.getElementById('taskStartDate');
            const preservedStartDateValue = startDateInput ? startDateInput.value : '';
            
            // Clear dropdown completely - remove ALL options first
            while (assigneeSelect.firstChild) {
                assigneeSelect.removeChild(assigneeSelect.firstChild);
            }
            
            // Add "Unassigned" option
            const unassignedOption = document.createElement('option');
            unassignedOption.value = '';
            unassignedOption.textContent = 'Unassigned';
            assigneeSelect.appendChild(unassignedOption);
            
            // Add unique users - ensure deduplication happens
            const uniqueUsers = deduplicateUsers(users);
            
            // Use a Set to track what we've already added (extra safety)
            const addedIds = new Set();
            const addedEmails = new Set();
            const addedNameEmail = new Set();
            
            uniqueUsers.forEach(user => {
                // Skip if we've already added this user by ID
                if (user.id && addedIds.has(user.id)) {
                    console.warn('Skipping duplicate user by ID:', user.id, user.name);
                    return;
                }
                
                const email = (user.email || '').toLowerCase().trim();
                // Skip if we've already added this user by email
                if (email && addedEmails.has(email)) {
                    console.warn('Skipping duplicate user by email:', email, user.name);
                    return;
                }
                
                // Also check by name+email combination
                const name = (user.name || '').toLowerCase().trim();
                const nameEmailKey = `${name}::${email}`;
                if (addedNameEmail.has(nameEmailKey)) {
                    console.warn('Skipping duplicate user by name+email:', nameEmailKey);
                    return;
                }
                
                // Create and add option
                const option = document.createElement('option');
                option.value = user.id;
                option.textContent = user.name || user.email || 'Unknown';
                assigneeSelect.appendChild(option);
                
                // Track what we've added
                if (user.id) addedIds.add(user.id);
                if (email) addedEmails.add(email);
                addedNameEmail.add(nameEmailKey);
            });
            
            // Restore selection if it still exists
            if (currentValue && Array.from(assigneeSelect.options).some(opt => opt.value === currentValue)) {
                assigneeSelect.value = currentValue;
            }
            
            // FIX 3: Restore start date input value
            if (startDateInput && preservedStartDateValue) {
                startDateInput.value = preservedStartDateValue;
            }
            
            console.log(`Populated assignee dropdown with ${uniqueUsers.length} unique users (${addedIds.size} by ID, ${addedEmails.size} by email)`);
        };
        
        // Check cache first
        if (usersProductsCache.users && usersProductsCache.timestamp && 
            (now - usersProductsCache.timestamp) < usersProductsCache.ttl) {
            // Use cached data
            populateAssigneeDropdown(usersProductsCache.users);
            if (productSelect) {
                productSelect.innerHTML = '<option value="">General</option>';
                if (usersProductsCache.products && Array.isArray(usersProductsCache.products)) {
                    usersProductsCache.products.forEach(product => {
                        const option = document.createElement('option');
                        option.value = product.id;
                        option.textContent = product.name;
                        productSelect.appendChild(option);
                    });
                }
            }
            isLoadingUsersAndProducts = false;
            return;
        }
        
        // Load users and products in parallel
        const [usersResponse, productsResponse] = await Promise.all([
            apiClient.get('/auth/users'),
            apiClient.get('/products')
        ]);
        
        if (usersResponse.ok) {
            const users = await usersResponse.json();
            // Deduplicate and cache - ensure we store deduplicated data
            const uniqueUsers = deduplicateUsers(users);
            // Store deduplicated users in cache to prevent future duplicates
            usersProductsCache.users = uniqueUsers;
            populateAssigneeDropdown(uniqueUsers);
        } else {
            console.error('Failed to load users:', usersResponse.status);
        }
        
        if (productsResponse.ok) {
            const products = await productsResponse.json();
            usersProductsCache.products = Array.isArray(products) ? products : []; // Cache products
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
    } finally {
        isLoadingUsersAndProducts = false;
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
                // Preserve the currently selected value before clearing
                const currentValue = labelSelect.value || '';
                
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
                
                // Restore the selected value if it still exists
                if (currentValue && labelSelect.querySelector(`option[value="${currentValue}"]`)) {
                    labelSelect.value = currentValue;
                }
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
    
    // Prevent duplicate submissions
    const submitButton = document.getElementById('taskSubmitBtn');
    if (submitButton && submitButton.disabled) {
        console.log('Form submission already in progress, ignoring duplicate submit');
        return;
    }
    
    // Disable submit button to prevent double submission
    if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = 'Saving...';
    }
    
    const modal = document.getElementById('taskModal');
    const column = modal.dataset.column;
    const taskId = modal.dataset.taskId;
    
    // Convert dates to ISO 8601 format with UTC timezone
    let startDate = null;
    const startDateInput = document.getElementById('taskStartDate');
    if (startDateInput && startDateInput.value) {
        // HTML date input gives YYYY-MM-DD format
        // Convert to ISO 8601 with UTC timezone (midnight UTC)
        try {
            const date = new Date(startDateInput.value + 'T00:00:00Z');
            if (!isNaN(date.getTime())) {
                startDate = date.toISOString();
                console.log('Start date converted:', startDateInput.value, '->', startDate);
            } else {
                console.warn('Invalid start date:', startDateInput.value);
            }
        } catch (e) {
            console.error('Error parsing start date:', e);
        }
    }
    
    let dueDate = null;
    const dueDateInput = document.getElementById('taskDueDate');
    if (dueDateInput && dueDateInput.value) {
        // HTML date input gives YYYY-MM-DD format
        // Convert to ISO 8601 with UTC timezone (midnight UTC)
        try {
            const date = new Date(dueDateInput.value + 'T00:00:00Z');
            if (!isNaN(date.getTime())) {
                dueDate = date.toISOString();
                console.log('Due date converted:', dueDateInput.value, '->', dueDate);
            } else {
                console.warn('Invalid due date:', dueDateInput.value);
            }
        } catch (e) {
            console.error('Error parsing due date:', e);
        }
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
    
    // Get assignee - handle "Unassigned" or empty value
    const assigneeSelect = document.getElementById('taskAssignee');
    let assigneeId = null;
    if (assigneeSelect && assigneeSelect.value && assigneeSelect.value !== '' && assigneeSelect.value !== 'unassigned') {
        assigneeId = parseInt(assigneeSelect.value);
    }
    
    // Get label - handle "No Label" or empty value
    const labelSelect = document.getElementById('taskLabel');
    let label = null;
    if (labelSelect && labelSelect.value && labelSelect.value !== '' && labelSelect.value !== 'no label') {
        label = labelSelect.value;
    }
    
    // Get product - handle empty value
    const productSelect = document.getElementById('taskProduct');
    let productId = null;
    if (productSelect && productSelect.value && productSelect.value !== '') {
        productId = parseInt(productSelect.value);
    }
    
    const taskData = {
        title: document.getElementById('taskTitle').value,
        description: document.getElementById('taskDescription').value,
        status: selectedStatus, // Use status from dropdown
        label: label, // null if "No Label" or empty, otherwise the label value
        assigneeId: assigneeId, // null if "Unassigned" or empty, otherwise the assignee ID
        productId: productId, // null if empty, otherwise the product ID
        priority: parseInt(document.getElementById('taskPriority').value),
        // Always send dates - send null if empty to allow clearing, or the date value if set
        startDate: startDate, // Will be null if empty, or ISO string if set
        dueDate: dueDate, // Will be null if empty, or ISO string if set
        checklist: checklistItems.length > 0 ? checklistItems : [] // Always send array, even if empty
    };
    
    console.log('Task data being sent:', {
        ...taskData,
        startDate: startDate ? startDate : 'null',
        dueDate: dueDate ? dueDate : 'null'
    });
    
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
            
            // Re-enable submit button
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = 'Save';
            }
            
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
            // Re-enable submit button on error
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = 'Save';
            }
            
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
        
        // Re-enable submit button on error
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = 'Save';
        }
        
        // Show error in modal instead of alert
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = 'background: #fee; color: #c33; padding: 12px; border-radius: 4px; margin-bottom: 16px;';
        errorDiv.textContent = 'Failed to save task. Please try again.';
        const form = document.getElementById('taskForm');
        if (form) {
            form.insertBefore(errorDiv, form.firstChild);
            setTimeout(() => errorDiv.remove(), 5000);
        }
    }
}

// Helper function to get all tasks as a flat array for dashboard
function getAllTasksFlat() {
    const allTasks = [];
    if (tasks && typeof tasks === 'object') {
        Object.keys(tasks).forEach(status => {
            if (Array.isArray(tasks[status])) {
                tasks[status].forEach(task => {
                    allTasks.push({
                        ...task,
                        status: status === 'progress' ? 'in progress' : status
                    });
                });
            }
        });
    }
    return allTasks;
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
        
        // Load tasks filtered by project and assignee (with pagination for large datasets)
        // Use smaller pageSize for better performance - board view doesn't need all tasks at once
        const response = await apiClient.get(queryUrl + '&page=1&pageSize=100');
        if (response.ok) {
            const data = await response.json();
            // Handle both paginated and non-paginated responses for backwards compatibility
            const apiTasks = data.tasks || data;
            
            // Convert API tasks to board format
            tasks = {
                todo: [],
                progress: [],
                review: [],
                blocked: [],
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
                    startDate: task.startDate, // Include startDate so it persists when editing
                    subtasks: Math.floor(Math.random() * 5) + 1 // Mock subtask count - replace with actual when available
                };
                
                // Map API status to board columns
                let boardStatus = 'todo';
                if (task.status === 'progress' || task.status === 'in-progress') boardStatus = 'progress';
                else if (task.status === 'review' || task.status === 'in-review') boardStatus = 'review';
                else if (task.status === 'blocked') boardStatus = 'blocked';
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
                
                // Make tasks available globally for dashboard
                window.tasks = getAllTasksFlat();
                
                // Refresh dashboard if it's currently visible
                if (typeof loadDashboardData === 'function' && currentBoardView === 'dashboard') {
                    setTimeout(() => loadDashboardData(), 200);
                }
                
                // Apply filters after loading tasks
                if (typeof filterTasks === 'function') {
                    filterTasks();
                }
                
                return Promise.resolve();
            } else {
                // Handle non-ok response
                const errorText = await response.text().catch(() => 'Unknown error');
                console.error(`API returned ${response.status}:`, errorText);
                // Initialize empty tasks to show empty board
                tasks = {
                    todo: [],
                    progress: [],
                    review: [],
                    blocked: [],
                    done: []
                };
                window.tasks = [];
                renderBoard();
                return Promise.resolve();
            }
        } catch (error) {
            console.error('Failed to load tasks:', error);
            // Initialize empty tasks to show empty board on error
            tasks = {
                todo: [],
                progress: [],
                review: [],
                blocked: [],
                done: []
            };
            window.tasks = [];
            renderBoard();
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
    try {
        // Add timeout to prevent hanging
        const loadPromise = loadTasksFromAPI();
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Load timeout')), 15000) // Increased timeout to 15s for slower connections
        );
        
        await Promise.race([loadPromise, timeoutPromise]);
    } catch (error) {
        console.error('Error loading tasks:', error);
        // Only show error toast if it's a real failure after retries
        // During normal page loads, errors are handled gracefully (empty board shown)
        // Don't show error toast on initial page load to avoid flash messages
        // Users can still see the empty state and try again if needed
    }
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



// Group by functionality - Grid layout with assignee rows
let collapsedAssignees = {}; // Track which assignees are collapsed

function renderBoard() {
    // Render grid layout with assignee rows
    renderBoardGrid();
}

function renderBoardGrid() {
    const container = document.getElementById('boardGridBody');
    if (!container) return;
    
    // Collect all tasks from all statuses
    const allTasks = [
        ...(tasks.todo || []),
        ...(tasks.progress || []),
        ...(tasks.review || []),
        ...(tasks.blocked || []),
        ...(tasks.done || [])
    ];
    
    // Group tasks by assignee
    const assigneeGroups = {};
    allTasks.forEach(task => {
        const assigneeName = task.assigneeName || 'Unassigned';
        const assigneeId = task.assigneeId || 'unassigned';
        
        if (!assigneeGroups[assigneeName]) {
            assigneeGroups[assigneeName] = {
                name: assigneeName,
                id: assigneeId,
                tasks: { todo: [], progress: [], review: [], blocked: [], done: [] }
            };
        }
        
        // Add task to appropriate status
        const status = (task.status || 'todo').toLowerCase();
        if (status.includes('progress')) {
            assigneeGroups[assigneeName].tasks.progress.push(task);
        } else if (status.includes('review')) {
            assigneeGroups[assigneeName].tasks.review.push(task);
        } else if (status === 'blocked') {
            assigneeGroups[assigneeName].tasks.blocked.push(task);
        } else if (status === 'done') {
            assigneeGroups[assigneeName].tasks.done.push(task);
        } else {
            assigneeGroups[assigneeName].tasks.todo.push(task);
        }
    });
    
    // Sort assignees alphabetically, Unassigned last
    const sortedAssignees = Object.keys(assigneeGroups).sort((a, b) => {
        if (a === 'Unassigned') return 1;
        if (b === 'Unassigned') return -1;
        return a.localeCompare(b);
    });
    
    // Render rows
    container.innerHTML = '';
    sortedAssignees.forEach(assigneeName => {
        const group = assigneeGroups[assigneeName];
        const totalTasks = group.tasks.todo.length + group.tasks.progress.length + 
                          group.tasks.review.length + group.tasks.blocked.length + group.tasks.done.length;
        
        const isCollapsed = collapsedAssignees[assigneeName] || false;
        const initials = assigneeName === 'Unassigned' ? 'UN' : 
                        assigneeName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        const assigneeColor = getAssigneeColor(group.id, assigneeName);
        
        const row = document.createElement('div');
        row.className = `assignee-row ${isCollapsed ? 'collapsed' : ''}`;
        row.style.height = 'auto';
        row.style.minHeight = '120px';
        row.dataset.assignee = assigneeName;
        
        row.innerHTML = `
            <div class="assignee-info">
                <div class="assignee-toggle ${isCollapsed ? 'collapsed' : ''}" onclick="toggleAssigneeRow('${assigneeName}')">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                </div>
                <div class="assignee-avatar" style="background: ${assigneeColor.bg}; color: ${assigneeColor.text};">
                    ${initials}
                </div>
                <div class="assignee-details">
                    <div class="assignee-name">${assigneeName}</div>
                    <div class="assignee-task-count">${totalTasks} task${totalTasks !== 1 ? 's' : ''}</div>
                </div>
            </div>
            <div class="status-cell" data-status="todo" data-assignee="${assigneeName}"></div>
            <div class="status-cell" data-status="progress" data-assignee="${assigneeName}"></div>
            <div class="status-cell" data-status="review" data-assignee="${assigneeName}"></div>
            <div class="status-cell" data-status="blocked" data-assignee="${assigneeName}"></div>
            <div class="status-cell" data-status="done" data-assignee="${assigneeName}"></div>
        `;
        
        container.appendChild(row);
        
        // Add tasks to cells
        ['todo', 'progress', 'review', 'blocked', 'done'].forEach(status => {
            const cell = row.querySelector(`.status-cell[data-status="${status}"]`);
            group.tasks[status].forEach(task => {
                const card = createTaskCard(task);
                cell.appendChild(card);
            });
        });
    });
    
    updateCounts();
    setupGridDragAndDrop();
}

function toggleAssigneeRow(assigneeName) {
    const row = document.querySelector(`.assignee-row[data-assignee="${assigneeName}"]`);
    const toggle = row.querySelector('.assignee-toggle');
    
    if (row.classList.contains('collapsed')) {
        row.classList.remove('collapsed');
        toggle.classList.remove('collapsed');
        collapsedAssignees[assigneeName] = false;
    } else {
        row.classList.add('collapsed');
        toggle.classList.add('collapsed');
        collapsedAssignees[assigneeName] = true;
    }
}

function setupGridDragAndDrop() {
    // Setup drop zones for all status cells
    document.querySelectorAll('.status-cell').forEach(cell => {
        cell.addEventListener('dragover', handleGridDragOver);
        cell.addEventListener('drop', handleGridDrop);
        cell.addEventListener('dragleave', handleGridDragLeave);
    });
}

function handleGridDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    this.classList.add('drop-target');
}

function handleGridDragLeave(e) {
    this.classList.remove('drop-target');
}

async function handleGridDrop(e) {
    e.preventDefault();
    this.classList.remove('drop-target');
    
    if (!draggedElement) return;
    
    const taskId = parseInt(draggedElement.dataset.taskId);
    const newStatus = this.dataset.status;
    const newAssignee = this.dataset.assignee;
    
    // Find the task
    let task = null;
    for (const status in tasks) {
        task = tasks[status].find(t => t.id === taskId);
        if (task) break;
    }
    
    if (!task) return;
    
    // Update task status
    const statusMap = {
        'todo': 'To Do',
        'progress': 'In Progress',
        'review': 'In Review',
        'blocked': 'Blocked',
        'done': 'Done'
    };
    
    try {
        const response = await apiClient.put(`/tasks/${taskId}`, {
            ...task,
            status: statusMap[newStatus]
        });
        
        if (response.ok) {
            // Move task in local data
            const oldStatus = task.status ? task.status.toLowerCase().replace(' ', '') : 'todo';
            const oldStatusKey = oldStatus.includes('progress') ? 'progress' : 
                                oldStatus.includes('review') ? 'review' :
                                oldStatus === 'done' ? 'done' : 'todo';
            
            tasks[oldStatusKey] = tasks[oldStatusKey].filter(t => t.id !== taskId);
            task.status = statusMap[newStatus];
            tasks[newStatus].push(task);
            
            renderBoard();
        }
    } catch (error) {
        console.error('Failed to update task:', error);
        renderBoard();
    }
}

// Make functions globally accessible
window.toggleAssigneeRow = toggleAssigneeRow;

// Make function globally accessible
window.toggleAssigneeRow = toggleAssigneeRow;
