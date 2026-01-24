// Teams functionality
let allTeams = [];
let filteredTeams = [];
let allUsers = [];
let allProjects = [];
let currentFilter = 'all';
let teamMembers = []; // For team creation

// Show toast notification
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    
    if (type === 'error') {
        toast.style.background = '#DE350B';
    } else if (type === 'success') {
        toast.style.background = '#36B37E';
    }
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Initialize
document.addEventListener('DOMContentLoaded', async function() {
    if (!authService.isAuthenticated()) {
        window.location.href = 'milo-login.html';
        return;
    }

    await loadTeams();
    await loadUsersAndProjects();
});

// Load all teams
async function loadTeams() {
    try {
        const currentProject = projectSelector.getCurrentProject();
        let url = '/teams';
        
        // If we're on "Current project" filter and have a project, filter by it
        if (currentFilter === 'project' && currentProject) {
            url += `?projectId=${currentProject.id}`;
        }
        
        const response = await apiClient.get(url);
        
        if (response.ok) {
            allTeams = await response.json();
            applyFilter(currentFilter);
        } else {
            console.error('Failed to load teams');
            showToast('Failed to load teams', 'error');
        }
    } catch (error) {
        console.error('Error loading teams:', error);
        showToast('Error loading teams', 'error');
    }
}

// Apply filter - make it global
window.applyFilter = function(filter) {
    currentFilter = filter;
    
    // Update active tab
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.dataset.filter === filter) {
            tab.classList.add('active');
        }
    });
    
    const currentUser = authService.getCurrentUser();
    const currentProject = projectSelector.getCurrentProject();
    
    // Filter teams
    if (filter === 'all') {
        filteredTeams = allTeams;
    } else if (filter === 'project' && currentProject) {
        filteredTeams = allTeams.filter(t => t.projectId === currentProject.id);
    } else if (filter === 'myteams' && currentUser) {
        filteredTeams = allTeams.filter(t => 
            t.members.some(m => m.userId === currentUser.id)
        );
    } else {
        filteredTeams = allTeams;
    }
    
    renderTeams();
}

