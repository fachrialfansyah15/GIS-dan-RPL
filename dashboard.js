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

        // Removed exportData method and all export references

        // Notification button
        const notificationBtn = document.getElementById('notificationsBtn');
        if (notificationBtn) {
            notificationBtn.addEventListener('click', () => {
                this.showNotifications();
            });
        }
    }

    setupMobileNav() {
        // Quick Actions floating menu for mobile
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

            // Bind robustly for mobile interactions
            quickToggle.addEventListener('pointerdown', toggleMenu);
            quickToggle.addEventListener('click', toggleMenu);

            // Prevent clicks inside the menu from bubbling to document
            quickMenu.addEventListener('click', (e) => e.stopPropagation());

            // Close on backdrop or outside click
            backdrop.addEventListener('click', closeMenu);
            document.addEventListener('click', (e) => {
                if (quickMenu.classList.contains('open') && !quickMenu.contains(e.target) && !quickToggle.contains(e.target)) {
                    closeMenu();
                }
            });

            // Close menu on item click
            quickMenu.querySelectorAll('.quick-action-item').forEach(link => {
                link.addEventListener('click', closeMenu);
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
            alert(`Area Details:\n\n${area}\n\nClick "View Full Map" to see detailed information.`