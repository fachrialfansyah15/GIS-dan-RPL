// Supabase Configuration
window.SUPABASE_URL = 'https://cxcxatowzymfpasesrvp.supabase.co';
window.SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN4Y3hhdG93enltZnBhc2VzcnZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwMTY0MDIsImV4cCI6MjA3NTU5MjQwMn0.klPbBM_u-UvlG5DTMmZxRIXuczpqqLfupJUZW0gMRa0';

(function () {
  // Initialize Supabase client
  const supabase = window.supabase?.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);
  
  if (!supabase) {
    console.error("[map.js] Supabase client not initialized. Check if Supabase CDN is loaded.");
  }

  // Mobile hamburger -> quick actions overlay
  function setupHamburgerMenu() {
    const toggle = document.getElementById('quickActionsToggle');
    const menu = document.getElementById('quickActionsMenu');
    const backdrop = document.getElementById('quickActionsBackdrop');

    if (!toggle || !menu || !backdrop) return;

    const closeMenu = () => {
      menu.classList.remove('open');
      backdrop.classList.remove('show');
      // Recalculate map size after layout changes
      if (window._map) setTimeout(() => window._map.invalidateSize(), 150);
    };

    const openMenu = () => {
      menu.classList.add('open');
      backdrop.classList.add('show');
      if (window._map) setTimeout(() => window._map.invalidateSize(), 150);
    };

    const handleToggle = (e) => {
      e.stopPropagation();
      if (e.cancelable) e.preventDefault();
      if (menu.classList.contains('open')) closeMenu();
      else openMenu();
    };

    // Open instantly on touch devices
    toggle.addEventListener('touchstart', handleToggle, { passive: false });
    // Fallback for click (desktop and some mobiles)
    toggle.addEventListener('click', handleToggle);

    backdrop.addEventListener('click', closeMenu);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeMenu();
    });
  }

  // Ensure map resizes correctly on viewport changes (mobile orientation, etc.)
  function setupResizeInvalidate() {
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (window._map) window._map.invalidateSize();
      }, 150);
    });
  }

  // Simple toast banner (non-blocking) for errors/info
  function showToast(message, type = 'error') {
    let el = document.getElementById('app-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'app-toast';
      el.style.cssText = 'position:fixed; top:70px; left:50%; transform:translateX(-50%); z-index:9999; background:#fff; color:#333; border:1px solid #e5e7eb; box-shadow:0 6px 18px rgba(0,0,0,0.15); border-radius:10px; padding:10px 14px; font-size:14px;';
      document.body.appendChild(el);
    }
    el.style.background = type === 'error' ? '#fff' : '#ecfdf5';
    el.style.borderColor = type === 'error' ? '#e5e7eb' : '#10b981';
    el.style.color = '#333';
    el.textContent = message;
    el.style.display = 'block';
    clearTimeout(el._t);
    el._t = setTimeout(() => { el.style.display = 'none'; }, 4000);
  }

  // Guard for Supabase credentials
  if (!window.SUPABASE_URL || !window.SUPABASE_KEY) {
    console.warn('[map.js] Missing SUPABASE_URL or SUPABASE_KEY');
    showToast('Konfigurasi Supabase tidak ditemukan. Cek pengaturan.', 'error');
  }
  
  // Bucket name untuk foto
  const BUCKET_FOTO_JALAN = "foto_jalan";

  // Inject tooltip CSS once for better border/size fit
  function ensureTooltipStyles() {
    if (document.getElementById('leaflet-tooltip-own-style')) return;
    const style = document.createElement('style');
    style.id = 'leaflet-tooltip-own-style';
    style.textContent = `
      .leaflet-tooltip-own {
        padding: 8px 10px;
        border-radius: 8px;
        line-height: 1.35;
        white-space: normal;
        max-width: 260px;
      }
      .leaflet-tooltip-own b { font-weight: 700; }
      .leaflet-tooltip-own img { display:block; }
    `;
    document.head.appendChild(style);
  }

  // Map bounds - Kota Palu dengan 8 Kecamatan (diperlebar untuk panning)
  // Kecamatan: Palu Barat, Palu Selatan, Palu Timur, Palu Utara, Tatanga, Ulujadi, Mantikulore, Tawaeli
  // Koordinat mencakup seluruh wilayah administratif Kota Palu + buffer untuk panning
  const boundsPalu = L.latLngBounds(
    [-0.98, 119.78], // Southwest corner (batas selatan-barat) - diperlebar
    [-0.80, 119.94]  // Northeast corner (batas utara-timur) - diperlebar
  );

  // Legend filter for severity (clickable)
  let activeLegendFilter = 'all'; // 'all', 'Rusak Berat', 'Rusak Sedang', 'Rusak Ringan'

  function normalizeSeverity(val) {
    if (!val) return '';
    const s = String(val).toLowerCase();
    if (s.includes('berat')) return 'Rusak Berat';
    if (s.includes('sedang')) return 'Rusak Sedang';
    if (s.includes('ringan')) return 'Rusak Ringan';
    return val;
  }

  function severityColor(sev) {
    const n = normalizeSeverity(sev);
    if (n === 'Rusak Berat') return '#dc3545'; // red
    if (n === 'Rusak Sedang') return '#ff8c00'; // orange
    if (n === 'Rusak Ringan') return '#ffd31a'; // yellow
    return '#3b82f6'; // fallback blue
  }

  function createSeverityIcon(sev) {
    const color = severityColor(sev);
    const html = `
      <div style="width:26px;height:38px;">
        <svg width="26" height="38" viewBox="0 0 26 38" xmlns="http://www.w3.org/2000/svg">
          <path d="M13 0C5.82 0 0 5.82 0 13c0 8.35 9.74 19.33 11.95 21.73.56.6 1.54.6 2.1 0C16.26 32.33 26 21.35 26 13 26 5.82 20.18 0 13 0z" fill="${color}" />
          <circle cx="13" cy="13" r="5.5" fill="#ffffff"/>
        </svg>
      </div>`;
    return L.divIcon({ className: 'severity-marker', html, iconSize: [26, 38], iconAnchor: [13, 38], popupAnchor: [0, -30], tooltipAnchor: [0, -32] });
  }

  // Initialize map function
  function initializeMap() {
    if (window._roadMonitorMapInitialized) return;
    
    const mapElement = document.getElementById('map');
    if (!mapElement) {
      console.error('[map.js] Map element #map not found!');
      return;
    }
    
    console.log('[map.js] Map element found:', mapElement);
    console.log('[map.js] Map element dimensions:', mapElement.offsetWidth, 'x', mapElement.offsetHeight);
    
    window._map = L.map('map', {
      center: [-0.900, 119.870], // Kota Palu center
      zoom: 12,
      minZoom: 11,
      maxZoom: 18,
      zoomControl: false, // We'll add it to bottomright
      preferCanvas: false
    });

    console.log('[map.js] Leaflet map object created:', window._map);

    // Add tile layer
    const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(window._map);
    
    tileLayer.on('loading', () => console.log('[map.js] Tiles loading...'));
    tileLayer.on('load', () => console.log('[map.js] Tiles loaded!'));
    tileLayer.on('tileerror', (e) => console.error('[map.js] Tile error:', e));

    // Note: All controls (zoom, locate) moved to custom HTML buttons
    // No Leaflet controls added to map - using HTML buttons in map-controls div instead

    // Note: Legend moved to sidebar - no floating legend on map

    // Free panning enabled (no max bounds)
    
    // Layer groups
    window._damageLayer = L.layerGroup().addTo(window._map);
    window._maintenanceLayer = L.layerGroup(); // add as needed
    
    // Tambahkan marker default di pusat Kota Palu
    const paluCenterMarker = L.marker([-0.898, 119.870], {
      icon: L.divIcon({
        className: 'palu-center-marker',
        html: '<i class="fas fa-map-marker-alt" style="color: #667eea; font-size: 32px;"></i>',
        iconSize: [32, 32],
        iconAnchor: [16, 32]
      })
    }).addTo(window._map);
    paluCenterMarker.bindPopup('<strong>Kota Palu</strong><br/>Pusat Kota');
    
    window._roadMonitorMapInitialized = true;
    
    // Force map to recalculate size after initialization (multiple attempts)
    setTimeout(() => {
      if (window._map) {
        window._map.invalidateSize();
        console.log('[map.js] Map size invalidated and refreshed (100ms)');
      }
    }, 100);
    
    setTimeout(() => {
      if (window._map) {
        window._map.invalidateSize();
        console.log('[map.js] Map size invalidated and refreshed (500ms)');
      }
    }, 500);
    
    // Auto-locate user position (dengan pengecekan bounds)
    autoLocateUserWithBounds(window._map, boundsPalu);
  } // End of initializeMap function

  function getMapAndLayers() {
    return {
      map: window._map,
      damageLayer: window._damageLayer
    };
  }

  // Helpers: read different cases of column names (safe)
  function getVal(row, ...keys) {
    for (const k of keys) {
      if (Object.prototype.hasOwnProperty.call(row, k) && row[k] !== null && row[k] !== undefined) return row[k];
    }
    return null;
  }

  // Helper: Get photo URL from Supabase storage
  function getPhotoUrl(fotoJalanUrl) {
    if (!fotoJalanUrl) {
      console.log('[map.js] No foto_jalan URL provided');
      return null;
    }
    // Normalisasi dan trim
    let url = String(fotoJalanUrl).trim();
    
    // Kolom foto_jalan sudah berisi URL lengkap dari Supabase Storage
    // Format: https://cxcxatowzymfpasesrvp.supabase.co/storage/v1/object/public/foto_jalan/JR-PU-001.jpg
    if (url.startsWith('http')) {
      console.log('[map.js] Using full URL from database:', url);
      return url;
    }
    
    // Fallback: jika hanya nama file, generate URL
    try {
      const { data: publicURL } = supabase.storage
        .from('foto_jalan')
        .getPublicUrl(url);
      
      const imageURL = publicURL?.publicUrl || null;
      console.log('[map.js] Generated public URL:', imageURL);
      return imageURL;
    } catch (error) {
      console.error('[map.js] Error generating photo URL:', error);
      return null;
    }
  }

  // Render popup content sesuai format yang diminta
  function renderPopupContent(row) {
    // Ambil data dari kolom yang sesuai dengan struktur tabel
    const namaJalan = row.nama_jalan || 'Jalan Tidak Diketahui';
    const jenisKerusakan = row.jenis_kerusakan || 'Tidak dispesifikasi';
    const fotoPath = row.foto_jalan;
    
    console.log(`[map.js] Creating popup for: ${namaJalan}, foto_jalan: ${fotoPath}`);
    
    // Get photo URL dari storage
    const imageURL = getPhotoUrl(fotoPath);
    
    // Build foto HTML sesuai format yang diminta
    let fotoHtml = '';
    if (imageURL) {
      // Fixed pixel width so it doesn't scale with map zoom
      fotoHtml = `<img src="${imageURL}" style="margin-top:8px; border-radius:10px; display:block; width:300px; height:auto; max-width:300px;" onerror="this.style.display='none';">`;
    }

    // Format popup sesuai permintaan
    return `
      <div style="font-family:Arial,sans-serif; min-width:240px;">
        <b>Nama Jalan:</b> ${namaJalan}<br>
        <b>Jenis Kerusakan:</b> ${jenisKerusakan}<br>
        ${fotoHtml}
      </div>
    `;
  }

  // Clear markers
  function clearLayers() {
    if (window._damageLayer) window._damageLayer.clearLayers();
  }

  // Apply filters from UI
  function getActiveFilters() {
    const tipe = (document.getElementById('damageType')?.value || 'all');
    const status = (document.getElementById('statusFilter')?.value || 'all');
    return { tipe, status, legendFilter: activeLegendFilter };
  }

  // Load markers from Supabase table "jalan_rusak"
  async function loadMarkersFromSupabase() {
    if (!supabase) {
      console.error('[map.js] supabase not initialized');
      return;
    }

    console.log('[map.js] Loading markers from jalan_rusak table...');
    
    try {
      // Ambil semua data dari tabel jalan_rusak (status banyak yang NULL)
      const { data, error } = await supabase
        .from('jalan_rusak')
        .select('*');

      if (error) {
        console.error('[map.js] Supabase select error:', error);
        showToast('Gagal memuat data dari Supabase: ' + error.message, 'error');
        return;
      }
      
      if (!Array.isArray(data)) {
        console.warn('[map.js] Data is not an array');
        return;
      }

      console.log(`[map.js] Fetched ${data.length} records from jalan_rusak`);

      clearLayers();

      const { tipe, status, legendFilter } = getActiveFilters();

      let countActive = 0, countProcessing = 0, countCompleted = 0;
      let validMarkers = 0;

      data.forEach((row, index) => {
        // Ambil koordinat dari kolom Latitude dan Longitude (HURUF BESAR DI AWAL!)
        const lat = parseFloat(row.Latitude);
        const lng = parseFloat(row.Longitude);

        console.log(`[map.js] Row ${index} (${row.nama_jalan}): Latitude=${lat}, Longitude=${lng}`);

        // Validasi koordinat
        if (isNaN(lat) || isNaN(lng)) {
          console.warn(`[map.js] Invalid coordinates for ${row.nama_jalan}: lat=${lat}, lng=${lng}`);
          return;
        }
        
        validMarkers++;

        const jenis = getVal(row, 'jenis_kerusakan', 'Jenis Kerusakan') || '';
        const stat = String(getVal(row, 'status') || '').toLowerCase();

        // Map status from table jalan_rusak to UI buckets
        // aktif -> Active; pending/in_progress/disetujui -> Processing; selesai/completed/ditolak -> Completed
        if (!stat || stat === 'aktif') countActive++;
        else if (['pending','in_progress','disetujui','proses'].includes(stat)) countProcessing++;
        else if (['selesai','completed','ditolak'].includes(stat)) countCompleted++;
        else countActive++; // fallback

        // apply filters
        if (tipe !== 'all' && jenis !== tipe) return;
        if (status !== 'all' && stat !== status) return;
        // apply legend filter
        if (legendFilter !== 'all' && normalizeSeverity(jenis) !== legendFilter) return;

        // Build popup and marker
        const popup = renderPopupContent(row);
        // Colored icon based on severity
        const marker = L.marker([lat, lng], { icon: createSeverityIcon(jenis) });

        // Tooltip pada hover: tampilkan info vertikal + foto di bawah
        const tooltipImageUrl = getPhotoUrl(row.foto_jalan);
        const tooltipHtml = `
          <div style="font-family:Arial,sans-serif; max-width:240px;">
            <div><b>Nama Jalan:</b> ${row.nama_jalan || '-'}</div>
            <div style="margin-top:4px;"><b>Jenis Kerusakan:</b> ${row.jenis_kerusakan || '-'}</div>
            ${tooltipImageUrl ? `<img src="${tooltipImageUrl}" style="margin-top:6px; width:180px; height:auto; border-radius:8px; display:block;" onerror="this.style.display='none';">` : ''}
          </div>
        `;
        marker.bindTooltip(tooltipHtml, { direction: 'top', offset: [0, -10], sticky: true, opacity: 0.95, className: 'leaflet-tooltip-own' });

        // Bind popup dengan ukuran yang sesuai (klik untuk membuka)
        marker.bindPopup(popup, { maxWidth: 300, minWidth: 220 });

        // Tooltip akan sticky saat hover; tidak perlu open/close manual

        marker.on('popupopen', () => {
          console.log('[map.js] Popup opened for:', row.nama_jalan);
        });

        window._damageLayer.addLayer(marker);
      });

      // update stats UI (both desktop and mobile views)
      const statActiveEl = document.getElementById('statActive');
      const statProcessingEl = document.getElementById('statProcessing');
      const statCompletedEl = document.getElementById('statCompleted');
      const statActiveMobileEl = document.getElementById('statActiveMobile');
      const statProcessingMobileEl = document.getElementById('statProcessingMobile');
      const statCompletedMobileEl = document.getElementById('statCompletedMobile');
      
      if (statActiveEl) statActiveEl.textContent = countActive;
      if (statProcessingEl) statProcessingEl.textContent = countProcessing;
      if (statCompletedEl) statCompletedEl.textContent = countCompleted;
      if (statActiveMobileEl) statActiveMobileEl.textContent = countActive;
      if (statProcessingMobileEl) statProcessingMobileEl.textContent = countProcessing;
      if (statCompletedMobileEl) statCompletedMobileEl.textContent = countCompleted;

      console.log(`[map.js] Successfully loaded ${validMarkers} valid markers out of ${data.length} records`);
      console.log('[map.js] Total markers on map:', window._damageLayer.getLayers().length);
      
      if (validMarkers === 0) {
        console.warn('[map.js] No valid markers found! Check if Latitude/Longitude columns have data.');
      }
    } catch (err) {
      console.error('[map.js] load error', err);
    }
  }

  // Open modal and fill details
  function openReportModal(row) {
    const kode = getVal(row, 'kode_titik_jalan', 'kode_titik', 'kode_titik_jalan') || '-';
    const nama = getVal(row, 'nama_jalan') || '-';
    const jenis = getVal(row, 'jenis_kerusakan') || '-';
    const tanggal = getVal(row, 'tanggal_survey') || '-';
    const status = getVal(row, 'status') || '-';
    const foto = buildPublicUrl(getVal(row, 'foto_jalan')) || '';

    document.getElementById('reportId').textContent = kode;
    document.getElementById('reportLocation').textContent = nama;
    document.getElementById('damageType').textContent = jenis;
    document.getElementById('reportPriority').textContent = (row.priority || '-');
    document.getElementById('reportStatus').textContent = status;
    document.getElementById('reportedBy').textContent = (row.reporter || '-');
    document.getElementById('reportDate').textContent = tanggal;
    document.getElementById('reportDescription').textContent = (row.description || '-');

    // show modal
    const modal = document.getElementById('reportModal');
    if (modal) modal.style.display = 'block';
  }

  // close modal handlers
  (function setupModal() {
    const modal = document.getElementById('reportModal');
    const closeBtn = document.querySelector('.modal .close');
    if (closeBtn) closeBtn.addEventListener('click', () => { if (modal) modal.style.display = 'none'; });
    window.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });
  })();

  // Wire UI events (filters, layer toggles, map controls)
  function setupUIHandlers() {
    // Filter changes
    const dmgSelect = document.getElementById('damageType');
    const statusSelect = document.getElementById('statusFilter');
    if (dmgSelect) dmgSelect.addEventListener('change', loadMarkersFromSupabase);
    if (statusSelect) statusSelect.addEventListener('change', loadMarkersFromSupabase);

    // Layer toggles (damage / maintenance)
    const damageCheckbox = document.getElementById('damage');
    if (damageCheckbox) damageCheckbox.addEventListener('change', (e) => {
      if (e.target.checked) window._map.addLayer(window._damageLayer); 
      else window._map.removeLayer(window._damageLayer);
    });

    // Custom zoom buttons
    const zoomInBtn = document.getElementById('zoomIn');
    const zoomOutBtn = document.getElementById('zoomOut');
    const locateBtn = document.getElementById('locate');
    
    if (zoomInBtn) {
      zoomInBtn.addEventListener('click', () => {
        if (window._map) window._map.zoomIn();
      });
    }
    
    if (zoomOutBtn) {
      zoomOutBtn.addEventListener('click', () => {
        if (window._map) window._map.zoomOut();
      });
    }
    
    if (locateBtn) {
      locateBtn.addEventListener('click', () => {
        autoLocateUserWithBounds(window._map, boundsPalu);
      });
    }
    
    // Mobile: Toggle map tools sidebar via tools dropdown
    const toolsToggle = document.getElementById('toolsToggle');
    const mapSidebar = document.querySelector('.map-box-container .sidebar');
    
    if (toolsToggle && mapSidebar) {
      toolsToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        mapSidebar.classList.toggle('mobile-open');
        
        // Toggle chevron icon
        const chevron = toolsToggle.querySelector('.fa-chevron-down, .fa-chevron-up');
        if (chevron) {
          chevron.classList.toggle('fa-chevron-down');
          chevron.classList.toggle('fa-chevron-up');
        }
      });
      
      // Close sidebar when clicking outside (mobile only)
      document.addEventListener('click', (e) => {
        if (window.innerWidth <= 900) {
          if (!mapSidebar.contains(e.target) && !toolsToggle.contains(e.target)) {
            mapSidebar.classList.remove('mobile-open');
            const chevron = toolsToggle.querySelector('.fa-chevron-up');
            if (chevron) {
              chevron.classList.remove('fa-chevron-up');
              chevron.classList.add('fa-chevron-down');
            }
          }
        }
      });
    }

    // --- Mobile bottom bar chips ---
    const sidebarEl = document.querySelector('.map-box-container .sidebar');
    function openSidebarAndFocus(sectionTitle) {
      if (!sidebarEl) return;
      if (!sidebarEl.classList.contains('mobile-open')) sidebarEl.classList.add('mobile-open');
      // try to focus by heading text
      const headers = Array.from(sidebarEl.querySelectorAll('h3'));
      const target = headers.find(h => h.textContent.trim().toLowerCase() === sectionTitle.toLowerCase());
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // rotate chevron on toolsToggle to "open" state
      const chevron = toolsToggle?.querySelector('.fa-chevron-down, .fa-chevron-up');
      if (chevron && chevron.classList.contains('fa-chevron-down')) {
        chevron.classList.remove('fa-chevron-down');
        chevron.classList.add('fa-chevron-up');
      }
      // keep map sized
      if (window._map) setTimeout(() => window._map.invalidateSize(), 150);
    }

    const chipStats = document.getElementById('chipStats');
    const chipTools = document.getElementById('chipTools');
    const chipLegend = document.getElementById('chipLegend');
    const chipLocate = document.getElementById('chipLocate');
    const chipZoomIn = document.getElementById('chipZoomIn');

    if (chipStats) chipStats.addEventListener('click', () => openSidebarAndFocus('Statistik'));
    if (chipTools) chipTools.addEventListener('click', () => openSidebarAndFocus('Alat Peta'));
    if (chipLegend) chipLegend.addEventListener('click', () => openSidebarAndFocus('Legenda'));
    if (chipLocate) chipLocate.addEventListener('click', () => {
      const btn = document.getElementById('locate');
      if (btn) btn.click();
    });
    if (chipZoomIn) chipZoomIn.addEventListener('click', () => {
      const btn = document.getElementById('zoomIn');
      if (btn) btn.click();
    });
  }

  // Auto-locate user position dengan pengecekan bounds
  function autoLocateUserWithBounds(map, bounds) {
    if (navigator.geolocation) {
      console.log('[map.js] Attempting to locate user position...');
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLat = position.coords.latitude;
          const userLng = position.coords.longitude;
          const userLatLng = L.latLng(userLat, userLng);
          
          console.log(`[map.js] User location found: ${userLat}, ${userLng}`);
          
          // Cek apakah lokasi user dalam bounds Palu
          if (bounds.contains(userLatLng)) {
            // Lokasi dalam area Palu, zoom ke lokasi user
            map.setView([userLat, userLng], 14);
          } else {
            console.log('[map.js] User location outside Palu bounds, staying at default view');
            // Lokasi di luar Palu, tetap di view default
          }
        },
        (error) => {
          console.warn('[map.js] Geolocation failed:', error.message);
          // Tetap di view default Palu
        },
        {
          enableHighAccuracy: false,
          timeout: 5000,
          maximumAge: 60000
        }
      );
    }
  }

  // Location selection mode untuk form laporan
  function enableLocationSelectionMode() {
    console.log('[map.js] Location selection mode enabled');
    
    // Tampilkan notifikasi
    const notification = document.createElement('div');
    notification.id = 'locationSelectNotif';
    notification.style.cssText = 'position: fixed; top: 80px; left: 50%; transform: translateX(-50%); background: #667eea; color: white; padding: 12px 24px; border-radius: 8px; z-index: 10000; box-shadow: 0 4px 12px rgba(0,0,0,0.2); font-weight: 500;';
    notification.innerHTML = '<i class="fas fa-map-marker-alt"></i> Klik pada peta untuk memilih lokasi';
    document.body.appendChild(notification);
    
    // Tambahkan marker sementara untuk selection
    let selectionMarker = null;
    
    // Handler untuk klik peta
    const clickHandler = (e) => {
      const { lat, lng } = e.latlng;
      
      console.log(`[map.js] Location selected: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
      
      // Hapus marker lama
      if (selectionMarker) {
        window._map.removeLayer(selectionMarker);
      }
      
      // Tambah marker baru
      selectionMarker = L.marker([lat, lng], {
        icon: L.divIcon({
          className: 'selection-marker',
          html: '<i class="fas fa-map-pin" style="color: #e74c3c; font-size: 36px;"></i>',
          iconSize: [36, 36],
          iconAnchor: [18, 36]
        })
      }).addTo(window._map);
      
      // Update notifikasi
      notification.innerHTML = `<i class="fas fa-check-circle"></i> Lokasi dipilih! Mengalihkan ke form...`;
      notification.style.background = '#28a745';
      
      // Auto redirect ke report.html dengan koordinat di URL params
      setTimeout(() => {
        window.location.href = `report.html?lat=${lat.toFixed(6)}&lng=${lng.toFixed(6)}`;
      }, 800); // Delay 0.8s untuk user melihat konfirmasi
    };
    
    window._map.on('click', clickHandler);
    
    // Simpan handler untuk cleanup
    window._locationSelectHandler = clickHandler;
  }
  
  // Cek apakah mode selection aktif (dari query parameter)
  function checkLocationSelectionMode() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('selectLocation') === 'true') {
      enableLocationSelectionMode();
    }
  }

  // Mobile sidebar toggle
  function setupMobileSidebar() {
    const sidebar = document.getElementById('mapSidebar');
    const toggle = document.getElementById('sidebarToggle');
    const backdrop = document.getElementById('sidebarBackdrop');
    
    if (!sidebar || !toggle || !backdrop) return;
    
    // Toggle sidebar
    toggle.addEventListener('click', () => {
      sidebar.classList.toggle('active');
      backdrop.classList.toggle('active');
    });
    
    // Close sidebar when clicking backdrop
    backdrop.addEventListener('click', () => {
      sidebar.classList.remove('active');
      backdrop.classList.remove('active');
    });
    
    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', (e) => {
      if (window.innerWidth <= 900) {
        if (!sidebar.contains(e.target) && !toggle.contains(e.target) && sidebar.classList.contains('active')) {
          sidebar.classList.remove('active');
          backdrop.classList.remove('active');
        }
      }
    });
  }

  // Initial load
  document.addEventListener('DOMContentLoaded', () => {
    console.log('[map.js] DOM loaded, initializing map...');
    ensureTooltipStyles();
    initializeMap(); // Initialize map FIRST
    setupUIHandlers();
    setupMobileSidebar(); // Setup mobile sidebar toggle
    setupHamburgerMenu(); // Mobile hamburger -> quick actions
    setupResizeInvalidate(); // Keep map sized on viewport changes
    loadMarkersFromSupabase();
    checkLocationSelectionMode(); // Cek mode selection
    // expose refresh fn
    window.refreshJalanRusakMarkers = loadMarkersFromSupabase;
  });

})();
