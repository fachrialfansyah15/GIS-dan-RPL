// Reports functionality for Road Monitor Palu

class ReportsPage {
    constructor() {
        this.init();
    }

    init() {
        this.checkAuth();
        this.setupEventListeners();
        this.renderLists();
        this.setupMobileNav();
        // Setup filter event listeners setelah DOM ready
        setTimeout(() => {
            this.setupFilterListeners();
        }, 100);
    }

    setupFilterListeners() {
        const statusFilter = document.getElementById('statusFilter');
        const priorityFilter = document.getElementById('priorityFilter');
        const statusBaruFilter = document.getElementById('statusBaruFilter');
        const jenisBaruFilter = document.getElementById('jenisBaruFilter');
        
        // Box kanan (Laporan Divalidasi)
        if(statusFilter) {
            statusFilter.removeEventListener('change', this.renderValidList);
            statusFilter.addEventListener('change', ()=>{ this.renderValidList(); });
        }
        if(priorityFilter) {
            priorityFilter.removeEventListener('change', this.renderValidList);
            priorityFilter.addEventListener('change', ()=>{ this.renderValidList(); });
        }
        
        // Box kiri (Laporan Masuk)
        if(statusBaruFilter) {
            statusBaruFilter.removeEventListener('change', this.renderBaruList);
            statusBaruFilter.addEventListener('change', ()=>{ this.renderBaruList(); });
        }
        if(jenisBaruFilter) {
            jenisBaruFilter.removeEventListener('change', this.renderBaruList);
            jenisBaruFilter.addEventListener('change', ()=>{ this.renderBaruList(); });
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

    setupEventListeners() {
        // Logout functionality
        const logoutLink = document.getElementById('logoutLink');
        if (logoutLink) {
            logoutLink.addEventListener('click', (e) => {
                e.preventDefault();
                window.auth.logout();
            });
        }

        // Filter functionality - sudah dihandle di init(), tidak perlu duplikat di sini

        const btn = document.getElementById('buatLaporanBaruBtn');
        if(btn){
            btn.addEventListener('click',()=>{
                // Scroll ke form jika form ditampilkan inline (atau munculkan modal jika ada)
                const ele = document.getElementById('damageReportForm');
                if(ele) ele.scrollIntoView({behavior:'smooth',block:'start'});
                // Atau: document.getElementById('formLaporanContainer').style.display='block';
            });
        }
    }

    // Ganti: render dua list utama
    async renderLists() {
        await Promise.all([
            this.renderBaruList(), this.renderValidList()
        ]);
        // Setup ulang filter listeners setelah dropdown diisi
        this.setupFilterListeners();
    }

    async renderBaruList() {
        const box = document.getElementById('laporanBaruList');
        if (!box) return;
        const supabase = window.supabase?.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);
        if (!supabase) { box.innerHTML='<div class="no-reports">Supabase config missing.</div>'; return; }
        const isAdmin = window.auth && window.auth.isUserAdmin && window.auth.isUserAdmin();
        const userId = window.auth?.getUserId ? window.auth.getUserId() : null;
        let rows = [];
        try {
            if (isAdmin) {
                const { data, error } = await supabase
                    .from('laporan_masuk')
                    .select('*')
                    .order('created_at',{ascending:false});
                if (error) throw error; rows=data||[];
            } else {
                if (!userId) { box.innerHTML='<div class="no-reports">Login untuk melihat laporan Anda.</div>'; return; }
                const { data, error } = await supabase
                    .from('laporan_masuk')
                    .select('*')
                    .eq('user_id',userId)
                    .order('created_at',{ascending:false});
                if (error) throw error; rows=data||[];
            }
        } catch(e){ box.innerHTML = `<div class="no-reports">${e.message}</div>`; return; }
        // Generate filter opsi jenis kerusakan untuk laporanBaru
        const jenisSet = new Set();
        rows.forEach(r=>{if (r.jenis_kerusakan) jenisSet.add(r.jenis_kerusakan);});
        const jenisList = Array.from(jenisSet);
        // Fungsi mapping jenis kerusakan ke Bahasa Indonesia
        const mapJenisKerusakan = (jenis) => {
            const j = String(jenis||'').toLowerCase();
            if(j.includes('minor') || j.includes('ringan')) return 'Kerusakan Ringan';
            if(j.includes('medium') || j.includes('sedang')) return 'Kerusakan Sedang';
            if(j.includes('severe') || j.includes('berat')) return 'Kerusakan Berat';
            return jenis; // return as-is jika tidak match
        };
        let jenisDropdown = document.getElementById('jenisBaruFilter');
        if(jenisDropdown){
            // Clear old options (kecuali pertama)
            jenisDropdown.innerHTML = '<option value="all">Jenis Kerusakan</option>';
            jenisList.forEach(jk=>{
                const opt = document.createElement('option');
                opt.value = jk; 
                opt.innerText = mapJenisKerusakan(jk);
                jenisDropdown.appendChild(opt);
            });
        }
        // FILTER: status dan jenis kerusakan
        const statusBaru = (document.getElementById('statusBaruFilter')||{}).value||'all';
        const jenisBaru = (jenisDropdown||{}).value||'all';
        rows = rows.filter(r=>{
            let pass = true;
            // Filter status
            if(statusBaru!=='all') {
                const rStatus = (r.status||'').toLowerCase().trim();
                pass = pass && (rStatus===statusBaru.toLowerCase().trim());
            }
            // Filter jenis kerusakan (match dengan value asli dari database)
            if(jenisBaru!=='all') {
                pass = pass && (String(r.jenis_kerusakan||'').trim()===String(jenisBaru).trim());
            }
            return pass;
        });
        if (!rows.length) {
            box.innerHTML = `<div class="no-reports">${isAdmin?'Tidak ada laporan baru.':'Belum ada laporan Anda.'}</div>`;
            return;
        }
        // Fungsi mapping status ke Bahasa Indonesia
        const mapStatus = (status) => {
            const s = String(status||'').toLowerCase().trim();
            if(s.includes('reported') || s==='dilaporkan') return 'Dilaporkan';
            if(s.includes('approved') || s==='disetujui') return 'Disetujui';
            if(s.includes('ditolak') || s==='rejected') return 'Ditolak';
            if(s.includes('aktif') || s==='active') return 'Aktif';
            if(s.includes('pending')) return 'Menunggu';
            if(s.includes('closed') || s==='selesai') return 'Selesai';
            return status; // return as-is jika tidak match
        };
        const html = rows.map(r=>{
            const s = (r.status||'').toLowerCase();
            const statusText = mapStatus(r.status);
            let actionBtns = '';
            if(isAdmin){
                actionBtns = `<button class="btn-primary approve-report" data-id="${r.id}"><i class="fas fa-check"></i>Setujui</button> <button class="btn-secondary reject-report" data-id="${r.id}"><i class="fas fa-times"></i>Tolak</button>`;
            }
            // Mapping jenis kerusakan ke Bahasa Indonesia untuk display
            const jenisDisplay = mapJenisKerusakan(r.jenis_kerusakan);
            return `<div class="report-card" data-status="${s}">
                <div class="report-header"><div class="report-id">${r.id}</div><div class="report-status ${s}">${statusText}</div></div>
                <div class="report-content">
                <h3>${jenisDisplay}</h3>
                <p class="report-location"><i class="fas fa-map-marker-alt"></i>${r.nama_jalan||''}</p>
                <div class="report-meta"><span class="report-date"><i class="fas fa-clock"></i>${r.created_at?new Date(r.created_at).toLocaleString():''}</span></div>
                <div class="report-description">${r.description||''}</div>
                </div>
                <div class="report-actions">${actionBtns}</div></div>`;
        }).join('');
        box.innerHTML = html;
        if(isAdmin){
            box.querySelectorAll('.approve-report').forEach(btn=>btn.addEventListener('click',async()=>{await this.approveLaporan(btn.getAttribute('data-id'));this.renderLists();}));
            box.querySelectorAll('.reject-report').forEach(btn=>btn.addEventListener('click',async()=>{await this.rejectLaporan(btn.getAttribute('data-id'));this.renderLists();}));
        }
    }

    async renderValidList() {
        const box = document.getElementById('laporanValidList');
        if (!box) return;
        const supabase = window.supabase?.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);
        if (!supabase) { box.innerHTML='<div class="no-reports">Supabase config missing.</div>'; return; }
        let rows = [];
        try {
            const { data, error } = await supabase.from('jalan_rusak').select('*').order('tanggal_survey',{ascending:false});
            if (error) throw error; rows=data||[];
        }catch(e){ box.innerHTML=`<div class="no-reports">${e.message}</div>`; return; }
        // FILTER: status dan priority (jenis kerusakan via priority filter)
        const statusVal = (document.getElementById('statusFilter')||{}).value||'all';
        const priorityVal = (document.getElementById('priorityFilter')||{}).value||'all';
        function mapPriority(jenis) {
            const s = String(jenis||'').toLowerCase();
            if(s.includes('berat') || s.includes('severe')) return 'high';
            if(s.includes('sedang') || s.includes('medium')) return 'medium';
            if(s.includes('ringan') || s.includes('minor')) return 'low';
            return 'low';
        }
        rows = rows.filter(r=>{
            let pass = true;
            // Filter status
            if(statusVal!=='all') {
                const rStatus = (r.status||'').toLowerCase().trim();
                pass = pass && (rStatus===statusVal.toLowerCase().trim());
            }
            // Filter priority (berdasarkan jenis kerusakan)
            if(priorityVal!=='all') {
                const mappedPriority = mapPriority(r.jenis_kerusakan);
                pass = pass && (mappedPriority===priorityVal);
            }
            return pass;
        });
        if(!rows.length){ box.innerHTML='<div class="no-reports">Belum ada laporan tervalidasi.</div>'; return; }
        // Fungsi mapping jenis kerusakan ke Bahasa Indonesia
        const mapJenisKerusakan = (jenis) => {
            const j = String(jenis||'').toLowerCase();
            if(j.includes('minor') || j.includes('ringan')) return 'Kerusakan Ringan';
            if(j.includes('medium') || j.includes('sedang')) return 'Kerusakan Sedang';
            if(j.includes('severe') || j.includes('berat')) return 'Kerusakan Berat';
            return jenis; // return as-is jika tidak match
        };
        // Fungsi mapping status ke Bahasa Indonesia
        const mapStatus = (status) => {
            const s = String(status||'').toLowerCase().trim();
            if(s.includes('reported') || s==='dilaporkan') return 'Dilaporkan';
            if(s.includes('approved') || s==='disetujui') return 'Disetujui';
            if(s.includes('ditolak') || s==='rejected') return 'Ditolak';
            if(s.includes('aktif') || s==='active') return 'Aktif';
            if(s.includes('pending')) return 'Menunggu';
            if(s.includes('closed') || s==='selesai') return 'Selesai';
            return status; // return as-is jika tidak match
        };
        const html = rows.map(r=>{
            const s = (r.status||'').toLowerCase();
            const statusText = mapStatus(r.status);
            // Mapping jenis kerusakan ke Bahasa Indonesia untuk display
            const jenisDisplay = mapJenisKerusakan(r.jenis_kerusakan);
            return `<div class="report-card" data-status="${s}">
                <div class="report-header"><div class="report-id">${r.id}</div><div class="report-status ${s}">${statusText}</div></div>
                <div class="report-content">
                <h3>${jenisDisplay}</h3>
                <p class="report-location"><i class="fas fa-map-marker-alt"></i>${r.nama_jalan||''}</p>
                <div class="report-meta"><span class="report-date"><i class="fas fa-clock"></i>${r.tanggal_survey?new Date(r.tanggal_survey).toLocaleString():''}</span></div>
                <div class="report-description">${r.description||''}</div>
                </div>
            </div>`;
        }).join('');
        box.innerHTML = html;
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

    // Approve dan reject logic
    async approveLaporan(id) {
        const supabase = window.supabase?.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);
        if (!supabase) return;
        const { data: src, error: e1 } = await supabase.from('laporan_masuk').select('*').eq('id', id).single();
        if (e1 || !src) {
            this.showMessage('Data tidak ditemukan', 'error');
            return;
        }
        // Insert ke jalan_rusak
        const insertData = {
            tanggal_survey: src.tanggal_survey,
            nama_jalan: src.nama_jalan,
            jenis_kerusakan: src.jenis_kerusakan,
            foto_jalan: src.foto_jalan,
            Latitude: src.Latitude,
            Longitude: src.Longitude,
            status: 'pending',
            user_id: src.user_id || null,
            admin_id: window.auth?.getUserId ? window.auth.getUserId() : null
        };
        const { error: e2 } = await supabase.from('jalan_rusak').insert([insertData]);
        if (e2) {
            this.showMessage('Gagal approve laporan', 'error');
            return;
        }
        const { error: e3 } = await supabase.from('laporan_masuk').update({status:'approved'}).eq('id', id);
        if (e3) {
            this.showMessage('Gagal update status laporan', 'error');
        } else {
            this.showMessage('Laporan disetujui dan dipindahkan.', 'success');
        }
    }
    async rejectLaporan(id) {
        const supabase = window.supabase?.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);
        if (!supabase) return;
        const { error } = await supabase.from('laporan_masuk').update({status:'ditolak'}).eq('id',id);
        if (error) {
            this.showMessage('Gagal menolak laporan','error');
        } else {
            this.showMessage('Laporan ditolak','success');
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


