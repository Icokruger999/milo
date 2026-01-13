// Dashboard functionality with Chart.js

let dashboardData = {
    tasks: [],
    filteredTasks: []
};

let charts = {
    statusChart: null,
    assigneeChart: null,
    priorityChart: null,
    timelineChart: null
};

// Performance: Cache data for 30 seconds
let dataCache = {
    tasks: null,
    timestamp: 0,
    duration: 30000 // 30 seconds
};

// Debounce filter changes
let filterTimeout = null;
const FILTER_DEBOUNCE_MS = 300;

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    if (!authService.isAuthenticated()) {
        window.location.href = 'milo-login.html';
        return;
    }

    // Set user avatar
    const user = authService.getCurrentUser();
    if (user) {
        const nameParts = (user.name || user.email || 'User').trim().split(' ');
        let initials = 'U';
        if (nameParts.length >= 2) {
            initials = (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase();
        } else if (nameParts.length === 1) {
            initials = nameParts[0].substring(0, 2).toUpperCase();
        }
        const avatarEl = document.getElementById('globalUserAvatar');
        if (avatarEl) avatarEl.textContent = initials;
    }

    // Setup user menu dropdown
    setupUserMenu();

    // Load project info - wait for projectSelector to be available
    let currentProject = null;
    if (typeof projectSelector !== 'undefined' && projectSelector.getCurrentProject) {
        currentProject = projectSelector.getCurrentProject();
    } else {
        // Fallback: try to get from localStorage
        const projectsStr = localStorage.getItem('milo_user_projects') || sessionStorage.getItem('milo_user_projects');
        if (projectsStr) {
            try {
                const projects = JSON.parse(projectsStr);
                if (projects && projects.length > 0) {
                    currentProject = projects[0];
                }
            } catch (e) {
                console.error('Error parsing projects:', e);
            }
        }
    }
    
    if (currentProject) {
        const nameEl = document.getElementById('projectName');
        const iconEl = document.getElementById('projectIcon');
        const titleEl = document.getElementById('projectTitle');
        
        if (nameEl) nameEl.textContent = currentProject.name;
        if (iconEl) iconEl.textContent = (currentProject.key || currentProject.name).substring(0, 1).toUpperCase();
        if (titleEl) titleEl.textContent = currentProject.name + ' Dashboard';
        
        console.log('Project loaded:', currentProject.name, 'ID:', currentProject.id);
    } else {
        console.error('No project found, redirecting to project selection');
        window.location.href = 'milo-select-project.html';
        return;
    }

    // Show loading state
    showLoadingState();
    
    // Load dashboard data with timeout
    const loadTimeout = setTimeout(() => {
        console.warn('Dashboard load timeout - forcing reload');
        showErrorState();
    }, 10000); // 10 second timeout
    
    loadDashboardData().then(() => {
        clearTimeout(loadTimeout);
    }).catch(error => {
        clearTimeout(loadTimeout);
        console.error('Dashboard load failed:', error);
        showErrorState();
    });
});

// Show loading state
function showLoadingState() {
    const stats = ['totalTasks', 'inProgressTasks', 'completedTasks', 'completionRate'];
    stats.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.textContent = '...';
            el.style.color = '#6B778C';
        }
    });
}

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
             onclick="if(typeof window.logout === 'function') { window.logout(); } else if(typeof authService !== 'undefined' && authService.logout) { authService.logout(); } else { window.location.href = 'milo-login.html'; }">Logout</div>
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

