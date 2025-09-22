// Admin Report Validation functionality for Road Monitor Palu

class AdminValidation {
    constructor() {
        this.map = null;
        this.pendingReports = [];
        this.selectedReport = null;
        this.init();
    }

    init() {
        this.checkAuth();
        this.initializeMap();
        this.setupEventListeners();
        this.loadPendingReports();
    }

    checkAuth() {
        // Wait for auth to be available
        if (!window.auth) {
            setTimeout(() => this.checkAuth(), 100);
            return;
        }

        if (!window.auth.isAuthenticated() || !window.auth.isUserAdmin()) {
            window.location.href = 'index.html';
            return;
        }

        // Update user info in header
        const userName = document.getElementById('userName');
        if (userName) {
            userName.textContent = window.auth.getCurrentUser();
        }
    }

    initializeMap() {
        // Initialize map for validation
        this.map = L.map('validationMap', {
            center: [-0.8966, 119.8756], // Palu City coordinates
            zoom: 13,
            zoomControl: false
        });

        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(this.map);
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

        // Validation modal
        const modal = document.getElementById('validationModal');
        const closeBtn = modal.querySelector('.close');
        const approveBtn = document.getElementById('approveReport');
        const rejectBtn = document.getElementById('rejectReport');

        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });

        approveBtn.addEventListener('click', () => {
            this.validateReport('approved');
        });

        rejectBtn.addEventListener('click', () => {
            this.validateReport('rejected');
        });

        // Close modal when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    }

    loadPendingReports() {
        // Get all reports from localStorage
        const allReports = JSON.parse(localStorage.getItem('roadDamageReports') || '[]');
        
        // Filter pending reports (status: 'pending' or 'reported')
        this.pendingReports = allReports.filter(report => 
            report.status === 'pending' || report.status === 'reported'
        );

        this.updateStats();
        this.displayPendingReports();
    }

    updateStats() {
        const allReports = JSON.parse(localStorage.getItem('roadDamageReports') || '[]');
        
        const pendingCount = allReports.filter(r => r.status === 'pending' || r.status === 'reported').length;
        const approvedCount = allReports.filter(r => r.status === 'approved' || r.status === 'in_progress' || r.status === 'completed').length;
        const rejectedCount = allReports.filter(r => r.status === 'rejected').length;

        document.getElementById('pendingCount').textContent = pendingCount;
        document.getElementById('approvedCount').textContent = approvedCount;
        document.getElementById('rejectedCount').textContent = rejectedCount;
    }

    displayPendingReports() {
        const reportsList = document.getElementById('pendingReportsList');
        
        if (this.pendingReports.length === 0) {
            reportsList.innerHTML = `
                <div class="no-reports">
                    <i class="fas fa-check-circle"></i>
                    <h3>No Pending Reports</h3>
                    <p>All reports have been validated!</p>
                </div>
            `;
            return;
        }

        reportsList.innerHTML = this.pendingReports.map(report => `
            <div class="report-card pending" data-report-id="${report.id}">
                <div class="report-header">
                    <div class="report-id">${report.id}</div>
                    <div class="report-priority ${report.priority}">${report.priority}</div>
                </div>
                <div class="report-content">
                    <h4>${report.damageType.charAt(0).toUpperCase() + report.damageType.slice(1)}</h4>
                    <p class="report-location">
                        <i class="fas fa-map-marker-alt"></i>
                        ${report.location}
                    </p>
                    <p class="report-description">${report.description}</p>
                    <div class="report-meta">
                        <span class="report-date">
                            <i class="fas fa-clock"></i>
                            ${new Date(report.date).toLocaleDateString()}
                        </span>
                        <span class="report-reporter">
                            <i class="fas fa-user"></i>
                            ${report.reporter}
                        </span>
                    </div>
                </div>
                <div class="report-actions">
                    <button class="btn-secondary" onclick="adminValidation.viewReportOnMap('${report.id}')">
                        <i class="fas fa-map-marker-alt"></i>
                        View on Map
                    </button>
                    <button class="btn-primary" onclick="adminValidation.openValidationModal('${report.id}')">
                        <i class="fas fa-gavel"></i>
                        Validate
                    </button>
                </div>
            </div>
        `).join('');
    }

    viewReportOnMap(reportId) {
        const report = this.pendingReports.find(r => r.id === reportId);
        if (report && report.coordinates) {
            // Clear existing markers
            this.map.eachLayer(layer => {
                if (layer instanceof L.Marker) {
                    this.map.removeLayer(layer);
                }
            });

            // Add report marker
            const marker = L.marker(report.coordinates, {
                icon: L.divIcon({
                    className: 'validation-marker',
                    html: `<i class="fas fa-exclamation-triangle" style="color: #dc3545; font-size: 20px;"></i>`,
                    iconSize: [20, 20],
                    iconAnchor: [10, 10]
                })
            }).addTo(this.map);

            marker.bindPopup(`
                <div class="validation-popup">
                    <h4>${report.damageType.charAt(0).toUpperCase() + report.damageType.slice(1)}</h4>
                    <p><strong>Location:</strong> ${report.location}</p>
                    <p><strong>Priority:</strong> ${report.priority}</p>
                    <p><strong>Reporter:</strong> ${report.reporter}</p>
                    <p><strong>Date:</strong> ${new Date(report.date).toLocaleDateString()}</p>
                </div>
            `).openPopup();

            // Center map on report
            this.map.setView(report.coordinates, 15);
        }
    }

    openValidationModal(reportId) {
        const report = this.pendingReports.find(r => r.id === reportId);
        if (!report) return;

        this.selectedReport = report;
        
        const modal = document.getElementById('validationModal');
        const detailsContainer = document.getElementById('validationReportDetails');
        
        detailsContainer.innerHTML = `
            <div class="validation-report-info">
                <div class="info-row">
                    <span class="label">Report ID:</span>
                    <span class="value">${report.id}</span>
                </div>
                <div class="info-row">
                    <span class="label">Damage Type:</span>
                    <span class="value">${report.damageType.charAt(0).toUpperCase() + report.damageType.slice(1)}</span>
                </div>
                <div class="info-row">
                    <span class="label">Location:</span>
                    <span class="value">${report.location}</span>
                </div>
                <div class="info-row">
                    <span class="label">Priority:</span>
                    <span class="value priority-${report.priority}">${report.priority.toUpperCase()}</span>
                </div>
                <div class="info-row">
                    <span class="label">Reporter:</span>
                    <span class="value">${report.reporter}</span>
                </div>
                <div class="info-row">
                    <span class="label">Date:</span>
                    <span class="value">${new Date(report.date).toLocaleString()}</span>
                </div>
                <div class="info-row">
                    <span class="label">Description:</span>
                    <span class="value">${report.description}</span>
                </div>
                ${report.reporterEmail ? `
                <div class="info-row">
                    <span class="label">Email:</span>
                    <span class="value">${report.reporterEmail}</span>
                </div>
                ` : ''}
                ${report.reporterPhone ? `
                <div class="info-row">
                    <span class="label">Phone:</span>
                    <span class="value">${report.reporterPhone}</span>
                </div>
                ` : ''}
            </div>
        `;

        modal.style.display = 'block';
    }

    validateReport(decision) {
        if (!this.selectedReport) return;

        const allReports = JSON.parse(localStorage.getItem('roadDamageReports') || '[]');
        const reportIndex = allReports.findIndex(r => r.id === this.selectedReport.id);
        
        if (reportIndex !== -1) {
            if (decision === 'approved') {
                allReports[reportIndex].status = 'approved';
                allReports[reportIndex].validatedBy = window.auth.getCurrentUser();
                allReports[reportIndex].validatedAt = new Date().toISOString();
                this.showMessage('Report approved successfully!', 'success');
            } else {
                allReports[reportIndex].status = 'rejected';
                allReports[reportIndex].rejectedBy = window.auth.getCurrentUser();
                allReports[reportIndex].rejectedAt = new Date().toISOString();
                this.showMessage('Report rejected.', 'info');
            }

            localStorage.setItem('roadDamageReports', JSON.stringify(allReports));
            
            // Close modal
            document.getElementById('validationModal').style.display = 'none';
            
            // Reload pending reports
            this.loadPendingReports();
        }
    }

    showMessage(message, type) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `validation-message ${type}`;
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
}

