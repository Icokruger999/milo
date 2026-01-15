// Project Selector Service
class ProjectSelectorService {
    constructor() {
        this.currentProject = null;
        this.projects = [];
        this.storageKey = 'milo_current_project';
        this.projectsCache = {
            data: null,
            timestamp: null,
            ttl: 5 * 60 * 1000 // 5 minutes cache
        };
    }

    /**
     * Load projects from API with caching
     * @param {number} userId - Optional user ID to filter projects
     * @param {boolean} forceRefresh - Force refresh cache
     */
    async loadProjects(userId = null, forceRefresh = false) {
        try {
            // Check cache first (unless forced refresh)
            if (!forceRefresh && this.projectsCache.data && this.projectsCache.timestamp) {
                const cacheAge = Date.now() - this.projectsCache.timestamp;
                if (cacheAge < this.projectsCache.ttl) {
                    // Check if cache is for the same user
                    const cachedUserId = this.projectsCache.userId;
                    if (cachedUserId === userId) {
                        console.log('Using cached projects (age:', Math.round(cacheAge / 1000), 's)');
                        this.projects = this.projectsCache.data;
                        return this.projects;
                    }
                }
            }

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
                
                // Update cache
                this.projectsCache = {
                    data: this.projects,
                    timestamp: Date.now(),
                    userId: userId
                };
                
                return this.projects;
            }
        } catch (error) {
            console.error('Failed to load projects:', error);
            // Return cached data if available, even if expired
            if (this.projectsCache.data) {
                console.log('API failed, using stale cache');
                this.projects = this.projectsCache.data;
                return this.projects;
            }
        }
        return [];
    }
    
    /**
     * Clear projects cache
     */
    clearCache() {
        this.projectsCache = {
            data: null,
            timestamp: null,
            userId: null
        };
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
        // First check in-memory cache
        if (this.currentProject) {
            return this.currentProject;
        }
        
        // Then check localStorage
        const stored = localStorage.getItem(this.storageKey);
        if (stored) {
            try {
                this.currentProject = JSON.parse(stored);
                return this.currentProject;
            } catch (e) {
                console.error('Failed to parse stored project:', e);
                localStorage.removeItem(this.storageKey);
            }
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

