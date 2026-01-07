// Project Creation and Invitation Modals

// Project Creation Modal
function showCreateProjectModal() {
    const modal = document.createElement('div');
    modal.id = 'createProjectModal';
    modal.style.cssText = 'display: flex; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 2000; align-items: center; justify-content: center;';
    
    modal.innerHTML = `
        <div style="background: white; border-radius: 8px; padding: 24px; width: 90%; max-width: 500px; max-height: 90vh; overflow-y: auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="margin: 0; font-size: 20px; font-weight: 600;">Create New Project</h2>
                <button onclick="closeCreateProjectModal()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #666;">&times;</button>
            </div>
            <div id="createProjectError" style="display: none; background: #FFEBE6; border: 1px solid #DE350B; border-radius: 4px; padding: 12px; margin-bottom: 16px; color: #DE350B; font-size: 14px;"></div>
            <form id="createProjectForm" onsubmit="handleCreateProject(event)">
                <div style="margin-bottom: 16px;">
                    <label style="display: block; margin-bottom: 6px; font-weight: 500; font-size: 14px;">Project Name *</label>
                    <input type="text" id="projectName" name="name" required style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; box-sizing: border-box;">
                </div>
                <div style="margin-bottom: 16px;">
                    <label style="display: block; margin-bottom: 6px; font-weight: 500; font-size: 14px;">Project Key (optional)</label>
                    <input type="text" id="projectKey" name="key" maxlength="10" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; box-sizing: border-box; text-transform: uppercase;">
                    <small style="color: #6B778C; font-size: 12px;">Short identifier for your project (e.g., MILO, BG)</small>
                </div>
                <div style="margin-bottom: 16px;">
                    <label style="display: block; margin-bottom: 6px; font-weight: 500; font-size: 14px;">Description (optional)</label>
                    <textarea id="projectDescription" name="description" rows="3" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; box-sizing: border-box; resize: vertical;"></textarea>
                </div>
                <div style="display: flex; gap: 12px; justify-content: flex-end;">
                    <button type="button" onclick="closeCreateProjectModal()" style="padding: 10px 20px; border: 1px solid #ddd; background: white; border-radius: 4px; cursor: pointer; font-size: 14px;">Cancel</button>
                    <button type="submit" style="padding: 10px 20px; background: #0052CC; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; font-weight: 500;">Create Project</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    document.getElementById('projectName').focus();
}

function closeCreateProjectModal() {
    const modal = document.getElementById('createProjectModal');
    if (modal) {
        modal.remove();
    }
}

async function handleCreateProject(event) {
    event.preventDefault();
    const errorDiv = document.getElementById('createProjectError');
    errorDiv.style.display = 'none';
    
    const name = document.getElementById('projectName').value.trim();
    const key = document.getElementById('projectKey').value.trim().toUpperCase();
    const description = document.getElementById('projectDescription').value.trim();
    
    if (!name) {
        errorDiv.textContent = 'Project name is required';
        errorDiv.style.display = 'block';
        return;
    }
    
    try {
        const user = authService.getCurrentUser();
        const response = await apiClient.post('/projects', {
            name: name,
            key: key || null,
            description: description || null,
            ownerId: user.id
        });
        
        if (response.ok) {
            const project = await response.json();
            
            // Ensure project has all required fields
            if (!project.id) {
                errorDiv.textContent = 'Invalid project response from server';
                errorDiv.style.display = 'block';
                return;
            }
            
            // Store project in selector immediately (synchronous)
            const projectData = {
                id: project.id,
                name: project.name || name,
                key: project.key,
                description: project.description,
                status: project.status || 'active'
            };
            
            // Store synchronously
            localStorage.setItem('milo_current_project', JSON.stringify(projectData));
            projectSelector.currentProject = projectData;
            
            // Close modal
            closeCreateProjectModal();
            
            // Reload projects list to include the new project (with user ID)
            const currentUser = authService.getCurrentUser();
            if (currentUser && currentUser.id) {
                await projectSelector.loadProjects(currentUser.id);
            }
            
            // Redirect after a brief moment to ensure everything is saved
            setTimeout(() => {
                window.location.href = 'milo-board.html';
            }, 200);
        } else {
            const error = await response.json();
            errorDiv.textContent = error.message || 'Failed to create project';
            errorDiv.style.display = 'block';
        }
    } catch (error) {
        console.error('Failed to create project:', error);
        errorDiv.textContent = 'Failed to create project. Please try again.';
        errorDiv.style.display = 'block';
    }
}

// Invitation Modal
function showInviteModal() {
    const modal = document.createElement('div');
    modal.id = 'inviteModal';
    modal.style.cssText = 'display: flex; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 2000; align-items: center; justify-content: center;';
    
    modal.innerHTML = `
        <div style="background: white; border-radius: 8px; padding: 24px; width: 90%; max-width: 500px; max-height: 90vh; overflow-y: auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="margin: 0; font-size: 20px; font-weight: 600;">Invite People to Project</h2>
                <button onclick="closeInviteModal()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #666;">&times;</button>
            </div>
            <div id="inviteError" style="display: none; background: #FFEBE6; border: 1px solid #DE350B; border-radius: 4px; padding: 12px; margin-bottom: 16px; color: #DE350B; font-size: 14px;"></div>
            <div id="inviteSuccess" style="display: none; background: #E3FCEF; border: 1px solid #36B37E; border-radius: 4px; padding: 12px; margin-bottom: 16px; color: #006644; font-size: 14px;"></div>
            <form id="inviteForm" onsubmit="handleInviteUser(event)">
                <div style="margin-bottom: 16px;">
                    <label style="display: block; margin-bottom: 6px; font-weight: 500; font-size: 14px;">Email Address *</label>
                    <input type="email" id="inviteEmail" name="email" required style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; box-sizing: border-box;" placeholder="user@example.com">
                </div>
                <div style="margin-bottom: 16px;">
                    <label style="display: block; margin-bottom: 6px; font-weight: 500; font-size: 14px;">Name (optional)</label>
                    <input type="text" id="inviteName" name="name" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; box-sizing: border-box;" placeholder="John Doe">
                </div>
                <div style="display: flex; gap: 12px; justify-content: flex-end;">
                    <button type="button" onclick="closeInviteModal()" style="padding: 10px 20px; border: 1px solid #ddd; background: white; border-radius: 4px; cursor: pointer; font-size: 14px;">Cancel</button>
                    <button type="submit" style="padding: 10px 20px; background: #0052CC; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; font-weight: 500;">Send Invitation</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    document.getElementById('inviteEmail').focus();
}