// Load dashboard data with caching and error handling
async function loadDashboardData() {
    try {
        let currentProject = null;
        
        // Try projectSelector first
        if (typeof projectSelector !== 'undefined' && projectSelector.getCurrentProject) {
            currentProject = projectSelector.getCurrentProject();
        }
        
        // If not in memory, try localStorage
        if (!currentProject) {
            const stored = localStorage.getItem('milo_current_project');
            if (stored) {
                try {
                    currentProject = JSON.parse(stored);
                    if (typeof projectSelector !== 'undefined' && projectSelector.setCurrentProject) {
                        projectSelector.setCurrentProject(currentProject);
                    }
                } catch (e) {
                    console.error('Error parsing stored project:', e);
                }
            }
        }
        
        // If still no project, try user projects list
        if (!currentProject) {
            const projectsStr = localStorage.getItem('milo_user_projects') || sessionStorage.getItem('milo_user_projects');
            if (projectsStr) {
                try {
                    const projects = JSON.parse(projectsStr);
                    if (projects && projects.length > 0) {
                        currentProject = projects[0];
                        if (typeof projectSelector !== 'undefined' && projectSelector.setCurrentProject) {
                            projectSelector.setCurrentProject(currentProject);
                        }
                    }
                } catch (e) {
                    console.error('Error parsing projects:', e);
                }
            }
        }
        
        // If still no project, try loading from API
        if (!currentProject) {
            const user = authService.getCurrentUser();
            if (user && typeof projectSelector !== 'undefined' && projectSelector.loadProjects) {
                try {
                    await projectSelector.loadProjects(user.id);
                    currentProject = projectSelector.getCurrentProject();
                    if (!currentProject && projectSelector.projects && projectSelector.projects.length > 0) {
                        currentProject = projectSelector.projects[0];
                        projectSelector.setCurrentProject(currentProject);
                    }
                } catch (error) {
                    console.error('Failed to load projects:', error);
                }
            }
        }
        
        if (!currentProject) {
            console.error('No project selected');
            showErrorState();
            return;
        }
        
        console.log('Loading dashboard for project:', currentProject.name, 'ID:', currentProject.id);

        // Check cache first (but always reload if data is empty)
        const now = Date.now();
        const hasValidCache = dataCache.tasks && 
                             dataCache.tasks.length > 0 && 
                             (now - dataCache.timestamp < dataCache.duration);
        
        if (hasValidCache) {
            console.log('Using cached dashboard data:', dataCache.tasks.length, 'tasks');
            dashboardData.tasks = dataCache.tasks;
            dashboardData.filteredTasks = [...dashboardData.tasks];
            await loadAssignees();
            applyFiltersImmediate();
            return;
        } else if (dataCache.tasks && dataCache.tasks.length === 0) {
            console.log('Cache has no tasks, forcing reload...');
        }

        // Load data with timeout protection
        console.log('🔍 Fetching tasks for project:', currentProject.id, 'from API endpoint:', `/tasks?projectId=${currentProject.id}`);
        const apiPromise = (async () => {
            try {
                const response = await apiClient.get(`/tasks?projectId=${currentProject.id}`);
                
                console.log('📡 API Response Status:', response.status, response.ok ? '✅' : '❌');
                
                if (response.ok) {
                    const data = await response.json();
                    // Handle both paginated and non-paginated responses
                    const tasks = data.tasks || data;
                    
                    // Ensure tasks is an array
                    const tasksArray = Array.isArray(tasks) ? tasks : [];
                    
                    console.log('✅ Loaded tasks:', tasksArray.length, 'tasks');
                    console.log('📋 Response structure:', {
                        isArray: Array.isArray(data),
                        hasTasks: !!data.tasks,
                        tasksLength: tasksArray.length,
                        sampleData: data
                    });
                    
                    if (tasksArray.length === 0) {
                        console.warn('⚠️ No tasks found for this project. Please create some tasks on the Board first!');
                        console.info('💡 Tip: Click the "Create" button on the Board page to add tasks');
                        console.info('💡 Current project ID:', currentProject.id);
                    } else {
                        console.log('📋 Sample task:', tasksArray[0]);
                    }
                    
                    // Cache the data
                    dataCache.tasks = tasksArray;
                    dataCache.timestamp = now;
                    
                    dashboardData.tasks = tasksArray;
                    // Start with all tasks visible (no filtering yet)
                    dashboardData.filteredTasks = [...dashboardData.tasks];
                    
                    console.log('📊 Dashboard data set:', {
                        totalTasks: dashboardData.tasks.length,
                        filteredTasks: dashboardData.filteredTasks.length,
                        hasData: dashboardData.tasks.length > 0
                    });
                    
                    // Load assignees for filter
                    await loadAssignees();
                    
                    // Apply initial filters and render (this will update stats)
                    console.log('🔄 Applying filters and updating UI...');
                    applyFiltersImmediate();
                    
                    // Force update stats even if filters didn't change
                    updateStats();
                    updateCharts();
                    
                    if (dashboardData.tasks.length > 0) {
                        console.log('✅ Dashboard loaded successfully with', dashboardData.tasks.length, 'tasks');
                    } else {
                        console.log('ℹ️ Dashboard loaded but no tasks found. Create tasks on the Board to see data here.');
                    }
                } else {
                    const errorText = await response.text().catch(() => 'Unknown error');
                    console.error('❌ Failed to load tasks. Status:', response.status, 'Response:', errorText);
                    console.error('🔧 Check if the API is running at:', apiClient.baseURL);
                    showErrorState();
                }
            } catch (apiError) {
                console.error('❌ API Request Error:', apiError.message);
                console.error('🔧 Full error:', apiError);
                showErrorState();
                throw apiError;
            }
        })();
        
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Dashboard load timeout')), 10000)
        );
        
        await Promise.race([apiPromise, timeoutPromise]);
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showErrorState();
    }
}

