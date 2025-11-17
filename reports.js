// Reports functionality for Road Monitor Palu

class ReportsPage {
    constructor() {
        this.init();
    }

    // Fungsi untuk mengubah status_pengerjaan menjadi "selesai"
    async selesaiLaporan(id) {
        console.log('[selesaiLaporan] Called with id:', id);
        const supabase = window.__supabaseClient || (window.__supabaseClient = window.supabase?.createClient(window.SUPABASE_URL, window.SUPABASE_KEY));
        if (!supabase) {
            this.showMessage('Supabase tidak tersedia', 'error');
            return;
        }
        if (!(window.auth && window.auth.isUserAdmin && window.auth.isUserAdmin())) {
            this.showMessage('Hanya admin yang dapat menyelesaikan laporan', 'error');
            return;
        }
        try {
            console.log('[selesaiLaporan] Updating status_pengerjaan to "selesai" for id:', id);
            const { data, error } = await supabase
                .from('jalan_rusak')
                .update({ status_pengerjaan: 'selesai' })
                .eq('id', id)
                .select();
            console.log('[selesaiLaporan] Update result:', { data, error });
            if (error) {
                console.error('[selesaiLaporan] Error:', error);
                this.showMessage('Gagal menyelesaikan laporan: ' + error.message, 'error');
                return;
            }
            if (!data || data.length === 0) {
                console.warn('[selesaiLaporan] No rows updated. ID might not exist:', id);
                this.showMessage('Laporan tidak ditemukan atau sudah selesai', 'warning');
                return;
            }
            console.log('[selesaiLaporan] Successfully updated:', data[0]);
            this.showMessage('Laporan ditandai selesai. Marker akan berubah di peta.', 'success');
            await this.renderValidList();
            if (window.refreshJalanRusakMarkers) {
                window.refreshJalanRusakMarkers();
            }
        } catch (err) {
            console.error('[selesaiLaporan] Exception:', err);
            this.showMessage('Terjadi kesalahan saat menyelesaikan laporan', 'error');
        }
    }