function closeInviteModal() {
    const modal = document.getElementById('inviteModal');
    if (modal) {
        modal.remove();
    }
}

async function handleInviteUser(event) {
    event.preventDefault();
    const errorDiv = document.getElementById('inviteError');
    const successDiv = document.getElementById('inviteSuccess');
    errorDiv.style.display = 'none';
    successDiv.style.display = 'none';
    
    const email = document.getElementById('inviteEmail').value.trim();
    const name = document.getElementById('inviteName').value.trim();
    
    if (!email) {
        errorDiv.textContent = 'Email address is required';
        errorDiv.style.display = 'block';
        return;
    }
    
    try {
        const currentProject = projectSelector.getCurrentProject();
        const user = authService.getCurrentUser();
        
        if (!currentProject || !user) {
            errorDiv.textContent = 'Project or user not found';
            errorDiv.style.display = 'block';
            return;
        }
        
        const response = await apiClient.post('/invitations', {
            projectId: currentProject.id,
            email: email,
            name: name || null,
            invitedById: user.id
        });
        
        if (response.ok) {
            successDiv.textContent = `Invitation sent successfully to ${email}`;
            successDiv.style.display = 'block';
            document.getElementById('inviteForm').reset();
            setTimeout(() => {
                closeInviteModal();
            }, 2000);
        } else {
            const error = await response.json();
            errorDiv.textContent = error.message || 'Failed to send invitation';
            errorDiv.style.display = 'block';
        }
    } catch (error) {
        console.error('Failed to send invitation:', error);
        errorDiv.textContent = 'Failed to send invitation. Please try again.';
        errorDiv.style.display = 'block';
    }
}

function showProjectSettings() {
    alert('Project settings coming soon!');
}

