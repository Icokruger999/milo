// API Configuration - Production Only
const API_CONFIG = {
    // Production API URL
    baseURL: 'https://www.codingeverest.com/api',
    
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

