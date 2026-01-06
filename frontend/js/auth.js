// Authentication utilities for Milo

const AUTH_STORAGE_KEY = 'milo_auth_token';
const AUTH_USER_KEY = 'milo_user';

class AuthService {
    /**
     * Login with email and password
     */
    async login(email, password, rememberMe = false) {
        try {
            const response = await apiClient.post('/auth/login', {
                email: email,
                password: password,
                rememberMe: rememberMe
            });

            if (response.ok) {
                const data = await response.json();
                
                if (data.success && data.token) {
                    // Store token and user info
                    const storage = rememberMe ? localStorage : sessionStorage;
                    storage.setItem(AUTH_STORAGE_KEY, data.token);
                    storage.setItem(AUTH_USER_KEY, JSON.stringify(data.user));
                    
                    return { success: true, user: data.user };
                }
            } else {
                const error = await response.json();
                return { success: false, message: error.message || 'Login failed' };
            }
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, message: error.message || 'Network error. Please try again.' };
        }
    }

    /**
     * Logout current user
     */
    logout() {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        localStorage.removeItem(AUTH_USER_KEY);
        sessionStorage.removeItem(AUTH_STORAGE_KEY);
        sessionStorage.removeItem(AUTH_USER_KEY);
        window.location.href = 'milo-login.html';
    }

    /**
     * Get current authentication token
     */
    getToken() {
        return localStorage.getItem(AUTH_STORAGE_KEY) || sessionStorage.getItem(AUTH_STORAGE_KEY);
    }

    /**
     * Get current user
     */
    getCurrentUser() {
        const userStr = localStorage.getItem(AUTH_USER_KEY) || sessionStorage.getItem(AUTH_USER_KEY);
        if (userStr) {
            try {
                return JSON.parse(userStr);
            } catch {
                return null;
            }
        }
        return null;
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        return this.getToken() !== null;
    }

    /**
     * Verify token with backend
     */
    async verifyToken() {
        const token = this.getToken();
        if (!token) {
            return false;
        }

        try {
            const response = await apiClient.post('/auth/verify', { token: token });
            if (response.ok) {
                const data = await response.json();
                return data.valid === true;
            }
        } catch (error) {
            console.error('Token verification error:', error);
        }

        return false;
    }

    /**
     * Require authentication - redirect to login if not authenticated
     */
    requireAuth() {
        if (!this.isAuthenticated()) {
            window.location.href = 'milo-login.html';
            return false;
        }
        return true;
    }
}

// Create global auth service instance
const authService = new AuthService();

