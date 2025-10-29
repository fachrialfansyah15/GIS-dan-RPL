// Gunakan Supabase config dari window (sudah di-set di HTML)
const supabase = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);
// Try multiple bucket ids to be resilient to dash/underscore differences
const BUCKET_CANDIDATES = Array.isArray(window.SUPABASE_BUCKETS) && window.SUPABASE_BUCKETS.length
  ? window.SUPABASE_BUCKETS
  : ["foto_jalan", "foto-jalan"]; // defaults

console.log("[report.js] Supabase client initialized from window config"); 

// Inisialisasi peta Leaflet - Fokus ke Kota Palu
const map = L.map("mapPreview", {
  zoomControl: false // Disable default zoom control
}).setView([-0.898, 119.870], 13); 

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap contributors",
  maxZoom: 19
}).addTo(map);

// Marker untuk menandai lokasi yang dipilih
let marker = null;

// Bounds Kota Palu (untuk validasi) - diperluas agar mencakup Tawaeli (utara)
const boundsPalu = L.latLngBounds(
  [-1.02, 119.72],  // Southwest (lebih lebar)
  [-0.70, 120.02]   // Northeast (menjangkau Tawaeli + buffer)
);

// ========== Reverse Geocoding Function ==========
async function reverseGeocode(lat, lng) {
  try {
    console.log(`[Reverse Geocoding] Fetching address for: ${lat}, ${lng}`);
    
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'SIPATUJU Road Monitor App'
        }
      }
    );
    
    const data = await response.json();
    
    if (data && data.address) {
      // Prioritas: road > suburb > city_district > neighbourhood
      const roadName = data.address.road || 
                      data.address.suburb || 
                      data.address.city_district || 
                      data.address.neighbourhood ||
                      'Jalan tidak diketahui';
      
      console.log(`[Reverse Geocoding] Road name found: ${roadName}`);
      
      // Auto-fill field nama jalan
      const streetNameInput = document.getElementById('streetName');
      if (streetNameInput) {
        streetNameInput.value = roadName;
        console.log(`[Reverse Geocoding] Street name filled: ${roadName}`);
      }
      
      return roadName;
    } else {
      console.warn('[Reverse Geocoding] No address found');
      return 'Jalan tidak diketahui';
    }
  } catch (error) {
    console.error('[Reverse Geocoding] Error:', error);
    return 'Jalan tidak diketahui';
  }
}

// Event handler untuk klik pada peta (onMapClick)
map.on("click", async (e) => {
  const { lat, lng } = e.latlng;
  
  // Validasi lokasi harus di dalam bounds Palu
  if (!boundsPalu.contains([lat, lng])) {
    alert("⚠️ Lokasi yang dipilih harus di dalam wilayah Kota Palu!");
    return;
  }
  
  // Hapus marker lama jika ada
  if (marker) marker.remove();
  
  // Tambahkan marker baru di lokasi yang diklik
  marker = L.marker([lat, lng]).addTo(map);
  
  // Auto-fill form fields dengan koordinat
  document.getElementById("coordinates").value = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  document.getElementById("latitude").value = lat.toFixed(6);
  document.getElementById("longitude").value = lng.toFixed(6);
  
  console.log(`Lokasi dipilih: Lat ${lat.toFixed(6)}, Lng ${lng.toFixed(6)}`);
  
  // Auto-fill nama jalan dengan reverse geocoding
  await reverseGeocode(lat, lng);
});

// ========== Load koordinat dari URL params atau localStorage ==========
async function loadSelectedLocation() {
  // Cek URL params terlebih dahulu (dari redirect map.html)
  const urlParams = new URLSearchParams(window.location.search);
  let selectedLat = urlParams.get("lat");
  let selectedLng = urlParams.get("lng");
  
  // Jika tidak ada di URL, cek localStorage
  if (!selectedLat || !selectedLng) {
    selectedLat = localStorage.getItem("selectedLat");
    selectedLng = localStorage.getItem("selectedLng");
  }
  
  if (selectedLat && selectedLng) {
    // Isi form dengan koordinat yang dipilih
    document.getElementById("coordinates").value = `${selectedLat}, ${selectedLng}`;
    document.getElementById("latitude").value = selectedLat;
    document.getElementById("longitude").value = selectedLng;
    
    // Update marker di peta
    const lat = parseFloat(selectedLat);
    const lng = parseFloat(selectedLng);
    
    if (!isNaN(lat) && !isNaN(lng)) {
      if (marker) marker.remove();
      marker = L.marker([lat, lng]).addTo(map);
      map.setView([lat, lng], 15);
      
      // Auto-fill nama jalan dengan reverse geocoding
      await reverseGeocode(lat, lng);
    }
    
    // Hapus dari localStorage dan clean URL
    localStorage.removeItem("selectedLat");
    localStorage.removeItem("selectedLng");
    if (urlParams.has("lat")) {
      window.history.replaceState({}, document.title, "report.html");
    }
    
    // Tampilkan notifikasi sukses
    const notification = document.createElement("div");
    notification.style.cssText = "position: fixed; top: 80px; left: 50%; transform: translateX(-50%); background: #28a745; color: white; padding: 12px 24px; border-radius: 8px; z-index: 10000; box-shadow: 0 4px 12px rgba(0,0,0,0.2);";
    notification.innerHTML = '<i class="fas fa-check-circle"></i> Lokasi berhasil dipilih dari peta!';
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }
}

