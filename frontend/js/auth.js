// Authentication utilities for Milo

const AUTH_STORAGE_KEY = 'milo_auth_token';
const AUTH_USER_KEY = 'milo_user';

class AuthService {
    /**
     * Sign up with name and email (temporary password will be emailed)
     */
    async signup(name, email) {
        try {
            const response = await apiClient.post('/auth/signup', {
                name: name,
                email: email
            });

            if (response.ok) {
                const data = await response.json();
                
                if (data.success) {
                    // Don't store token - user needs to log in with temp password first
                    return { success: true, message: data.message || 'Account created successfully' };
                }
            } else {
                const error = await response.json();
                return { success: false, message: error.message || 'Signup failed' };
            }
        } catch (error) {
            console.error('Signup error:', error);
            return { success: false, message: error.message || 'Network error. Please try again.' };
        }
    }

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
                    // Check if password change is required
                    if (data.requiresPasswordChange) {
                        // Store token temporarily for password change
                        const storage = rememberMe ? localStorage : sessionStorage;
                        storage.setItem(AUTH_STORAGE_KEY, data.token);
                        storage.setItem(AUTH_USER_KEY, JSON.stringify(data.user));
                        storage.setItem('milo_requires_password_change', 'true');
                        
                        return { 
                            success: true, 
                            requiresPasswordChange: true,
                            user: data.user,
                            message: data.message || 'Please change your password'
                        };
                    }
                    
                    // Normal login - store token and user info
                    const storage = rememberMe ? localStorage : sessionStorage;
                    storage.setItem(AUTH_STORAGE_KEY, data.token);
                    storage.setItem(AUTH_USER_KEY, JSON.stringify(data.user));
                    storage.removeItem('milo_requires_password_change');
                    
                    return { success: true, user: data.user, requiresPasswordChange: false };
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

    /**
     * Change password (for first login or password reset)
     */
    async changePassword(email, currentPassword, newPassword) {
        try {
            const response = await apiClient.post('/auth/change-password', {
                email: email,
                currentPassword: currentPassword,
                newPassword: newPassword
            });

            if (response.ok) {
                const data = await response.json();
                
                if (data.success && data.token) {
                    // Update stored token and clear password change flag
                    const storage = localStorage.getItem(AUTH_STORAGE_KEY) ? localStorage : sessionStorage;
                    storage.setItem(AUTH_STORAGE_KEY, data.token);
                    storage.setItem(AUTH_USER_KEY, JSON.stringify(data.user));
                    storage.removeItem('milo_requires_password_change');
                    
                    return { success: true, user: data.user, message: data.message || 'Password changed successfully' };
                }
            } else {
                const error = await response.json();
                return { success: false, message: error.message || 'Password change failed' };
            }
        } catch (error) {
            console.error('Change password error:', error);
            return { success: false, message: error.message || 'Network error. Please try again.' };
        }
    }

    /**
     * Check if password change is required
     */
    requiresPasswordChange() {
        return localStorage.getItem('milo_requires_password_change') === 'true' ||
               sessionStorage.getItem('milo_requires_password_change') === 'true';
    }
}

// Create global auth service instance
const authService = new AuthService();

