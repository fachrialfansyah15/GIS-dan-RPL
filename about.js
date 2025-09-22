// About page functionality for Road Monitor Palu

class AboutPage {
    constructor() {
        this.init();
    }

    init() {
        this.checkAuth();
        this.setupEventListeners();
        this.initializeAnimations();
    }

    checkAuth() {
        // Wait for auth to be available
        if (!window.auth) {
            setTimeout(() => this.checkAuth(), 100);
            return;
        }

        if (!window.auth.isAuthenticated()) {
            window.location.href = 'index.html';
            return;
        }

        // Update user info in header
        const userName = document.getElementById('userName');
        if (userName) {
            userName.textContent = window.auth.getCurrentUser();
        }
    }

    setupEventListeners() {
        // Logout functionality
        const logoutLink = document.getElementById('logoutLink');
        if (logoutLink) {
            logoutLink.addEventListener('click', (e) => {
                e.preventDefault();
                window.auth.logout();
            });
        }

        // Smooth scrolling for anchor links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', (e) => {
                e.preventDefault();
                const target = document.querySelector(anchor.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });

        // Contact form interactions
        this.setupContactInteractions();

        // Social media links
        this.setupSocialLinks();

        // Download press kit
        const pressKitBtn = document.querySelector('.btn-primary');
        if (pressKitBtn && pressKitBtn.textContent.includes('Download Press Kit')) {
            pressKitBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.downloadPressKit();
            });
        }
    }

    setupContactInteractions() {
        // Email links
        document.querySelectorAll('a[href^="mailto:"]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const email = link.getAttribute('href').replace('mailto:', '');
                this.showContactModal('email', email);
            });
        });

        // Phone links
        document.querySelectorAll('a[href^="tel:"]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const phone = link.getAttribute('href').replace('tel:', '');
                this.showContactModal('phone', phone);
            });
        });
    }

    setupSocialLinks() {
        // Social media links with tracking
        document.querySelectorAll('.social-link').forEach(link => {
            link.addEventListener('click', (e) => {
                const platform = link.textContent.trim();
                this.trackSocialClick(platform);
            });
        });

        // Member social links
        document.querySelectorAll('.member-social a').forEach(link => {
            link.addEventListener('click', (e) => {
                const platform = link.querySelector('i').className;
                this.trackSocialClick(platform);
            });
        });
    }

    initializeAnimations() {
        // Intersection Observer for scroll animations
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-in');
                }
            });
        }, observerOptions);

        // Observe elements for animation
        document.querySelectorAll('.mission-card, .feature-item, .tech-item, .team-member, .contact-card, .media-card').forEach(el => {
            observer.observe(el);
        });

        // Counter animation for statistics
        this.animateCounters();
    }

    animateCounters() {
        const counters = document.querySelectorAll('.stat-value');
        const counterObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.animateCounter(entry.target);
                    counterObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });

        counters.forEach(counter => {
            counterObserver.observe(counter);
        });
    }

    animateCounter(element) {
        const target = parseInt(element.textContent);
        const duration = 2000; // 2 seconds
        const increment = target / (duration / 16); // 60fps
        let current = 0;

        const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
                current = target;
                clearInterval(timer);
            }
            element.textContent = Math.floor(current);
        }, 16);
    }

    showContactModal(type, value) {
        const modal = document.createElement('div');
        modal.className = 'contact-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Contact Information</h3>
                    <span class="close">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="contact-info">
                        <div class="contact-icon">
                            <i class="fas fa-${type === 'email' ? 'envelope' : 'phone'}"></i>
                        </div>
                        <div class="contact-details">
                            <h4>${type === 'email' ? 'Email Address' : 'Phone Number'}</h4>
                            <p class="contact-value">${value}</p>
                            <div class="contact-actions">
                                <button class="btn-primary copy-btn" data-value="${value}">
                                    <i class="fas fa-copy"></i>
                                    Copy
                                </button>
                                ${type === 'email' ? 
                                    `<a href="mailto:${value}" class="btn-secondary">
                                        <i class="fas fa-envelope"></i>
                                        Send Email
                                    </a>` : 
                                    `<a href="tel:${value}" class="btn-secondary">
                                        <i class="fas fa-phone"></i>
                                        Call Now
                                    </a>`
                                }
                            </div>
                        </div>
                    </div>
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

        // Close modal functionality
        const closeBtn = modal.querySelector('.close');
        const copyBtn = modal.querySelector('.copy-btn');

        closeBtn.addEventListener('click', () => {
            modal.remove();
        });

        copyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(value).then(() => {
                copyBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
                copyBtn.style.background = '#28a745';
                setTimeout(() => {
                    copyBtn.innerHTML = '<i class="fas fa-copy"></i> Copy';
                    copyBtn.style.background = '';
                }, 2000);
            });
        });

        // Close on outside click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    trackSocialClick(platform) {
        // Track social media clicks (in a real app, this would send to analytics)
        console.log(`Social media click tracked: ${platform}`);
        
        // Show a subtle notification
        this.showNotification(`Opening ${platform}...`);
    }

    downloadPressKit() {
        // Create a mock press kit
        const pressKit = {
            project: 'Road Monitor Palu',
            version: '1.0.0',
            description: 'Web GIS Road Monitoring System for Palu City, Central Sulawesi',
            features: [
                'Interactive GIS Map',
                'Damage Reporting System',
                'Real-time Monitoring',
                'Mobile Responsive Design'
            ],
            technology: [
                'HTML5',
                'CSS3',
                'JavaScript ES6+',
                'Leaflet.js',
                'OpenStreetMap'
            ],
            team: [
                'John Doe - Lead Developer',
                'Jane Smith - GIS Specialist',
                'Mike Johnson - UI/UX Designer'
            ],
            contact: {
                email: 'info@roadmonitorpalu.com',
                phone: '+62 451 123 4567',
                address: 'Jl. Sudirman No. 123, Palu, Central Sulawesi 94111'
            },
            downloadDate: new Date().toISOString()
        };

        // Create and download JSON file
        const dataStr = JSON.stringify(pressKit, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = 'road-monitor-palu-press-kit.json';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        this.showNotification('Press kit downloaded successfully!');
    }

    showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'about-notification';
        notification.innerHTML = `
            <i class="fas fa-info-circle"></i>
            <span>${message}</span>
        `;

        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            background: #17a2b8;
            color: white;
            border-radius: 8px;
            font-weight: 500;
            z-index: 10000;
            display: flex;
            align-items: center;
            gap: 10px;
            animation: slideIn 0.3s ease;
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
}

