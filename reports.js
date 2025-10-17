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

    async loadReports() {
        const reportsList = document.getElementById('reportsList');
        if (!reportsList) return;

        // Supabase client
        const supabase = window.supabase?.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);
        if (!supabase) {
            reportsList.innerHTML = '<div class="no-reports">Supabase config missing.</div>';
            return;
        }

        const isAdmin = !!(window.auth && window.auth.isUserAdmin && window.auth.isUserAdmin());
        const userId = window.auth?.getUserId ? window.auth.getUserId() : null;

        let rows = [];
        try {
            if (isAdmin) {
                const { data, error } = await supabase
                    .from('jalan_rusak')
                    .select('*');
                if (error) throw error; rows = data || [];
            } else {
                if (!userId) {
                    reportsList.innerHTML = '<div class="no-reports">Please login to view your reports.</div>';
                    return;
                }
                const { data, error } = await supabase
                    .from('laporan_masuk')
                    .select('*')
                    .eq('user_id', userId);
                if (error) throw error; rows = data || [];
            }
        } catch (e) {
            reportsList.innerHTML = `<div class="no-reports">Failed to load reports: ${e.message}</div>`;
            return;
        }

        // Sort client-side: prefer created_at, fallback tanggal_survey, then id
        rows.sort((a, b) => {
            const da = a.created_at || a.tanggal_survey || '';
            const db = b.created_at || b.tanggal_survey || '';
            const ta = da ? new Date(da).getTime() : 0;
            const tb = db ? new Date(db).getTime() : 0;
            if (tb !== ta) return tb - ta;
            const ia = typeof a.id === 'number' ? a.id : parseInt(a.id || '0', 10) || 0;
            const ib = typeof b.id === 'number' ? b.id : parseInt(b.id || '0', 10) || 0;
            return ib - ia;
        });

        if (!rows.length) {
            reportsList.innerHTML = `
                <div class="no-reports">
                    <i class="fas fa-clipboard-list"></i>
                    <h3>No Reports Found</h3>
                    <p>${isAdmin ? 'No validated reports yet.' : 'You have not submitted any reports.'}</p>
                </div>
            `;
            return;
        }

        function mapPriority(jenis) {
            const s = String(jenis || '').toLowerCase();
            if (s.includes('berat')) return 'high';
            if (s.includes('sedang')) return 'medium';
            if (s.includes('ringan')) return 'low';
            return 'low';
        }

        const html = rows.map(r => {
            const status = (r.status || (isAdmin ? 'reported' : 'reported')).toString().toLowerCase();
            const priority = mapPriority(r.jenis_kerusakan);
            const dateRaw = r.created_at || r.tanggal_survey || '';
            const dateStr = dateRaw ? new Date(dateRaw).toLocaleDateString() : '';
            const dmg = r.jenis_kerusakan || '-';
            const loc = r.nama_jalan || `${r.Latitude || ''}, ${r.Longitude || ''}`;
            return `
            <div class="report-card" data-status="${status}" data-priority="${priority}">
                <div class="report-header">
                    <div class="report-id">${r.id}</div>
                    <div class="report-status ${status}">${status.replace('_',' ')}</div>
                </div>
                <div class="report-content">
                    <h3>${dmg}</h3>
                    <p class="report-location"><i class="fas fa-map-marker-alt"></i>${loc}</p>
                    <div class="report-meta">
                        <span class="report-priority ${priority}"><i class="fas fa-flag"></i>${priority} Priority</span>
                        <span class="report-date"><i class="fas fa-clock"></i>${dateStr}</span>
                    </div>
                </div>
                <div class="report-actions">
                    <button class="btn-secondary" data-view-id="${r.id}"><i class="fas fa-eye"></i>View Details</button>
                    ${isAdmin ? `<button class="btn-primary" data-delete-id="${r.id}"><i class="fas fa-trash"></i>Hapus</button>` : ''}
                </div>
            </div>`;
        }).join('');

        reportsList.innerHTML = html;

        // Wire actions
        reportsList.querySelectorAll('[data-view-id]').forEach(btn => btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-view-id');
            this.viewReportSupabase(id, isAdmin);
        }));
        if (isAdmin) {
            reportsList.querySelectorAll('[data-delete-id]').forEach(btn => btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-delete-id');
                this.deleteReportSupabase(id);
            }));
        }
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

    async viewReportSupabase(reportId, isAdmin) {
        const supabase = window.supabase?.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);
        if (!supabase) return;
        const table = isAdmin ? 'jalan_rusak' : 'laporan_masuk';
        const { data, error } = await supabase.from(table).select('*').eq('id', reportId).single();
        if (error || !data) return;
        alert(`Report Details\n\nID: ${data.id}\nJenis: ${data.jenis_kerusakan || '-'}\nLokasi: ${data.nama_jalan || '-'}\nStatus: ${data.status || '-'}\nTanggal: ${data.created_at ? new Date(data.created_at).toLocaleString() : '-'}`);
    }

    async deleteReportSupabase(reportId) {
        const supabase = window.supabase?.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);
        if (!supabase) return;
        if (!(window.auth && window.auth.isUserAdmin && window.auth.isUserAdmin())) return;
        const ok = confirm('Hapus laporan ini? Tindakan ini akan menandai laporan sebagai dihapus.');
        if (!ok) return;
        const { error } = await supabase.from('jalan_rusak').update({ status: 'deleted' }).eq('id', reportId);
        if (!error) { this.loadReports(); this.showMessage('Laporan berhasil dihapus.', 'success'); }
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


