// Incidents Management
let incidents = [];
let allIncidents = [];
let currentIncident = null;
let currentProject = null;
let users = [];
let teams = [];
const apiClient = new ApiClient(window.config);

// Initialize on page load
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Incidents page loaded');
    
    // Check authentication
    if (!authService.isAuthenticated()) {
        window.location.href = 'milo-login.html';
        return;
    }

    // Get current project
    if (typeof projectSelector !== 'undefined') {
        currentProject = projectSelector.currentProject;
    } else {
        // Fallback to localStorage
        const projectData = localStorage.getItem('currentProject');
        if (projectData) {
            try {
                currentProject = JSON.parse(projectData);
            } catch (e) {
                console.error('Failed to parse project data', e);
            }
        }
    }

    if (!currentProject) {
        console.warn('No project selected');
        // Don't redirect, just show message
        // Incidents can be created without a project
    }

    // Update project name in breadcrumb
    const projectNameEl = document.getElementById('projectName');
    if (projectNameEl) {
        projectNameEl.textContent = currentProject.name || 'Project';
    }

    // Load initial data
    await loadUsers();
    await loadTeams();
    await loadIncidents();
    
    // Close modal when clicking outside
    const createModal = document.getElementById('createIncidentModal');
    if (createModal) {
        createModal.addEventListener('click', function(e) {
            if (e.target === createModal) {
                closeCreateIncidentModal();
            }
        });
    }
});

