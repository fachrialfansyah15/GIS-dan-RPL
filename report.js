// Report functionality for Road Monitor Palu

class ReportForm {
    constructor() {
        this.map = null;
        this.selectedLocation = null;
        this.photoFile = null;
        this.init();
    }

    init() {
        this.checkAuth();
        this.initializeLocationMap();
        this.setupEventListeners();
        this.loadFormData();
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

    initializeLocationMap() {
        // Initialize map for location selection
        this.map = L.map('locationMap', {
            center: [-0.8966, 119.8756], // Palu City coordinates
            zoom: 13,
            zoomControl: false
        });

        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(this.map);

        // Add click handler for location selection
        this.map.on('click', (e) => {
            this.selectLocation(e.latlng);
        });

        // Add existing damage reports to map
        this.addExistingReports();
    }

    addExistingReports() {
        const reports = this.getExistingReports();
        reports.forEach(report => {
            const marker = L.marker(report.coordinates, {
                icon: L.divIcon({
                    className: 'existing-report-marker',
                    html: `<i class="fas fa-exclamation-triangle" style="color: #dc3545; font-size: 16px;"></i>`,
                    iconSize: [16, 16],
                    iconAnchor: [8, 8]
                })
            }).addTo(this.map);

            marker.bindPopup(`
                <div class="existing-report-popup">
                    <h4>Existing Report</h4>
                    <p><strong>Type:</strong> ${report.type}</p>
                    <p><strong>Priority:</strong> ${report.priority}</p>
                    <p><strong>Status:</strong> ${report.status}</p>
                </div>
            `);
        });
    }

    getExistingReports() {
        const storedReports = localStorage.getItem('roadDamageReports');
        if (storedReports) {
            return JSON.parse(storedReports);
        }
        return [];
    }

    setupEventListeners() {
        // Form submission
        const form = document.getElementById('damageReportForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleFormSubmission();
            });
        }

        // Preview button
        const previewBtn = document.getElementById('previewBtn');
        if (previewBtn) {
            previewBtn.addEventListener('click', () => {
                this.showPreview();
            });
        }

