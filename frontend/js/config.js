// API Configuration - Production Only
const API_CONFIG = {
    // Production API URL - Milo backend runs on port 5001
    // Use same protocol as frontend to avoid mixed content issues
    get baseURL() {
        const hostname = window.location.hostname;
        const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
        
        if (hostname === 'www.codingeverest.com' || hostname === 'codingeverest.com') {
            // For production, use HTTP backend (will need HTTPS setup later)
            // Browsers block HTTP from HTTPS, so we use HTTP for now
            return 'http://34.246.3.141:5001/api';
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