// Render teams
function renderTeams() {
    const container = document.getElementById('teamsContainer');
    
    if (filteredTeams.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
                <h3>No teams found</h3>
                <p>Create your first team using the button above</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = filteredTeams.map(team => {
        const memberAvatars = team.members.slice(0, 5).map(member => {
            const initials = member.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
            return `<div class="member-avatar" title="${member.name}${member.title ? ' - ' + member.title : ''}">${initials}</div>`;
        }).join('');
        
        const moreCount = team.memberCount > 5 ? team.memberCount - 5 : 0;
        const moreAvatar = moreCount > 0 ? `<div class="member-avatar member-avatar-more">+${moreCount}</div>` : '';
        
        const teamInitials = team.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
        
        return `
            <div class="team-card" onclick="viewTeam(${team.id})">
                <div class="team-card-header">
                    <div class="team-avatar">${teamInitials}</div>
                    <div class="team-info">
                        <div class="team-name">${escapeHtml(team.name)}</div>
                        <div class="team-member-count">${team.memberCount} member${team.memberCount !== 1 ? 's' : ''}</div>
                    </div>
                </div>
                ${team.project ? `<div class="team-project">${escapeHtml(team.project.name)}</div>` : ''}
                ${team.description ? `<div class="team-description">${escapeHtml(team.description)}</div>` : ''}
                <div class="team-members">
                    ${memberAvatars}
                    ${moreAvatar}
                </div>
            </div>
        `;
    }).join('');
}

// Open create team modal - make it global
window.openCreateTeamModal = async function() {
    teamMembers = [];
    document.getElementById('teamName').value = '';
    document.getElementById('teamDescription').value = '';
    document.getElementById('teamProject').value = '';
    document.getElementById('membersList').innerHTML = '';
    
    // Load project members for the current project
    await loadProjectMembers();
    
    // Add two initial member rows
    addMemberToTeam();
    addMemberToTeam();
    
    // Update modal title
    const modalTitle = document.getElementById('teamModalTitle');
    if (modalTitle) {
        modalTitle.textContent = 'Create Team';
    }
    
    // Set mode to create
    const modal = document.getElementById('createTeamModal');
    modal.dataset.mode = 'create';
    delete modal.dataset.teamId;
    
    modal.style.display = 'flex';
}

// Close create team modal - make it global
window.closeCreateTeamModal = function() {
    document.getElementById('createTeamModal').style.display = 'none';
}

// Add member to team (in modal) - make it global
window.addMemberToTeam = function() {
    const membersList = document.getElementById('membersList');
    
    const memberItem = document.createElement('div');
    memberItem.className = 'member-item';
    memberItem.innerHTML = `
        <select class="form-select" style="flex: 2;" onchange="updateMemberSelection(this)">
            <option value="">Select user</option>
            ${allUsers.map(user => `<option value="${user.id}">${escapeHtml(user.name)} (${escapeHtml(user.email)})</option>`).join('')}
        </select>
        <input type="text" class="form-input" placeholder="Title (e.g., Developer)" style="flex: 1;">
        <select class="form-select" style="flex: 1;">
            <option value="member">Member</option>
            <option value="lead">Lead</option>
            <option value="admin">Admin</option>
        </select>
        <button type="button" class="btn-remove" onclick="removeMemberFromList(this)">Remove</button>
    `;
    
    membersList.appendChild(memberItem);
}

// Remove member from list - make it global
window.removeMemberFromList = function(button) {
    button.closest('.member-item').remove();
}

// Update member selection
function updateMemberSelection(select) {
    // Could add logic to prevent duplicate selections
}

// Handle create/edit team - make it global
window.handleCreateTeam = async function(event) {
    event.preventDefault();
    
    const modal = document.getElementById('createTeamModal');
    const mode = modal.dataset.mode || 'create';
    const teamId = modal.dataset.teamId;
    
    const name = document.getElementById('teamName').value.trim();
    const description = document.getElementById('teamDescription').value.trim();
    const projectId = document.getElementById('teamProject').value;
    const currentUser = authService.getCurrentUser();
    
    if (!name) {
        showToast('Team name is required', 'error');
        return;
    }
    
    // Collect members
    const members = [];
    document.querySelectorAll('#membersList .member-item').forEach(item => {
        const selects = item.querySelectorAll('select');
        const userSelect = selects[0]; // First select is the user
        const roleSelect = selects[1]; // Second select is the role
        const titleInput = item.querySelector('input[type="text"]');
        
        if (userSelect && userSelect.value) {
            const memberData = {
                userId: parseInt(userSelect.value),
                title: titleInput ? titleInput.value.trim() || null : null,
                role: roleSelect ? roleSelect.value : 'member'
            };
            
            // Include member ID if editing existing member
            const memberId = item.dataset.memberId;
            if (memberId) {
                memberData.id = parseInt(memberId);
            }
            
            members.push(memberData);
        }
    });
    
    try {
        if (mode === 'edit' && teamId) {
            // Update existing team
            const updateResponse = await apiClient.put(`/teams/${teamId}`, {
                name,
                description: description || null,
                projectId: projectId ? parseInt(projectId) : null
            });
            
            if (!updateResponse.ok) {
                const error = await updateResponse.json();
                showToast(error.message || 'Failed to update team', 'error');
                return;
            }
            
            // Get current team members
            const teamResponse = await apiClient.get(`/teams/${teamId}`);
            const currentTeam = await teamResponse.json();
            const currentMemberIds = currentTeam.members.map(m => m.userId);
            
            // Add new members
            for (const member of members) {
                if (!member.id && !currentMemberIds.includes(member.userId)) {
                    await apiClient.post(`/teams/${teamId}/members`, {
                        userId: member.userId,
                        title: member.title,
                        role: member.role
                    });
                }
            }
            
            showToast('Team updated successfully!', 'success');
        } else {
            // Create new team
            const response = await apiClient.post('/teams', {
                name,
                description: description || null,
                projectId: projectId ? parseInt(projectId) : null,
                createdById: currentUser.id,
                members
            });
            
            if (!response.ok) {
                const error = await response.json();
                showToast(error.message || 'Failed to create team', 'error');
                return;
            }
            
            showToast('Team created successfully!', 'success');
        }
        
        closeCreateTeamModal();
        await loadTeams();
    } catch (error) {
        console.error('Error saving team:', error);
        showToast('Error saving team', 'error');
    }
}

// View team - make it global
window.viewTeam = async function(teamId) {
    try {
        // Load team details
        const response = await apiClient.get(`/teams/${teamId}`);
        if (!response.ok) {
            showToast('Failed to load team details', 'error');
            return;
        }
        
        const team = await response.json();
        
        // Open edit modal
        await openEditTeamModal(team);
    } catch (error) {
        console.error('Error loading team:', error);
        showToast('Error loading team', 'error');
    }
}

// Open edit team modal
async function openEditTeamModal(team) {
    // Load project members first
    await loadProjectMembers();
    
    // Set form values
    document.getElementById('teamName').value = team.name || '';
    document.getElementById('teamDescription').value = team.description || '';
    document.getElementById('teamProject').value = team.projectId || '';
    
    // Clear and populate members list
    const membersList = document.getElementById('membersList');
    membersList.innerHTML = '';
    
    // Add existing members
    if (team.members && team.members.length > 0) {
        team.members.forEach(member => {
            const memberItem = document.createElement('div');
            memberItem.className = 'member-item';
            memberItem.dataset.memberId = member.id;
            memberItem.innerHTML = `
                <select class="form-select" style="flex: 2;" onchange="updateMemberSelection(this)">
                    <option value="">Select user</option>
                    ${allUsers.map(user => `<option value="${user.id}" ${user.id === member.userId ? 'selected' : ''}>${escapeHtml(user.name)} (${escapeHtml(user.email)})</option>`).join('')}
                </select>
                <input type="text" class="form-input" placeholder="Title (e.g., Developer)" style="flex: 1;" value="${escapeHtml(member.title || '')}">
                <select class="form-select" style="flex: 1;">
                    <option value="member" ${member.role === 'member' ? 'selected' : ''}>Member</option>
                    <option value="lead" ${member.role === 'lead' ? 'selected' : ''}>Lead</option>
                    <option value="admin" ${member.role === 'admin' ? 'selected' : ''}>Admin</option>
                </select>
                <button type="button" class="btn-remove" onclick="removeMemberFromList(this)">Remove</button>
            `;
            membersList.appendChild(memberItem);
        });
    }
    
    // Add two empty rows for adding new members
    addMemberToTeam();
    addMemberToTeam();
    
    // Update modal title and button
    const modalTitle = document.getElementById('teamModalTitle');
    if (modalTitle) {
        modalTitle.textContent = 'Edit Team';
    }
    
    // Store team ID for update
    const modal = document.getElementById('createTeamModal');
    modal.dataset.teamId = team.id;
    modal.dataset.mode = 'edit';
    
    // Show modal
    modal.style.display = 'flex';
}

// Load users and projects
async function loadUsersAndProjects() {
    try {
        const projectsResponse = await apiClient.get('/projects');
        
        if (projectsResponse.ok) {
            allProjects = await projectsResponse.json();
            
            // Populate project dropdown
            const projectSelect = document.getElementById('teamProject');
            projectSelect.innerHTML = '<option value="">No project</option>' +
                allProjects.map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('');
        }
    } catch (error) {
        console.error('Error loading projects:', error);
    }
}

// Load project members for the current project
async function loadProjectMembers() {
    try {
        const currentProject = projectSelector.getCurrentProject();
        
        if (!currentProject) {
            // No project selected, load all users as fallback
            const usersResponse = await apiClient.get('/auth/users');
            if (usersResponse.ok) {
                allUsers = await usersResponse.json();
            }
            return;
        }
        
        // Load members for the current project
        const response = await apiClient.get(`/projects/${currentProject.id}/members`);
        
        if (response.ok) {
            allUsers = await response.json();
            console.log(`Loaded ${allUsers.length} members for project ${currentProject.name}`);
        } else {
            console.error('Failed to load project members');
            showToast('Failed to load project members', 'error');
        }
    } catch (error) {
        console.error('Error loading project members:', error);
        showToast('Error loading project members', 'error');
    }
}

// Escape HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