// Show error state with fallback values
function showErrorState() {
    // Use cached data if available, otherwise show zeros
    if (dataCache.tasks && dataCache.tasks.length > 0) {
        console.log('Using cached data due to error');
        dashboardData.tasks = dataCache.tasks;
        dashboardData.filteredTasks = [...dashboardData.tasks];
        applyFiltersImmediate(); // No debounce for error recovery
        return;
    }
    
    // Show zeros instead of "Error"
    const totalTasksEl = document.getElementById('totalTasks');
    const inProgressEl = document.getElementById('inProgressTasks');
    const completedEl = document.getElementById('completedTasks');
    const completionRateEl = document.getElementById('completionRate');
    
    if (totalTasksEl) {
        totalTasksEl.textContent = '0';
        totalTasksEl.style.color = '';
    }
    if (inProgressEl) inProgressEl.textContent = '0';
    if (completedEl) completedEl.textContent = '0';
    if (completionRateEl) completionRateEl.textContent = '0%';
    
    // Show helpful message on dashboard
    showEmptyStateMessage();
    
    // Clear charts
    Object.values(charts).forEach(chart => {
        if (chart) {
            try {
                chart.destroy();
            } catch (e) {
                console.warn('Error destroying chart:', e);
            }
        }
    });
}

// Show empty state message when no tasks
function showEmptyStateMessage() {
    const dashboardContent = document.querySelector('.dashboard-content');
    if (!dashboardContent) return;
    
    // Check if message already exists
    if (document.getElementById('emptyStateMessage')) return;
    
    const emptyMessage = document.createElement('div');
    emptyMessage.id = 'emptyStateMessage';
    emptyMessage.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        text-align: center;
        padding: 40px;
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        z-index: 1000;
        max-width: 500px;
    `;
    emptyMessage.innerHTML = `
        <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#0052CC" stroke-width="1.5" style="margin-bottom: 20px;">
            <rect x="3" y="3" width="7" height="9"></rect>
            <rect x="14" y="3" width="7" height="5"></rect>
            <rect x="14" y="12" width="7" height="9"></rect>
            <rect x="3" y="16" width="7" height="5"></rect>
        </svg>
        <h2 style="margin: 0 0 16px 0; color: #172B4D; font-size: 24px;">No Tasks Yet</h2>
        <p style="margin: 0 0 24px 0; color: #6B778C; font-size: 16px; line-height: 1.5;">
            Your dashboard will display metrics once you create tasks on the Board.
        </p>
        <button onclick="window.location.href='milo-board.html'" 
                style="background: #0052CC; color: white; border: none; padding: 12px 24px; border-radius: 4px; font-size: 14px; font-weight: 500; cursor: pointer;">
            Go to Board & Create Tasks
        </button>
        <p style="margin: 16px 0 0 0; color: #6B778C; font-size: 13px;">
            Or press <kbd style="background: #F4F5F7; padding: 2px 6px; border-radius: 3px;">F12</kbd> to open console for debugging
        </p>
    `;
    
    dashboardContent.appendChild(emptyMessage);
}

// Load assignees for filter dropdown - get ALL users from API
async function loadAssignees() {
    try {
        const assigneeFilter = document.getElementById('assigneeFilter');
        if (!assigneeFilter) {
            console.warn('Assignee filter element not found');
            return;
        }
        
        // Clear existing options except "All Assignees"
        assigneeFilter.innerHTML = '<option value="all" selected>All Assignees</option>';
        
        // Load all users from API (not just from tasks)
        const usersResponse = await apiClient.get('/auth/users');
        
        if (usersResponse.ok) {
            const users = await usersResponse.json();
            console.log('Loaded all users for filter:', users.length);
            
            // Sort users by name
            const sortedUsers = users.sort((a, b) => 
                (a.name || a.email || '').localeCompare(b.name || b.email || '')
            );
            
            // Add all users to dropdown
            sortedUsers.forEach(user => {
                const option = document.createElement('option');
                option.value = user.id;
                option.textContent = user.name || user.email || 'Unknown';
                assigneeFilter.appendChild(option);
            });
            
            console.log('Added', sortedUsers.length, 'assignees to filter');
        } else {
            console.error('Failed to load users for filter:', usersResponse.status);
            // Fallback: extract from tasks if API fails
            const assigneeMap = new Map();
            dashboardData.tasks.forEach(task => {
                if (task.assignee && task.assigneeId) {
                    assigneeMap.set(task.assigneeId, task.assignee.name || task.assignee.email);
                }
            });
            const sortedAssignees = Array.from(assigneeMap.entries()).sort((a, b) => 
                a[1].localeCompare(b[1])
            );
            sortedAssignees.forEach(([id, name]) => {
                const option = document.createElement('option');
                option.value = id;
                option.textContent = name;
                assigneeFilter.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading assignees:', error);
    }
}

// Apply filters with debouncing for performance
function applyFilters() {
    // Clear existing timeout
    if (filterTimeout) {
        clearTimeout(filterTimeout);
    }
    
    // Show immediate feedback if there's no data yet
    if (!dashboardData.tasks || dashboardData.tasks.length === 0) {
        showLoadingState();
    }
    
    // Debounce filter application
    filterTimeout = setTimeout(() => {
        applyFiltersImmediate();
    }, FILTER_DEBOUNCE_MS);
}

// Immediate filter application (called after debounce)
function applyFiltersImmediate() {
    const assigneeFilterEl = document.getElementById('assigneeFilter');
    const statusFilterEl = document.getElementById('statusFilter');
    const timeRangeFilterEl = document.getElementById('timeRangeFilter');
    
    if (!assigneeFilterEl || !statusFilterEl || !timeRangeFilterEl) {
        console.warn('Filter elements not found');
        return;
    }
    
    // Handle case where tasks haven't loaded yet
    if (!dashboardData.tasks) {
        console.log('No tasks data available yet');
        showLoadingState();
        return;
    }
    
    const assigneeFilter = assigneeFilterEl.value;
    const statusFilter = statusFilterEl.value;
    const timeRangeFilter = timeRangeFilterEl.value;
    
    // Filter tasks - treat empty string as "all"
    const assigneeValue = assigneeFilter === '' ? 'all' : assigneeFilter;
    const statusValue = statusFilter === '' ? 'all' : statusFilter;
    
    console.log('Applying filters:', {
        assignee: assigneeValue,
        status: statusValue,
        timeRange: timeRangeFilter,
        totalTasks: dashboardData.tasks.length
    });
    
    dashboardData.filteredTasks = dashboardData.tasks.filter(task => {
        // Filter by assignee
        if (assigneeValue && assigneeValue !== 'all') {
            const taskAssigneeId = task.assigneeId ? String(task.assigneeId) : null;
            const filterAssigneeId = String(assigneeValue);
            if (taskAssigneeId !== filterAssigneeId) {
                return false;
            }
        }
        
        // Filter by status (handle variations)
        if (statusValue && statusValue !== 'all') {
            const taskStatus = (task.status || '').toLowerCase();
            const filterStatus = statusValue.toLowerCase();
            
            // Map status variations
            const statusMap = {
                'todo': ['todo', 'backlog', ''],
                'progress': ['progress', 'in-progress', 'inprogress'],
                'review': ['review', 'in-review', 'inreview'],
                'done': ['done', 'completed', 'complete']
            };
            
            const matchingStatuses = statusMap[filterStatus] || [filterStatus];
            if (!matchingStatuses.includes(taskStatus)) {
                return false;
            }
        }
        
        // Filter by time range
        if (timeRangeFilter && timeRangeFilter !== 'all') {
            const daysAgo = parseInt(timeRangeFilter);
            if (!isNaN(daysAgo)) {
                const cutoffDate = new Date();
                cutoffDate.setDate(cutoffDate.getDate() - daysAgo);
                cutoffDate.setHours(0, 0, 0, 0);
                
                // Try different date fields
                const taskDate = task.createdAt ? new Date(task.createdAt) : 
                               task.createdDate ? new Date(task.createdDate) :
                               task.dateCreated ? new Date(task.dateCreated) : null;
                
                if (taskDate) {
                    taskDate.setHours(0, 0, 0, 0);
                    if (taskDate < cutoffDate) {
                        return false;
                    }
                } else {
                    // If no date field, include it (don't filter out)
                }
            }
        }
        
        return true;
    });
    
    console.log('Filtered tasks:', dashboardData.filteredTasks.length, 'out of', dashboardData.tasks.length);
    
    // Update stats and charts
    updateStats();
    updateCharts();
}

// Update stats cards with null checks and status matching
function updateStats() {
    const tasks = dashboardData.filteredTasks || dashboardData.tasks || [];
    
    const totalTasks = tasks.length;
    
    // Handle status variations
    const inProgressTasks = tasks.filter(t => {
        const status = (t.status || '').toLowerCase();
        return status === 'progress' || status === 'in-progress' || status === 'inprogress';
    }).length;
    
    const completedTasks = tasks.filter(t => {
        const status = (t.status || '').toLowerCase();
        return status === 'done' || status === 'completed' || status === 'complete';
    }).length;
    
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    
    console.log('✓ Stats updated:', {
        total: totalTasks,
        inProgress: inProgressTasks,
        completed: completedTasks,
        rate: completionRate + '%',
        hasData: dashboardData.tasks && dashboardData.tasks.length > 0
    });
    
    // Update with null checks
    const totalTasksEl = document.getElementById('totalTasks');
    const inProgressEl = document.getElementById('inProgressTasks');
    const completedEl = document.getElementById('completedTasks');
    const completionRateEl = document.getElementById('completionRate');
    
    if (totalTasksEl) {
        totalTasksEl.textContent = totalTasks;
        totalTasksEl.style.color = ''; // Reset color from loading state
        totalTasksEl.style.opacity = '1';
    }
    if (inProgressEl) {
        inProgressEl.textContent = inProgressTasks;
        inProgressEl.style.opacity = '1';
    }
    if (completedEl) {
        completedEl.textContent = completedTasks;
        completedEl.style.opacity = '1';
    }
    if (completionRateEl) {
        completionRateEl.textContent = completionRate + '%';
        completionRateEl.style.opacity = '1';
    }
}

// Update all charts with error handling
function updateCharts() {
    try {
        // Check if Chart.js is loaded
        if (typeof Chart === 'undefined') {
            console.error('Chart.js not loaded! Waiting for it...');
            // Retry after a delay
            setTimeout(() => {
                if (typeof Chart !== 'undefined') {
                    console.log('Chart.js loaded, retrying charts...');
                    updateCharts();
                } else {
                    console.error('Chart.js failed to load after waiting');
                }
            }, 500);
            return;
        }
        
        console.log('Updating all charts...');
        updateStatusChart();
        updateAssigneeChart();
        updatePriorityChart();
        updateTimelineChart();
        console.log('✓ All charts updated');
    } catch (error) {
        console.error('Error updating charts:', error);
    }
}

// Update status chart with status variation handling
function updateStatusChart() {
    const tasks = dashboardData.filteredTasks || dashboardData.tasks || [];
    const ctx = document.getElementById('statusChart');
    
    if (!ctx) {
        console.warn('Status chart canvas not found');
        return;
    }
    
    // Count tasks by status (handle variations)
    const statusCounts = {
        'todo': tasks.filter(t => {
            const status = (t.status || '').toLowerCase();
            return status === 'todo' || status === 'backlog' || !status;
        }).length,
        'progress': tasks.filter(t => {
            const status = (t.status || '').toLowerCase();
            return status === 'progress' || status === 'in-progress' || status === 'inprogress';
        }).length,
        'review': tasks.filter(t => {
            const status = (t.status || '').toLowerCase();
            return status === 'review' || status === 'in-review' || status === 'inreview';
        }).length,
        'done': tasks.filter(t => {
            const status = (t.status || '').toLowerCase();
            return status === 'done' || status === 'completed' || status === 'complete';
        }).length
    };
    
    console.log('Status chart data:', statusCounts);
    
    // Update existing chart if possible, otherwise create new one
    if (charts.statusChart && charts.statusChart.data) {
        charts.statusChart.data.datasets[0].data = [
            statusCounts.todo,
            statusCounts.progress,
            statusCounts.review,
            statusCounts.done
        ];
        charts.statusChart.update('none'); // 'none' mode = no animation for performance
    } else {
        // Destroy existing chart if it exists
        if (charts.statusChart) {
            try {
                charts.statusChart.destroy();
            } catch (e) {
                console.warn('Error destroying old chart:', e);
            }
        }
        
        charts.statusChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['To Do', 'In Progress', 'In Review', 'Done'],
            datasets: [{
                data: [statusCounts.todo, statusCounts.progress, statusCounts.review, statusCounts.done],
                backgroundColor: [
                    '#DFE1E6',
                    '#FFAB00',
                    '#0065FF',
                    '#36B37E'
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 15,
                        font: {
                            size: 12,
                            family: 'Inter'
                        }
                    }
                }
            }
        }
    });
}

// Update assignee chart with optimization
function updateAssigneeChart() {
    const tasks = dashboardData.filteredTasks || dashboardData.tasks || [];
    const ctx = document.getElementById('assigneeChart');
    
    if (!ctx) {
        console.warn('Assignee chart canvas not found');
        return;
    }
    
    console.log('Updating assignee chart with', tasks.length, 'tasks');
    console.log('Sample task assignee:', tasks[0]?.assignee);
    
    // Group tasks by assignee
    const assigneeMap = {};
    tasks.forEach(task => {
        // Handle different assignee data structures
        let assigneeName = 'Unassigned';
        if (task.assignee) {
            // API returns assignee as { Id, Name, Email }
            assigneeName = task.assignee.Name || task.assignee.name || task.assignee.Email || task.assignee.email || 'Unassigned';
        } else if (task.assigneeName) {
            // Fallback to assigneeName if available
            assigneeName = task.assigneeName;
        }
        assigneeMap[assigneeName] = (assigneeMap[assigneeName] || 0) + 1;
    });
    
    console.log('Assignee map:', assigneeMap);
    
    // Sort by count and take top 10
    const sortedAssignees = Object.entries(assigneeMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
    
    const labels = sortedAssignees.map(a => a[0]);
    const data = sortedAssignees.map(a => a[1]);
    
    console.log('Assignee chart data:', { labels, data });
    
    // If no data, create a chart with placeholder
    if (labels.length === 0 || (labels.length === 1 && labels[0] === 'Unassigned' && data[0] === 0)) {
        labels.length = 0;
        data.length = 0;
        labels.push('No Data');
        data.push(0);
    }
    
    // Update existing chart if possible
    if (charts.assigneeChart) {
        charts.assigneeChart.data.labels = labels;
        charts.assigneeChart.data.datasets[0].data = data;
        charts.assigneeChart.update('none');
    } else {
        charts.assigneeChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Tasks',
                data: data,
                backgroundColor: '#0052CC',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1,
                        font: {
                            family: 'Inter'
                        }
                    },
                    grid: {
                        color: '#F4F5F7'
                    }
                },
                x: {
                    ticks: {
                        font: {
                            family: 'Inter',
                            size: 11
                        }
                    },
                    grid: {
                        display: false
                    }
                }
            }
        }
        });
    }
}

// Update priority chart with optimization
function updatePriorityChart() {
    const tasks = dashboardData.filteredTasks || dashboardData.tasks || [];
    const ctx = document.getElementById('priorityChart');
    
    if (!ctx) {
        console.warn('Priority chart canvas not found');
        return;
    }
    
    console.log('Updating priority chart with', tasks.length, 'tasks');
    console.log('Sample task priority:', tasks[0]?.priority);
    
    const priorityCounts = {
        'low': tasks.filter(t => (t.priority || 0) === 0).length,
        'medium': tasks.filter(t => (t.priority || 0) === 1).length,
        'high': tasks.filter(t => (t.priority || 0) === 2).length
    };
    
    console.log('Priority counts:', priorityCounts);
    
    // Check if all counts are zero
    const totalCount = priorityCounts.low + priorityCounts.medium + priorityCounts.high;
    if (totalCount === 0) {
        // Don't show fake data, show empty state
        priorityCounts.low = 0;
        priorityCounts.medium = 0;
        priorityCounts.high = 0;
    }
    
    // Update existing chart if possible
    if (charts.priorityChart) {
        charts.priorityChart.data.datasets[0].data = [
            priorityCounts.low,
            priorityCounts.medium,
            priorityCounts.high
        ];
        charts.priorityChart.update('none');
    } else {
        charts.priorityChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Low', 'Medium', 'High'],
            datasets: [{
                data: [priorityCounts.low, priorityCounts.medium, priorityCounts.high],
                backgroundColor: [
                    '#36B37E',
                    '#FFAB00',
                    '#DE350B'
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 15,
                        font: {
                            size: 12,
                            family: 'Inter'
                        }
                    }
                }
            }
        }
        });
    }
}

// Invalidate cache (call this when tasks are updated elsewhere)
function invalidateDashboardCache() {
    dataCache.tasks = null;
    dataCache.timestamp = 0;
}

// Update timeline chart (last 7 days) with null checks
function updateTimelineChart() {
    const tasks = dashboardData.tasks || []; // Use all tasks for timeline
    const ctx = document.getElementById('timelineChart');
    
    if (!ctx) {
        console.warn('Timeline chart canvas not found');
        return;
    }
    
    console.log('Updating timeline chart with', tasks.length, 'tasks');
    console.log('Sample task dates:', tasks[0] ? { createdAt: tasks[0].createdAt, updatedAt: tasks[0].updatedAt } : 'no tasks');
    
    // Get last 7 days
    const days = [];
    const completedCounts = [];
    const createdCounts = [];
    
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        days.push(dateStr);
        
        // Count tasks completed on this day (handle status variations)
        const completedOnDay = tasks.filter(t => {
            // Check if task is done
            const status = (t.status || '').toLowerCase();
            if (status !== 'done' && status !== 'completed' && status !== 'complete') return false;
            
            // Use updatedAt if available, otherwise createdAt
            const dateField = t.updatedAt || t.createdAt;
            if (!dateField) return false;
            
            try {
                const taskDate = new Date(dateField);
                if (isNaN(taskDate.getTime())) return false;
                taskDate.setHours(0, 0, 0, 0);
                return taskDate.getTime() === date.getTime();
            } catch (e) {
                return false;
            }
        }).length;
        
        // Count tasks created on this day
        const createdOnDay = tasks.filter(t => {
            if (!t.createdAt) return false;
            try {
                const taskDate = new Date(t.createdAt);
                if (isNaN(taskDate.getTime())) return false;
                taskDate.setHours(0, 0, 0, 0);
                return taskDate.getTime() === date.getTime();
            } catch (e) {
                return false;
            }
        }).length;
        
        completedCounts.push(completedOnDay);
        createdCounts.push(createdOnDay);
    }
    
    console.log('Timeline chart data:', { days, completedCounts, createdCounts });
    
    // Update existing chart if possible
    if (charts.timelineChart) {
        charts.timelineChart.data.labels = days;
        charts.timelineChart.data.datasets[0].data = completedCounts;
        charts.timelineChart.data.datasets[1].data = createdCounts;
        charts.timelineChart.update('none');
    } else {
        charts.timelineChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: days,
            datasets: [
                {
                    label: 'Completed',
                    data: completedCounts,
                    borderColor: '#36B37E',
                    backgroundColor: 'rgba(54, 179, 126, 0.1)',
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Created',
                    data: createdCounts,
                    borderColor: '#0052CC',
                    backgroundColor: 'rgba(0, 82, 204, 0.1)',
                    tension: 0.4,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 15,
                        font: {
                            size: 12,
                            family: 'Inter'
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1,
                        font: {
                            family: 'Inter'
                        }
                    },
                    grid: {
                        color: '#F4F5F7'
                    }
                },
                x: {
                    ticks: {
                        font: {
                            family: 'Inter',
                            size: 11
                        }
                    },
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
    }
}

// Show create task modal (redirect to board for now)
function showCreateTaskModal() {
    window.location.href = 'milo-board.html';
}

// Make functions globally available
window.applyFilters = applyFilters;
window.showCreateTaskModal = showCreateTaskModal;
window.invalidateDashboardCache = invalidateDashboardCache;
window.loadDashboardData = loadDashboardData;
}
