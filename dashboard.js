// Dashboard functionality for Road Monitor Palu

class Dashboard {
    constructor() {
        this.map = null;
        this.init();
    }

    init() {
        this.checkAuth();
        this.initializeMapPreview();
        this.setupEventListeners();
        this.loadDashboardData();
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


    initializeMapPreview() {
        // Initialize small map for dashboard preview
        this.map = L.map('mapPreview', {
            center: [-0.8966, 119.8756], // Palu City coordinates
            zoom: 12,
            zoomControl: false,
            attributionControl: false
        });

        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(this.map);

        // Add sample damage reports
        this.addSampleReports();
    }

    addSampleReports() {
        const reports = [
            {
                position: [-0.8966, 119.8756],
                type: 'pothole',
                priority: 'high',
                title: 'Large Pothole on Jl. Sudirman'
            },
            {
                position: [-0.9000, 119.8800],
                type: 'crack',
                priority: 'medium',
                title: 'Road Crack on Jl. Ahmad Yani'
            },
            {
                position: [-0.8900, 119.8700],
                type: 'flooding',
                priority: 'high',
                title: 'Flooding on Jl. Gatot Subroto'
            }
        ];

        reports.forEach(report => {
            const icon = this.getReportIcon(report.type, report.priority);
            const marker = L.marker(report.position, { icon });
            
            marker.bindPopup(`
                <div class="report-popup">
                    <h4>${report.title}</h4>
                    <p><strong>Type:</strong> ${report.type}</p>
                    <p><strong>Priority:</strong> ${report.priority}</p>
                </div>
            `);

            marker.addTo(this.map);
        });
    }

    getReportIcon(type, priority) {
        const colors = {
            'high': '#dc3545',
            'medium': '#ffc107',
            'low': '#28a745'
        };

        const icons = {
            'pothole': 'fas fa-exclamation-triangle',
            'crack': 'fas fa-road',
            'flooding': 'fas fa-tint',
            'sign': 'fas fa-sign'
        };

        return L.divIcon({
            className: 'report-marker',
            html: `<i class="${icons[type] || 'fas fa-exclamation-triangle'}" style="color: ${colors[priority]}; font-size: 20px;"></i>`,
            iconSize: [20, 20],
            iconAnchor: [10, 10]
        });
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

        // Export data functionality removed

        // Notification button
        const notificationBtn = document.getElementById('notificationsBtn');
        if (notificationBtn) {
            notificationBtn.addEventListener('click', () => {
                this.showNotifications();
            });
        }
    }

    loadDashboardData() {
        // Simulate loading dashboard data
        this.updateStatistics();
        this.loadRecentReports();
        this.loadPriorityAreas();
    }

    updateStatistics() {
        // Simulate real-time statistics updates
        const stats = {
            activeReports: 24,
            inProgress: 8,
            completed: 156,
            avgResponse: 2.3
        };

        // Update stat cards with animation
        this.animateStatCard('.stat-card:nth-child(1) .stat-value', stats.activeReports);
        this.animateStatCard('.stat-card:nth-child(2) .stat-value', stats.inProgress);
        this.animateStatCard('.stat-card:nth-child(3) .stat-value', stats.completed);
        this.animateStatCard('.stat-card:nth-child(4) .stat-value', stats.avgResponse);
    }

    animateStatCard(selector, value) {
        const element = document.querySelector(selector);
        if (element) {
            const currentValue = parseInt(element.textContent) || 0;
            const increment = (value - currentValue) / 20;
            let current = currentValue;

            const timer = setInterval(() => {
                current += increment;
                if ((increment > 0 && current >= value) || (increment < 0 && current <= value)) {
                    current = value;
                    clearInterval(timer);
                }
                element.textContent = Math.round(current);
            }, 50);
        }
    }

    loadRecentReports() {
        // Recent reports are already in HTML, but we can add dynamic updates here
        const reportItems = document.querySelectorAll('.report-item');
        reportItems.forEach((item, index) => {
            // Add click handler for report items
            item.addEventListener('click', () => {
                this.showReportDetails(index);
            });
        });
    }

    loadPriorityAreas() {
        // Priority areas are already in HTML, but we can add dynamic updates here
        const priorityItems = document.querySelectorAll('.priority-item');
        priorityItems.forEach((item, index) => {
            // Add click handler for priority items
            item.addEventListener('click', () => {
                this.showAreaDetails(index);
            });
        });
    }

    showReportDetails(reportIndex) {
        const reports = [
            {
                id: 'RPT-001',
                title: 'Pothole on Jl. Sudirman',
                description: 'Large pothole causing traffic disruption',
                reporter: 'John Doe',
                priority: 'High',
                status: 'Reported',
                date: '2 hours ago'
            },
            {
                id: 'RPT-002',
                title: 'Cracked Road Surface',
                description: 'Multiple cracks on Jl. Ahmad Yani',
                reporter: 'Jane Smith',
                priority: 'Medium',
                status: 'Reported',
                date: '5 hours ago'
            },
            {
                id: 'RPT-003',
                title: 'Missing Road Sign',
                description: 'Stop sign missing at intersection',
                reporter: 'Mike Johnson',
                priority: 'Low',
                status: 'Reported',
                date: '1 day ago'
            }
        ];

        const report = reports[reportIndex];
        if (report) {
            alert(`Report Details:\n\nID: ${report.id}\nTitle: ${report.title}\nDescription: ${report.description}\nReporter: ${report.reporter}\nPriority: ${report.priority}\nStatus: ${report.status}\nDate: ${report.date}`);
        }
    }

    showAreaDetails(areaIndex) {
        const areas = [
            'Jl. Sudirman - 5 active reports',
            'Jl. Ahmad Yani - 3 active reports',
            'Jl. Gatot Subroto - 2 active reports'
        ];

        const area = areas[areaIndex];
        if (area) {
            alert(`Area Details:\n\n${area}\n\nClick "View Full Map" to see detailed information.`);
        }
    }

    exportData() {
        // Simulate data export
        const data = {
            timestamp: new Date().toISOString(),
            activeReports: 24,
            inProgress: 8,
            completed: 156,
            avgResponse: 2.3,
            user: window.auth.getCurrentUser()
        };

        const dataStr = JSON.stringify(data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `road-monitor-data-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        this.showMessage('Data exported successfully!', 'success');
    }

    showNotifications() {
        const notifications = [
            {
                title: 'New Report Submitted',
                message: 'A new road damage report has been submitted for Jl. Sudirman',
                time: '5 minutes ago',
                type: 'info'
            },
            {
                title: 'Report Status Updated',
                message: 'Report RPT-001 has been marked as "In Progress"',
                time: '1 hour ago',
                type: 'success'
            },
            {
                title: 'Maintenance Completed',
                message: 'Road maintenance on Jl. Ahmad Yani has been completed',
                time: '2 hours ago',
                type: 'success'
            }
        ];

        // Create notification dropdown
        const dropdown = document.createElement('div');
        dropdown.className = 'notification-dropdown';
        dropdown.innerHTML = `
            <div class="notification-header">
                <h4>Notifications</h4>
                <button class="close-notifications">&times;</button>
            </div>
            <div class="notification-list">
                ${notifications.map(notif => `
                    <div class="notification-item ${notif.type}">
                        <div class="notification-icon">
                            <i class="fas fa-${notif.type === 'success' ? 'check-circle' : 'info-circle'}"></i>
                        </div>
                        <div class="notification-content">
                            <h5>${notif.title}</h5>
                            <p>${notif.message}</p>
                            <span class="notification-time">${notif.time}</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        // Add styles
        dropdown.style.cssText = `
            position: absolute;
            top: 100%;
            right: 0;
            width: 350px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            z-index: 1000;
            max-height: 400px;
            overflow-y: auto;
        `;

        // Position relative to notification button
        const notificationBtn = document.getElementById('notificationsBtn');
        notificationBtn.style.position = 'relative';
        notificationBtn.appendChild(dropdown);

        // Close dropdown when clicking outside
        setTimeout(() => {
            document.addEventListener('click', (e) => {
                if (!notificationBtn.contains(e.target)) {
                    dropdown.remove();
                }
            });
        }, 100);

        // Close button functionality
        dropdown.querySelector('.close-notifications').addEventListener('click', () => {
            dropdown.remove();
        });
    }

    showMessage(message, type) {
        // Create message element
        const messageDiv = document.createElement('div');
        messageDiv.className = `dashboard-message ${type}`;
        messageDiv.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'info-circle'}"></i>
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
            ${type === 'success' ? 'background: #28a745;' : 'background: #17a2b8;'}
        `;

        document.body.appendChild(messageDiv);

        // Remove after 3 seconds
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

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new Dashboard();
});

// Add notification styles
const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
    .notification-header {
        padding: 15px 20px;
        border-bottom: 1px solid #e0e0e0;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .notification-header h4 {
        margin: 0;
        color: #333;
        font-size: 16px;
    }

    .close-notifications {
        background: none;
        border: none;
        font-size: 20px;
        cursor: pointer;
        color: #666;
    }

    .notification-list {
        max-height: 300px;
        overflow-y: auto;
    }

    .notification-item {
        padding: 15px 20px;
        border-bottom: 1px solid #f0f0f0;
        display: flex;
        gap: 12px;
        align-items: flex-start;
    }

    .notification-item:last-child {
        border-bottom: none;
    }

    .notification-icon {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
    }

    .notification-item.success .notification-icon {
        background: #d4edda;
        color: #155724;
    }

    .notification-item.info .notification-icon {
        background: #d1ecf1;
        color: #0c5460;
    }

    .notification-content {
        flex: 1;
    }

    .notification-content h5 {
        margin: 0 0 5px 0;
        color: #333;
        font-size: 14px;
        font-weight: 600;
    }

    .notification-content p {
        margin: 0 0 5px 0;
        color: #666;
        font-size: 13px;
        line-height: 1.4;
    }

    .notification-time {
        font-size: 12px;
        color: #999;
    }
`;
document.head.appendChild(notificationStyles);