        // File upload (single road photo)
        const fileInput = document.getElementById('roadPhoto');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                this.photoFile = e.target.files && e.target.files[0] ? e.target.files[0] : null;
                this.handleFilePreview(this.photoFile);
            });
        }

        // Modal controls
        this.setupModalControls();

        // Logout functionality
        const logoutLink = document.getElementById('logoutLink');
        if (logoutLink) {
            logoutLink.addEventListener('click', (e) => {
                e.preventDefault();
                window.auth.logout();
            });
        }
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
                e.stopPropagation();
                if (quickMenu.classList.contains('open')) {
                    closeMenu();
                } else {
                    openMenu();
                }
            };
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

    setupModalControls() {
        // Preview modal
        const previewModal = document.getElementById('previewModal');
        const previewClose = previewModal.querySelector('.close');
        
        if (previewClose) {
            previewClose.addEventListener('click', () => {
                previewModal.style.display = 'none';
            });
        }

        // Success modal
        const successModal = document.getElementById('successModal');
        const successClose = successModal.querySelector('.close');
        
        if (successClose) {
            successClose.addEventListener('click', () => {
                successModal.style.display = 'none';
            });
        }

        // Modal action buttons
        const editReportBtn = document.getElementById('editReport');
        const confirmSubmitBtn = document.getElementById('confirmSubmit');
        const viewReportBtn = document.getElementById('viewReport');
        const newReportBtn = document.getElementById('newReport');

        if (editReportBtn) {
            editReportBtn.addEventListener('click', () => {
                previewModal.style.display = 'none';
            });
        }

        if (confirmSubmitBtn) {
            confirmSubmitBtn.addEventListener('click', () => {
                this.submitReport();
            });
        }

        if (viewReportBtn) {
            viewReportBtn.addEventListener('click', () => {
                window.location.href = 'reports.html';
            });
        }

        if (newReportBtn) {
            newReportBtn.addEventListener('click', () => {
                window.location.href = 'report.html';
            });
        }

        // Close modals when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target === previewModal) {
                previewModal.style.display = 'none';
            }
            if (e.target === successModal) {
                successModal.style.display = 'none';
            }
        });
    }

    loadFormData() {
        // Check for coordinates from URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const coords = urlParams.get('coords');
        
        if (coords) {
            const [lat, lng] = coords.split(',').map(coord => parseFloat(coord.trim()));
            this.selectLocation({ lat, lng });
        }

        // Pre-fill reporter name if available
        const reporterName = document.getElementById('reporterName');
        if (reporterName && window.auth.getCurrentUser()) {
            reporterName.value = window.auth.getCurrentUser();
        }
    }

    selectLocation(latlng) {
        // Remove existing location marker
        if (this.locationMarker) {
            this.map.removeLayer(this.locationMarker);
        }

        // Add new location marker
        this.locationMarker = L.marker(latlng, {
            icon: L.divIcon({
                className: 'selected-location-marker',
                html: '<i class="fas fa-map-pin" style="color: #667eea; font-size: 24px;"></i>',
                iconSize: [24, 24],
                iconAnchor: [12, 24]
            })
        }).addTo(this.map);

        // Update coordinates field
        const coordinatesField = document.getElementById('coordinates');
        if (coordinatesField) {
            coordinatesField.value = `${latlng.lat.toFixed(6)}, ${latlng.lng.toFixed(6)}`;
        }

        // No reverse geocoding required for new schema. Street captured via input.

        this.selectedLocation = latlng;
    }

    // reverseGeocode removed per new requirements

    handleFilePreview(file) {
        const preview = document.getElementById('filePreview');
        if (!preview) return;
        preview.innerHTML = '';
        if (!file || !file.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const previewItem = document.createElement('div');
            previewItem.className = 'file-preview-item';
            previewItem.innerHTML = `
                <img src="${e.target.result}" alt="Preview">
                <button class="remove-file" onclick="this.parentElement.remove()">&times;</button>
            `;
            preview.appendChild(previewItem);
        };
        reader.readAsDataURL(file);
    }

    showPreview() {
        const formData = this.getFormData();
        
        if (!this.validateFormData(formData)) {
            return;
        }

        const previewContent = document.getElementById('previewContent');
        previewContent.innerHTML = `
            <div class="preview-section">
                <h4>Report Information</h4>
                <div class="preview-row">
                    <span class="preview-label">Damage Type:</span>
                    <span class="preview-value">${formData.damageSeverity}</span>
                </div>
                <div class="preview-row">
                    <span class="preview-label">Priority:</span>
                    <span class="preview-value">${formData.priority || 'Not specified'}</span>
                </div>
                <div class="preview-row">
                    <span class="preview-label">Street Name:</span>
                    <span class="preview-value">${formData.streetName}</span>
                </div>
                <div class="preview-row">
                    <span class="preview-label">Coordinates:</span>
                    <span class="preview-value">${formData.coordinates}</span>
                </div>
                <div class="preview-row">
                    <span class="preview-label">Description:</span>
                    <span class="preview-value">${formData.description || 'Not provided'}</span>
                </div>
                <div class="preview-row">
                    <span class="preview-label">Reporter:</span>
                    <span class="preview-value">${formData.reporterName}</span>
                </div>
                <div class="preview-row">
                    <span class="preview-label">Email:</span>
                    <span class="preview-value">${formData.reporterEmail || 'Not provided'}</span>
                </div>
                <div class="preview-row">
                    <span class="preview-label">Phone:</span>
                    <span class="preview-value">${formData.reporterPhone || 'Not provided'}</span>
                </div>
            </div>
        `;

        document.getElementById('previewModal').style.display = 'block';
    }

    getFormData() {
        return {
            damageSeverity: document.getElementById('damageSeverity').value,
            priority: document.getElementById('priority').value,
            streetName: document.getElementById('streetName').value,
            coordinates: document.getElementById('coordinates').value,
            description: document.getElementById('description').value,
            reporterName: document.getElementById('reporterName').value,
            reporterEmail: document.getElementById('reporterEmail').value,
            reporterPhone: document.getElementById('reporterPhone').value,
        };
    }

    validateFormData(data) {
        const required = ['damageSeverity', 'streetName', 'reporterName'];
        
        for (const field of required) {
            if (!data[field]) {
                this.showMessage(`Please fill in the ${field.replace(/([A-Z])/g, ' $1').toLowerCase()} field`, 'error');
                return false;
            }
        }

        if (!this.selectedLocation) {
            this.showMessage('Please select a location on the map', 'error');
            return false;
        }

        return true;
    }

    submitReport() {
        const formData = this.getFormData();
        
        if (!this.validateFormData(formData)) {
            return;
        }

        // Build geometry WKT (Point) for PostGIS
        const latitude = this.selectedLocation.lat;
        const longitude = this.selectedLocation.lng;
        const geom = `POINT(${longitude} ${latitude})`;

        // Simulate photo path/link (frontend placeholder). In real app, backend/uploads returns these.
        let fotoJalan = '';
        let fotoPath = '';
        if (this.photoFile) {
            fotoJalan = 'gdrive://placeholder-link';
            fotoPath = `/uploads/${this.photoFile.name}`;
        }

        const payload = {
            jalan_rusak: {
                nama_jalan: formData.streetName,
                jenis_kerusakan: formData.damageSeverity,
                latitude: latitude,
                longitude: longitude,
                geom: geom,
                foto_jalan: fotoJalan,
                foto_path: fotoPath
            },
            reporter: {
                name: formData.reporterName,
                email: formData.reporterEmail || '',
                phone: formData.reporterPhone || ''
            },
            additional: {
                priority: formData.priority || '',
                description: formData.description || ''
            }
        };

        // Persist original-style report locally (optional for in-app listing)
        const report = {
            id: 'RPT-' + Date.now().toString().slice(-6),
            damageType: formData.damageSeverity,
            priority: formData.priority || 'reported',
            location: formData.streetName,
            coordinates: this.selectedLocation,
            description: formData.description || '',
            reporter: window.auth.getCurrentUser(),
            status: 'reported',
            date: new Date().toISOString()
        };
        this.saveReport(report);

        // For now, show JSON payload as preview of what will be sent to backend
        console.log('Payload to submit:', payload);
        window.localStorage.setItem('last_report_payload', JSON.stringify(payload));

        // Show success modal
        this.showSuccessModal(report);

        // Close preview modal
        document.getElementById('previewModal').style.display = 'none';
    }

    saveReport(report) {
        const existingReports = this.getExistingReports();
        existingReports.push(report);
        localStorage.setItem('roadDamageReports', JSON.stringify(existingReports));
    }

    showSuccessModal(report) {
        const reportSummary = document.getElementById('reportSummary');
        reportSummary.innerHTML = `
            <div class="success-details">
                <div class="success-row">
                    <span class="success-label">Report ID:</span>
                    <span class="success-value">${report.id}</span>
                </div>
                <div class="success-row">
                    <span class="success-label">Street:</span>
                    <span class="success-value">${report.location}</span>
                </div>
                <div class="success-row">
                    <span class="success-label">Damage Type:</span>
                    <span class="success-value">${report.damageType}</span>
                </div>
                <div class="success-row">
                    <span class="success-label">Priority:</span>
                    <span class="success-value">${report.priority}</span>
                </div>
                <div class="success-row">
                    <span class="success-label">Submitted:</span>
                    <span class="success-value">${new Date().toLocaleString()}</span>
                </div>
            </div>
        `;

        document.getElementById('successModal').style.display = 'block';
    }

    handleFormSubmission() {
        this.showPreview();
    }

    showMessage(message, type) {
        // Create message element
        const messageDiv = document.createElement('div');
        messageDiv.className = `report-message ${type}`;
        messageDiv.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-triangle'}"></i>
            <span>${message}</span>
        `;

        // Add styles
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
            ${type === 'success' ? 'background: #28a745;' : 'background: #dc3545;'}
        `;

        document.body.appendChild(messageDiv);

        // Remove after 5 seconds
        setTimeout(() => {
            messageDiv.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (messageDiv.parentNode) {
                    messageDiv.parentNode.removeChild(messageDiv);
                }
            }, 300);
        }, 5000);
    }
}

