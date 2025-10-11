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
        this.initializeSupabase();
        this.loadDashboardData();
        this.setupMobileNav();
    }

    initializeSupabase() {
        if (window.supabase && window.supabase.createClient) {
            const supabase_url = window.SUPABASE_URL;
            const supabase_key = window.SUPABASE_KEY;
            this.supabase = (supabase_url && supabase_key) ? window.supabase.createClient(supabase_url, supabase_key) : null;
        } else {
            this.supabase = null;
        }
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
            center: [-0.8966, 120.9],
            zoom: 8,
            zoomControl: false,
            attributionControl: false
        });
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(this.map);
        this.reportLayer = L.layerGroup().addTo(this.map);
        // Tampil marker awal
        this.refreshMapPreview();
        // Add auto-refresh interval
        if (this._refreshInterval) clearInterval(this._refreshInterval);
        this._refreshInterval = setInterval(()=>{
            this.refreshMapPreview();
            this.updateStatistics();
        }, 30000);
    }

    async refreshMapPreview() {
        // Hapus semua marker lama
        if (this.reportLayer) this.reportLayer.clearLayers();
        if (!this.supabase) return;
        try {
            const { data, error } = await this.supabase.from('jalan_rusak').select('*');
            if (!error && Array.isArray(data)) {
                data.forEach(row => {
                    const lat = parseFloat(row.Latitude);
                    const lng = parseFloat(row.Longitude);
                    if (isNaN(lat) || isNaN(lng)) return;
                    const marker = L.marker([lat, lng], {
                        icon: this.getReportIcon('pothole', 'high') // or customize by kerusakan
                    });
                    let content = `<div style='min-width:180px'><strong>${row.nama_jalan || '-'}</strong><br/>`;
                    content += `Jenis: ${row.jenis_kerusakan || '-'}<br/>`;
                    if (row.foto_jalan) content += `<img src='${row.foto_jalan}' alt='foto jalan' style='width:140px;margin-top:6px;border-radius:6px'/><br/>`;
                    content += `</div>`;
                    marker.bindPopup(content);
                    this.reportLayer.addLayer(marker);
                });
            }
        } catch(err) { }
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

    async loadDashboardData() {
        await this.updateStatistics();
        this.loadRecentReports();
        this.loadPriorityAreas();
    }

    async updateStatistics() {
        let totalMasuk = 0;
        let totalSetuju = 0;
        let totalTolak = 0;
        if (this.supabase) {
            try {
                let resp = await this.supabase.from('laporan_masuk').select('status');
                if (!resp.error && Array.isArray(resp.data)) {
                    totalMasuk = resp.data.length;
                    totalTolak = resp.data.filter(r => (r.status||'').toLowerCase() === 'ditolak').length;
                }
                let jalan_rusak = await this.supabase.from('jalan_rusak').select('id');
                if (!jalan_rusak.error && Array.isArray(jalan_rusak.data)) {
                    totalSetuju = jalan_rusak.data.length;
                }
            } catch (_) {}
        }
        this.animateStatCard('.stat-card:nth-child(1) .stat-value', totalMasuk);
        this.animateStatCard('.stat-card:nth-child(2) .stat-value', totalSetuju);
        this.animateStatCard('.stat-card:nth-child(3) .stat-value', totalTolak);
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
}