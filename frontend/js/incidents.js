// Incidents Management
let incidents = [];
let allIncidents = [];
let currentIncident = null;
let currentProject = null;
let users = [];
let teams = [];
// Pagination state
let currentPage = 1;
let pageSize = 50;
let totalIncidents = 0;
let totalPages = 1;
// apiClient is already defined in api-client.js - use it directly
// If apiClient is not available, try to access it from global scope
if (typeof apiClient === 'undefined') {
    console.error('apiClient is not defined. Make sure api-client.js is loaded before incidents.js');
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Incidents page loaded');
    
    // Check authentication
    if (!authService.isAuthenticated()) {
        window.location.href = 'milo-login.html';
        return;
    }

    // Wait for projectSelector to be available
    let retries = 0;
    while (typeof projectSelector === 'undefined' && retries < 10) {
        await new Promise(resolve => setTimeout(resolve, 100));
        retries++;
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
    if (projectNameEl && currentProject) {
        projectNameEl.textContent = currentProject.name || 'Project';
    }

    // PERFORMANCE: Load initial data in parallel (not sequential)
    // This makes the page load much faster
    await Promise.all([
        loadAssignees(),
        loadGroups(),
        loadRequesters(),
        loadIncidents()
    ]);
    
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

// Legacy functions - now handled by incident-entities.js
// These are kept for backward compatibility but delegate to the new functions
async function loadUsers() {
    if (typeof loadRequesters === 'function') {
        await loadRequesters();
    }
}

async function loadTeams() {
    if (typeof loadGroups === 'function') {
        await loadGroups();
    }
}

// Load incidents
async function loadIncidents(page = 1) {
    try {
        console.log(`Loading incidents page ${page}...`);
        currentPage = page;
        
        // Show loading state
        const tbody = document.getElementById('incidentsTableBody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px; color: #6B778C;">Loading incidents...</td></tr>';
        }
        
        const projectId = currentProject?.id;
        const url = projectId ? `/incidents?projectId=${projectId}&page=${page}&pageSize=${pageSize}` : `/incidents?page=${page}&pageSize=${pageSize}`;
        
        // Add timeout to prevent hanging
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        const response = await apiClient.get(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (response.ok) {
            const data = await response.json() || {};
            // Handle pagination response (new format) or direct array (old format)
            if (data.incidents && Array.isArray(data.incidents)) {
                allIncidents = data.incidents;
                totalIncidents = data.total || data.incidents.length;
                totalPages = Math.ceil(totalIncidents / pageSize);
            } else if (Array.isArray(data)) {
                // Backward compatibility with old format
                allIncidents = data;
                totalIncidents = data.length;
                totalPages = 1;
            } else {
                allIncidents = [];
                totalIncidents = 0;
                totalPages = 1;
            }
            incidents = [...allIncidents];
            
            console.log(`Loaded ${incidents.length} incidents (page ${currentPage} of ${totalPages}, total: ${totalIncidents})`);
            renderIncidents();
            renderPagination();
        } else {
            console.error('Failed to load incidents:', response.status);
            showEmptyState();
        }
    } catch (error) {
        if (error.name === 'AbortError') {
            console.error('Incidents loading timed out');
            const tbody = document.getElementById('incidentsTableBody');
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px; color: #DE350B;">Loading timed out. Please refresh the page.</td></tr>';
            }
        } else {
            console.error('Failed to load incidents:', error);
            showEmptyState();
        }
    }
}

// Render incidents table - OPTIMIZED for fast rendering
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

    // PERFORMANCE: Use DocumentFragment for faster DOM manipulation
    const fragment = document.createDocumentFragment();
    const tempDiv = document.createElement('div');
    
    // Build HTML string first (faster than creating elements one by one)
    const html = incidents.map(incident => {
        const createdDate = new Date(incident.createdAt).toLocaleDateString();
        const requesterName = incident.requester?.name || 'Unknown';
        const assigneeName = incident.assignee?.name || 'Unassigned';
        
        return `
            <tr onclick="showIncidentDetails(${incident.id})">
                <td><span class="incident-number">${incident.incidentNumber}</span></td>
                <td>${escapeHtml(incident.subject)}</td>
                <td><span class="status-badge status-${incident.status.toLowerCase()}">${incident.status}</span></td>
                <td><span class="priority-badge priority-${incident.priority.toLowerCase()}">${incident.priority}</span></td>
                <td>${escapeHtml(requesterName)}</td>
                <td>${escapeHtml(assigneeName)}</td>
                <td>${createdDate}</td>
            </tr>
        `;
    }).join('');
    
    // Single DOM update (much faster than multiple updates)
    tbody.innerHTML = html;
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

    // IMPORTANT: Don't filter out incidents - just filter based on search/filters
    // Keep ALL incidents visible regardless of status (including Closed)
    incidents = allIncidents.filter(incident => {
        const matchesSearch = 
            incident.incidentNumber.toLowerCase().includes(searchTerm) ||
            incident.subject.toLowerCase().includes(searchTerm) ||
            incident.requester?.name.toLowerCase().includes(searchTerm) ||
            incident.assignee?.name.toLowerCase().includes(searchTerm);
        
        const matchesStatus = !statusFilter || incident.status === statusFilter;
        const matchesPriority = !priorityFilter || incident.priority === priorityFilter;
        
        return matchesSearch && matchesStatus && matchesPriority;
    });

    renderIncidents();
}

// Show create incident modal
function showCreateIncidentModal() {
    try {
        console.log('showCreateIncidentModal called');
        const modal = document.getElementById('createIncidentModal');
        if (!modal) {
            console.error('Modal element not found!');
            return;
        }
        
        // Reset modal to create mode
        resetModalForCreate();
        
        console.log('Modal found, showing it');
        // Force display with inline styles that override everything
        modal.style.setProperty('display', 'flex', 'important');
        modal.style.setProperty('visibility', 'visible', 'important');
        modal.style.setProperty('opacity', '1', 'important');
        modal.style.setProperty('z-index', '9999', 'important');
        modal.classList.add('active');
        document.body.style.overflow = 'hidden'; // Prevent body scroll when modal is open
        
        // Double check it's visible
        setTimeout(() => {
            const computedStyle = window.getComputedStyle(modal);
            console.log('Modal display after show:', computedStyle.display);
            console.log('Modal visibility:', computedStyle.visibility);
            console.log('Modal z-index:', computedStyle.zIndex);
            if (computedStyle.display === 'none') {
                console.error('Modal still not visible! Forcing again...');
                modal.style.display = 'flex';
                modal.style.visibility = 'visible';
            }
        }, 100);
    
        // Load entities for dropdowns
        if (typeof loadRequesters === 'function') {
            loadRequesters();
        }
        if (typeof loadAssignees === 'function') {
            loadAssignees();
        }
        if (typeof loadGroups === 'function') {
            loadGroups();
        }
    } catch (error) {
        console.error('Error in showCreateIncidentModal:', error);
    }
}

// Close create incident modal
function closeCreateIncidentModal() {
    try {
        const modal = document.getElementById('createIncidentModal');
        if (modal) {
            modal.classList.remove('active');
            modal.style.display = 'none'; // Ensure it's hidden
            modal.style.visibility = 'hidden';
            modal.style.opacity = '0';
            document.body.style.overflow = ''; // Restore body scroll
        }
        // Reset modal state for create mode
        resetModalForCreate();
    } catch (error) {
        console.error('Error closing modal:', error);
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

        const subject = document.getElementById('incidentSubject')?.value?.trim();
        const requesterId = parseInt(document.getElementById('incidentRequester')?.value);
        const status = document.getElementById('incidentStatus')?.value || 'New';
        const priority = document.getElementById('incidentPriority')?.value || 'Low';
        const urgency = document.getElementById('incidentUrgency')?.value;
        const impact = document.getElementById('incidentImpact')?.value;
        const source = document.getElementById('incidentSource')?.value;
        const department = document.getElementById('incidentDepartment')?.value;
        const agentId = document.getElementById('incidentAgent')?.value ? parseInt(document.getElementById('incidentAgent').value) : null;
        const groupId = document.getElementById('incidentGroup')?.value ? parseInt(document.getElementById('incidentGroup').value) : null;
        const category = document.getElementById('incidentCategory')?.value?.trim();
        const description = document.getElementById('incidentDescription')?.value?.trim();
        const resolution = document.getElementById('incidentResolution')?.value?.trim();

        if (!subject) {
            console.error('Subject is required');
            return;
        }

        if (!requesterId || isNaN(requesterId)) {
            console.error('Requester is required. Please select a requester.');
            // Highlight the requester field
            const requesterSelect = document.getElementById('incidentRequester');
            if (requesterSelect) {
                requesterSelect.focus();
                requesterSelect.style.borderColor = '#DE350B';
                setTimeout(() => {
                    requesterSelect.style.borderColor = '';
                }, 3000);
            }
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
            agentId: agentId, // Backend expects agentId (maps to IncidentAssignee)
            groupId: groupId,
            category: category || null,
            description: description || null,
            resolution: resolution || null,
            projectId: currentProject?.id || null
        };

        console.log('Creating incident:', incidentData);

        const response = await apiClient.post('/incidents', incidentData);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Failed to create incident' }));
            console.error('Failed to create incident:', response.status, errorData);
            throw new Error(errorData.message || 'Failed to create incident');
        }
        
        const newIncident = await response.json();
        console.log('Incident created:', newIncident);

        // Close modal
        closeCreateIncidentModal();

        // Reload incidents
        await loadIncidents();

        // Success - incident created
        console.log(`Incident ${newIncident.incidentNumber} created successfully!`);
        
        // Show success message (optional - can be removed if you don't want popups)
        // You could add a toast notification here instead
    } catch (error) {
        console.error('Failed to create incident:', error);
        // Show error to user (optional)
        const errorMessage = error?.message || error?.error || 'Failed to create incident. Please try again.';
        console.error('Error details:', errorMessage);
    }
}