    // Reset status_pengerjaan ke kosong (kembali ke kondisi awal)
    async resetStatusPengerjaan(id) {
        console.log('[resetStatusPengerjaan] Called with id:', id);
        const supabase = window.__supabaseClient || (window.__supabaseClient = window.supabase?.createClient(window.SUPABASE_URL, window.SUPABASE_KEY));
        if (!supabase) {
            this.showMessage('Supabase tidak tersedia', 'error');
            return;
        }
        if (!(window.auth && window.auth.isUserAdmin && window.auth.isUserAdmin())) {
            this.showMessage('Hanya admin yang dapat mereset status', 'error');
            return;
        }
        try {
            const { data, error } = await supabase
                .from('jalan_rusak')
                .update({ status_pengerjaan: '' })
                .eq('id', id)
                .select();
            console.log('[resetStatusPengerjaan] Update result:', { data, error });
            if (error) {
                this.showMessage('Gagal mereset status: ' + error.message, 'error');
                return;
            }
            this.showMessage('Status pengerjaan dikembalikan.', 'success');
            await this.renderValidList();
            if (window.refreshJalanRusakMarkers) window.refreshJalanRusakMarkers();
        } catch (err) {
            console.error('[resetStatusPengerjaan] Exception:', err);
            this.showMessage('Terjadi kesalahan saat mereset status', 'error');
        }
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

        // Tombol "Buat Laporan Baru" sekarang adalah link biasa ke report.html
        // Tidak perlu event listener karena sudah menggunakan href
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
        const supabase = window.__supabaseClient || (window.__supabaseClient = window.supabase?.createClient(window.SUPABASE_URL, window.SUPABASE_KEY));
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
            const fotoUrl = r.foto_jalan || '';
            const fotoEl = fotoUrl ? `<div class="report-media"><img src="${fotoUrl}" alt="Foto jalan" onerror="this.style.display='none'"/></div>` : '';
            return `<div class="report-card" data-status="${s}">
                <div class="report-header"><div class="report-id">${r.id}</div><div class="report-status ${s}">${statusText}</div></div>
                <div class="report-content">
                  <div class="report-body">
                    <h3>${jenisDisplay}</h3>
                    <p class="report-location"><i class="fas fa-map-marker-alt"></i>${r.nama_jalan||''}</p>
                    <div class="report-meta"><span class="report-date"><i class="fas fa-clock"></i>${r.created_at?new Date(r.created_at).toLocaleString():''}</span></div>
                    <div class="report-description">${r.description||''}</div>
                  </div>
                  ${fotoEl}
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
        const supabase = window.__supabaseClient || (window.__supabaseClient = window.supabase?.createClient(window.SUPABASE_URL, window.SUPABASE_KEY));
        if (!supabase) { box.innerHTML='<div class="no-reports">Supabase config missing.</div>'; return; }
        let rows = [];
        try {
            const { data, error } = await supabase.from('jalan_rusak').select('*').order('tanggal_survey',{ascending:false});
            if (error) throw error; rows=data||[];
        }catch(e){ box.innerHTML=`<div class="no-reports">${e.message}</div>`; return; }
        // FILTER: status dan priority (jenis kerusakan via priority filter)
        const statusSelectEl = document.getElementById('statusFilter');
        // Ubah label 'Menunggu/Pending' menjadi 'Dalam Proses' di UI jika ada
        if (statusSelectEl) {
            Array.from(statusSelectEl.options).forEach(opt => {
                const v = String(opt.value||'').toLowerCase();
                if (v === 'pending' || v === 'menunggu') opt.textContent = 'Dalam Proses';
            });
        }
        const statusVal = (statusSelectEl||{}).value||'all';
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
            // Filter status: gunakan kolom status_pengerjaan untuk 'Dalam Proses' dan 'Selesai'
            if(statusVal!=='all') {
                const sel = statusVal.toLowerCase().trim();
                const pengerjaan = String(r.status_pengerjaan||'').toLowerCase().trim();
                const rStatus = String(r.status||'').toLowerCase().trim();
                if (sel === 'aktif') {
                    pass = pass && (rStatus === 'aktif' || rStatus === '' || rStatus === null);
                } else if (['pending','menunggu','proses','dalam proses'].includes(sel)) {
                    pass = pass && (pengerjaan === 'proses');
                } else if (sel === 'selesai') {
                    pass = pass && (pengerjaan === 'selesai');
                }
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
            const statusPengerjaan = r.status_pengerjaan || null;
            // Mapping jenis kerusakan ke Bahasa Indonesia untuk display
            const jenisDisplay = mapJenisKerusakan(r.jenis_kerusakan);
            
            // Tombol aksi hanya untuk admin
            const isAdmin = window.auth && window.auth.isUserAdmin && window.auth.isUserAdmin();
            let actionButtons = '';
            if (isAdmin) {
                // Status badge untuk status pengerjaan
                let statusBadge = '';
                if (statusPengerjaan === 'proses') {
                    // Badge disamakan ukurannya dengan tombol di samping
                    statusBadge = '<div style="margin-bottom:8px;"><span style="display:inline-flex;align-items:center;gap:6px;background:#3b82f6;color:#fff;padding:8px 12px;border-radius:6px;font-size:13px;font-weight:500;"><i class="fas fa-cog fa-spin"></i> Dalam Proses</span></div>';
                }
                
                actionButtons = `
                    <div class="report-actions" style="margin-top:12px;">
                        ${statusBadge}
                        <div style="display:flex;gap:8px;">
                            <button class="btn-proses" data-id="${r.id}" style="flex:1;background:#3b82f6;color:#fff;border:none;padding:8px 12px;border-radius:6px;font-size:13px;font-weight:500;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;transition:all 0.2s ease;">
                                <i class="fas fa-wrench"></i> Proses
                            </button>
                            <button class="btn-selesai" data-id="${r.id}" style="flex:1;background:#16a34a;color:#fff;border:none;padding:8px 12px;border-radius:6px;font-size:13px;font-weight:500;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;transition:all 0.2s ease;">
                                <i class="fas fa-check-circle"></i> Selesai
                            </button>
                            <button class="btn-reset" data-id="${r.id}" style="flex:1;background:#6b7280;color:#fff;border:none;padding:8px 12px;border-radius:6px;font-size:13px;font-weight:500;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;transition:all 0.2s ease;">
                                <i class="fas fa-undo"></i> Reset Status
                            </button>
                            <button class="btn-hapus" data-id="${r.id}" data-foto="${r.foto_jalan||''}" style="flex:1;background:#dc3545;color:#fff;border:none;padding:8px 12px;border-radius:6px;font-size:13px;font-weight:500;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;transition:all 0.2s ease;">
                                <i class="fas fa-trash"></i> Hapus
                            </button>
                        </div>
                    </div>
                `;
            }
            
            return `<div class="report-card" data-status="${s}" data-id="${r.id}">
                <div class="report-header"><div class="report-id">${r.id}</div><div class="report-status ${s}">${statusText}</div></div>
                <div class="report-content">
                <h3>${jenisDisplay}</h3>
                <p class="report-location"><i class="fas fa-map-marker-alt"></i>${r.nama_jalan||''}</p>
                <div class="report-meta"><span class="report-date"><i class="fas fa-clock"></i>${r.tanggal_survey?new Date(r.tanggal_survey).toLocaleString():''}</span></div>
                <div class="report-description">${r.description||''}</div>
                ${actionButtons}
                </div>
            </div>`;
        }).join('');
        box.innerHTML = html;
        
        // Attach event listeners untuk tombol Proses dan Hapus
        if (window.auth && window.auth.isUserAdmin && window.auth.isUserAdmin()) {
            document.querySelectorAll('.btn-proses').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const id = e.currentTarget.getAttribute('data-id');
                    this.prosesLaporan(id);
                });
            });
            document.querySelectorAll('.btn-selesai').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const id = e.currentTarget.getAttribute('data-id');
                    this.selesaiLaporan(id);
                });
            });
            document.querySelectorAll('.btn-reset').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const id = e.currentTarget.getAttribute('data-id');
                    this.resetStatusPengerjaan(id);
                });
            });
            
            document.querySelectorAll('.btn-hapus').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const id = e.currentTarget.getAttribute('data-id');
                    const foto = e.currentTarget.getAttribute('data-foto');
                    this.hapusLaporan(id, foto);
                });
            });
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
        const supabase = window.__supabaseClient || (window.__supabaseClient = window.supabase?.createClient(window.SUPABASE_URL, window.SUPABASE_KEY));
        if (!supabase) return;
        const table = isAdmin ? 'jalan_rusak' : 'laporan_masuk';
        const { data, error } = await supabase.from(table).select('*').eq('id', reportId).single();
        if (error || !data) return;
        alert(`Report Details\n\nID: ${data.id}\nJenis: ${data.jenis_kerusakan || '-'}\nLokasi: ${data.nama_jalan || '-'}\nStatus: ${data.status || '-'}\nTanggal: ${data.created_at ? new Date(data.created_at).toLocaleString() : '-'}`);
    }

    async deleteReportSupabase(reportId) {
        const supabase = window.__supabaseClient || (window.__supabaseClient = window.supabase?.createClient(window.SUPABASE_URL, window.SUPABASE_KEY));
        if (!supabase) return;
        if (!(window.auth && window.auth.isUserAdmin && window.auth.isUserAdmin())) return;
        const ok = confirm('Hapus laporan ini? Tindakan ini akan menandai laporan sebagai dihapus.');
        if (!ok) return;
        const { error } = await supabase.from('jalan_rusak').update({ status: 'deleted' }).eq('id', reportId);
        if (!error) { this.loadReports(); this.showMessage('Laporan berhasil dihapus.', 'success'); }
    }

    // Approve dan reject logic
    async approveLaporan(id) {
        const supabase = window.__supabaseClient || (window.__supabaseClient = window.supabase?.createClient(window.SUPABASE_URL, window.SUPABASE_KEY));
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
        const supabase = window.__supabaseClient || (window.__supabaseClient = window.supabase?.createClient(window.SUPABASE_URL, window.SUPABASE_KEY));
        if (!supabase) return;
        const { error } = await supabase.from('laporan_masuk').update({status:'ditolak'}).eq('id',id);
        if (error) {
            this.showMessage('Gagal menolak laporan','error');
        } else {
            this.showMessage('Laporan ditolak','success');
        }
    }

    // Fungsi untuk mengubah status_pengerjaan menjadi "proses"
    async prosesLaporan(id) {
        console.log('[prosesLaporan] Called with id:', id);
        const supabase = window.__supabaseClient || (window.__supabaseClient = window.supabase?.createClient(window.SUPABASE_URL, window.SUPABASE_KEY));
        if (!supabase) {
            this.showMessage('Supabase tidak tersedia', 'error');
            return;
        }
        
        // Cek apakah user adalah admin
        if (!(window.auth && window.auth.isUserAdmin && window.auth.isUserAdmin())) {
            this.showMessage('Hanya admin yang dapat memproses laporan', 'error');
            return;
        }
        
        try {
            console.log('[prosesLaporan] Updating status_pengerjaan to "proses" for id:', id);
            
            // Update status_pengerjaan menjadi "proses"
            const { data, error } = await supabase
                .from('jalan_rusak')
                .update({ status_pengerjaan: 'proses' })
                .eq('id', id)
                .select();
            
            console.log('[prosesLaporan] Update result:', { data, error });
            
            if (error) {
                console.error('[prosesLaporan] Error:', error);
                this.showMessage('Gagal memproses laporan: ' + error.message, 'error');
                return;
            }
            
            if (!data || data.length === 0) {
                console.warn('[prosesLaporan] No rows updated. ID might not exist:', id);
                this.showMessage('Laporan tidak ditemukan atau sudah diproses', 'warning');
                return;
            }
            
            console.log('[prosesLaporan] Successfully updated:', data[0]);
            this.showMessage('Laporan berhasil diproses! Marker akan berubah di peta.', 'success');
            
            // Reload laporan untuk update UI
            await this.renderValidList();
            
            // Refresh marker di peta jika fungsi tersedia
            if (window.refreshJalanRusakMarkers) {
                window.refreshJalanRusakMarkers();
            }
        } catch (err) {
            console.error('[prosesLaporan] Exception:', err);
            this.showMessage('Terjadi kesalahan saat memproses laporan', 'error');
        }
    }

    // Fungsi untuk menghapus laporan (selesai)
    async hapusLaporan(id, fotoPath) {
        const supabase = window.__supabaseClient || (window.__supabaseClient = window.supabase?.createClient(window.SUPABASE_URL, window.SUPABASE_KEY));
        if (!supabase) {
            this.showMessage('Supabase tidak tersedia', 'error');
            return;
        }
        
        // Cek apakah user adalah admin
        if (!(window.auth && window.auth.isUserAdmin && window.auth.isUserAdmin())) {
            this.showMessage('Hanya admin yang dapat menghapus laporan', 'error');
            return;
        }
        
        // Alert pertama: konfirmasi hapus
        const confirm1 = confirm('⚠️ Apakah Anda yakin ingin menghapus laporan ini?');
        if (!confirm1) return;
        
        // Alert kedua: peringatan data tidak bisa dikembalikan
        const confirm2 = confirm('🚨 Data yang dihapus tidak bisa dikembalikan. Yakin ingin melanjutkan?');
        if (!confirm2) return;
        
        try {
            // Hapus file foto dari storage (opsional)
            if (fotoPath && fotoPath.trim() !== '') {
                // Extract filename dari URL atau path
                let filename = fotoPath;
                
                // Jika fotoPath adalah URL lengkap, extract filename
                if (fotoPath.startsWith('http')) {
                    const urlParts = fotoPath.split('/');
                    filename = urlParts[urlParts.length - 1];
                }
                
                console.log('[hapusLaporan] Attempting to delete photo:', filename);
                
                const { error: storageError } = await supabase.storage
                    .from('foto_jalan')
                    .remove([filename]);
                
                if (storageError) {
                    console.warn('[hapusLaporan] Failed to delete photo:', storageError);
                    // Lanjutkan hapus data meski foto gagal dihapus
                }
            }
            
            // Hapus baris dari tabel jalan_rusak
            const { error: deleteError } = await supabase
                .from('jalan_rusak')
                .delete()
                .eq('id', id);
            
            if (deleteError) {
                console.error('[hapusLaporan] Error deleting record:', deleteError);
                this.showMessage('Gagal menghapus laporan dari database', 'error');
                return;
            }
            
            this.showMessage('✅ Laporan berhasil dihapus! Marker akan hilang dari peta.', 'success');
            
            // Reload laporan untuk update UI
            await this.loadLaporanValid();
            
            // Refresh marker di peta jika fungsi tersedia
            if (window.refreshJalanRusakMarkers) {
                window.refreshJalanRusakMarkers();
            }
        } catch (err) {
            console.error('[hapusLaporan] Exception:', err);
            this.showMessage('Terjadi kesalahan saat menghapus laporan', 'error');
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

    .btn-proses:hover {
        background: #2563eb !important;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
    }

    .btn-hapus:hover {
        background: #b91c1c !important;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(220, 53, 69, 0.3);
    }

    .btn-proses:active, .btn-hapus:active {
        transform: translateY(0);
    }

    @media (max-width: 600px) {
        .btn-proses, .btn-hapus {
            font-size: 12px !important;
            padding: 6px 10px !important;
        }
        
        .report-actions > div {
            flex-direction: column !important;
        }
        
        .btn-proses, .btn-hapus {
            width: 100% !important;
        }

        #laporanBaruList .report-content {
            flex-direction: column;
        }
        #laporanBaruList .report-media {
            width: 100%;
            height: 180px; /* responsive fixed height on mobile */
            max-height: 40vh;
            flex: 0 0 auto;
        }
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

    #laporanBaruList .report-content {
        padding: 20px;
        display: flex;
        gap: 16px;
        align-items: flex-start;
    }

    #laporanBaruList .report-body {
        flex: 1 1 auto;
        min-width: 0;
    }

    #laporanBaruList .report-media {
        flex: 0 0 auto;
        width: 220px;
        height: 160px; /* fixed box height on desktop */
        display: flex;
        justify-content: center;
        align-items: center;
        background: #f6f7fb;
        border-radius: 10px;
        overflow: hidden;
    }

    #laporanBaruList .report-media img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
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


