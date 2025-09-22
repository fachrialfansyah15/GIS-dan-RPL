// Map functionality for Road Monitor Palu

class RoadMonitorMap {
    constructor() {
        this.map = null;
        this.damageLayer = null;
        this.maintenanceLayer = null;
        this.currentTool = 'select';
        this.selectedReport = null;
        this.init();
    }

    init() {
        this.checkAuth();
        this.initializeMap();
        this.setupEventListeners();
        this.loadMapData();
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

    initializeMap() {
        // Initialize Leaflet map focused on Palu City
        this.map = L.map('map', {
            center: [-0.8966, 119.8756], // Palu City coordinates
            zoom: 13,
            zoomControl: false
        });

        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(this.map);

        // Initialize layers
        this.damageLayer = L.layerGroup().addTo(this.map);
        this.maintenanceLayer = L.layerGroup().addTo(this.map);
    }

    setupEventListeners() {
        // Tool buttons (only select and measure)
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tool = e.currentTarget.dataset.tool;
                if (tool === 'select' || tool === 'measure') {
                    this.setActiveTool(tool);
                }
            });
        });

        // Layer checkboxes
        document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                this.toggleLayer(e.target.id, e.target.checked);
            });
        });

        // Filter controls
        document.getElementById('damageType').addEventListener('change', (e) => {
            this.filterReports('damageType', e.target.value);
        });

        document.getElementById('priority').addEventListener('change', (e) => {
            this.filterReports('priority', e.target.value);
        });

        document.getElementById('status').addEventListener('change', (e) => {
            this.filterReports('status', e.target.value);
        });

        // Map controls
        document.getElementById('zoomIn').addEventListener('click', () => {
            this.map.zoomIn();
        });

        document.getElementById('zoomOut').addEventListener('click', () => {
            this.map.zoomOut();
        });

        document.getElementById('fullscreen').addEventListener('click', () => {
            this.toggleFullscreen();
        });

        document.getElementById('locate').addEventListener('click', () => {
            this.locateUser();
        });

        // Modal controls
        const modal = document.getElementById('reportModal');
        const closeBtn = document.querySelector('.close');
        
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                modal.style.display = 'none';
            });
        }

        window.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });

        // Logout functionality
        const logoutLink = document.getElementById('logoutLink');
        if (logoutLink) {
            logoutLink.addEventListener('click', (e) => {
                e.preventDefault();
                window.auth.logout();
            });
        }
    }

    setActiveTool(tool) {
        // Remove active class from all tools
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        // Add active class to selected tool
        document.querySelector(`[data-tool="${tool}"]`).classList.add('active');
        this.currentTool = tool;

        // Change cursor based on tool
        const mapContainer = document.getElementById('map');
        mapContainer.style.cursor = this.getCursorForTool(tool);

        // Setup tool-specific event handlers
        this.setupToolHandlers();
    }

    getCursorForTool(tool) {
        const cursors = {
            'select': 'pointer',
            'measure': 'crosshair',
            'draw': 'crosshair',
            'report': 'crosshair'
        };
        return cursors[tool] || 'default';
    }

    setupToolHandlers() {
        // Remove existing click handlers
        this.map.off('click');

        // Add new click handler based on current tool
        this.map.on('click', (e) => {
            switch (this.currentTool) {
                case 'select':
                    this.handleMapClick(e);
                    break;
                case 'measure':
                    this.handleMeasureClick(e);
                    break;
                case 'draw':
                    this.handleDrawClick(e);
                    break;
                case 'report':
                    this.handleReportClick(e);
                    break;
            }
        });
    }

    handleMapClick(e) {
        // Find nearest report and show details
        const nearestReport = this.findNearestReport(e.latlng);
        if (nearestReport) {
            this.showReportDetails(nearestReport);
        }
    }

    handleMeasureClick(e) {
        // Add measurement functionality
        this.addMeasurementPoint(e.latlng);
    }

    handleDrawClick(e) {
        // Add drawing functionality
        this.addDrawingPoint(e.latlng);
    }

    handleReportClick(e) {
        // Redirect to report form with coordinates
        const coords = `${e.latlng.lat.toFixed(6)}, ${e.latlng.lng.toFixed(6)}`;
        window.location.href = `report.html?coords=${coords}`;
    }

    loadMapData() {
        this.loadDamageReports();
        this.loadMaintenanceData();
    }

    loadRoadData() {
        // Generate road data for Palu City
        const roads = this.generatePaluRoadData();
        
        roads.forEach(road => {
            const roadLine = L.polyline(road.coordinates, {
                color: this.getRoadColor(road.type),
                weight: this.getRoadWeight(road.type),
                opacity: 0.8
            });

            roadLine.roadData = road;
            roadLine.on('click', (e) => {
                this.showRoadInfo(road);
            });

            this.roadLayer.addLayer(roadLine);
        });
    }

    loadDamageReports() {
        // Load damage reports from localStorage or generate sample data
        const reports = this.getDamageReports();
        
        reports.forEach(report => {
            const marker = this.createReportMarker(report);
            this.damageLayer.addLayer(marker);
        });
    }

    loadMaintenanceData() {
        // Load maintenance data
        const maintenance = this.getMaintenanceData();
        
        maintenance.forEach(item => {
            const marker = this.createMaintenanceMarker(item);
            this.maintenanceLayer.addLayer(marker);
        });
    }

    loadTrafficData() {
        // Load traffic data
        const traffic = this.getTrafficData();
        
        traffic.forEach(item => {
            const marker = this.createTrafficMarker(item);
            this.trafficLayer.addLayer(marker);
        });
    }

    generatePaluRoadData() {
        // Generate sample road data for Palu City
        const baseLat = -0.8966;
        const baseLng = 119.8756;

        return [
            {
                id: 'road-1',
                name: 'Jl. Sudirman',
                type: 'arterial',
                coordinates: [
                    [baseLat - 0.01, baseLng - 0.02],
                    [baseLat, baseLng],
                    [baseLat + 0.01, baseLng + 0.02]
                ]
            },
            {
                id: 'road-2',
                name: 'Jl. Ahmad Yani',
                type: 'arterial',
                coordinates: [
                    [baseLat - 0.02, baseLng - 0.01],
                    [baseLat + 0.02, baseLng + 0.01]
                ]
            },
            {
                id: 'road-3',
                name: 'Jl. Gatot Subroto',
                type: 'local',
                coordinates: [
                    [baseLat - 0.005, baseLng - 0.015],
                    [baseLat + 0.005, baseLng + 0.015]
                ]
            },
            {
                id: 'road-4',
                name: 'Jl. Palu IV',
                type: 'local',
                coordinates: [
                    [baseLat - 0.015, baseLng - 0.005],
                    [baseLat + 0.015, baseLng + 0.005]
                ]
            }
        ];
    }

    getDamageReports() {
        // Prefer user-submitted reports stored by report.js
        const storedReports = localStorage.getItem('roadDamageReports');
        if (storedReports) {
            const allReports = JSON.parse(storedReports);
            // Show reported/in_progress/completed (include reported to visualize new points)
            return allReports.filter(report => 
                report.status === 'reported' ||
                report.status === 'in_progress' || 
                report.status === 'completed'
            ).map(r => ({
                id: r.id,
                type: r.damageType, // now holds Minor/Medium/Severe
                priority: r.priority || 'medium',
                status: r.status,
                location: r.location,
                coordinates: [r.coordinates.lat, r.coordinates.lng],
                description: r.description || '',
                reporter: r.reporter || '',
                date: r.date
            }));
        }

        // Fallback sample data mapped to new severity labels
        return [
            {
                id: 'RPT-001',
                type: 'Severe Damage',
                priority: 'high',
                status: 'reported',
                location: 'Jl. Sudirman',
                coordinates: [-0.8966, 119.8756],
                description: 'Large pothole causing traffic disruption',
                reporter: 'John Doe',
                date: new Date().toISOString()
            },
            {
                id: 'RPT-002',
                type: 'Medium Damage',
                priority: 'medium',
                status: 'in_progress',
                location: 'Jl. Ahmad Yani',
                coordinates: [-0.9000, 119.8800],
                description: 'Multiple cracks on road surface',
                reporter: 'Jane Smith',
                date: new Date(Date.now() - 86400000).toISOString()
            },
            {
                id: 'RPT-003',
                type: 'Severe Damage',
                priority: 'high',
                status: 'reported',
                location: 'Jl. Gatot Subroto',
                coordinates: [-0.8900, 119.8700],
                description: 'Road flooding during heavy rain',
                reporter: 'Mike Johnson',
                date: new Date(Date.now() - 172800000).toISOString()
            }
        ];
    }

    getMaintenanceData() {
        return [
            {
                id: 'MNT-001',
                type: 'repair',
                status: 'in_progress',
                location: 'Jl. Ahmad Yani',
                coordinates: [-0.9000, 119.8800],
                description: 'Road repair in progress',
                startDate: new Date().toISOString(),
                estimatedCompletion: new Date(Date.now() + 86400000).toISOString()
            }
        ];
    }

    getTrafficData() {
        return [
            {
                id: 'TFC-001',
                type: 'congestion',
                level: 'moderate',
                location: 'Jl. Sudirman',
                coordinates: [-0.8966, 119.8756],
                speed: 25,
                timestamp: new Date().toISOString()
            }
        ];
    }

    createReportMarker(report) {
        const icon = this.getReportIcon(report.type, report.priority);
        const marker = L.marker(report.coordinates, { icon });
        
        marker.reportData = report;
        marker.on('click', () => {
            this.showReportDetails(report);
        });

        return marker;
    }

    createMaintenanceMarker(maintenance) {
        const icon = L.divIcon({
            className: 'maintenance-marker',
            html: '<i class="fas fa-tools" style="color: #17a2b8; font-size: 20px;"></i>',
            iconSize: [20, 20],
            iconAnchor: [10, 10]
        });

        const marker = L.marker(maintenance.coordinates, { icon });
        
        marker.bindPopup(`
            <div class="maintenance-popup">
                <h4>Maintenance Work</h4>
                <p><strong>Type:</strong> ${maintenance.type}</p>
                <p><strong>Status:</strong> ${maintenance.status}</p>
                <p><strong>Location:</strong> ${maintenance.location}</p>
                <p><strong>Description:</strong> ${maintenance.description}</p>
            </div>
        `);

        return marker;
    }

    createTrafficMarker(traffic) {
        const color = this.getTrafficColor(traffic.level);
        const marker = L.circleMarker(traffic.coordinates, {
            radius: 8,
            fillColor: color,
            color: '#fff',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8
        });

        marker.bindPopup(`
            <div class="traffic-popup">
                <h4>Traffic Information</h4>
                <p><strong>Level:</strong> ${traffic.level}</p>
                <p><strong>Speed:</strong> ${traffic.speed} km/h</p>
                <p><strong>Location:</strong> ${traffic.location}</p>
            </div>
        `);

        return marker;
    }

    getReportIcon(type, priority) {
        const colors = {
            'Severe Damage': '#dc3545',
            'Medium Damage': '#ffc107',
            'Minor Damage': '#28a745'
        };
        const defaultColor = '#667eea';
        const iconClass = 'fas fa-exclamation-triangle';
        const color = colors[type] || defaultColor;
        return L.divIcon({
            className: 'report-marker',
            html: `<i class="${iconClass}" style="color: ${color}; font-size: 20px;"></i>`,
            iconSize: [20, 20],
            iconAnchor: [10, 10]
        });
    }

    getRoadColor(type) {
        const colors = {
            'highway': '#2E8B57',
            'arterial': '#4169E1',
            'local': '#808080'
        };
        return colors[type] || '#808080';
    }

    getRoadWeight(type) {
        const weights = {
            'highway': 6,
            'arterial': 4,
            'local': 2
        };
        return weights[type] || 2;
    }

    getTrafficColor(level) {
        const colors = {
            'normal': '#2E8B57',
            'moderate': '#FFD700',
            'heavy': '#FF6347'
        };
        return colors[level] || '#2E8B57';
    }

    toggleLayer(layerId, visible) {
        switch (layerId) {
            case 'damage':
                if (visible) {
                    this.map.addLayer(this.damageLayer);
                } else {
                    this.map.removeLayer(this.damageLayer);
                }
                break;
            case 'maintenance':
                if (visible) {
                    this.map.addLayer(this.maintenanceLayer);
                } else {
                    this.map.removeLayer(this.maintenanceLayer);
                }
                break;
        }
    }

    filterReports(filterType, value) {
        this.damageLayer.eachLayer(layer => {
            if (!layer.reportData) return;
            const report = layer.reportData;
            let show = true;

            switch (filterType) {
                case 'damageType':
                    show = value === 'all' || report.type === value;
                    break;
                case 'priority':
                    show = value === 'all' || (report.priority || 'medium') === value;
                    break;
                case 'status':
                    show = value === 'all' || report.status === value;
                    break;
            }

            if (show) {
                layer.setOpacity(1);
            } else {
                layer.setOpacity(0.3);
            }
        });
    }

    findNearestReport(latlng) {
        let nearestReport = null;
        let minDistance = Infinity;

        this.damageLayer.eachLayer(layer => {
            if (layer.reportData) {
                const distance = this.calculateDistance(latlng, layer.getLatLng());
                if (distance < minDistance) {
                    minDistance = distance;
                    nearestReport = layer.reportData;
                }
            }
        });

        return nearestReport;
    }

    calculateDistance(latlng1, latlng2) {
        const R = 6371e3; // Earth's radius in meters
        const φ1 = latlng1.lat * Math.PI / 180;
        const φ2 = latlng2.lat * Math.PI / 180;
        const Δφ = (latlng2.lat - latlng1.lat) * Math.PI / 180;
        const Δλ = (latlng2.lng - latlng1.lng) * Math.PI / 180;

        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ/2) * Math.sin(Δλ/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

        return R * c;
    }

    showReportDetails(report) {
        document.getElementById('reportId').textContent = report.id;
        document.getElementById('reportLocation').textContent = report.location;
        document.getElementById('damageType').textContent = report.type;
        document.getElementById('reportPriority').textContent = (report.priority || '').toString().charAt(0).toUpperCase() + (report.priority || '').toString().slice(1);
        document.getElementById('reportStatus').textContent = report.status.charAt(0).toUpperCase() + report.status.slice(1);
        document.getElementById('reportedBy').textContent = report.reporter;
        document.getElementById('reportDate').textContent = new Date(report.date).toLocaleString();
        document.getElementById('reportDescription').textContent = report.description;

        document.getElementById('reportModal').style.display = 'block';
    }

    showRoadInfo(road) {
        alert(`Road Information:\n\nName: ${road.name}\nType: ${road.type}\nID: ${road.id}`);
    }

    addMeasurementPoint(latlng) {
        const marker = L.marker(latlng, {
            icon: L.divIcon({
                className: 'measurement-marker',
                html: '<i class="fas fa-ruler" style="color: #FF6347; font-size: 16px;"></i>',
                iconSize: [16, 16],
                iconAnchor: [8, 8]
            })
        }).addTo(this.map);

        marker.bindPopup(`Measurement Point<br>Lat: ${latlng.lat.toFixed(6)}<br>Lng: ${latlng.lng.toFixed(6)}`);
    }

    addDrawingPoint(latlng) {
        const marker = L.marker(latlng, {
            icon: L.divIcon({
                className: 'drawing-marker',
                html: '<i class="fas fa-pencil-alt" style="color: #32CD32; font-size: 16px;"></i>',
                iconSize: [16, 16],
                iconAnchor: [8, 8]
            })
        }).addTo(this.map);

        marker.bindPopup(`Drawing Point<br>Lat: ${latlng.lat.toFixed(6)}<br>Lng: ${latlng.lng.toFixed(6)}`);
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().then(() => {
                // Resize map after entering fullscreen
                setTimeout(() => {
                    this.map.invalidateSize();
                }, 100);
            });
        } else {
            document.exitFullscreen().then(() => {
                // Resize map after exiting fullscreen
                setTimeout(() => {
                    this.map.invalidateSize();
                }, 100);
            });
        }
    }

    locateUser() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((position) => {
                const userLatLng = [position.coords.latitude, position.coords.longitude];
                this.map.setView(userLatLng, 15);
                
                // Add user location marker
                L.marker(userLatLng, {
                    icon: L.divIcon({
                        className: 'user-location-marker',
                        html: '<i class="fas fa-crosshairs" style="color: #667eea; font-size: 20px;"></i>',
                        iconSize: [20, 20],
                        iconAnchor: [10, 10]
                    })
                }).addTo(this.map).bindPopup('Your Location').openPopup();
            });
        } else {
            alert('Geolocation is not supported by this browser.');
        }
    }
}

// Initialize map when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new RoadMonitorMap();
});

