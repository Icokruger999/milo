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
                <p>Create your first team to get started</p>
                <button class="btn-primary" onclick="openCreateTeamModal()">Create Team</button>
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
window.openCreateTeamModal = function() {
    teamMembers = [];
    document.getElementById('teamName').value = '';
    document.getElementById('teamDescription').value = '';
    document.getElementById('teamProject').value = '';
    document.getElementById('membersList').innerHTML = '';
    
    // Add two initial member rows
    addMemberToTeam();
    addMemberToTeam();
    
    document.getElementById('createTeamModal').style.display = 'flex';
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

// Handle create team - make it global
window.handleCreateTeam = async function(event) {
    event.preventDefault();
    
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
            members.push({
                userId: parseInt(userSelect.value),
                title: titleInput ? titleInput.value.trim() || null : null,
                role: roleSelect ? roleSelect.value : 'member'
            });
        }
    });
    
    try {
        const response = await apiClient.post('/teams', {
            name,
            description: description || null,
            projectId: projectId ? parseInt(projectId) : null,
            createdById: currentUser.id,
            members
        });
        
        if (response.ok) {
            showToast('Team created successfully!', 'success');
            closeCreateTeamModal();
            await loadTeams();
        } else {
            const error = await response.json();
            showToast(error.message || 'Failed to create team', 'error');
        }
    } catch (error) {
        console.error('Error creating team:', error);
        showToast('Error creating team', 'error');
    }
}

// View team - make it global
window.viewTeam = function(teamId) {
    // For now, just show a toast - could open a detail modal
    showToast('Team details view - Coming soon!', 'info');
    console.log('View team:', teamId);
}

// Load users and projects
async function loadUsersAndProjects() {
    try {
        const [usersResponse, projectsResponse] = await Promise.all([
            apiClient.get('/auth/users'),
            apiClient.get('/projects')
        ]);
        
        if (usersResponse.ok) {
            allUsers = await usersResponse.json();
        }
        
        if (projectsResponse.ok) {
            allProjects = await projectsResponse.json();
            
            // Populate project dropdown
            const projectSelect = document.getElementById('teamProject');
            projectSelect.innerHTML = '<option value="">No project</option>' +
                allProjects.map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('');
        }
    } catch (error) {
        console.error('Error loading users/projects:', error);
    }
}

// Escape HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

