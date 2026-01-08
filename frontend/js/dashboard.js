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
        document.getElementById('globalUserAvatar').textContent = initials;
    }

    // Setup user menu dropdown
    setupUserMenu();

    // Load project info
    const currentProject = projectSelector.getCurrentProject();
    if (currentProject) {
        document.getElementById('projectName').textContent = currentProject.name;
        document.getElementById('projectIcon').textContent = (currentProject.key || currentProject.name).substring(0, 1).toUpperCase();
        document.getElementById('projectTitle').textContent = currentProject.name + ' Dashboard';
    } else {
        window.location.href = 'milo-select-project.html';
        return;
    }

    // Load dashboard data
    loadDashboardData();
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

// Load dashboard data
async function loadDashboardData() {
    try {
        const currentProject = projectSelector.getCurrentProject();
        if (!currentProject) {
            console.error('No project selected');
            return;
        }

        console.log('Loading dashboard data for project:', currentProject.id);
        const response = await apiClient.get(`/tasks?projectId=${currentProject.id}`);
        
        if (response.ok) {
            dashboardData.tasks = await response.json();
            console.log('Loaded tasks:', dashboardData.tasks.length);
            dashboardData.filteredTasks = [...dashboardData.tasks];
            
            // Load assignees for filter
            await loadAssignees();
            
            // Apply initial filters and render
            applyFilters();
        } else {
            const errorText = await response.text();
            console.error('Failed to load tasks. Status:', response.status, 'Response:', errorText);
            
            // Show error message to user
            document.getElementById('totalTasks').textContent = 'Error';
            document.getElementById('totalTasks').style.color = '#DE350B';
        }
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        
        // Show error message to user
        document.getElementById('totalTasks').textContent = 'Error';
        document.getElementById('totalTasks').style.color = '#DE350B';
    }
}

// Load assignees for filter dropdown
async function loadAssignees() {
    try {
        const currentProject = projectSelector.getCurrentProject();
        const response = await apiClient.get(`/users?projectId=${currentProject.id}`);
        if (response.ok) {
            const users = await response.json();
            const assigneeFilter = document.getElementById('assigneeFilter');
            
            // Add assignees to dropdown
            users.forEach(user => {
                const option = document.createElement('option');
                option.value = user.id;
                option.textContent = user.name || user.email;
                assigneeFilter.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading assignees:', error);
    }
}

// Apply filters
function applyFilters() {
    const assigneeFilter = document.getElementById('assigneeFilter').value;
    const statusFilter = document.getElementById('statusFilter').value;
    const timeRangeFilter = document.getElementById('timeRangeFilter').value;
    
    // Filter tasks
    dashboardData.filteredTasks = dashboardData.tasks.filter(task => {
        // Filter by assignee
        if (assigneeFilter && task.assigneeId != assigneeFilter) {
            return false;
        }
        
        // Filter by status
        if (statusFilter && task.status !== statusFilter) {
            return false;
        }
        
        // Filter by time range
        if (timeRangeFilter !== 'all') {
            const daysAgo = parseInt(timeRangeFilter);
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysAgo);
            const taskDate = new Date(task.createdAt);
            if (taskDate < cutoffDate) {
                return false;
            }
        }
        
        return true;
    });
    
    // Update stats and charts
    updateStats();
    updateCharts();
}

// Update stats cards
function updateStats() {
    const tasks = dashboardData.filteredTasks;
    
    const totalTasks = tasks.length;
    const inProgressTasks = tasks.filter(t => t.status === 'progress').length;
    const completedTasks = tasks.filter(t => t.status === 'done').length;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    
    document.getElementById('totalTasks').textContent = totalTasks;
    document.getElementById('inProgressTasks').textContent = inProgressTasks;
    document.getElementById('completedTasks').textContent = completedTasks;
    document.getElementById('completionRate').textContent = completionRate + '%';
}

// Update all charts
function updateCharts() {
    updateStatusChart();
    updateAssigneeChart();
    updatePriorityChart();
    updateTimelineChart();
}

// Update status chart
function updateStatusChart() {
    const tasks = dashboardData.filteredTasks;
    
    const statusCounts = {
        'todo': tasks.filter(t => t.status === 'todo').length,
        'progress': tasks.filter(t => t.status === 'progress').length,
        'review': tasks.filter(t => t.status === 'review').length,
        'done': tasks.filter(t => t.status === 'done').length
    };
    
    const ctx = document.getElementById('statusChart');
    
    // Destroy existing chart if it exists
    if (charts.statusChart) {
        charts.statusChart.destroy();
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

// Update assignee chart
function updateAssigneeChart() {
    const tasks = dashboardData.filteredTasks;
    
    // Group tasks by assignee
    const assigneeMap = {};
    tasks.forEach(task => {
        const assigneeName = task.assignee ? task.assignee.name : 'Unassigned';
        assigneeMap[assigneeName] = (assigneeMap[assigneeName] || 0) + 1;
    });
    
    // Sort by count and take top 10
    const sortedAssignees = Object.entries(assigneeMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
    
    const labels = sortedAssignees.map(a => a[0]);
    const data = sortedAssignees.map(a => a[1]);
    
    const ctx = document.getElementById('assigneeChart');
    
    // Destroy existing chart if it exists
    if (charts.assigneeChart) {
        charts.assigneeChart.destroy();
    }
    
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

// Update priority chart
function updatePriorityChart() {
    const tasks = dashboardData.filteredTasks;
    
    const priorityCounts = {
        'low': tasks.filter(t => t.priority === 0).length,
        'medium': tasks.filter(t => t.priority === 1).length,
        'high': tasks.filter(t => t.priority === 2).length
    };
    
    const ctx = document.getElementById('priorityChart');
    
    // Destroy existing chart if it exists
    if (charts.priorityChart) {
        charts.priorityChart.destroy();
    }
    
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

// Update timeline chart (last 7 days)
function updateTimelineChart() {
    const tasks = dashboardData.tasks; // Use all tasks for timeline
    
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
        
        // Count tasks completed on this day
        const completedOnDay = tasks.filter(t => {
            if (!t.updatedAt || t.status !== 'done') return false;
            const taskDate = new Date(t.updatedAt);
            taskDate.setHours(0, 0, 0, 0);
            return taskDate.getTime() === date.getTime();
        }).length;
        
        // Count tasks created on this day
        const createdOnDay = tasks.filter(t => {
            const taskDate = new Date(t.createdAt);
            taskDate.setHours(0, 0, 0, 0);
            return taskDate.getTime() === date.getTime();
        }).length;
        
        completedCounts.push(completedOnDay);
        createdCounts.push(createdOnDay);
    }
    
    const ctx = document.getElementById('timelineChart');
    
    // Destroy existing chart if it exists
    if (charts.timelineChart) {
        charts.timelineChart.destroy();
    }
    
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

// Show create task modal (redirect to board for now)
function showCreateTaskModal() {
    window.location.href = 'milo-board.html';
}

// Make functions globally available
window.applyFilters = applyFilters;
window.showCreateTaskModal = showCreateTaskModal;