// Initialize report form when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ReportForm();
});

// Add preview styles
const previewStyles = document.createElement('style');
previewStyles.textContent = `
    .preview-section {
        margin-bottom: 20px;
    }

    .preview-section h4 {
        color: #333;
        margin-bottom: 15px;
        font-size: 18px;
        font-weight: 600;
    }

    .preview-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 0;
        border-bottom: 1px solid #f0f0f0;
    }

    .preview-row:last-child {
        border-bottom: none;
    }

    .preview-label {
        font-weight: 500;
        color: #666;
        font-size: 14px;
    }

    .preview-value {
        color: #333;
        font-size: 14px;
        font-weight: 600;
        text-align: right;
        max-width: 60%;
        word-wrap: break-word;
    }

    .success-details {
        background: #f8f9fa;
        padding: 20px;
        border-radius: 8px;
        margin-top: 15px;
    }

    .success-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 0;
        border-bottom: 1px solid #e9ecef;
    }

    .success-row:last-child {
        border-bottom: none;
    }

    .success-label {
        font-weight: 500;
        color: #666;
        font-size: 14px;
    }

    .success-value {
        color: #333;
        font-size: 14px;
        font-weight: 600;
    }

    .modal-footer {
        padding: 20px;
        border-top: 1px solid #e0e0e0;
        display: flex;
        gap: 15px;
        justify-content: flex-end;
    }

    .modal-header.success {
        background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
    }

    .modal-header.success h3 {
        color: white;
        display: flex;
        align-items: center;
        gap: 10px;
    }

    .modal-header.success h3 i {
        color: white;
    }
`;
document.head.appendChild(previewStyles);

