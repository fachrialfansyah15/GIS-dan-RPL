# Changelog - SIPATUJU

## [Update] - Status Pengerjaan Feature

### ✨ Fitur Baru

#### 1. Marker Icon Baru
- **Marker Proses** (Biru dengan ikon wrench)
  - Digunakan untuk laporan dengan `status_pengerjaan = "proses"`
  - Lokasi: `/public/icons/marker-proses.svg`
  - Ukuran: 40x40px

- **Marker Selesai** (Hijau dengan ikon check)
  - Lokasi: `/public/icons/marker-selesai.svg`
  - Ukuran: 40x40px
  - Note: Tidak digunakan karena data selesai akan dihapus

#### 2. Filter Status Pengerjaan di Peta
- Dropdown baru di `map.html`: "Status Pengerjaan"
- Opsi:
  - Semua Status
  - Dalam Proses
- Filter bekerja bersama dengan filter jenis kerusakan

#### 3. Tombol Aksi di Reports Page (Admin Only)

**Tombol "Proses"** (Biru)
- Icon: ⚙️ wrench
- Fungsi: Mengubah `status_pengerjaan` menjadi "proses"
- Efek: Marker di peta berubah menjadi ikon biru
- Auto-reload card dan refresh marker

**Tombol "Hapus (Selesai)"** (Merah)
- Icon: 🗑️ trash
- Fungsi: Menghapus laporan dari database
- Konfirmasi 2 langkah:
  1. "Apakah Anda yakin ingin menghapus laporan ini?"
  2. "Data yang dihapus tidak bisa dikembalikan. Yakin ingin melanjutkan?"
- Menghapus:
  - Baris dari tabel `jalan_rusak`
  - File foto dari bucket `foto_jalan` (opsional)
  - Marker dari peta

### 🔧 Perubahan Teknis

#### File yang Dimodifikasi:

1. **map.js**
   - Tambah definisi `markerIconProses` dan `markerIconSelesai`
   - Update logika marker untuk cek `status_pengerjaan`
   - Tambah filter `statusPengerjaanFilter`
   - Update `getActiveFilters()` dan `loadMarkersFromSupabase()`

2. **map.html**
   - Tambah dropdown filter "Status Pengerjaan"
   - ID: `statusPengerjaanFilter`

3. **reports.js**
   - Tambah fungsi `prosesLaporan(id)`
   - Tambah fungsi `hapusLaporan(id, fotoPath)`
   - Update `loadLaporanValid()` untuk render tombol
   - Tambah event listeners untuk tombol
   - Tambah CSS hover effects

4. **reports.html**
   - Tidak ada perubahan HTML (tombol di-generate dinamis)

#### Database Schema:

Kolom baru yang digunakan:
```sql
-- Tabel: jalan_rusak
status_pengerjaan VARCHAR(50) NULL
-- Nilai: null | "proses"
```

### 📱 Responsivitas

- Tombol menyesuaikan ukuran di mobile
- Layout berubah menjadi vertikal di layar < 600px
- Status badge tetap terlihat di semua ukuran layar

### 🔐 Keamanan

- Tombol hanya muncul untuk admin
- Validasi role di fungsi `prosesLaporan()` dan `hapusLaporan()`
- Double confirmation untuk delete

### 🎨 UI/UX

- Hover effects pada tombol (transform + shadow)
- Loading state dengan icon spinner
- Toast notifications untuk feedback
- Status badge "Dalam Proses" dengan animated cog icon

### 📝 Catatan

- Marker "selesai" tidak digunakan karena data akan dihapus
- Foto dihapus dari storage saat laporan dihapus
- Refresh otomatis untuk sinkronisasi peta dan list

### 🐛 Bug Fixes

- Fix duplicate variable `statusPengerjaan` di map.js
- Fix layout status badge di card

---

## Cara Menggunakan

### Admin:
1. Login sebagai admin
2. Buka halaman "Semua Laporan"
3. Lihat box "Laporan yang sudah di validasi admin"
4. Klik "Proses" untuk menandai laporan sedang dikerjakan
5. Klik "Hapus" untuk menghapus laporan yang sudah selesai

### User:
1. Buka halaman "Tampilan Peta"
2. Gunakan filter "Status Pengerjaan" untuk melihat:
   - Semua laporan
   - Hanya laporan dalam proses (marker biru)
3. Marker biru = sedang diproses
4. Marker warna lain = berdasarkan jenis kerusakan

---

## Testing Checklist

- [x] Marker proses muncul dengan benar
- [x] Filter status pengerjaan berfungsi
- [x] Tombol Proses mengubah status_pengerjaan
- [x] Tombol Hapus menghapus data dari database
- [x] Foto terhapus dari storage
- [x] Marker refresh setelah aksi
- [x] Card reload setelah aksi
- [x] Responsif di mobile
- [x] Admin-only validation
- [x] Double confirmation untuk delete
