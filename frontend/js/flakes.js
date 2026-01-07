// Flakes functionality - Confluence-like wiki/documentation

let flakes = [];
let currentFlake = null;

// Initialize flakes
document.addEventListener('DOMContentLoaded', function() {
    if (!authService.isAuthenticated()) {
        window.location.href = 'milo-login.html';
        return;
    }

    // Set user avatars
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
        document.getElementById('sidebarUserAvatar').textContent = initials;
    }

    // Load project info
    const currentProject = projectSelector.getCurrentProject();
    if (currentProject) {
        document.getElementById('projectName').textContent = currentProject.name;
        document.getElementById('projectIcon').textContent = (currentProject.key || currentProject.name).substring(0, 1).toUpperCase();
    } else {
        window.location.href = 'milo-select-project.html';
        return;
    }

    // Load flakes
    loadFlakes();
});

// Load flakes from API
async function loadFlakes() {
    try {
        const currentProject = projectSelector.getCurrentProject();
        if (!currentProject) return;

        const response = await apiClient.get(`/flakes?projectId=${currentProject.id}`);
        if (response.ok) {
            flakes = await response.json();
            renderFlakes();
        } else {
            // If endpoint doesn't exist yet, show empty state
            flakes = [];
            renderFlakes();
        }
    } catch (error) {
        console.error('Failed to load flakes:', error);
        flakes = [];
        renderFlakes();
    }
}

// Render flakes list
function renderFlakes() {
    const container = document.getElementById('flakesContent');
    if (!container) return;

    if (flakes.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📄</div>
                <div class="empty-state-title">No flakes yet</div>
                <div class="empty-state-text">Create your first flake to start documenting your project</div>
                <button class="btn-primary" onclick="showCreateFlakeModal()">Create Flake</button>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div class="flakes-list">
            ${flakes.map(flake => `
                <div class="flake-card" onclick="openFlake(${flake.id})">
                    <div class="flake-card-title">${flake.title || 'Untitled'}</div>
                    <div class="flake-card-meta">
                        Updated ${new Date(flake.updatedAt || flake.createdAt).toLocaleDateString()} by ${flake.authorName || 'Unknown'}
                    </div>
                    <div class="flake-card-preview">${(flake.content || '').substring(0, 150)}${(flake.content || '').length > 150 ? '...' : ''}</div>
                </div>
            `).join('')}
        </div>
    `;
}

// Show create flake modal
function showCreateFlakeModal() {
    const modal = document.getElementById('createFlakeModal');
    if (modal) {
        modal.style.display = 'flex';
        document.getElementById('flakeTitle').focus();
    }
}

// Close create flake modal
function closeCreateFlakeModal() {
    const modal = document.getElementById('createFlakeModal');
    if (modal) {
        modal.style.display = 'none';
        document.getElementById('createFlakeForm').reset();
    }
}

// Handle create flake
async function handleCreateFlake(event) {
    event.preventDefault();
    
    const title = document.getElementById('flakeTitle').value.trim();
    const content = document.getElementById('flakeContent').value.trim();
    
    if (!title) {
        alert('Title is required');
        return;
    }

    try {
        const currentProject = projectSelector.getCurrentProject();
        const user = authService.getCurrentUser();
        
        const response = await apiClient.post('/flakes', {
            title: title,
            content: content,
            projectId: currentProject ? currentProject.id : null,
            authorId: user ? user.id : null
        });

        if (response.ok) {
            closeCreateFlakeModal();
            await loadFlakes();
        } else {
            const error = await response.json();
            alert(error.message || 'Failed to create flake');
        }
    } catch (error) {
        console.error('Error creating flake:', error);
        // For now, create locally until backend is ready
        const newFlake = {
            id: Date.now(),
            title: title,
            content: content,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            authorName: authService.getCurrentUser()?.name || 'You'
        };
        flakes.push(newFlake);
        renderFlakes();
        closeCreateFlakeModal();
    }
}

// Open flake for viewing/editing
function openFlake(flakeId) {
    const flake = flakes.find(f => f.id === flakeId);
    if (!flake) return;
    
    // For now, show in alert - will implement full editor later
    window.location.href = `milo-flake-view.html?id=${flakeId}`;
}

// Make functions globally available
window.showCreateFlakeModal = showCreateFlakeModal;
window.closeCreateFlakeModal = closeCreateFlakeModal;
window.handleCreateFlake = handleCreateFlake;
window.openFlake = openFlake;
window.loadFlakes = loadFlakes;

