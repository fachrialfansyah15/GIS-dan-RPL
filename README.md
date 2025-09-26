# GIS dan RPL Project

## 📖 Deskripsi
Repository ini berisi project integrasi **Sistem Informasi Geografis (GIS)** dengan **Rekayasa Perangkat Lunak (RPL)**.

## 🚀 Fitur Utama
- **Pemetaan digital** dengan teknologi GIS
- **Analisis spasial** dan visualisasi data
- **Web-based application** untuk akses mudah
- **Database terintegrasi** untuk penyimpanan data geografis

## 🛠️ Teknologi yang Digunakan
- **Frontend:** HTML, CSS, JavaScript, Leaflet.js
- **Backend:** Python, Django/Flask
- **Database:** PostgreSQL dengan PostGIS
- **GIS Tools:** QGIS, GeoPandas

## 📦 Instalasi

### Prerequisites
- Python 3.8+
- PostgreSQL dengan ekstensi PostGIS
- Git

### Langkah Instalasi
```bash
# Clone repository
git clone https://github.com/fachrialfansyah15/GIS-dan-RPL.git
cd GIS-dan-RPL

# Install dependencies
pip install -r requirements.txt

# Setup database
python manage.py migrate

# Run aplikasi
python manage.py runserver
