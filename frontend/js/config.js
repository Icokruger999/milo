// API Configuration - Production Only
// HTTPS endpoint configured - fixes mixed content error
// PORT CONFIGURATION: Backend runs on port 8080 (see DEPLOYMENT_RULES.md)
const API_CONFIG = {
    // Production API URL - Milo backend runs on port 8080 via nginx with HTTPS
    get baseURL() {
        const hostname = window.location.hostname;
        if (hostname === 'www.codingeverest.com' || hostname === 'codingeverest.com') {
            // HTTPS endpoint - fixes mixed content error (HTTPS frontend calling HTTPS backend)
            // Nginx proxies api.codingeverest.com to localhost:8080
            return 'https://api.codingeverest.com/api';
        }
        // Local development fallback (for testing locally)
        return 'http://localhost:8080/api';
    },
    
    // Timeout settings
    timeout: 30000,
    
    // Retry settings
    retryAttempts: 3,
    retryDelay: 1000
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = API_CONFIG;
}

