// Manage Assignees, Groups, and Requesters for Incidents

let assignees = [];
let groups = [];
let requesters = [];

// ==================== ASSIGNEES MANAGEMENT ====================

async function loadAssignees() {
    try {
        const response = await apiClient.get('/incidents/assignees');
        if (response.ok) {
            assignees = await response.json() || [];
        } else {
            assignees = [];
        }
        renderAssignees();
        updateAssigneeDropdown();
    } catch (error) {
        console.error('Failed to load assignees:', error);
        assignees = [];
        renderAssignees();
    }
}

function renderAssignees() {
    const list = document.getElementById('assigneesList');
    if (!list) return;

    if (assignees.length === 0) {
        list.innerHTML = '<div style="text-align: center; padding: 32px; color: #6B778C;">No assignees yet. Click "Add Assignee" to create one.</div>';
        return;
    }

    list.innerHTML = assignees
        .filter(assignee => assignee && assignee.id && assignee.name && assignee.email) // Filter out invalid assignees
        .map(assignee => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: white; border: 1px solid #DFE1E6; border-radius: 4px; margin-bottom: 8px;">
            <div>
                <div style="font-weight: 600; color: #172B4D; margin-bottom: 4px;">${assignee.name || 'Unnamed Assignee'}</div>
                <div style="font-size: 12px; color: #6B778C;">${assignee.email || 'No email'}</div>
            </div>
            <button class="btn-secondary" onclick="deleteAssignee(${assignee.id})" style="padding: 6px 12px; font-size: 12px;">
                Delete
            </button>
        </div>
    `).join('');
}

function updateAssigneeDropdown() {
    const select = document.getElementById('incidentAgent');
    if (!select) return;

    const currentValue = select.value;
    select.innerHTML = '<option value="">Unassigned</option>';
    assignees
        .filter(assignee => assignee && assignee.id && assignee.name && assignee.email) // Filter out invalid assignees
        .forEach(assignee => {
            const option = document.createElement('option');
            option.value = assignee.id;
            option.textContent = `${assignee.name || 'Unnamed'} (${assignee.email || 'No email'})`;
            select.appendChild(option);
        });
    if (currentValue) select.value = currentValue;
}

function showManageAssignees() {
    const modal = document.getElementById('manageAssigneesModal');
    if (modal) {
        modal.style.display = 'flex';
        modal.style.visibility = 'visible';
        modal.classList.add('active');
        loadAssignees();
    }
}

function closeManageAssignees() {
    const modal = document.getElementById('manageAssigneesModal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('active');
    }
}

function showAddAssigneeForm() {
    document.getElementById('addAssigneeForm').style.display = 'block';
    document.getElementById('assigneeName').value = '';
    document.getElementById('assigneeEmail').value = '';
}

function hideAddAssigneeForm() {
    document.getElementById('addAssigneeForm').style.display = 'none';
}

async function addAssignee() {
    const name = document.getElementById('assigneeName').value.trim();
    const email = document.getElementById('assigneeEmail').value.trim();

    if (!name || !email) {
        console.error('Name and email are required');
        return;
    }

    try {
        const response = await apiClient.post('/incidents/assignees', { name, email });
        
        if (!response.ok) {
            console.error('Failed to create assignee:', response.status);
            await loadAssignees();
            hideAddAssigneeForm();
            return;
        }
        
        const newAssignee = await response.json();
        
        // Validate response has required properties
        if (!newAssignee || !newAssignee.id || !newAssignee.name || !newAssignee.email) {
            console.error('Invalid response from server:', newAssignee);
            // Reload all assignees instead of using broken response
            await loadAssignees();
            hideAddAssigneeForm();
            return;
        }
        
        assignees.push(newAssignee);
        renderAssignees();
        updateAssigneeDropdown();
        hideAddAssigneeForm();
        
        // Clear form fields
        document.getElementById('assigneeName').value = '';
        document.getElementById('assigneeEmail').value = '';
        
        console.log('Assignee created:', newAssignee);
    } catch (error) {
        console.error('Failed to create assignee:', error);
    }
}

async function deleteAssignee(id) {
    // Delete without confirmation popup

    try {
        await apiClient.delete(`/incidents/assignees/${id}`);
        assignees = assignees.filter(a => a.id !== id);
        renderAssignees();
        updateAssigneeDropdown();
        console.log('Assignee deleted');
    } catch (error) {
        console.error('Failed to delete assignee:', error);
    }
}

// ==================== GROUPS MANAGEMENT ====================

async function loadGroups() {
    try {
        const response = await apiClient.get('/incidents/groups');
        if (response.ok) {
            groups = await response.json() || [];
        } else {
            groups = [];
        }
        renderGroups();
        updateGroupDropdown();
    } catch (error) {
        console.error('Failed to load groups:', error);
        groups = [];
        renderGroups();
    }
}

function renderGroups() {
    const list = document.getElementById('groupsList');
    if (!list) return;

    if (groups.length === 0) {
        list.innerHTML = '<div style="text-align: center; padding: 32px; color: #6B778C;">No groups yet. Click "Add Group" to create one.</div>';
        return;
    }

    list.innerHTML = groups
        .filter(group => group && group.id && group.name) // Filter out invalid groups
        .map(group => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: white; border: 1px solid #DFE1E6; border-radius: 4px; margin-bottom: 8px;">
            <div>
                <div style="font-weight: 600; color: #172B4D; margin-bottom: 4px;">${group.name || 'Unnamed Group'}</div>
                ${group.description ? `<div style="font-size: 12px; color: #6B778C;">${group.description}</div>` : ''}
            </div>
            <button class="btn-secondary" onclick="deleteGroup(${group.id})" style="padding: 6px 12px; font-size: 12px;">
                Delete
            </button>
        </div>
    `).join('');
}