// Load users for requester/agent dropdowns
async function loadUsers() {
    try {
        const response = await apiClient.get('/auth/users');
        users = response || [];
        
        // Populate requester dropdown
        const requesterSelect = document.getElementById('incidentRequester');
        if (requesterSelect) {
            requesterSelect.innerHTML = '<option value="">Select Requester</option>';
            users.forEach(user => {
                const option = document.createElement('option');
                option.value = user.id;
                option.textContent = `${user.name} (${user.email})`;
                requesterSelect.appendChild(option);
            });
        }

        // Populate agent dropdown
        const agentSelect = document.getElementById('incidentAgent');
        if (agentSelect) {
            agentSelect.innerHTML = '<option value="">Unassigned</option>';
            users.forEach(user => {
                const option = document.createElement('option');
                option.value = user.id;
                option.textContent = user.name;
                agentSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Failed to load users:', error);
    }
}

// Load teams for group dropdown
async function loadTeams() {
    try {
        if (!currentProject || !currentProject.id) {
            console.warn('No project ID available for loading teams');
            return;
        }

        const response = await apiClient.get(`/teams?projectId=${currentProject.id}`);
        teams = response || [];
        
        const groupSelect = document.getElementById('incidentGroup');
        if (groupSelect) {
            groupSelect.innerHTML = '<option value="">Select Group</option>';
            teams.forEach(team => {
                const option = document.createElement('option');
                option.value = team.id;
                option.textContent = team.name;
                groupSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Failed to load teams:', error);
    }
}

// Load incidents
async function loadIncidents() {
    try {
        console.log('Loading incidents...');
        
        const projectId = currentProject?.id;
        const url = projectId ? `/incidents?projectId=${projectId}` : '/incidents';
        
        const response = await apiClient.get(url);
        allIncidents = response || [];
        incidents = [...allIncidents];
        
        console.log(`Loaded ${incidents.length} incidents`);
        renderIncidents();
    } catch (error) {
        console.error('Failed to load incidents:', error);
        showEmptyState();
    }
}

// Render incidents table
function renderIncidents() {
    const tbody = document.getElementById('incidentsTableBody');
    const emptyState = document.getElementById('emptyState');
    
    if (!tbody) return;

    if (incidents.length === 0) {
        tbody.innerHTML = '';
        if (emptyState) {
            emptyState.style.display = 'block';
        }
        return;
    }

    if (emptyState) {
        emptyState.style.display = 'none';
    }

    tbody.innerHTML = incidents.map(incident => {
        const createdDate = new Date(incident.createdAt).toLocaleDateString();
        const requesterName = incident.requester?.name || 'Unknown';
        const agentName = incident.agent?.name || 'Unassigned';
        
        return `
            <tr onclick="showIncidentDetails(${incident.id})">
                <td><span class="incident-number">${incident.incidentNumber}</span></td>
                <td>${escapeHtml(incident.subject)}</td>
                <td><span class="status-badge status-${incident.status.toLowerCase()}">${incident.status}</span></td>
                <td><span class="priority-badge priority-${incident.priority.toLowerCase()}">${incident.priority}</span></td>
                <td>${escapeHtml(requesterName)}</td>
                <td>${escapeHtml(agentName)}</td>
                <td>${createdDate}</td>
            </tr>
        `;
    }).join('');
}

// Show empty state
function showEmptyState() {
    const tbody = document.getElementById('incidentsTableBody');
    const emptyState = document.getElementById('emptyState');
    
    if (tbody) {
        tbody.innerHTML = '';
    }
    if (emptyState) {
        emptyState.style.display = 'block';
    }
}

// Filter incidents
function filterIncidents() {
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const statusFilter = document.getElementById('statusFilter')?.value || '';
    const priorityFilter = document.getElementById('priorityFilter')?.value || '';

    incidents = allIncidents.filter(incident => {
        const matchesSearch = 
            incident.incidentNumber.toLowerCase().includes(searchTerm) ||
            incident.subject.toLowerCase().includes(searchTerm) ||
            incident.requester?.name.toLowerCase().includes(searchTerm) ||
            incident.agent?.name.toLowerCase().includes(searchTerm);
        
        const matchesStatus = !statusFilter || incident.status === statusFilter;
        const matchesPriority = !priorityFilter || incident.priority === priorityFilter;
        
        return matchesSearch && matchesStatus && matchesPriority;
    });

    renderIncidents();
}

// Show create incident modal
function showCreateIncidentModal() {
    console.log('showCreateIncidentModal called');
    const modal = document.getElementById('createIncidentModal');
    if (modal) {
        console.log('Modal found, adding active class');
        modal.classList.add('active');
        document.body.style.overflow = 'hidden'; // Prevent body scroll when modal is open
        
        // Reset form
        const form = document.getElementById('createIncidentForm');
        if (form) {
            form.reset();
        }
        
        // Load users for requester dropdown
        loadUsers().then(() => {
            const requesterSelect = document.getElementById('incidentRequester');
            if (requesterSelect && users.length > 0) {
                requesterSelect.innerHTML = '<option value="">Select Requester</option>';
                users.forEach(user => {
                    const option = document.createElement('option');
                    option.value = user.id;
                    option.textContent = user.name || user.email;
                    requesterSelect.appendChild(option);
                });
            }
        });
    } else {
        console.error('Modal element not found!');
    }
}

// Close create incident modal
function closeCreateIncidentModal() {
    const modal = document.getElementById('createIncidentModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = ''; // Restore body scroll
    }
}


// Create incident
async function createIncident(event) {
    event.preventDefault();
    
    try {
        const currentUser = authService.getCurrentUser();
        if (!currentUser) {
            console.error('User not logged in');
            return;
        }

        const subject = document.getElementById('incidentSubject')?.value;
        const requesterId = parseInt(document.getElementById('incidentRequester')?.value);
        const status = document.getElementById('incidentStatus')?.value || 'New';
        const priority = document.getElementById('incidentPriority')?.value || 'Low';
        const urgency = document.getElementById('incidentUrgency')?.value;
        const impact = document.getElementById('incidentImpact')?.value;
        const source = document.getElementById('incidentSource')?.value;
        const department = document.getElementById('incidentDepartment')?.value;
        const agentId = document.getElementById('incidentAgent')?.value;
        const groupId = document.getElementById('incidentGroup')?.value;
        const category = document.getElementById('incidentCategory')?.value;
        const description = document.getElementById('incidentDescription')?.value;

        if (!subject || !requesterId) {
            console.error('Missing required fields');
            return;
        }

        const incidentData = {
            subject,
            requesterId,
            status,
            priority,
            urgency: urgency || null,
            impact: impact || null,
            source: source || null,
            department: department || null,
            agentId: agentId ? parseInt(agentId) : null,
            groupId: groupId ? parseInt(groupId) : null,
            category: category || null,
            description: description || null,
            projectId: currentProject?.id || null
        };

        console.log('Creating incident:', incidentData);

        const newIncident = await apiClient.post('/incidents', incidentData);
        
        console.log('Incident created:', newIncident);

        // Close modal
        closeCreateIncidentModal();

        // Reload incidents
        await loadIncidents();

        // Success - incident created
        console.log(`Incident ${newIncident.incidentNumber} created successfully!`);
    } catch (error) {
        console.error('Failed to create incident:', error);
    }
}

// Show incident details
async function showIncidentDetails(incidentId) {
    try {
        console.log('Loading incident details for:', incidentId);
        
        const incident = await apiClient.get(`/incidents/${incidentId}`);
        currentIncident = incident;
        
        console.log('Incident details loaded:', incident);
        
        // Update detail panel
        const detailPanel = document.getElementById('detailPanel');
        const detailIncidentNumber = document.getElementById('detailIncidentNumber');
        const detailContent = document.getElementById('detailContent');
        
        if (detailIncidentNumber) {
            detailIncidentNumber.textContent = incident.incidentNumber;
        }
        
        if (detailContent) {
            detailContent.innerHTML = renderIncidentDetails(incident);
        }
        
        if (detailPanel) {
            detailPanel.classList.add('active');
        }
    } catch (error) {
        console.error('Failed to load incident details:', error);
    }
}

// Render incident details
function renderIncidentDetails(incident) {
    const createdDate = new Date(incident.createdAt).toLocaleString();
    const updatedDate = incident.updatedAt ? new Date(incident.updatedAt).toLocaleString() : 'Not updated';
    const resolvedDate = incident.resolvedAt ? new Date(incident.resolvedAt).toLocaleString() : 'Not resolved';
    
    return `
        <div class="detail-section">
            <div class="detail-section-title">Subject</div>
            <div class="detail-field">
                <div class="detail-field-value" style="font-size: 16px; font-weight: 500;">
                    ${escapeHtml(incident.subject)}
                </div>
            </div>
        </div>

        <div class="detail-section">
            <div class="detail-section-title">Status & Priority</div>
            <div class="detail-field">
                <div class="detail-field-label">Status</div>
                <div class="detail-field-value">
                    <span class="status-badge status-${incident.status.toLowerCase()}">${incident.status}</span>
                    <button class="btn-secondary" style="margin-left: 8px; padding: 4px 8px; font-size: 12px;" onclick="updateIncidentStatus()">Change Status</button>
                </div>
            </div>
            <div class="detail-field">
                <div class="detail-field-label">Priority</div>
                <div class="detail-field-value">
                    <span class="priority-badge priority-${incident.priority.toLowerCase()}">${incident.priority}</span>
                </div>
            </div>
            ${incident.urgency ? `
            <div class="detail-field">
                <div class="detail-field-label">Urgency</div>
                <div class="detail-field-value">${escapeHtml(incident.urgency)}</div>
            </div>
            ` : ''}
            ${incident.impact ? `
            <div class="detail-field">
                <div class="detail-field-label">Impact</div>
                <div class="detail-field-value">${escapeHtml(incident.impact)}</div>
            </div>
            ` : ''}
        </div>

        <div class="detail-section">
            <div class="detail-section-title">People</div>
            <div class="detail-field">
                <div class="detail-field-label">Requester</div>
                <div class="detail-field-value">${incident.requester ? escapeHtml(incident.requester.name) + ' (' + escapeHtml(incident.requester.email) + ')' : 'Unknown'}</div>
            </div>
            <div class="detail-field">
                <div class="detail-field-label">Agent</div>
                <div class="detail-field-value">${incident.agent ? escapeHtml(incident.agent.name) : 'Unassigned'}</div>
            </div>
            ${incident.group ? `
            <div class="detail-field">
                <div class="detail-field-label">Group</div>
                <div class="detail-field-value">${escapeHtml(incident.group.name)}</div>
            </div>
            ` : ''}
            ${incident.department ? `
            <div class="detail-field">
                <div class="detail-field-label">Department</div>
                <div class="detail-field-value">${escapeHtml(incident.department)}</div>
            </div>
            ` : ''}
        </div>

        ${incident.description ? `
        <div class="detail-section">
            <div class="detail-section-title">Description</div>
            <div class="detail-field">
                <div class="detail-field-value" style="white-space: pre-wrap;">${escapeHtml(incident.description)}</div>
            </div>
        </div>
        ` : ''}

        ${incident.category ? `
        <div class="detail-section">
            <div class="detail-section-title">Category</div>
            <div class="detail-field">
                <div class="detail-field-value">${escapeHtml(incident.category)}</div>
            </div>
        </div>
        ` : ''}

        ${incident.source ? `
        <div class="detail-section">
            <div class="detail-section-title">Source</div>
            <div class="detail-field">
                <div class="detail-field-value">${escapeHtml(incident.source)}</div>
            </div>
        </div>
        ` : ''}

        <div class="detail-section">
            <div class="detail-section-title">Dates</div>
            <div class="detail-field">
                <div class="detail-field-label">Created</div>
                <div class="detail-field-value">${createdDate}</div>
            </div>
            <div class="detail-field">
                <div class="detail-field-label">Updated</div>
                <div class="detail-field-value">${updatedDate}</div>
            </div>
            ${incident.resolvedAt ? `
            <div class="detail-field">
                <div class="detail-field-label">Resolved</div>
                <div class="detail-field-value">${resolvedDate}</div>
            </div>
            ` : ''}
            ${incident.firstResponseDue ? `
            <div class="detail-field">
                <div class="detail-field-label">First Response Due</div>
                <div class="detail-field-value">${new Date(incident.firstResponseDue).toLocaleString()}</div>
            </div>
            ` : ''}
            ${incident.resolutionDue ? `
            <div class="detail-field">
                <div class="detail-field-label">Resolution Due</div>
                <div class="detail-field-value">${new Date(incident.resolutionDue).toLocaleString()}</div>
            </div>
            ` : ''}
        </div>

        ${incident.resolution ? `
        <div class="detail-section">
            <div class="detail-section-title">Resolution</div>
            <div class="detail-field">
                <div class="detail-field-value" style="white-space: pre-wrap;">${escapeHtml(incident.resolution)}</div>
            </div>
        </div>
        ` : ''}

        <div class="detail-section">
            <button class="btn-secondary" style="width: 100%;" onclick="editIncident()">Edit Incident</button>
        </div>
    `;
}

// Close detail panel
function closeDetailPanel() {
    const detailPanel = document.getElementById('detailPanel');
    if (detailPanel) {
        detailPanel.classList.remove('active');
    }
    currentIncident = null;
}

// Update incident status (simple prompt-based for now)
async function updateIncidentStatus() {
    if (!currentIncident) return;
    
    const newStatus = prompt('Enter new status (New, Open, Pending, Resolved, Closed):', currentIncident.status);
    if (!newStatus) return;
    
    const validStatuses = ['New', 'Open', 'Pending', 'Resolved', 'Closed'];
    if (!validStatuses.includes(newStatus)) {
        console.error('Invalid status:', newStatus);
        return;
    }
    
    try {
        await apiClient.put(`/incidents/${currentIncident.id}`, { status: newStatus });
        console.log('Status updated successfully');
        
        // Reload incident details
        await showIncidentDetails(currentIncident.id);
        
        // Reload incidents list
        await loadIncidents();
    } catch (error) {
        console.error('Failed to update status:', error);
    }
}

// Edit incident (placeholder)
function editIncident() {
    console.log('Edit functionality coming soon!');
}

// Export incidents (placeholder)
function exportIncidents() {
    console.log('Export functionality coming soon!');
}

// Utility function to escape HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// User menu functionality
document.addEventListener('DOMContentLoaded', function() {
    const userMenuBtn = document.getElementById('userMenuBtn');
    if (userMenuBtn) {
        userMenuBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            
            // Create dropdown menu if it doesn't exist
            let menu = document.getElementById('userDropdownMenu');
            if (!menu) {
                menu = document.createElement('div');
                menu.id = 'userDropdownMenu';
                menu.style.cssText = `
                    position: absolute;
                    top: 48px;
                    right: 16px;
                    background: white;
                    border: 1px solid #DFE1E6;
                    border-radius: 3px;
                    box-shadow: 0 4px 8px rgba(9, 30, 66, 0.13);
                    min-width: 200px;
                    z-index: 1000;
                `;
                
                const currentUser = authService.getCurrentUser();
                menu.innerHTML = `
                    <div style="padding: 12px; border-bottom: 1px solid #DFE1E6;">
                        <div style="font-weight: 600; color: #172B4D;">${currentUser?.name || 'User'}</div>
                        <div style="font-size: 12px; color: #6B778C;">${currentUser?.email || ''}</div>
                    </div>
                    <div style="padding: 8px 0;">
                        <a href="milo-change-password.html" style="display: block; padding: 8px 12px; color: #42526E; text-decoration: none; font-size: 14px;">Change Password</a>
                        <a href="#" onclick="authService.logout(); return false;" style="display: block; padding: 8px 12px; color: #42526E; text-decoration: none; font-size: 14px;">Logout</a>
                    </div>
                `;
                
                document.body.appendChild(menu);
            } else {
                menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
            }
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', function() {
            const menu = document.getElementById('userDropdownMenu');
            if (menu) {
                menu.style.display = 'none';
            }
        });
    }
});

// Export functions for global use
window.showCreateIncidentModal = showCreateIncidentModal;
window.closeCreateIncidentModal = closeCreateIncidentModal;
window.createIncident = createIncident;
window.showIncidentDetails = showIncidentDetails;
window.closeDetailPanel = closeDetailPanel;
window.filterIncidents = filterIncidents;
window.exportIncidents = exportIncidents;
window.updateIncidentStatus = updateIncidentStatus;
window.editIncident = editIncident;
