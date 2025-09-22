// Authentication System for Road Monitor Palu

class AuthSystem {
    constructor() {
        this.currentUser = null;
        this.isAdmin = false;
        this.init();
    }

    init() {
        this.setupEventListeners();
        // Only check auth status on login page, other pages will check manually
        if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
            this.checkAuthStatus();
        } else {
            this.loadUserData();
        }
    }

    setupEventListeners() {
        // Login form submission
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }

        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // Register link
        const registerLink = document.getElementById('registerLink');
        if (registerLink) {
            registerLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.showRegisterForm();
            });
        }

        // Forgot password link
        const forgotPassword = document.getElementById('forgotPassword');
        if (forgotPassword) {
            forgotPassword.addEventListener('click', (e) => {
                e.preventDefault();
                this.showForgotPassword();
            });
        }

        // User dropdown functionality
        this.setupUserDropdown();
    }

    setupUserDropdown() {
        const dropdownBtn = document.querySelector('.dropdown-btn');
        const dropdownContent = document.querySelector('.dropdown-content');
        const logoutLink = document.getElementById('logoutLink');

        if (dropdownBtn && dropdownContent) {
            dropdownBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                dropdownContent.classList.toggle('show');
            });

            // Close dropdown when clicking outside
            document.addEventListener('click', (e) => {
                if (!e.target.closest('.user-profile')) {
                    dropdownContent.classList.remove('show');
                }
            });

            // Logout functionality
            if (logoutLink) {
                logoutLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.logout();
                });
            }
        }

        // Show/hide admin navigation
        this.toggleAdminNavigation();
    }

    toggleAdminNavigation() {
        const adminNavItems = document.querySelectorAll('.admin-only');
        adminNavItems.forEach(item => {
            if (this.isAdmin) {
                item.classList.add('show');
            } else {
                item.classList.remove('show');
            }
        });
    }

    switchTab(tab) {
        // Remove active class from all tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        // Add active class to selected tab
        document.querySelector(`[data-tab="${tab}"]`).classList.add('active');

        // Update form based on tab
        const form = document.getElementById('loginForm');
        if (tab === 'admin') {
            form.innerHTML = `
                <div class="form-group">
                    <label for="username">Admin Username</label>
                    <input type="text" id="username" name="username" required>
                </div>
                
                <div class="form-group">
                    <label for="password">Admin Password</label>
                    <input type="password" id="password" name="password" required>
                </div>

                <div class="form-group">
                    <label for="adminCode">Admin Code</label>
                    <input type="text" id="adminCode" name="adminCode" placeholder="Enter admin verification code" required>
                </div>

                <div class="form-group">
                    <label class="checkbox-label">
                        <input type="checkbox" id="remember">
                        <span class="checkmark"></span>
                        Remember me
                    </label>
                </div>

                <button type="submit" class="login-btn">
                    <i class="fas fa-sign-in-alt"></i>
                    Admin Login
                </button>
            `;
        } else {
            form.innerHTML = `
                <div class="form-group">
                    <label for="username">Username</label>
                    <input type="text" id="username" name="username" required>
                </div>
                
                <div class="form-group">
                    <label for="password">Password</label>
                    <input type="password" id="password" name="password" required>
                </div>

                <div class="form-group">
                    <label class="checkbox-label">
                        <input type="checkbox" id="remember">
                        <span class="checkmark"></span>
                        Remember me
                    </label>
                </div>

                <button type="submit" class="login-btn">
                    <i class="fas fa-sign-in-alt"></i>
                    Login
                </button>
            `;
        }

        // Re-attach event listener
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });
    }

    handleLogin() {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const adminCode = document.getElementById('adminCode')?.value;
        const remember = document.getElementById('remember').checked;

        // Simple validation
        if (!username || !password) {
            this.showMessage('Please fill in all required fields', 'error');
            return;
        }

        // Check if it's admin login
        const isAdminLogin = document.querySelector('.tab-btn.active').dataset.tab === 'admin';
        
        if (isAdminLogin && !adminCode) {
            this.showMessage('Please enter admin verification code', 'error');
            return;
        }

        // Simulate authentication
        this.authenticateUser(username, password, adminCode, isAdminLogin, remember);
    }

    authenticateUser(username, password, adminCode, isAdminLogin, remember) {
        // Show loading state
        const submitBtn = document.querySelector('.login-btn');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Authenticating...';
        submitBtn.disabled = true;

        // Simulate API call
        setTimeout(() => {
            // Demo admin credentials only
            const demoAdmin = {
                'admin': { password: 'admin123', isAdmin: true, adminCode: 'ADMIN2024' }
            };

            // Get registered users from localStorage
            const registeredUsers = JSON.parse(localStorage.getItem('registeredUsers') || '{}');

            // Check demo admin first
            if (demoAdmin[username.toLowerCase()]) {
                const user = demoAdmin[username.toLowerCase()];
                if (user.password === password) {
                    if (isAdminLogin) {
                        if (user.isAdmin && adminCode === user.adminCode) {
                            this.loginSuccess(username, true, remember);
                        } else {
                            this.showMessage('Invalid admin verification code', 'error');
                        }
                    } else {
                        this.showMessage('Admin must use admin login tab', 'error');
                    }
                } else {
                    this.showMessage('Invalid admin password', 'error');
                }
            }
            // Check registered users
            else if (registeredUsers[username.toLowerCase()]) {
                const user = registeredUsers[username.toLowerCase()];
                if (user.password === password) {
                    if (isAdminLogin) {
                        this.showMessage('Regular users cannot use admin login', 'error');
                    } else {
                        this.loginSuccess(username, false, remember);
                    }
                } else {
                    this.showMessage('Invalid password', 'error');
                }
            } else {
                this.showMessage('User not found. Please register first.', 'error');
            }

            // Reset button
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }, 1500);
    }

    loginSuccess(username, isAdmin, remember) {
        this.currentUser = username;
        this.isAdmin = isAdmin;

        // Store in localStorage if remember is checked
        if (remember) {
            localStorage.setItem('roadMonitorUser', JSON.stringify({
                username: username,
                isAdmin: isAdmin,
                timestamp: Date.now()
            }));
        }

        // Store in sessionStorage always
        sessionStorage.setItem('roadMonitorUser', JSON.stringify({
            username: username,
            isAdmin: isAdmin,
            timestamp: Date.now()
        }));

        this.showMessage('Login successful! Redirecting...', 'success');

        // Redirect to dashboard
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1000);
    }


    loadUserData() {
        // Check sessionStorage first
        const sessionUser = sessionStorage.getItem('roadMonitorUser');
        if (sessionUser) {
            const userData = JSON.parse(sessionUser);
            // Check if session is still valid (24 hours)
            if (Date.now() - userData.timestamp < 24 * 60 * 60 * 1000) {
                this.currentUser = userData.username;
                this.isAdmin = userData.isAdmin;
                return;
            } else {
                sessionStorage.removeItem('roadMonitorUser');
            }
        }

        // Check localStorage
        const localUser = localStorage.getItem('roadMonitorUser');
        if (localUser) {
            const userData = JSON.parse(localUser);
            // Check if remember me is still valid (7 days)
            if (Date.now() - userData.timestamp < 7 * 24 * 60 * 60 * 1000) {
                this.currentUser = userData.username;
                this.isAdmin = userData.isAdmin;
                return;
            } else {
                localStorage.removeItem('roadMonitorUser');
            }
        }
    }

    checkAuthStatus() {
        // Check sessionStorage first
        const sessionUser = sessionStorage.getItem('roadMonitorUser');
        if (sessionUser) {
            const userData = JSON.parse(sessionUser);
            // Check if session is still valid (24 hours)
            if (Date.now() - userData.timestamp < 24 * 60 * 60 * 1000) {
                this.currentUser = userData.username;
                this.isAdmin = userData.isAdmin;
                // Redirect to dashboard if already logged in and on login page
                if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
                    window.location.href = 'dashboard.html';
                }
                return;
            } else {
                sessionStorage.removeItem('roadMonitorUser');
            }
        }

        // Check localStorage
        const localUser = localStorage.getItem('roadMonitorUser');
        if (localUser) {
            const userData = JSON.parse(localUser);
            // Check if remember me is still valid (7 days)
            if (Date.now() - userData.timestamp < 7 * 24 * 60 * 60 * 1000) {
                this.currentUser = userData.username;
                this.isAdmin = userData.isAdmin;
                // Redirect to dashboard if already logged in and on login page
                if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
                    window.location.href = 'dashboard.html';
                }
                return;
            } else {
                localStorage.removeItem('roadMonitorUser');
            }
        }
    }

    isAuthenticated() {
        return this.currentUser !== null;
    }


    logout() {
        this.currentUser = null;
        this.isAdmin = false;
        sessionStorage.removeItem('roadMonitorUser');
        localStorage.removeItem('roadMonitorUser');
        window.location.href = 'index.html';
    }

    showMessage(message, type) {
        // Remove existing messages
        const existingMessage = document.querySelector('.auth-message');
        if (existingMessage) {
            existingMessage.remove();
        }

        // Create new message
        const messageDiv = document.createElement('div');
        messageDiv.className = `auth-message ${type}`;
        messageDiv.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-triangle'}"></i>
            <span>${message}</span>
        `;

        // Add styles
        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 10000;
            display: flex;
            align-items: center;
            gap: 10px;
            animation: slideIn 0.3s ease;
            ${type === 'success' ? 'background: #28a745;' : 'background: #dc3545;'}
        `;

        document.body.appendChild(messageDiv);

        // Remove after 5 seconds
        setTimeout(() => {
            messageDiv.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (messageDiv.parentNode) {
                    messageDiv.parentNode.removeChild(messageDiv);
                }
            }, 300);
        }, 5000);
    }

    showRegisterForm() {
        this.showRegistrationModal();
    }

    showRegistrationModal() {
        const modal = document.createElement('div');
        modal.className = 'registration-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Create New Account</h3>
                    <span class="close">&times;</span>
                </div>
                <div class="modal-body">
                    <form id="registrationForm" class="registration-form">
                        <div class="form-group">
                            <label for="regUsername">Username *</label>
                            <input type="text" id="regUsername" name="username" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="regEmail">Email *</label>
                            <input type="email" id="regEmail" name="email" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="regPassword">Password *</label>
                            <input type="password" id="regPassword" name="password" required minlength="6">
                        </div>
                        
                        <div class="form-group">
                            <label for="regConfirmPassword">Confirm Password *</label>
                            <input type="password" id="regConfirmPassword" name="confirmPassword" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="regFullName">Full Name *</label>
                            <input type="text" id="regFullName" name="fullName" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="regPhone">Phone Number</label>
                            <input type="tel" id="regPhone" name="phone">
                        </div>
                        
                        <div class="form-group">
                            <label class="checkbox-label">
                                <input type="checkbox" id="regTerms" required>
                                <span class="checkmark"></span>
                                I agree to the <a href="#" class="terms-link">Terms of Service</a> and <a href="#" class="privacy-link">Privacy Policy</a>
                            </label>
                        </div>
                        
                        <div class="form-actions">
                            <button type="button" class="btn-secondary" id="cancelRegistration">Cancel</button>
                            <button type="submit" class="btn-primary">Create Account</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        // Add styles
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            animation: fadeIn 0.3s ease;
        `;

        document.body.appendChild(modal);

        // Setup event listeners
        const closeBtn = modal.querySelector('.close');
        const cancelBtn = modal.querySelector('#cancelRegistration');
        const form = modal.querySelector('#registrationForm');

        closeBtn.addEventListener('click', () => {
            modal.remove();
        });

        cancelBtn.addEventListener('click', () => {
            modal.remove();
        });

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleRegistration(form);
        });

        // Close on outside click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    handleRegistration(form) {
        const formData = new FormData(form);
        const userData = {
            username: formData.get('username').toLowerCase(),
            email: formData.get('email'),
            password: formData.get('password'),
            confirmPassword: formData.get('confirmPassword'),
            fullName: formData.get('fullName'),
            phone: formData.get('phone'),
            isAdmin: false,
            registeredAt: new Date().toISOString()
        };

        // Validation
        if (userData.password !== userData.confirmPassword) {
            this.showMessage('Passwords do not match', 'error');
            return;
        }

        if (userData.password.length < 6) {
            this.showMessage('Password must be at least 6 characters long', 'error');
            return;
        }

        // Check if username already exists
        const registeredUsers = JSON.parse(localStorage.getItem('registeredUsers') || '{}');
        if (registeredUsers[userData.username]) {
            this.showMessage('Username already exists. Please choose a different username.', 'error');
            return;
        }

        // Check if email already exists
        const existingEmails = Object.values(registeredUsers).map(user => user.email);
        if (existingEmails.includes(userData.email)) {
            this.showMessage('Email already registered. Please use a different email.', 'error');
            return;
        }

        // Register user
        registeredUsers[userData.username] = {
            email: userData.email,
            password: userData.password,
            fullName: userData.fullName,
            phone: userData.phone,
            isAdmin: false,
            registeredAt: userData.registeredAt
        };

        localStorage.setItem('registeredUsers', JSON.stringify(registeredUsers));

        this.showMessage('Account created successfully! You can now login.', 'success');
        
        // Close modal
        document.querySelector('.registration-modal').remove();
    }

    showForgotPassword() {
        this.showMessage('Password reset feature coming soon! Please contact administrator for assistance.', 'info');
    }

    getCurrentUser() {
        return this.currentUser;
    }

    isUserAdmin() {
        return this.isAdmin;
    }
}

// Initialize authentication system
const auth = new AuthSystem();

// Add CSS animations and modal styles
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }

    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }

    .registration-modal .modal-content {
        background: white;
        border-radius: 12px;
        max-width: 500px;
        width: 90%;
        max-height: 90vh;
        overflow-y: auto;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        animation: modalSlideIn 0.3s ease;
    }

    .registration-modal .modal-header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 20px;
        border-radius: 12px 12px 0 0;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .registration-modal .modal-header h3 {
        margin: 0;
        font-size: 18px;
    }

    .registration-modal .close {
        background: none;
        border: none;
        color: white;
        font-size: 24px;
        cursor: pointer;
    }

    .registration-modal .modal-body {
        padding: 30px;
    }

    .registration-form {
        display: flex;
        flex-direction: column;
        gap: 20px;
    }

    .registration-form .form-group {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .registration-form .form-group label {
        font-size: 14px;
        font-weight: 500;
        color: #333;
    }

    .registration-form .form-group input {
        padding: 12px 16px;
        border: 1px solid #ddd;
        border-radius: 8px;
        font-size: 14px;
        transition: border-color 0.3s ease;
    }

    .registration-form .form-group input:focus {
        outline: none;
        border-color: #667eea;
        box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    .registration-form .checkbox-label {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        cursor: pointer;
        font-size: 14px;
        color: #666;
        line-height: 1.4;
    }

    .registration-form .checkbox-label input[type="checkbox"] {
        width: 16px;
        height: 16px;
        accent-color: #667eea;
        margin-top: 2px;
    }

    .registration-form .terms-link,
    .registration-form .privacy-link {
        color: #667eea;
        text-decoration: none;
    }

    .registration-form .terms-link:hover,
    .registration-form .privacy-link:hover {
        text-decoration: underline;
    }

    .registration-form .form-actions {
        display: flex;
        gap: 15px;
        justify-content: flex-end;
        margin-top: 20px;
    }

    .registration-form .btn-primary,
    .registration-form .btn-secondary {
        padding: 12px 24px;
        border: none;
        border-radius: 8px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
    }

    .registration-form .btn-primary {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
    }

    .registration-form .btn-primary:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
    }

    .registration-form .btn-secondary {
        background: #f8f9fa;
        color: #666;
        border: 1px solid #ddd;
    }

    .registration-form .btn-secondary:hover {
        background: #e9ecef;
        border-color: #adb5bd;
    }

    @keyframes modalSlideIn {
        from {
            opacity: 0;
            transform: scale(0.9) translateY(-20px);
        }
        to {
            opacity: 1;
            transform: scale(1) translateY(0);
        }
    }
`;
document.head.appendChild(style);

// Export for use in other files
window.auth = auth;

