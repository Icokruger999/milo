// API Configuration - Production Only
const API_CONFIG = {
    // Production API URL - Milo backend runs on port 5001
    baseURL: window.location.hostname === 'www.codingeverest.com' || 
             window.location.hostname === 'codingeverest.com'
        ? 'http://34.246.3.141:5001/api'
        : 'http://localhost:5001/api',
    
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

