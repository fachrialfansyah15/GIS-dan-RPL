// Reports functionality for Road Monitor Palu

class ReportsPage {
    constructor() {
        this.init();
    }

    init() {
        this.checkAuth();
        this.setupEventListeners();
        this.loadReports();
        this.setupMobileNav();
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

        // Filter functionality
        const statusFilter = document.getElementById('statusFilter');
        const priorityFilter = document.getElementById('priorityFilter');

        if (statusFilter) {
            statusFilter.addEventListener('change', () => {
                this.filterReports();
            });
        }

        if (priorityFilter) {
            priorityFilter.addEventListener('change', () => {
                this.filterReports();
            });
        }
    }

    loadReports() {
        const reportsList = document.getElementById('reportsList');
        if (!reportsList) return;

        // Get reports from localStorage
        const reports = JSON.parse(localStorage.getItem('roadDamageReports') || '[]');
        
        if (reports.length === 0) {
            reportsList.innerHTML = `
                <div class="no-reports">
                    <i class="fas fa-clipboard-list"></i>
                    <h3>No Reports Found</h3>
                    <p>No road damage reports have been submitted yet.</p>
                </div>
            `;
            return;
        }

        // Sort reports by date (newest first)
        reports.sort((a, b) => new Date(b.date) - new Date(a.date));

        reportsList.innerHTML = reports.map(report => `
            <div class="report-card" data-status="${report.status}" data-priority="${report.priority}">
                <div class="report-header">
                    <div class="report-id">${report.id}</div>
                    <div class="report-status ${report.status}">${report.status.replace('_', ' ')}</div>
                </div>
                <div class="report-content">
                    <h3>${report.damageType.charAt(0).toUpperCase() + report.damageType.slice(1)}</h3>
                    <p class="report-location">
                        <i class="fas fa-map-marker-alt"></i>
                        ${report.location}
                    </p>
                    <p class="report-description">${report.description}</p>
                    <div class="report-meta">
                        <span class="report-priority ${report.priority}">
                            <i class="fas fa-flag"></i>
                            ${report.priority} Priority
                        </span>
                        <span class="report-date">
                            <i class="fas fa-clock"></i>
                            ${new Date(report.date).toLocaleDateString()}
                        </span>
                    </div>
                </div>
                <div class="report-actions">
                    <button class="btn-secondary" onclick="this.viewReport('${report.id}')">
                        <i class="fas fa-eye"></i>
                        View Details
                    </button>
                    ${window.auth.isUserAdmin() ? `
                        <button class="btn-primary" onclick="this.updateStatus('${report.id}')">
                            <i class="fas fa-edit"></i>
                            Update Status
                        </button>
                    ` : ''}
                </div>
            </div>
        `).join('');
    }

    filterReports() {
        const statusFilter = document.getElementById('statusFilter').value;
        const priorityFilter = document.getElementById('priorityFilter').value;
        const reportCards = document.querySelectorAll('.report-card');

        reportCards.forEach(card => {
            const status = card.dataset.status;
            const priority = card.dataset.priority;

            const statusMatch = statusFilter === 'all' || status === statusFilter;
            const priorityMatch = priorityFilter === 'all' || priority === priorityFilter;

            if (statusMatch && priorityMatch) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
    }

    viewReport(reportId) {
        const reports = JSON.parse(localStorage.getItem('roadDamageReports') || '[]');
        const report = reports.find(r => r.id === reportId);
        
        if (report) {
            alert(`Report Details:\n\nID: ${report.id}\nType: ${report.damageType}\nLocation: ${report.location}\nPriority: ${report.priority}\nStatus: ${report.status}\nDescription: ${report.description}\nReporter: ${report.reporter}\nDate: ${new Date(report.date).toLocaleString()}`);
        }
    }

    updateStatus(reportId) {
        const reports = JSON.parse(localStorage.getItem('roadDamageReports') || '[]');
        const reportIndex = reports.findIndex(r => r.id === reportId);
        
        if (reportIndex !== -1) {
            const newStatus = prompt('Update status (reported/in_progress/completed):', reports[reportIndex].status);
            if (newStatus && ['reported', 'in_progress', 'completed'].includes(newStatus)) {
                reports[reportIndex].status = newStatus;
                localStorage.setItem('roadDamageReports', JSON.stringify(reports));
                this.loadReports();
                this.showMessage('Report status updated successfully!', 'success');
            }
        }
    }

    showMessage(message, type) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `reports-message ${type}`;
        messageDiv.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;

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
            ${type === 'success' ? 'background: #28a745;' : 'background: #17a2b8;'}
        `;

        document.body.appendChild(messageDiv);

        setTimeout(() => {
            messageDiv.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (messageDiv.parentNode) {
                    messageDiv.parentNode.removeChild(messageDiv);
                }
            }, 300);
        }, 3000);
    }

    setupMobileNav() {
        const quickToggle = document.getElementById('quickActionsToggle');
        const quickMenu = document.getElementById('quickActionsMenu');
        const backdrop = document.getElementById('quickActionsBackdrop');
        if (quickToggle && quickMenu && backdrop) {
            const openMenu = () => {
                quickMenu.classList.add('open');
                backdrop.classList.add('show');
                quickToggle.setAttribute('aria-expanded', 'true');
            };
            const closeMenu = () => {
                quickMenu.classList.remove('open');
                backdrop.classList.remove('show');
                quickToggle.setAttribute('aria-expanded', 'false');
            };
            const toggleMenu = (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (quickMenu.classList.contains('open')) {
                    closeMenu();
                } else {
                    openMenu();
                }
            };
            quickToggle.addEventListener('pointerdown', toggleMenu);
            quickToggle.addEventListener('click', toggleMenu);
            quickMenu.addEventListener('click', (e) => e.stopPropagation());
            backdrop.addEventListener('click', closeMenu);
            document.addEventListener('click', (e) => {
                if (quickMenu.classList.contains('open') && !quickMenu.contains(e.target) && !quickToggle.contains(e.target)) {
                    closeMenu();
                }
            });
            quickMenu.querySelectorAll('.quick-action-item').forEach(link => {
                link.addEventListener('click', closeMenu);
            });
        }
    }
}

// Initialize reports page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ReportsPage();
});

// Add reports page styles
const reportsStyles = document.createElement('style');
reportsStyles.textContent = `
    .reports-container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 20px;
    }

    .reports-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 30px;
        padding-bottom: 20px;
        border-bottom: 2px solid #f0f0f0;
    }

