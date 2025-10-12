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

// === MUAT DATA LAPORAN YANG BELUM DIVALIDASI ===
async function loadPendingReports() {
  if (!assertAdminOrRedirect()) return;
  const { data, error } = await supabaseClient
    .from("jalan_rusak")
    .select("*")
    .eq("status", "pending");

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
    btn.addEventListener("click", () => ubahStatusLaporan(btn.dataset.id, "disetujui"))
  );

  document.querySelectorAll(".reject-btn").forEach((btn) =>
    btn.addEventListener("click", () => ubahStatusLaporan(btn.dataset.id, "ditolak"))
  );
}

// === UPDATE STATUS LAPORAN ===
async function ubahStatusLaporan(id, statusBaru) {
  if (!assertAdminOrRedirect()) return;
  const { error } = await supabaseClient
    .from("jalan_rusak")
    .update({ status: statusBaru })
    .eq("id", id);

  if (error) {
    alert("Gagal memperbarui status laporan.");
    console.error(error);
  } else {
    alert(`Laporan berhasil diubah menjadi '${statusBaru}'.`);
    loadPendingReports();
  }
}

// === JALANKAN SAAT HALAMAN DIBUKA ===
loadPendingReports();
