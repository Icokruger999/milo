// API Configuration
const API_CONFIG = {
    // Production API URL - will be set based on environment
    baseURL: window.location.hostname === 'www.codingeverest.com' || 
             window.location.hostname === 'codingeverest.com'
        ? 'https://www.codingeverest.com/api'
        : 'http://localhost:5000/api',
    
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

