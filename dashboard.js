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
        // Initialize small map for dashboard preview - centered on Palu
        this.map = L.map('mapPreview', {
            center: [-0.898, 119.870], // Kota Palu coordinates
            zoom: 13,
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
                    
                    // Gunakan createSeverityIcon sama seperti di map.js
                    const jenis = row.jenis_kerusakan || '';
                    const marker = L.marker([lat, lng], {
                        icon: this.createSeverityIcon(jenis)
                    });
                    
                    let content = `<div style='min-width:180px'><strong>${row.nama_jalan || '-'}</strong><br/>`;
                    content += `Jenis: ${row.jenis_kerusakan || '-'}<br/>`;
                    if (row.foto_jalan) {
                        // Handle foto URL (bisa full URL atau perlu prefix)
                        let fotoUrl = row.foto_jalan;
                        if (!fotoUrl.startsWith('http')) {
                            fotoUrl = `https://cxcxatowzymfpasesrvp.supabase.co/storage/v1/object/public/foto_jalan/${fotoUrl}`;
                        }
                        content += `<img src='${fotoUrl}' alt='foto jalan' style='width:140px;margin-top:6px;border-radius:6px' onerror='this.style.display=\"none\"'/><br/>`;
                    }
                    content += `</div>`;
                    marker.bindPopup(content);
                    this.reportLayer.addLayer(marker);
                });
            }
        } catch(err) { }
    }

    // Helper functions untuk marker (sama dengan map.js)
    normalizeSeverity(val) {
        if (!val) return '';
        const s = String(val).toLowerCase();
        if (s.includes('berat')) return 'Rusak Berat';
        if (s.includes('sedang')) return 'Rusak Sedang';
        if (s.includes('ringan')) return 'Rusak Ringan';
        return val;
    }

    severityColor(sev) {
        const n = this.normalizeSeverity(sev);
        if (n === 'Rusak Berat') return '#dc3545'; // red
        if (n === 'Rusak Sedang') return '#ff8c00'; // orange
        if (n === 'Rusak Ringan') return '#ffd31a'; // yellow
        return '#3b82f6'; // fallback blue
    }

    createSeverityIcon(sev) {
        const color = this.severityColor(sev);
        const html = `
          <div style="width:26px;height:38px;">
            <svg width="26" height="38" viewBox="0 0 26 38" xmlns="http://www.w3.org/2000/svg">
              <path d="M13 0C5.82 0 0 5.82 0 13c0 8.35 9.74 19.33 11.95 21.73.56.6 1.54.6 2.1 0C16.26 32.33 26 21.35 26 13 26 5.82 20.18 0 13 0z" fill="${color}" />
              <circle cx="13" cy="13" r="5.5" fill="#ffffff"/>
            </svg>
          </div>`;
        return L.divIcon({ className: 'severity-marker', html, iconSize: [26, 38], iconAnchor: [13, 38], popupAnchor: [0, -30], tooltipAnchor: [0, -32] });
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

        // View Full Map button handler
        const viewFullMapBtn = document.getElementById('viewFullMapBtn');
        if (viewFullMapBtn) {
            viewFullMapBtn.addEventListener('click', () => {
                window.location.href = 'map.html';
            });
        }

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
        // Fetch statistics from Supabase tables
        let totalLaporanAktif = 0;
        let totalSedangDiproses = 0;
        let totalSelesai = 0;
        
        if (this.supabase) {
            try {
                // Get data from jalan_rusak table and count by category
                let { data: jalanRusak, error } = await this.supabase.from('jalan_rusak').select('jenis_kerusakan');
                
                if (!error && Array.isArray(jalanRusak)) {
                    // Count by damage severity (ringan, sedang, berat)
                    const ringan = jalanRusak.filter(r => 
                        (r.jenis_kerusakan || '').toLowerCase().includes('ringan') || 
                        (r.jenis_kerusakan || '').toLowerCase().includes('minor')
                    ).length;
                    
                    const sedang = jalanRusak.filter(r => 
                        (r.jenis_kerusakan || '').toLowerCase().includes('sedang') || 
                        (r.jenis_kerusakan || '').toLowerCase().includes('medium')
                    ).length;
                    
                    const berat = jalanRusak.filter(r => 
                        (r.jenis_kerusakan || '').toLowerCase().includes('berat') || 
                        (r.jenis_kerusakan || '').toLowerCase().includes('severe')
                    ).length;
                    
                    // Set statistics based on actual data
                    totalLaporanAktif = jalanRusak.length; // Total reports
                    totalSedangDiproses = sedang; // Medium damage as "being processed"
                    totalSelesai = ringan; // Light damage as "completed"
                }
                
                // Also check laporan_masuk for pending reports
                let { data: laporanMasuk } = await this.supabase.from('laporan_masuk').select('status');
                if (laporanMasuk && Array.isArray(laporanMasuk)) {
                    const pending = laporanMasuk.filter(r => 
                        (r.status || '').toLowerCase() !== 'ditolak'
                    ).length;
                    totalLaporanAktif += pending;
                }
            } catch (err) {
                console.error('Error fetching statistics:', err);
            }
        }
        
        // Animate stat cards with real data
        this.animateStatCard('.stats-section-inline .stat-card:nth-child(1) .stat-value', totalLaporanAktif);
        this.animateStatCard('.stats-section-inline .stat-card:nth-child(2) .stat-value', totalSedangDiproses);
        this.animateStatCard('.stats-section-inline .stat-card:nth-child(3) .stat-value', totalSelesai);
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

    async loadRecentReports() {
        // Ambil data laporan terbaru dari Supabase
        if (!this.supabase) {
            console.warn('[dashboard.js] Supabase not initialized');
            return;
        }
        
        try {
            // Ambil 5 laporan terbaru dari tabel jalan_rusak, urutkan berdasarkan tanggal_survey
            const { data, error } = await this.supabase
                .from('jalan_rusak')
                .select('*')
                .order('tanggal_survey', { ascending: false })
                .limit(5);
            
            if (error) {
                console.error('[dashboard.js] Error fetching recent reports:', error);
                return;
            }
            
            if (data && data.length > 0) {
                this.renderRecentReports(data);
            }
        } catch (err) {
            console.error('[dashboard.js] Exception loading recent reports:', err);
        }
    }
    
    renderRecentReports(reports) {
        const reportList = document.querySelector('.report-list');
        if (!reportList) return;
        
        // Kosongkan list yang ada
        reportList.innerHTML = '';
        
        // Render setiap laporan
        reports.forEach((report, index) => {
            const reportItem = document.createElement('div');
            reportItem.className = 'report-item';
            
            // Tentukan prioritas berdasarkan jenis kerusakan
            let priority = 'low';
            let priorityText = 'Prioritas Rendah';
            const jenisKerusakan = (report.jenis_kerusakan || '').toLowerCase();
            
            if (jenisKerusakan.includes('berat') || jenisKerusakan.includes('severe')) {
                priority = 'high';
                priorityText = 'Prioritas Tinggi';
            } else if (jenisKerusakan.includes('sedang') || jenisKerusakan.includes('medium')) {
                priority = 'medium';
                priorityText = 'Prioritas Sedang';
            }
            
            // Icon berdasarkan jenis kerusakan
            let icon = 'fa-road';
            if (jenisKerusakan.includes('lubang') || jenisKerusakan.includes('pothole')) {
                icon = 'fa-exclamation-triangle';
            }
            
            reportItem.innerHTML = `
                <div class="report-icon ${priority}">
                    <i class="fas ${icon}"></i>
                </div>
                <div class="report-details">
                    <h4>${report.nama_jalan || 'Jalan Tidak Diketahui'}</h4>
                    <p>${report.jenis_kerusakan || 'Kerusakan tidak dispesifikasi'}</p>
                    <span class="report-meta">Survei: ${report.tanggal_survey || 'Tanggal tidak tersedia'}</span>
                </div>
                <div class="report-status ${priority}">${priorityText}</div>
            `;
            
            // Add click handler
            reportItem.addEventListener('click', () => {
                this.showReportDetailsFromData(report);
            });
            
            reportList.appendChild(reportItem);
        });
    }

    async loadPriorityAreas() {
        // Ambil data dari jalan_rusak dan hitung frekuensi nama jalan
        if (!this.supabase) {
            console.warn('[dashboard.js] Supabase not initialized');
            return;
        }
        
        try {
            const { data, error } = await this.supabase
                .from('jalan_rusak')
                .select('nama_jalan');
            
            if (error) {
                console.error('[dashboard.js] Error fetching priority areas:', error);
                return;
            }
            
            if (data && data.length > 0) {
                // Hitung frekuensi kemunculan setiap nama jalan
                const frequency = {};
                data.forEach(row => {
                    const namaJalan = row.nama_jalan || 'Tidak Diketahui';
                    frequency[namaJalan] = (frequency[namaJalan] || 0) + 1;
                });
                
                // Urutkan berdasarkan frekuensi (terbanyak dulu)
                const sortedAreas = Object.entries(frequency)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5); // Ambil top 5
                
                this.renderPriorityAreas(sortedAreas);
            }
        } catch (err) {
            console.error('[dashboard.js] Exception loading priority areas:', err);
        }
    }
    
    renderPriorityAreas(areas) {
        const priorityList = document.querySelector('.priority-list');
        if (!priorityList) return;
        
        // Kosongkan list yang ada
        priorityList.innerHTML = '';
        
        // Render setiap area prioritas
        areas.forEach(([namaJalan, count], index) => {
            const priorityItem = document.createElement('div');
            priorityItem.className = 'priority-item';
            
            // Tentukan level prioritas berdasarkan jumlah laporan
            let level = 'low';
            if (count >= 5) level = 'high';
            else if (count >= 3) level = 'medium';
            
            priorityItem.innerHTML = `
                <div class="priority-bar ${level}"></div>
                <div class="priority-info">
                    <h4>${namaJalan}</h4>
                    <p>${count} laporan aktif</p>
                </div>
            `;
            
            priorityItem.addEventListener('click', () => {
                alert(`Area Prioritas: ${namaJalan}\n${count} laporan kerusakan tercatat.\n\nKlik "Lihat Peta Lengkap" untuk detail lokasi.`);
            });
            
            priorityList.appendChild(priorityItem);
        });
    }

    showReportDetailsFromData(report) {
        // Tampilkan detail laporan dari data Supabase
        const details = `
Detail Laporan Kerusakan Jalan

Nama Jalan: ${report.nama_jalan || '-'}
Jenis Kerusakan: ${report.jenis_kerusakan || '-'}
Tanggal Survey: ${report.tanggal_survey || '-'}
Koordinat: ${report.Latitude || '-'}, ${report.Longitude || '-'}

Klik "Lihat Peta Lengkap" untuk melihat lokasi di peta.
        `;
        alert(details);
    }


    showNotifications() {
        // Placeholder for notifications feature
        alert('Notifikasi: Anda memiliki 3 laporan baru yang perlu ditinjau.');
    }
}

// Initialize dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new Dashboard();
});