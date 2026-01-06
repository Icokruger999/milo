// API Configuration - Production Only
// HTTPS endpoint configured - fixes mixed content error
const API_CONFIG = {
    // Production API URL - Milo backend runs on port 5001 via nginx with HTTPS
    get baseURL() {
        const hostname = window.location.hostname;
        if (hostname === 'www.codingeverest.com' || hostname === 'codingeverest.com') {
            // HTTPS endpoint - fixes mixed content error (HTTPS frontend calling HTTPS backend)
            return 'https://api.codingeverest.com/api';
        }
        return 'http://localhost:5001/api';
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