function updateGroupDropdown() {
    const select = document.getElementById('incidentGroup');
    if (!select) return;

    const currentValue = select.value;
    select.innerHTML = '<option value="">Select Group</option>';
    groups
        .filter(group => group && group.id && group.name) // Filter out invalid groups
        .forEach(group => {
            const option = document.createElement('option');
            option.value = group.id;
            option.textContent = group.name || 'Unnamed Group';
            select.appendChild(option);
        });
    if (currentValue) select.value = currentValue;
}

function showManageGroups() {
    const modal = document.getElementById('manageGroupsModal');
    if (modal) {
        modal.style.display = 'flex';
        modal.style.visibility = 'visible';
        modal.classList.add('active');
        loadGroups();
    }
}

function closeManageGroups() {
    const modal = document.getElementById('manageGroupsModal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('active');
    }
}

function showAddGroupForm() {
    document.getElementById('addGroupForm').style.display = 'block';
    document.getElementById('groupName').value = '';
    document.getElementById('groupDescription').value = '';
}

function hideAddGroupForm() {
    document.getElementById('addGroupForm').style.display = 'none';
}

async function addGroup() {
    const name = document.getElementById('groupName').value.trim();
    const description = document.getElementById('groupDescription').value.trim();

    if (!name) {
        console.error('Name is required');
        return;
    }

    try {
        const response = await apiClient.post('/incidents/groups', { name, description: description || null });
        
        if (!response.ok) {
            console.error('Failed to create group:', response.status);
            await loadGroups();
            hideAddGroupForm();
            return;
        }
        
        const newGroup = await response.json();
        
        // Validate response has required properties
        if (!newGroup || !newGroup.id || !newGroup.name) {
            console.error('Invalid response from server:', newGroup);
            // Reload all groups instead of using broken response
            await loadGroups();
            hideAddGroupForm();
            return;
        }
        
        groups.push(newGroup);
        renderGroups();
        updateGroupDropdown();
        hideAddGroupForm();
        
        // Clear form fields
        document.getElementById('groupName').value = '';
        document.getElementById('groupDescription').value = '';
        
        console.log('Group created:', newGroup);
    } catch (error) {
        console.error('Failed to create group:', error);
    }
}

async function deleteGroup(id) {
    // Delete without confirmation popup

    try {
        await apiClient.delete(`/incidents/groups/${id}`);
        groups = groups.filter(g => g.id !== id);
        renderGroups();
        updateGroupDropdown();
        console.log('Group deleted');
    } catch (error) {
        console.error('Failed to delete group:', error);
    }
}

// ==================== REQUESTERS MANAGEMENT ====================

async function loadRequesters() {
    try {
        const response = await apiClient.get('/incidents/requesters');
        if (response.ok) {
            requesters = await response.json() || [];
        } else {
            requesters = [];
        }
        renderRequesters();
        updateRequesterDropdown();
    } catch (error) {
        console.error('Failed to load requesters:', error);
        requesters = [];
        renderRequesters();
    }
}

