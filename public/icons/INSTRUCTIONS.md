# Instruksi Generate Marker Icons PNG

## Cara 1: Menggunakan HTML Generator (Recommended)

1. Buka file `generate-icons.html` di browser
2. Anda akan melihat 2 ikon yang sudah ter-render:
   - Marker Proses (Biru dengan wrench)
   - Marker Selesai (Hijau dengan check)
3. Klik tombol "Download PNG" di bawah setiap ikon
4. Simpan file dengan nama yang sesuai:
   - `marker-proses.png`
   - `marker-selesai.png`
5. File PNG siap digunakan!

## Cara 2: Menggunakan SVG Langsung

File SVG sudah tersedia dan bisa langsung digunakan di Leaflet:
- `marker-proses.svg`
- `marker-selesai.svg`

Leaflet mendukung SVG secara native, jadi tidak perlu konversi ke PNG.

## Cara 3: Konversi Manual dengan Tool Online

Jika Anda ingin konversi manual:

1. Buka https://cloudconvert.com/svg-to-png
2. Upload file SVG (`marker-proses.svg` atau `marker-selesai.svg`)
3. Set ukuran output: 40x40 pixels
4. Convert dan download

## Spesifikasi Ikon

### Marker Proses
- **Warna**: Biru (#3b82f6)
- **Icon**: Wrench (kunci pas)
- **Ukuran**: 40x40 px
- **Format**: PNG dengan transparansi
- **Background**: Circle dengan border putih

### Marker Selesai
- **Warna**: Hijau (#10b981)
- **Icon**: Check mark (centang)
- **Ukuran**: 40x40 px
- **Format**: PNG dengan transparansi
- **Background**: Circle dengan border putih

## Penggunaan di Kode

Ikon sudah terintegrasi di `map.js`:

```javascript
const markerIconProses = L.icon({
    iconUrl: '/public/icons/marker-proses.svg',
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -35]
});
```

## Troubleshooting

**Q: Ikon tidak muncul di peta?**
A: Pastikan path `/public/icons/` dapat diakses dari web server Anda. Jika menggunakan live server, pastikan folder `public` ada di root project.

**Q: Ingin mengubah warna ikon?**
A: Edit file SVG dan ubah nilai `fill` pada element `<circle>`:
- Biru: `#3b82f6`
- Hijau: `#10b981`
- Merah: `#dc3545`
- Orange: `#ff8c00`

**Q: Ingin mengubah ukuran ikon?**
A: Edit di `map.js` pada property `iconSize: [width, height]`

## Notes

- SVG lebih direkomendasikan karena scalable dan ukuran file lebih kecil
- PNG diperlukan jika browser tidak support SVG (sangat jarang)
- Ikon marker-selesai tidak digunakan dalam aplikasi (data selesai akan dihapus)
