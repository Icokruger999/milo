// Enhanced Project Selector with Create New Project option

// Make showCreateProjectModal globally accessible
window.selectProjectFromDropdown = function(projectId) {
    const selectedProject = projectSelector.getProjectById(projectId);
    if (selectedProject) {
        projectSelector.setCurrentProject(selectedProject);
        const dropdown = document.getElementById('projectDropdown');
        if (dropdown) {
            dropdown.style.display = 'none';
        }
        window.location.reload();
    }
};

// Enhanced setup function
async function setupProjectSelectorEnhanced() {
    try {
        console.log('🔄 setupProjectSelectorEnhanced starting...');
        const user = authService.getCurrentUser();
        if (!user || !user.id) {
            console.error('User not authenticated for project selector setup.');
            window.location.href = 'milo-login.html';
            return;
        }
        
        console.log('🔄 Loading projects for user:', user.id);
        const projects = await projectSelector.loadProjects(user.id);
        console.log('🔄 Projects loaded:', projects.length, 'projects');
        console.log('🔄 Projects data:', projects);
        
        const selector = document.getElementById('projectSelector');
        const dropdown = document.getElementById('projectDropdown');
        const dropdownItems = document.getElementById('projectDropdownItems');
        const currentProject = projectSelector.getCurrentProject();
        
        console.log('🔄 Current project from storage:', currentProject);
        
        if (!selector) {
            console.error('Project selector element not found.');
            return;
        }

        if (projects.length === 0) {
            selector.innerHTML = '<option value="create">+ Create New Project</option>';
            selector.value = 'create';
            if (dropdownItems) {
                dropdownItems.innerHTML = '<div style="padding: 12px; color: #6B778C; font-size: 13px; text-align: center;">No projects yet</div>';
            }
            
            // Handle create option
            selector.addEventListener('change', function() {
                if (this.value === 'create') {
                    if (typeof showCreateProjectModal === 'function') {
                        showCreateProjectModal();
                    } else {
                        window.location.href = 'milo-select-project.html';
                    }
                }
            });
            return;
        }

        // Populate select dropdown with projects + create option
        selector.innerHTML = projects.map(p => 
            `<option value="${p.id}" ${currentProject && p.id === currentProject.id ? 'selected' : ''}>${p.name}${p.key ? ` (${p.key})` : ''}</option>`
        ).join('') + '<option value="create" style="font-weight: 600;">+ Create New Project</option>';
        
        console.log('✅ Selector populated with', projects.length, 'projects');

        // Populate custom dropdown if it exists
        if (dropdownItems) {
            dropdownItems.innerHTML = projects.map(p => {
                const isSelected = currentProject && p.id === currentProject.id;
                return `
                    <div class="project-dropdown-item" data-project-id="${p.id}" style="padding: 10px 12px; cursor: pointer; ${isSelected ? 'background: #DEEBFF; color: #0052CC;' : 'color: #42526E;'} transition: background 0.15s;" 
                         onmouseover="this.style.background='${isSelected ? '#DEEBFF' : '#F4F5F7'}'" 
                         onmouseout="this.style.background='${isSelected ? '#DEEBFF' : 'transparent'}'"
                         onclick="selectProjectFromDropdown(${p.id})">
                        <div style="font-weight: ${isSelected ? '600' : '400'}; font-size: 14px;">${p.name}</div>
                        ${p.key ? `<div style="font-size: 12px; color: #6B778C; margin-top: 2px;">${p.key}</div>` : ''}
                    </div>
                `;
            }).join('');
        }

        // Update project name in breadcrumb
        const currentProjectNameEl = document.getElementById('currentProjectName');
        if (currentProjectNameEl && currentProject) {
            currentProjectNameEl.textContent = currentProject.name;
            console.log('✅ Breadcrumb updated to:', currentProject.name);
        } else if (projects.length > 0 && !currentProject) {
            // If no current project but projects exist, select first one
            const firstProject = projects[0];
            projectSelector.setCurrentProject(firstProject);
            selector.value = firstProject.id;
            if (currentProjectNameEl) {
                currentProjectNameEl.textContent = firstProject.name;
                console.log('✅ Breadcrumb updated to first project:', firstProject.name);
            }
        } else if (currentProjectNameEl && !currentProject) {
            currentProjectNameEl.textContent = 'No projects';
            console.warn('⚠️ No projects available');
        }
        
        // Update project sidebar
        const projectNameEl = document.querySelector('.project-name');
        const projectIconEl = document.querySelector('.project-icon');
        if (projectNameEl && currentProject) {
            projectNameEl.textContent = currentProject.name;
        }
        if (projectIconEl && currentProject) {
            projectIconEl.textContent = (currentProject.key || currentProject.name).substring(0, 1).toUpperCase();
        }

        // Handle select dropdown change
        selector.addEventListener('change', function() {
            if (this.value === 'create') {
                // Create new project
                if (typeof showCreateProjectModal === 'function') {
                    showCreateProjectModal();
                    // Reset selector to current project
                    setTimeout(() => {
                        if (currentProject) {
                            this.value = currentProject.id;
                        }
                    }, 100);
                } else {
                    window.location.href = 'milo-select-project.html';
                }
            } else if (this.value) {
                const selectedProject = projectSelector.getProjectById(parseInt(this.value));
                if (selectedProject) {
                    projectSelector.setCurrentProject(selectedProject);
                    window.location.reload();
                }
            }
        });

        // Toggle custom dropdown on select click (if custom dropdown exists)
        if (dropdown) {
            selector.addEventListener('click', function(e) {
                e.stopPropagation();
                const isOpen = dropdown.style.display === 'block';
                dropdown.style.display = isOpen ? 'none' : 'block';
            });

            // Close dropdown when clicking outside
            document.addEventListener('click', function(e) {
                if (!selector.contains(e.target) && !dropdown.contains(e.target)) {
                    dropdown.style.display = 'none';
                }
            });
        }
        
        console.log('✅ setupProjectSelectorEnhanced completed successfully');
    } catch (error) {
        console.error('Failed to setup project selector:', error);
        console.error('Error stack:', error.stack);
    }
}

