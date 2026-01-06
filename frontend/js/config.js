// API Configuration - Production Only
const API_CONFIG = {
    // Production API URL - Milo backend runs on port 5001
    // Note: If frontend is HTTPS and backend is HTTP, browsers may block (mixed content)
    // For now using HTTP - will need HTTPS setup for backend later
    get baseURL() {
        const hostname = window.location.hostname;
        if (hostname === 'www.codingeverest.com' || hostname === 'codingeverest.com') {
            // Use HTTPS API subdomain (permanent fix for mixed content)
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