// Show incident details
async function showIncidentDetails(incidentId) {
    try {
        console.log('Loading incident details for:', incidentId);
        
        const response = await apiClient.get(`/incidents/${incidentId}`);
        if (!response.ok) {
            console.error('Failed to load incident details:', response.status);
            return;
        }
        
        const incident = await response.json();
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
                    <select class="form-select" id="incidentStatusChange" style="display: inline-block; width: auto; margin-left: 8px; padding: 4px 24px 4px 8px; font-size: 13px; vertical-align: middle;" onchange="updateIncidentStatus(this.value)">
                        <option value="New" ${incident.status === 'New' ? 'selected' : ''}>New</option>
                        <option value="Open" ${incident.status === 'Open' ? 'selected' : ''}>Open</option>
                        <option value="Pending" ${incident.status === 'Pending' ? 'selected' : ''}>Pending</option>
                        <option value="Resolved" ${incident.status === 'Resolved' ? 'selected' : ''}>Resolved</option>
                        <option value="Closed" ${incident.status === 'Closed' ? 'selected' : ''}>Closed</option>
                    </select>
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
                <div class="detail-field-label">Assignee</div>
                <div class="detail-field-value">${incident.assignee ? escapeHtml(incident.assignee.name) : 'Unassigned'}</div>
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

// Update incident status - KEEP INCIDENT VISIBLE AFTER STATUS CHANGE
async function updateIncidentStatus(newStatus) {
    if (!currentIncident || !newStatus) return;
    
    const validStatuses = ['New', 'Open', 'Pending', 'Resolved', 'Closed'];
    if (!validStatuses.includes(newStatus)) {
        console.error('Invalid status:', newStatus);
        return;
    }
    
    try {
        const response = await apiClient.put(`/incidents/${currentIncident.id}`, { status: newStatus });
        if (!response.ok) {
            console.error('Failed to update status:', response.status);
            // Revert dropdown selection on error
            const select = document.getElementById('incidentStatusChange');
            if (select) {
                select.value = currentIncident.status;
            }
            return;
        }
        
        console.log('Status updated successfully');
        
        // Update the incident in the local array immediately (no need to reload from server)
        const incidentIndex = allIncidents.findIndex(i => i.id === currentIncident.id);
        if (incidentIndex !== -1) {
            allIncidents[incidentIndex].status = newStatus;
        }
        
        // Update current incident
        currentIncident.status = newStatus;
        
        // Reload incident details to show updated status
        await showIncidentDetails(currentIncident.id);
        
        // Re-render incidents list (keeps incident visible)
        filterIncidents();
    } catch (error) {
        console.error('Failed to update status:', error);
        // Revert dropdown selection on error
        const select = document.getElementById('incidentStatusChange');
        if (select) {
            select.value = currentIncident.status;
        }
    }
}

// Edit incident
function editIncident() {
    if (!currentIncident) {
        console.error('No incident selected for editing');
        return;
    }
    
    // Close detail panel first to avoid confusion
    const detailPanel = document.getElementById('detailPanel');
    if (detailPanel) {
        detailPanel.classList.remove('active');
    }
    
    showEditIncidentModal(currentIncident);
}

// Show edit incident modal
function showEditIncidentModal(incident) {
    try {
        const modal = document.getElementById('createIncidentModal');
        if (!modal) {
            console.error('Modal element not found!');
            return;
        }
        
        // Change modal title
        const modalTitle = modal.querySelector('.modal-title');
        if (modalTitle) {
            modalTitle.textContent = 'Edit Incident';
        }
        
        // Change submit button text
        const submitButton = modal.querySelector('button[type="submit"]');
        if (submitButton) {
            submitButton.textContent = 'Update';
        }
        
        // Change form onsubmit handler
        const form = document.getElementById('createIncidentForm');
        if (form) {
            form.onsubmit = updateIncident;
        }
        
        // Show modal (already centered via CSS)
        modal.style.setProperty('display', 'flex', 'important');
        modal.style.setProperty('visibility', 'visible', 'important');
        modal.style.setProperty('opacity', '1', 'important');
        modal.style.setProperty('z-index', '9999', 'important');
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // Populate form fields
        populateIncidentForm(incident);
        
        // Load entities for dropdowns
        if (typeof loadRequesters === 'function') {
            loadRequesters();
        }
        if (typeof loadAssignees === 'function') {
            loadAssignees();
        }
        if (typeof loadGroups === 'function') {
            loadGroups();
        }
    } catch (error) {
        console.error('Error in showEditIncidentModal:', error);
    }
}

// Populate incident form with data
function populateIncidentForm(incident) {
    if (!incident) return;
    
    // Subject
    const subjectInput = document.getElementById('incidentSubject');
    if (subjectInput) {
        subjectInput.value = incident.subject || '';
    }
    
    // Requester (read-only in edit mode, but we can show it)
    const requesterSelect = document.getElementById('incidentRequester');
    if (requesterSelect && incident.requester) {
        // Requester cannot be changed during edit, so we'll disable it
        requesterSelect.value = incident.requester.id || '';
        requesterSelect.disabled = true;
    }
    
    // Status
    const statusSelect = document.getElementById('incidentStatus');
    if (statusSelect) {
        statusSelect.value = incident.status || 'New';
    }
    
    // Priority
    const prioritySelect = document.getElementById('incidentPriority');
    if (prioritySelect) {
        prioritySelect.value = incident.priority || 'Low';
    }
    
    // Urgency
    const urgencySelect = document.getElementById('incidentUrgency');
    if (urgencySelect) {
        urgencySelect.value = incident.urgency || 'Low';
    }
    
    // Impact
    const impactSelect = document.getElementById('incidentImpact');
    if (impactSelect) {
        impactSelect.value = incident.impact || 'Low';
    }
    
    // Source
    const sourceSelect = document.getElementById('incidentSource');
    if (sourceSelect) {
        sourceSelect.value = incident.source || '';
    }
    
    // Department
    const departmentSelect = document.getElementById('incidentDepartment');
    if (departmentSelect) {
        departmentSelect.value = incident.department || '';
    }
    
    // Assignee (set before loading - updateAssigneeDropdown preserves the value)
    const agentSelect = document.getElementById('incidentAgent');
    if (agentSelect && incident.assignee) {
        agentSelect.value = incident.assignee.id || '';
    }
    
    // Group (set before loading - updateGroupDropdown preserves the value)
    const groupSelect = document.getElementById('incidentGroup');
    if (groupSelect && incident.group) {
        groupSelect.value = incident.group.id || '';
    }
    
    // Category
    const categoryInput = document.getElementById('incidentCategory');
    if (categoryInput) {
        categoryInput.value = incident.category || '';
    }
    
    // Description
    const descriptionTextarea = document.getElementById('incidentDescription');
    if (descriptionTextarea) {
        descriptionTextarea.value = incident.description || '';
    }
    
    // Resolution
    const resolutionTextarea = document.getElementById('incidentResolution');
    if (resolutionTextarea) {
        resolutionTextarea.value = incident.resolution || '';
    }
}

// Update incident
async function updateIncident(event) {
    event.preventDefault();
    
    if (!currentIncident) {
        console.error('No incident selected for updating');
        return;
    }
    
    try {
        const subject = document.getElementById('incidentSubject')?.value?.trim();
        const status = document.getElementById('incidentStatus')?.value || 'New';
        const priority = document.getElementById('incidentPriority')?.value || 'Low';
        const urgency = document.getElementById('incidentUrgency')?.value;
        const impact = document.getElementById('incidentImpact')?.value;
        const source = document.getElementById('incidentSource')?.value;
        const department = document.getElementById('incidentDepartment')?.value;
        const agentId = document.getElementById('incidentAgent')?.value ? parseInt(document.getElementById('incidentAgent').value) : null;
        const groupId = document.getElementById('incidentGroup')?.value ? parseInt(document.getElementById('incidentGroup').value) : null;
        const category = document.getElementById('incidentCategory')?.value?.trim();
        const description = document.getElementById('incidentDescription')?.value?.trim();
        const resolution = document.getElementById('incidentResolution')?.value?.trim();

        if (!subject) {
            console.error('Subject is required');
            return;
        }

        const updateData = {
            subject,
            status,
            priority,
            urgency: urgency || null,
            impact: impact || null,
            source: source || null,
            department: department || null,
            agentId: agentId,
            groupId: groupId,
            category: category || null,
            description: description || null,
            resolution: resolution || null
        };

        console.log('Updating incident:', currentIncident.id, updateData);

        const response = await apiClient.put(`/incidents/${currentIncident.id}`, updateData);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Failed to update incident' }));
            console.error('Failed to update incident:', response.status, errorData);
            throw new Error(errorData.message || 'Failed to update incident');
        }
        
        const updatedIncident = await response.json();
        console.log('Incident updated:', updatedIncident);

        // Close modal
        closeCreateIncidentModal();
        resetModalForCreate();

        // Reload incident details
        await showIncidentDetails(currentIncident.id);

        // Reload incidents list
        await loadIncidents();

        console.log(`Incident ${updatedIncident.incidentNumber || currentIncident.incidentNumber} updated successfully!`);
    } catch (error) {
        console.error('Failed to update incident:', error);
    }
}

// Reset modal for create mode
function resetModalForCreate() {
    const modal = document.getElementById('createIncidentModal');
    if (!modal) return;
    
    // Reset modal title
    const modalTitle = modal.querySelector('.modal-title');
    if (modalTitle) {
        modalTitle.textContent = 'Create Incident';
    }
    
    // Reset submit button text
    const submitButton = modal.querySelector('button[type="submit"]');
    if (submitButton) {
        submitButton.textContent = 'Create';
    }
    
    // Reset form onsubmit handler
    const form = document.getElementById('createIncidentForm');
    if (form) {
        form.onsubmit = createIncident;
    }
    
    // Reset form fields
    if (form) {
        form.reset();
    }
    
    // Re-enable requester field
    const requesterSelect = document.getElementById('incidentRequester');
    if (requesterSelect) {
        requesterSelect.disabled = false;
    }
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

// Render pagination controls
function renderPagination() {
    const paginationContainer = document.getElementById('paginationControls');
    if (!paginationContainer) return;
    
    if (totalPages <= 1) {
        paginationContainer.innerHTML = '';
        return;
    }
    
    let html = '<div style="display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 20px;">';
    
    // Previous button
    html += `<button onclick="loadIncidents(${currentPage - 1})" 
        ${currentPage === 1 ? 'disabled' : ''} 
        style="padding: 8px 12px; border: 1px solid #DFE1E6; background: white; border-radius: 4px; cursor: ${currentPage === 1 ? 'not-allowed' : 'pointer'}; opacity: ${currentPage === 1 ? '0.5' : '1'};">
        ← Previous
    </button>`;
    
    // Page numbers
    const maxVisiblePages = 7;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    // Adjust start if we're near the end
    if (endPage - startPage < maxVisiblePages - 1) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    // First page + ellipsis
    if (startPage > 1) {
        html += `<button onclick="loadIncidents(1)" style="padding: 8px 12px; border: 1px solid #DFE1E6; background: white; border-radius: 4px; cursor: pointer;">1</button>`;
        if (startPage > 2) {
            html += '<span style="padding: 8px;">...</span>';
        }
    }
    
    // Page number buttons
    for (let i = startPage; i <= endPage; i++) {
        const isActive = i === currentPage;
        html += `<button onclick="loadIncidents(${i})" 
            style="padding: 8px 12px; border: 1px solid ${isActive ? '#0052CC' : '#DFE1E6'}; 
            background: ${isActive ? '#0052CC' : 'white'}; 
            color: ${isActive ? 'white' : '#172B4D'}; 
            border-radius: 4px; cursor: pointer; font-weight: ${isActive ? '600' : '400'};">
            ${i}
        </button>`;
    }
    
    // Last page + ellipsis
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            html += '<span style="padding: 8px;">...</span>';
        }
        html += `<button onclick="loadIncidents(${totalPages})" style="padding: 8px 12px; border: 1px solid #DFE1E6; background: white; border-radius: 4px; cursor: pointer;">${totalPages}</button>`;
    }
    
    // Next button
    html += `<button onclick="loadIncidents(${currentPage + 1})" 
        ${currentPage === totalPages ? 'disabled' : ''} 
        style="padding: 8px 12px; border: 1px solid #DFE1E6; background: white; border-radius: 4px; cursor: ${currentPage === totalPages ? 'not-allowed' : 'pointer'}; opacity: ${currentPage === totalPages ? '0.5' : '1'};">
        Next →
    </button>`;
    
    html += '</div>';
    
    // Add page info
    html += `<div style="text-align: center; margin-top: 12px; font-size: 13px; color: #6B778C;">
        Showing ${(currentPage - 1) * pageSize + 1} - ${Math.min(currentPage * pageSize, totalIncidents)} of ${totalIncidents} incidents
    </div>`;
    
    paginationContainer.innerHTML = html;
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

// Export functions to global scope IMMEDIATELY (don't wait for DOMContentLoaded)
window.showCreateIncidentModal = showCreateIncidentModal;
window.closeCreateIncidentModal = closeCreateIncidentModal;
window.createIncident = createIncident;

// Also attach to window explicitly for safety
if (typeof window !== 'undefined') {
    window.showCreateIncidentModal = showCreateIncidentModal;
    window.closeCreateIncidentModal = closeCreateIncidentModal;
    window.createIncident = createIncident;
}

// Ensure modal is initialized on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeModal);
} else {
    // DOM already loaded, initialize immediately
    initializeModal();
}

