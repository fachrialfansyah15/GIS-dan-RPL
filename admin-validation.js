// Use global Supabase config (set in HTML) to avoid duplicate declarations
const supabaseClient = window.supabase?.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);
if (!supabaseClient) {
  console.error('[admin-validation] Supabase client not initialized');
}

// Guard: Only allow admins
function assertAdminOrRedirect() {
  const isAdmin = !!(window.auth && window.auth.isUserAdmin && window.auth.isUserAdmin());
  if (!isAdmin) {
    alert('Akses ditolak. Hanya admin yang dapat melakukan validasi laporan.');
    // Optional: redirect to dashboard
    try { window.location.href = 'dashboard.html'; } catch (_) {}
    return false;
  }
  return true;
}

// === INISIALISASI PETA ===
const map = L.map("validationMap").setView([-0.898, 119.870], 13);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap kontributor"
}).addTo(map);

let markersLayer = L.layerGroup().addTo(map);

// === MUAT DATA LAPORAN MASUK (menunggu validasi) ===
async function loadPendingReports() {
  if (!assertAdminOrRedirect()) return;
  const { data, error } = await supabaseClient
    .from("laporan_masuk")
    .select("*")
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Gagal memuat data:", error);
    alert("Terjadi kesalahan saat mengambil data laporan.");
    return;
  }

  const tableBody = document.getElementById("validationBody");
  tableBody.innerHTML = "";
  markersLayer.clearLayers();

  if (data.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align:center; color:gray;">
          Tidak ada laporan yang menunggu validasi.
        </td>
      </tr>`;
    return;
  }

  data.forEach((laporan) => {
    const row = document.createElement("tr");
    // foto_jalan di DB bisa berupa URL penuh atau hanya nama file
    let fotoURL = null;
    if (laporan.foto_jalan) {
      const raw = String(laporan.foto_jalan).trim();
      if (raw.startsWith('http')) {
        fotoURL = raw;
      } else if (window.SUPABASE_URL) {
        // Build public URL (assumes bucket is public)
        fotoURL = `${window.SUPABASE_URL}/storage/v1/object/public/foto_jalan/${raw}`;
      }
    }

    row.innerHTML = `
      <td>${laporan.id}</td>
      <td>${new Date(laporan.created_at).toLocaleString("id-ID")}</td>
      <td>${laporan.nama_jalan}</td>
      <td>${laporan.jenis_kerusakan}</td>
      <td>
        ${fotoURL ? `<img src="${fotoURL}" alt="Foto Jalan" style="width: 80px; border-radius: 6px;" onerror="this.style.display='none';">` : '-'}
      </td>
      <td>${laporan.Latitude}</td>
      <td>${laporan.Longitude}</td>
      <td>
        <button class="approve-btn" data-id="${laporan.id}">Setujui</button>
        <button class="reject-btn" data-id="${laporan.id}">Tolak</button>
      </td>
    `;

    tableBody.appendChild(row);

    const marker = L.marker([laporan.Latitude, laporan.Longitude])
      .bindPopup(`<b>${laporan.nama_jalan}</b><br>${laporan.jenis_kerusakan}`)
      .addTo(markersLayer);
  });

  // === EVENT UNTUK TOMBOL SETUJUI / TOLAK ===
  document.querySelectorAll(".approve-btn").forEach((btn) =>
    btn.addEventListener("click", () => setujuiLaporan(btn.dataset.id))
  );

  document.querySelectorAll(".reject-btn").forEach((btn) =>
    btn.addEventListener("click", () => tolakLaporan(btn.dataset.id))
  );
}

// === SETUJUI: pindahkan dari laporan_masuk ke jalan_rusak dengan admin_id ===
async function setujuiLaporan(id) {
  if (!assertAdminOrRedirect()) return;
  try {
    const adminId = window.auth?.getUserId ? window.auth.getUserId() : null;
    if (!adminId || !window.auth?.isUserAdmin()) {
      alert('Akses ditolak.');
      return;
    }
    const { data: src, error: e1 } = await supabaseClient.from('laporan_masuk').select('*').eq('id', id).single();
    if (e1 || !src) throw e1 || new Error('Tidak ditemukan');

    const insertData = {
      tanggal_survey: src.tanggal_survey,
      nama_jalan: src.nama_jalan,
      jenis_kerusakan: src.jenis_kerusakan,
      foto_jalan: src.foto_jalan,
      Latitude: src.Latitude,
      Longitude: src.Longitude,
      status: 'pending',
      user_id: src.user_id || null,
      admin_id: adminId
    };
    const { error: e2 } = await supabaseClient.from('jalan_rusak').insert([insertData]);
    if (e2) throw e2;
    const { error: e3 } = await supabaseClient.from('laporan_masuk').delete().eq('id', id);
    if (e3) console.warn('gagal hapus sumber:', e3);
    alert('Laporan disetujui dan dipindahkan.');
    loadPendingReports();
  } catch (err) {
    console.error(err);
    alert('Gagal menyetujui laporan.');
  }
}

// === TOLAK: update status di laporan_masuk ===
async function tolakLaporan(id) {
  if (!assertAdminOrRedirect()) return;
  const { error } = await supabaseClient.from('laporan_masuk').update({ status: 'ditolak' }).eq('id', id);
  if (error) {
    alert('Gagal menolak laporan.');
  } else {
    alert('Laporan ditolak.');
    loadPendingReports();
  }
}

// === JALANKAN SAAT HALAMAN DIBUKA ===
loadPendingReports();
