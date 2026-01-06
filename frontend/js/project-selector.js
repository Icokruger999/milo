// Project Selector Service
class ProjectSelectorService {
    constructor() {
        this.currentProject = null;
        this.projects = [];
        this.storageKey = 'milo_current_project';
    }

    /**
     * Load projects from API
     */
    async loadProjects() {
        try {
            const response = await apiClient.get('/projects');
            if (response.ok) {
                this.projects = await response.json();
                return this.projects;
            }
        } catch (error) {
            console.error('Failed to load projects:', error);
        }
        return [];
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