function renderRequesters() {
    const list = document.getElementById('requestersList');
    if (!list) return;

    if (requesters.length === 0) {
        list.innerHTML = '<div style="text-align: center; padding: 32px; color: #6B778C;">No requesters yet. Click "Add Requester" to create one.</div>';
        return;
    }

    list.innerHTML = requesters
        .filter(requester => requester && requester.id && requester.name && requester.email) // Filter out invalid requesters
        .map(requester => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: white; border: 1px solid #DFE1E6; border-radius: 4px; margin-bottom: 8px;">
            <div>
                <div style="font-weight: 600; color: #172B4D; margin-bottom: 4px;">${requester.name || 'Unnamed Requester'}</div>
                <div style="font-size: 12px; color: #6B778C;">${requester.email || 'No email'}</div>
            </div>
            <button class="btn-secondary" onclick="deleteRequester(${requester.id})" style="padding: 6px 12px; font-size: 12px;">
                Delete
            </button>
        </div>
    `).join('');
}

function updateRequesterDropdown() {
    const select = document.getElementById('incidentRequester');
    if (!select) return;

    const currentValue = select.value;
    select.innerHTML = '<option value="">Select Requester (Required)</option>';
    requesters
        .filter(requester => requester && requester.id && requester.name && requester.email) // Filter out invalid requesters
        .forEach(requester => {
            const option = document.createElement('option');
            option.value = requester.id;
            option.textContent = `${requester.name || 'Unnamed'} (${requester.email || 'No email'})`;
            select.appendChild(option);
        });
    if (currentValue) select.value = currentValue;
}

function showManageRequesters() {
    const modal = document.getElementById('manageRequestersModal');
    if (modal) {
        modal.style.display = 'flex';
        modal.style.visibility = 'visible';
        modal.classList.add('active');
        loadRequesters();
    }
}

function closeManageRequesters() {
    const modal = document.getElementById('manageRequestersModal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('active');
    }
}

function showAddRequesterForm() {
    document.getElementById('addRequesterForm').style.display = 'block';
    document.getElementById('requesterName').value = '';
    document.getElementById('requesterEmail').value = '';
}

function hideAddRequesterForm() {
    document.getElementById('addRequesterForm').style.display = 'none';
}

async function addRequester() {
    const name = document.getElementById('requesterName').value.trim();
    const email = document.getElementById('requesterEmail').value.trim();

    if (!name || !email) {
        console.error('Name and email are required');
        return;
    }

    try {
        const response = await apiClient.post('/incidents/requesters', { name, email });
        
        if (!response.ok) {
            console.error('Failed to create requester:', response.status);
            await loadRequesters();
            hideAddRequesterForm();
            return;
        }
        
        const newRequester = await response.json();
        
        // Validate response has required properties
        if (!newRequester || !newRequester.id || !newRequester.name || !newRequester.email) {
            console.error('Invalid response from server:', newRequester);
            // Reload all requesters instead of using broken response
            await loadRequesters();
            hideAddRequesterForm();
            return;
        }
        
        requesters.push(newRequester);
        renderRequesters();
        updateRequesterDropdown();
        hideAddRequesterForm();
        
        // Clear form fields
        document.getElementById('requesterName').value = '';
        document.getElementById('requesterEmail').value = '';
        
        console.log('Requester created:', newRequester);
    } catch (error) {
        console.error('Failed to create requester:', error);
    }
}

async function deleteRequester(id) {
    // Delete without confirmation popup

    try {
        await apiClient.delete(`/incidents/requesters/${id}`);
        requesters = requesters.filter(r => r.id !== id);
        renderRequesters();
        updateRequesterDropdown();
        console.log('Requester deleted');
    } catch (error) {
        console.error('Failed to delete requester:', error);
    }
}

// Export functions to global scope
window.loadAssignees = loadAssignees;
window.loadGroups = loadGroups;
window.loadRequesters = loadRequesters;
window.updateAssigneeDropdown = updateAssigneeDropdown;
window.updateGroupDropdown = updateGroupDropdown;
window.updateRequesterDropdown = updateRequesterDropdown;

window.showManageAssignees = showManageAssignees;
window.closeManageAssignees = closeManageAssignees;
window.showAddAssigneeForm = showAddAssigneeForm;
window.hideAddAssigneeForm = hideAddAssigneeForm;
window.addAssignee = addAssignee;
window.deleteAssignee = deleteAssignee;

window.showManageGroups = showManageGroups;
window.closeManageGroups = closeManageGroups;
window.showAddGroupForm = showAddGroupForm;
window.hideAddGroupForm = hideAddGroupForm;
window.addGroup = addGroup;
window.deleteGroup = deleteGroup;

window.showManageRequesters = showManageRequesters;
window.closeManageRequesters = closeManageRequesters;
window.showAddRequesterForm = showAddRequesterForm;
window.hideAddRequesterForm = hideAddRequesterForm;
window.addRequester = addRequester;
window.deleteRequester = deleteRequester;