// Initialize admin validation when DOM is loaded
let adminValidation;
document.addEventListener('DOMContentLoaded', () => {
    adminValidation = new AdminValidation();
});

// Add admin validation styles
const adminValidationStyles = document.createElement('style');
adminValidationStyles.textContent = `
    .admin-validation-container {
        max-width: 1400px;
        margin: 0 auto;
        padding: 20px;
    }

    .validation-header {
        margin-bottom: 30px;
        padding-bottom: 20px;
        border-bottom: 2px solid #f0f0f0;
    }

    .validation-header h2 {
        color: #333;
        font-size: 28px;
        font-weight: 600;
        margin: 0 0 20px 0;
    }

    .validation-stats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 20px;
    }

    .stat-card {
        background: white;
        padding: 20px;
        border-radius: 12px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        text-align: center;
        transition: transform 0.3s ease;
    }

    .stat-card:hover {
        transform: translateY(-5px);
    }

    .stat-card i {
        font-size: 24px;
        margin-bottom: 10px;
        display: block;
    }

    .stat-card i.fa-clock {
        color: #ffc107;
    }

    .stat-card i.fa-check-circle {
        color: #28a745;
    }

    .stat-card i.fa-times-circle {
        color: #dc3545;
    }

    .stat-number {
        display: block;
        font-size: 32px;
        font-weight: 700;
        color: #333;
        margin-bottom: 5px;
    }

    .stat-label {
        color: #666;
        font-size: 14px;
        text-transform: uppercase;
        letter-spacing: 1px;
    }

    .validation-content {
        display: grid;
        grid-template-columns: 1fr 400px;
        gap: 30px;
    }

    .pending-reports h3 {
        color: #333;
        font-size: 20px;
        margin-bottom: 20px;
        padding-bottom: 10px;
        border-bottom: 1px solid #e0e0e0;
    }

    .reports-list {
        display: flex;
        flex-direction: column;
        gap: 15px;
        max-height: 600px;
        overflow-y: auto;
    }

    .report-card.pending {
        background: white;
        border-radius: 12px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        overflow: hidden;
        border-left: 4px solid #ffc107;
    }

    .report-card .report-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 15px 20px;
        background: #fff9e6;
        border-bottom: 1px solid #e0e0e0;
    }

    .report-card .report-id {
        font-weight: 600;
        color: #667eea;
        font-size: 14px;
    }

    .report-card .report-priority {
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 500;
        text-transform: uppercase;
    }

    .report-card .report-priority.high {
        background: #f8d7da;
        color: #721c24;
    }

    .report-card .report-priority.medium {
        background: #fff3cd;
        color: #856404;
    }

    .report-card .report-priority.low {
        background: #d4edda;
        color: #155724;
    }

    .report-card .report-content {
        padding: 20px;
    }

    .report-card .report-content h4 {
        margin: 0 0 10px 0;
        color: #333;
        font-size: 16px;
        font-weight: 600;
    }

    .report-card .report-location {
        margin: 0 0 10px 0;
        color: #666;
        font-size: 14px;
        display: flex;
        align-items: center;
        gap: 5px;
    }

    .report-card .report-location i {
        color: #667eea;
    }

    .report-card .report-description {
        margin: 0 0 15px 0;
        color: #555;
        line-height: 1.5;
        font-size: 14px;
    }

    .report-card .report-meta {
        display: flex;
        gap: 15px;
        margin-bottom: 15px;
    }

    .report-card .report-date,
    .report-card .report-reporter {
        display: flex;
        align-items: center;
        gap: 5px;
        font-size: 12px;
        color: #666;
    }

    .report-card .report-actions {
        padding: 15px 20px;
        background: #f8f9fa;
        border-top: 1px solid #e0e0e0;
        display: flex;
        gap: 10px;
    }

    .report-card .report-actions button {
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

    .report-card .report-actions .btn-primary {
        background: #667eea;
        color: white;
    }

    .report-card .report-actions .btn-primary:hover {
        background: #5a6fd8;
    }

    .report-card .report-actions .btn-secondary {
        background: #f8f9fa;
        color: #666;
        border: 1px solid #ddd;
    }

    .report-card .report-actions .btn-secondary:hover {
        background: #e9ecef;
    }

    .validation-map {
        background: white;
        border-radius: 12px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        overflow: hidden;
    }

    .validation-map h3 {
        color: #333;
        font-size: 18px;
        margin: 0;
        padding: 20px;
        border-bottom: 1px solid #e0e0e0;
    }

    #validationMap {
        height: 400px;
        width: 100%;
    }

    .map-instructions {
        padding: 15px 20px;
        background: #f8f9fa;
        border-top: 1px solid #e0e0e0;
    }

    .map-instructions p {
        margin: 0;
        color: #666;
        font-size: 14px;
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .map-instructions i {
        color: #667eea;
    }

    .validation-marker {
        background: none !important;
        border: none !important;
    }

    .validation-popup {
        min-width: 200px;
    }

    .validation-popup h4 {
        margin: 0 0 10px 0;
        color: #333;
        font-size: 16px;
    }

    .validation-popup p {
        margin: 5px 0;
        font-size: 14px;
        color: #666;
    }

    .validation-report-info {
        padding: 20px 0;
    }

    .info-row {
        display: flex;
        margin-bottom: 15px;
        align-items: flex-start;
    }

    .info-row .label {
        font-weight: 600;
        color: #333;
        min-width: 120px;
        margin-right: 15px;
    }

    .info-row .value {
        color: #666;
        flex: 1;
    }

    .info-row .value.priority-high {
        color: #dc3545;
        font-weight: 600;
    }

    .info-row .value.priority-medium {
        color: #ffc107;
        font-weight: 600;
    }

    .info-row .value.priority-low {
        color: #28a745;
        font-weight: 600;
    }

    .validation-actions {
        display: flex;
        gap: 15px;
        justify-content: center;
        padding: 20px 0;
        border-top: 1px solid #e0e0e0;
        margin-top: 20px;
    }

    .btn-approve,
    .btn-reject {
        padding: 12px 24px;
        border: none;
        border-radius: 8px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .btn-approve {
        background: #28a745;
        color: white;
    }

    .btn-approve:hover {
        background: #218838;
        transform: translateY(-2px);
    }

    .btn-reject {
        background: #dc3545;
        color: white;
    }

    .btn-reject:hover {
        background: #c82333;
        transform: translateY(-2px);
    }

    .no-reports {
        text-align: center;
        padding: 60px 20px;
        color: #666;
    }

    .no-reports i {
        font-size: 64px;
        color: #28a745;
        margin-bottom: 20px;
    }

    .no-reports h3 {
        margin: 0 0 10px 0;
        color: #333;
        font-size: 24px;
    }

    .no-reports p {
        margin: 0;
        font-size: 16px;
    }

    .admin-only {
        display: none !important;
    }

    @media (max-width: 768px) {
        .validation-content {
            grid-template-columns: 1fr;
        }
        
        .validation-stats {
            grid-template-columns: 1fr;
        }
    }
`;
document.head.appendChild(adminValidationStyles);