    .reports-header h2 {
        color: #333;
        font-size: 28px;
        font-weight: 600;
        margin: 0;
    }

    .reports-filters {
        display: flex;
        gap: 15px;
    }

    .reports-filters select {
        padding: 8px 12px;
        border: 1px solid #ddd;
        border-radius: 6px;
        background: white;
        font-size: 14px;
        color: #333;
        cursor: pointer;
    }

    .reports-filters select:focus {
        outline: none;
        border-color: #667eea;
        box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
    }

    .reports-list {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
        gap: 20px;
    }

    .report-card {
        background: white;
        border-radius: 12px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        overflow: hidden;
        transition: transform 0.3s ease;
    }

    .report-card:hover {
        transform: translateY(-5px);
    }

    .report-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 15px 20px;
        background: #f8f9fa;
        border-bottom: 1px solid #e0e0e0;
    }

    .report-id {
        font-weight: 600;
        color: #667eea;
        font-size: 14px;
    }

    .report-status {
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 500;
        text-transform: uppercase;
    }

    .report-status.reported {
        background: #fff3cd;
        color: #856404;
    }

    .report-status.in_progress {
        background: #d1ecf1;
        color: #0c5460;
    }

    .report-status.completed {
        background: #d4edda;
        color: #155724;
    }

    .report-content {
        padding: 20px;
    }

    .report-content h3 {
        margin: 0 0 10px 0;
        color: #333;
        font-size: 18px;
        font-weight: 600;
    }

    .report-location {
        margin: 0 0 10px 0;
        color: #666;
        font-size: 14px;
        display: flex;
        align-items: center;
        gap: 5px;
    }

    .report-location i {
        color: #667eea;
    }

    .report-description {
        margin: 0 0 15px 0;
        color: #555;
        line-height: 1.5;
    }

    .report-meta {
        display: flex;
        gap: 15px;
        margin-bottom: 15px;
    }

    .report-priority {
        display: flex;
        align-items: center;
        gap: 5px;
        font-size: 12px;
        font-weight: 500;
    }

    .report-priority.high {
        color: #dc3545;
    }

    .report-priority.medium {
        color: #ffc107;
    }

    .report-priority.low {
        color: #28a745;
    }

    .report-date {
        display: flex;
        align-items: center;
        gap: 5px;
        font-size: 12px;
        color: #666;
    }

    .report-actions {
        padding: 15px 20px;
        background: #f8f9fa;
        border-top: 1px solid #e0e0e0;
        display: flex;
        gap: 10px;
    }

    .report-actions button {
        padding: 8px 16px;
        border: none;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        gap: 5px;
    }

    .report-actions .btn-primary {
        background: #667eea;
        color: white;
    }

    .report-actions .btn-primary:hover {
        background: #5a6fd8;
    }

    .report-actions .btn-secondary {
        background: #f8f9fa;
        color: #666;
        border: 1px solid #ddd;
    }

    .report-actions .btn-secondary:hover {
        background: #e9ecef;
    }

    .no-reports {
        text-align: center;
        padding: 60px 20px;
        color: #666;
    }

    .no-reports i {
        font-size: 64px;
        color: #ddd;
        margin-bottom: 20px;
    }

    .no-reports h3 {
        margin: 0 0 10px 0;
        color: #333;
        font-size: 24px;
    }

    .no-reports p {
        margin: 0 0 15px 0;
        font-size: 16px;
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
document.head.appendChild(reportsStyles);