// ========== Auto Geolocate ==========
function handleGeolocate() {
  if (!navigator.geolocation) {
    alert("⚠️ Browser Anda tidak mendukung geolocation");
    return;
  }
  
  console.log("[report.js] Attempting to get user location...");
  
  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      
      console.log(`[report.js] User location: ${lat}, ${lng}`);
      
      // Validasi apakah di dalam bounds Palu
      if (!boundsPalu.contains([lat, lng])) {
        alert("⚠️ Lokasi Anda berada di luar wilayah Kota Palu. Silakan pilih lokasi secara manual.");
        return;
      }
      
      // Set marker di lokasi user
      if (marker) marker.remove();
      marker = L.marker([lat, lng]).addTo(map);
      map.setView([lat, lng], 16);
      
      // Update form
      document.getElementById("coordinates").value = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      document.getElementById("latitude").value = lat.toFixed(6);
      document.getElementById("longitude").value = lng.toFixed(6);
      
      console.log("[report.js] Location set to user position");
      
      // Auto-fill nama jalan dengan reverse geocoding
      await reverseGeocode(lat, lng);
    },
    (error) => {
      console.error("[report.js] Geolocation error:", error);
      alert("⚠️ Tidak dapat mengakses lokasi Anda. Pastikan Anda mengizinkan akses lokasi di browser.");
    }
  );
}

// ========== Inisialisasi saat DOM ready ==========
document.addEventListener("DOMContentLoaded", () => {
  console.log("[report.js] DOM loaded, initializing...");
  
  // Load koordinat dari URL/localStorage jika ada
  loadSelectedLocation();
  
  // Setup tombol geolocate
  const geolocateBtn = document.getElementById("geolocateBtn");
  if (geolocateBtn) {
    geolocateBtn.addEventListener("click", handleGeolocate);
    console.log("[report.js] Geolocate button initialized");
  }
  
  // Setup tombol full map
  const fullMapBtn = document.getElementById("fullMapBtn");
  if (fullMapBtn) {
    fullMapBtn.addEventListener("click", () => {
      console.log("[report.js] Redirecting to full map for location selection");
      window.location.href = "map.html?selectLocation=true";
    });
    console.log("[report.js] Full map button initialized");
  }
});

// ========== Preview Foto ==========
const roadPhotoInput = document.getElementById("roadPhoto");
const filePreview = document.getElementById("filePreview");

roadPhotoInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = () => {
      filePreview.innerHTML = `<img src="${reader.result}" alt="Preview" style="max-width:100%;border-radius:8px;margin-top:8px;">`;
    };
    reader.readAsDataURL(file);
  }
});

// ========== Submit Form ==========
const form = document.getElementById("damageReportForm");
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const formData = new FormData(form);
  const nama_jalan = formData.get("streetName");
  const jenis_kerusakan = formData.get("damageSeverity");
  const koordinat = formData.get("coordinates");
  const deskripsi = formData.get("description");
  const reporter = formData.get("reporterName");
  const tanggal_survey = new Date().toLocaleDateString("id-ID");

  // Ambil koordinat dari field terpisah (lebih reliable)
  const latitudeInput = formData.get("latitude");
  const longitudeInput = formData.get("longitude");
  
  // Pastikan koordinat valid
  if (!latitudeInput || !longitudeInput) {
    alert("Pilih lokasi pada peta terlebih dahulu.");
    return;
  }
  
  const Latitude = parseFloat(latitudeInput);
  const Longitude = parseFloat(longitudeInput);
  
  if (isNaN(Latitude) || isNaN(Longitude)) {
    alert("Koordinat tidak valid. Silakan pilih lokasi di peta.");
    return;
  }

  // Upload foto ke Supabase Storage (coba beberapa bucket candidates)
  let foto_jalan_url = null;
  const file = formData.get("roadPhoto");
  if (file && file.name) {
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

    let lastErr = null;
    for (const bucketId of BUCKET_CANDIDATES) {
      const { error: upErr } = await supabase.storage
        .from(bucketId)
        .upload(fileName, file, { contentType: file.type || undefined });
      if (!upErr) {
        const { data } = supabase.storage.from(bucketId).getPublicUrl(fileName);
        foto_jalan_url = data.publicUrl;
        break;
      } else {
        lastErr = upErr;
      }
    }

    if (!foto_jalan_url) {
      console.error("[report] upload error", lastErr);
      alert("Gagal mengunggah foto jalan.");
      return;
    }
  }

  // Ambil user_id dari sesi auth
  let user_id = null;
  try { user_id = window.auth?.getUserId ? window.auth.getUserId() : null; } catch (_) {}
  if (!user_id) {
    alert("Anda harus login untuk mengirim laporan.");
    return;
  }

  // Insert ke tabel laporan_masuk dengan user_id dan status awal
  const { error: insertError } = await supabase.from("laporan_masuk").insert([
    {
      tanggal_survey,
      nama_jalan,
      jenis_kerusakan,
      foto_jalan: foto_jalan_url,
      Latitude,
      Longitude,
      user_id,
      status: 'reported'
    },
  ]);

  if (insertError) {
    console.error(insertError);
    alert("Gagal mengirim laporan!");
  } else {
    alert("✅ Laporan berhasil dikirim!");
    form.reset();
    filePreview.innerHTML = "";
    if (marker) marker.remove();
  }
});
