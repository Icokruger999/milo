// API Configuration - Production Only
// STABLE CONFIGURATION - DO NOT CHANGE UNLESS EC2 IP CHANGES
const API_CONFIG = {
    // Production API URL - Milo backend runs on port 5001
    // STABLE: Using direct EC2 IP - this works and should not be changed
    get baseURL() {
        const hostname = window.location.hostname;
        if (hostname === 'www.codingeverest.com' || hostname === 'codingeverest.com') {
            // STABLE CONFIG: Direct EC2 IP on port 5001 - DO NOT CHANGE
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