function initializeModal() {
    console.log('Incidents page loaded, modal functions available');
    console.log('showCreateIncidentModal available:', typeof window.showCreateIncidentModal);
    
    // Close modal when clicking outside
    const modal = document.getElementById('createIncidentModal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeCreateIncidentModal();
            }
        });
        console.log('Modal element found and initialized');
    } else {
        console.error('Modal element not found during initialization');
    }
    
    // ADD DIRECT EVENT LISTENERS TO BUTTONS AS BACKUP
    const createButtons = document.querySelectorAll('.global-nav-create, button[onclick*="showCreateIncidentModal"]');
    createButtons.forEach(button => {
        if (button) {
            console.log('Adding event listener to Create Incident button');
            button.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('Create Incident button clicked via event listener');
                if (typeof showCreateIncidentModal === 'function') {
                    showCreateIncidentModal();
                } else if (typeof window.showCreateIncidentModal === 'function') {
                    window.showCreateIncidentModal();
                } else {
                    console.error('Create Incident function not found. Function type:', typeof window.showCreateIncidentModal);
                }
            });
            console.log('Event listener added to button:', button);
        }
    });
    
    // Also try to find button by text content
    const allButtons = document.querySelectorAll('button');
    allButtons.forEach(button => {
        if (button.textContent && button.textContent.trim() === 'Create Incident') {
            console.log('Found Create Incident button by text:', button);
            if (!button.hasAttribute('data-listener-added')) {
                button.setAttribute('data-listener-added', 'true');
                button.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Create Incident button clicked (text match)');
                    showCreateIncidentModal();
                });
            }
        }
    });
}
window.closeCreateIncidentModal = closeCreateIncidentModal;
window.createIncident = createIncident;
window.showIncidentDetails = showIncidentDetails;
window.closeDetailPanel = closeDetailPanel;
window.filterIncidents = filterIncidents;
window.exportIncidents = exportIncidents;
window.updateIncidentStatus = updateIncidentStatus;
window.editIncident = editIncident;
