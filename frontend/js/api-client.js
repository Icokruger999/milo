// API Client with retry logic and error handling
class ApiClient {
    constructor(config) {
        this.baseURL = config.baseURL;
        this.timeout = config.timeout || 30000;
        this.retryAttempts = config.retryAttempts || 3;
        this.retryDelay = config.retryDelay || 1000;
    }

    /**
     * Get authentication token
     */
    getAuthToken() {
        if (typeof authService !== 'undefined') {
            return authService.getToken();
        }
        return localStorage.getItem('milo_auth_token') || sessionStorage.getItem('milo_auth_token');
    }

    /**
     * Make an API request with retry logic
     * @param {string} endpoint - API endpoint (e.g., '/health')
     * @param {object} options - Fetch options (method, body, headers, etc.)
     * @returns {Promise<Response>}
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const token = this.getAuthToken();
        const headers = {
            'Content-Type': 'application/json',
        };
        
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const defaultOptions = {
            method: 'GET',
            headers: headers,
            signal: controller.signal,
            ...options
        };
        
        // Merge headers properly
        if (options.headers) {
            defaultOptions.headers = { ...defaultOptions.headers, ...options.headers };
        }

        let lastError;
        
        for (let attempt = 0; attempt < this.retryAttempts; attempt++) {
            try {
                const response = await fetch(url, defaultOptions);
                clearTimeout(timeoutId);
                
                // If response is ok, return it
                if (response.ok) {
                    return response;
                }
                
                // For 4xx errors (client errors), don't retry
                // Don't read the body here - let the caller read it
                if (response.status >= 400 && response.status < 500) {
                    // Return the response so caller can read the body
                    return response;
                }
                
                // For 5xx errors (server errors), retry
                if (response.status >= 500) {
                    // Read error details for logging, but clone response first
                    const responseClone = response.clone();
                    try {
                        const errorDetails = await this.getErrorDetails(responseClone);
                        lastError = new ApiError(
                            `Server error: ${response.status}`,
                            response.status,
                            errorDetails
                        );
                    } catch {
                        lastError = new ApiError(
                            `Server error: ${response.status}`,
                            response.status,
                            null
                        );
                    }
                    
                    // Wait before retrying (exponential backoff)
                    if (attempt < this.retryAttempts - 1) {
                        await this.delay(this.retryDelay * Math.pow(2, attempt));
                        continue;
                    }
                }
                
                return response;
            } catch (error) {
                clearTimeout(timeoutId);
                lastError = error;
                
                // Don't retry on abort (timeout) or network errors after all attempts
                if (error.name === 'AbortError') {
                    throw new ApiError(
                        'Request timeout - the server took too long to respond',
                        408,
                        null
                    );
                }
                
                // Network errors - retry
                if (error instanceof TypeError && error.message.includes('fetch')) {
                    if (attempt < this.retryAttempts - 1) {
                        await this.delay(this.retryDelay * Math.pow(2, attempt));
                        continue;
                    }
                    throw new ApiError(
                        'Network error - unable to connect to the server',
                        0,
                        error.message
                    );
                }
                
                // Other errors - throw immediately
                throw error;
            }
        }
        
        throw lastError || new ApiError('Request failed after retries', 0, null);
    }

    /**
     * Get error details from response
     */
    async getErrorDetails(response) {
        try {
            const text = await response.text();
            try {
                return JSON.parse(text);
            } catch {
                return text;
            }
        } catch {
            return null;
        }
    }

    /**
     * Delay helper for retries
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * GET request
     */
    async get(endpoint, options = {}) {
        return this.request(endpoint, { ...options, method: 'GET' });
    }

    /**
     * POST request
     */
    async post(endpoint, data, options = {}) {
        return this.request(endpoint, {
            ...options,
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    /**
     * PUT request
     */
    async put(endpoint, data, options = {}) {
        return this.request(endpoint, {
            ...options,
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    /**
     * DELETE request
     */
    async delete(endpoint, options = {}) {
        return this.request(endpoint, { ...options, method: 'DELETE' });
    }

    /**
     * Check API health
     */
    async healthCheck() {
        try {
            const response = await this.get('/health');
            const data = await response.json();
            return { success: true, data };
        } catch (error) {
            return { 
                success: false, 
                error: error.message || 'Health check failed' 
            };
        }
    }
}

/**
 * Custom API Error class
 */
class ApiError extends Error {
    constructor(message, status, details) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.details = details;
    }
}

// Create default API client instance
const apiClient = new ApiClient(API_CONFIG);

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ApiClient, ApiError, apiClient };
}

