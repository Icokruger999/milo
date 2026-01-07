// Project Selector Service
class ProjectSelectorService {
    constructor() {
        this.currentProject = null;
        this.projects = [];
        this.storageKey = 'milo_current_project';
    }

    /**
     * Load projects from API
     * @param {number} userId - Optional user ID to filter projects
     */
    async loadProjects(userId = null) {
        try {
            let url = '/projects';
            if (userId) {
                url += `?userId=${userId}`;
            }
            const response = await apiClient.get(url);
            if (response.ok) {
                this.projects = await response.json();
                // Role is now provided by the backend, but ensure it exists
                const currentUser = authService.getCurrentUser();
                if (currentUser) {
                    this.projects = this.projects.map(p => ({
                        ...p,
                        role: p.role || (p.ownerId === currentUser.id ? 'owner' : 'member')
                    }));
                }
                return this.projects;
            }
        } catch (error) {
            console.error('Failed to load projects:', error);
        }
        return [];
    }

    /**
     * Load projects for a specific user
     */
    async loadProjectsForUser(userId) {
        return this.loadProjects(userId);
    }

    /**
     * Get current project from storage
     */
    getCurrentProject() {
        const stored = localStorage.getItem(this.storageKey);
        if (stored) {
            this.currentProject = JSON.parse(stored);
            return this.currentProject;
        }
        return null;
    }

    /**
     * Set current project
     */
    setCurrentProject(project) {
        this.currentProject = project;
        if (project) {
            localStorage.setItem(this.storageKey, JSON.stringify(project));
        } else {
            localStorage.removeItem(this.storageKey);
        }
    }

    /**
     * Get project by ID
     */
    getProjectById(id) {
        return this.projects.find(p => p.id === id);
    }

    /**
     * Check if user has projects
     */
    hasProjects() {
        return this.projects.length > 0;
    }

    /**
     * Check if user has multiple projects
     */
    hasMultipleProjects() {
        return this.projects.length > 1;
    }
}

// Create global instance
const projectSelector = new ProjectSelectorService();