// Initialize about page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AboutPage();
});

// Add animation styles
const animationStyles = document.createElement('style');
animationStyles.textContent = `
    .mission-card, .feature-item, .tech-item, .team-member, .contact-card, .media-card {
        opacity: 0;
        transform: translateY(30px);
        transition: all 0.6s ease;
    }

    .mission-card.animate-in, .feature-item.animate-in, .tech-item.animate-in, 
    .team-member.animate-in, .contact-card.animate-in, .media-card.animate-in {
        opacity: 1;
        transform: translateY(0);
    }

    .contact-modal .modal-content {
        background: white;
        border-radius: 12px;
        max-width: 500px;
        width: 90%;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        animation: modalSlideIn 0.3s ease;
    }

    .contact-modal .modal-header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 20px;
        border-radius: 12px 12px 0 0;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .contact-modal .modal-header h3 {
        margin: 0;
        font-size: 18px;
    }

    .contact-modal .close {
        background: none;
        border: none;
        color: white;
        font-size: 24px;
        cursor: pointer;
    }

    .contact-modal .modal-body {
        padding: 30px;
    }

    .contact-info {
        display: flex;
        align-items: center;
        gap: 20px;
    }

    .contact-icon {
        width: 60px;
        height: 60px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 24px;
    }

    .contact-details h4 {
        margin: 0 0 10px 0;
        color: #333;
        font-size: 18px;
    }

    .contact-value {
        font-size: 16px;
        color: #667eea;
        font-weight: 600;
        margin: 0 0 20px 0;
        word-break: break-all;
    }

    .contact-actions {
        display: flex;
        gap: 10px;
    }

    .contact-actions .btn-primary,
    .contact-actions .btn-secondary {
        padding: 8px 16px;
        border: none;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        text-decoration: none;
        display: flex;
        align-items: center;
        gap: 5px;
        transition: all 0.3s ease;
    }

    .contact-actions .btn-primary {
        background: #667eea;
        color: white;
    }

    .contact-actions .btn-secondary {
        background: #f8f9fa;
        color: #666;
        border: 1px solid #ddd;
    }

    .contact-actions .btn-primary:hover,
    .contact-actions .btn-secondary:hover {
        transform: translateY(-2px);
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

    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }

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
`;
document.head.appendChild(animationStyles);

