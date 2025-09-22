// Web GIS Road Monitoring App JavaScript

class RoadMonitoringApp {
    constructor() {
        this.map = null;
        this.roadLayer = null;
        this.trafficLayer = null;
        this.incidentLayer = null;
        this.weatherLayer = null;
        this.currentTool = 'select';
        this.selectedRoad = null;
        
        this.init();
    }

    init() {
        this.initializeMap();
        this.setupEventListeners();
        this.loadRoadData();
        this.loadTrafficData();
        this.loadIncidentData();
        this.setupToolHandlers();
    }

    initializeMap() {
        // Initialize Leaflet map
        this.map = L.map('map', {
            center: [-6.2088, 106.8456], // Jakarta coordinates
            zoom: 12,
            zoomControl: false
        });

        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(this.map);

        // Add custom zoom controls
        L.control.zoom({
            position: 'topright'
        }).addTo(this.map);

        // Initialize layers
        this.roadLayer = L.layerGroup().addTo(this.map);
        this.trafficLayer = L.layerGroup().addTo(this.map);
        this.incidentLayer = L.layerGroup().addTo(this.map);
        this.weatherLayer = L.layerGroup().addTo(this.map);
    }

    setupEventListeners() {
        // Tool buttons
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setActiveTool(e.currentTarget.dataset.tool);
            });
        });

        // Layer checkboxes
        document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                this.toggleLayer(e.target.id, e.target.checked);
            });
        });

        // Filter controls
        document.getElementById('roadType').addEventListener('change', (e) => {
            this.filterRoads(e.target.value);
        });

        document.getElementById('timeRange').addEventListener('change', (e) => {
            this.filterByTimeRange(e.target.value);
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
        const modal = document.getElementById('roadModal');
        const closeBtn = document.querySelector('.close');
        
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });

        window.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
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
    }

    getCursorForTool(tool) {
        const cursors = {
            'select': 'pointer',
            'measure': 'crosshair',
            'draw': 'crosshair',
            'analyze': 'help'
        };
        return cursors[tool] || 'default';
    }

    setupToolHandlers() {
        this.map.on('click', (e) => {
            if (this.currentTool === 'select') {
                this.handleMapClick(e);
            } else if (this.currentTool === 'measure') {
                this.handleMeasureClick(e);
            } else if (this.currentTool === 'draw') {
                this.handleDrawClick(e);
            } else if (this.currentTool === 'analyze') {
                this.handleAnalyzeClick(e);
            }
        });
    }

    handleMapClick(e) {
        // Find nearest road and show details
        const nearestRoad = this.findNearestRoad(e.latlng);
        if (nearestRoad) {
            this.showRoadDetails(nearestRoad);
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

    handleAnalyzeClick(e) {
        // Add analysis functionality
        this.performAnalysis(e.latlng);
    }

    loadRoadData() {
        // Simulate road data loading
        const roadData = this.generateRoadData();
        
        roadData.forEach(road => {
            const roadLine = L.polyline(road.coordinates, {
                color: this.getRoadColor(road.type),
                weight: this.getRoadWeight(road.type),
                opacity: 0.8
            });

            roadLine.roadData = road;
            roadLine.on('click', (e) => {
                this.showRoadDetails(road);
            });

            this.roadLayer.addLayer(roadLine);
        });
    }

    loadTrafficData() {
        // Simulate traffic data
        const trafficData = this.generateTrafficData();
        
        trafficData.forEach(traffic => {
            const marker = L.circleMarker(traffic.position, {
                radius: 8,
                fillColor: this.getTrafficColor(traffic.level),
                color: '#fff',
                weight: 2,
                opacity: 1,
                fillOpacity: 0.8
            });

            marker.bindPopup(`
                <div class="traffic-popup">
                    <h4>Traffic Status</h4>
                    <p><strong>Speed:</strong> ${traffic.speed} km/h</p>
                    <p><strong>Level:</strong> ${traffic.level}</p>
                    <p><strong>Updated:</strong> ${traffic.timestamp}</p>
                </div>
            `);

            this.trafficLayer.addLayer(marker);
        });
    }

    loadIncidentData() {
        // Simulate incident data
        const incidentData = this.generateIncidentData();
        
        incidentData.forEach(incident => {
            const icon = L.divIcon({
                className: 'incident-icon',
                html: `<i class="fas fa-exclamation-triangle" style="color: #DC143C; font-size: 20px;"></i>`,
                iconSize: [20, 20],
                iconAnchor: [10, 10]
            });

            const marker = L.marker(incident.position, { icon });
            
            marker.bindPopup(`
                <div class="incident-popup">
                    <h4>Traffic Incident</h4>
                    <p><strong>Type:</strong> ${incident.type}</p>
                    <p><strong>Severity:</strong> ${incident.severity}</p>
                    <p><strong>Description:</strong> ${incident.description}</p>
                    <p><strong>Reported:</strong> ${incident.timestamp}</p>
                </div>
            `);

            this.incidentLayer.addLayer(marker);
        });
    }

    generateRoadData() {
        // Generate sample road data around Jakarta
        const roads = [];
        const baseLat = -6.2088;
        const baseLng = 106.8456;

        // Major highways
        roads.push({
            id: 'highway-1',
            name: 'Jalan Tol Jakarta-Cikampek',
            type: 'highway',
            coordinates: [
                [baseLat - 0.1, baseLng - 0.2],
                [baseLat - 0.05, baseLng - 0.1],
                [baseLat, baseLng],
                [baseLat + 0.05, baseLng + 0.1],
                [baseLat + 0.1, baseLng + 0.2]
            ]
        });

        // Arterial roads
        for (let i = 0; i < 5; i++) {
            roads.push({
                id: `arterial-${i}`,
                name: `Jalan Arteri ${i + 1}`,
                type: 'arterial',
                coordinates: [
                    [baseLat + (i - 2) * 0.05, baseLng - 0.15],
                    [baseLat + (i - 2) * 0.05, baseLng + 0.15]
                ]
            });
        }

        // Local roads
        for (let i = 0; i < 10; i++) {
            roads.push({
                id: `local-${i}`,
                name: `Jalan Lokal ${i + 1}`,
                type: 'local',
                coordinates: [
                    [baseLat + (i - 5) * 0.02, baseLng - 0.1],
                    [baseLat + (i - 5) * 0.02, baseLng + 0.1]
                ]
            });
        }

        return roads;
    }

    generateTrafficData() {
        const traffic = [];
        const baseLat = -6.2088;
        const baseLng = 106.8456;

        for (let i = 0; i < 20; i++) {
            traffic.push({
                position: [
                    baseLat + (Math.random() - 0.5) * 0.2,
                    baseLng + (Math.random() - 0.5) * 0.2
                ],
                speed: Math.floor(Math.random() * 60) + 20,
                level: ['Normal', 'Moderate', 'Heavy'][Math.floor(Math.random() * 3)],
                timestamp: new Date().toLocaleTimeString()
            });
        }

        return traffic;
    }

    generateIncidentData() {
        const incidents = [];
        const baseLat = -6.2088;
        const baseLng = 106.8456;

        const incidentTypes = ['Accident', 'Road Work', 'Traffic Jam', 'Vehicle Breakdown'];
        const severities = ['Low', 'Medium', 'High'];

        for (let i = 0; i < 5; i++) {
            incidents.push({
                position: [
                    baseLat + (Math.random() - 0.5) * 0.15,
                    baseLng + (Math.random() - 0.5) * 0.15
                ],
                type: incidentTypes[Math.floor(Math.random() * incidentTypes.length)],
                severity: severities[Math.floor(Math.random() * severities.length)],
                description: `Traffic incident reported in the area`,
                timestamp: new Date().toLocaleTimeString()
            });
        }

        return incidents;
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
            'Normal': '#2E8B57',
            'Moderate': '#FFD700',
            'Heavy': '#FF6347'
        };
        return colors[level] || '#2E8B57';
    }

    findNearestRoad(latlng) {
        // Simple nearest road finding (in real app, use spatial indexing)
        let nearestRoad = null;
        let minDistance = Infinity;

        this.roadLayer.eachLayer(layer => {
            if (layer.roadData) {
                const distance = this.calculateDistance(latlng, layer.roadData.coordinates[0]);
                if (distance < minDistance) {
                    minDistance = distance;
                    nearestRoad = layer.roadData;
                }
            }
        });

        return nearestRoad;
    }

    calculateDistance(latlng1, latlng2) {
        const R = 6371e3; // Earth's radius in meters
        const φ1 = latlng1.lat * Math.PI / 180;
        const φ2 = latlng2[0] * Math.PI / 180;
        const Δφ = (latlng2[0] - latlng1.lat) * Math.PI / 180;
        const Δλ = (latlng2[1] - latlng1.lng) * Math.PI / 180;

        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ/2) * Math.sin(Δλ/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

        return R * c;
    }

    showRoadDetails(road) {
        document.getElementById('roadName').textContent = road.name;
        document.getElementById('roadType').textContent = road.type.charAt(0).toUpperCase() + road.type.slice(1);
        document.getElementById('currentSpeed').textContent = `${Math.floor(Math.random() * 40) + 30} km/h`;
        document.getElementById('trafficStatus').textContent = ['Normal', 'Moderate', 'Heavy'][Math.floor(Math.random() * 3)];
        document.getElementById('lastUpdated').textContent = new Date().toLocaleTimeString();

        document.getElementById('roadModal').style.display = 'block';
    }

    toggleLayer(layerId, visible) {
        switch (layerId) {
            case 'roads':
                if (visible) {
                    this.map.addLayer(this.roadLayer);
                } else {
                    this.map.removeLayer(this.roadLayer);
                }
                break;
            case 'traffic':
                if (visible) {
                    this.map.addLayer(this.trafficLayer);
                } else {
                    this.map.removeLayer(this.trafficLayer);
                }
                break;
            case 'incidents':
                if (visible) {
                    this.map.addLayer(this.incidentLayer);
                } else {
                    this.map.removeLayer(this.incidentLayer);
                }
                break;
            case 'weather':
                if (visible) {
                    this.map.addLayer(this.weatherLayer);
                } else {
                    this.map.removeLayer(this.weatherLayer);
                }
                break;
        }
    }

    filterRoads(roadType) {
        this.roadLayer.eachLayer(layer => {
            if (layer.roadData) {
                if (roadType === 'all' || layer.roadData.type === roadType) {
                    layer.setStyle({ opacity: 0.8 });
                } else {
                    layer.setStyle({ opacity: 0.2 });
                }
            }
        });
    }

    filterByTimeRange(timeRange) {
        // Update statistics based on time range
        this.updateStatistics(timeRange);
    }

    updateStatistics(timeRange) {
        // Simulate updating statistics based on time range
        const stats = {
            '1h': { roads: 1247, incidents: 5, speed: 45 },
            '24h': { roads: 1247, incidents: 23, speed: 42 },
            '7d': { roads: 1247, incidents: 156, speed: 38 },
            '30d': { roads: 1247, incidents: 623, speed: 35 }
        };

        const currentStats = stats[timeRange] || stats['24h'];
        
        document.querySelector('.stat-card:nth-child(1) .stat-value').textContent = currentStats.roads;
        document.querySelector('.stat-card:nth-child(2) .stat-value').textContent = currentStats.incidents;
        document.querySelector('.stat-card:nth-child(3) .stat-value').textContent = `${currentStats.speed} km/h`;
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            document.exitFullscreen();
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
                        className: 'user-location-icon',
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

    addMeasurementPoint(latlng) {
        // Add measurement functionality
        const marker = L.marker(latlng, {
            icon: L.divIcon({
                className: 'measurement-icon',
                html: '<i class="fas fa-ruler" style="color: #FF6347; font-size: 16px;"></i>',
                iconSize: [16, 16],
                iconAnchor: [8, 8]
            })
        }).addTo(this.map);

        marker.bindPopup(`Measurement Point<br>Lat: ${latlng.lat.toFixed(6)}<br>Lng: ${latlng.lng.toFixed(6)}`);
    }

    addDrawingPoint(latlng) {
        // Add drawing functionality
        const marker = L.marker(latlng, {
            icon: L.divIcon({
                className: 'drawing-icon',
                html: '<i class="fas fa-pencil-alt" style="color: #32CD32; font-size: 16px;"></i>',
                iconSize: [16, 16],
                iconAnchor: [8, 8]
            })
        }).addTo(this.map);

        marker.bindPopup(`Drawing Point<br>Lat: ${latlng.lat.toFixed(6)}<br>Lng: ${latlng.lng.toFixed(6)}`);
    }

    performAnalysis(latlng) {
        // Add analysis functionality
        const marker = L.marker(latlng, {
            icon: L.divIcon({
                className: 'analysis-icon',
                html: '<i class="fas fa-chart-line" style="color: #9370DB; font-size: 16px;"></i>',
                iconSize: [16, 16],
                iconAnchor: [8, 8]
            })
        }).addTo(this.map);

        marker.bindPopup(`
            <div class="analysis-popup">
                <h4>Area Analysis</h4>
                <p><strong>Traffic Density:</strong> ${Math.floor(Math.random() * 100)}%</p>
                <p><strong>Average Speed:</strong> ${Math.floor(Math.random() * 30) + 30} km/h</p>
                <p><strong>Incident Risk:</strong> ${['Low', 'Medium', 'High'][Math.floor(Math.random() * 3)]}</p>
            </div>
        `);
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new RoadMonitoringApp();
});

// Add some additional utility functions
function formatTime(timestamp) {
    return new Date(timestamp).toLocaleString();
}

function formatDistance(meters) {
    if (meters < 1000) {
        return `${meters.toFixed(0)} m`;
    } else {
        return `${(meters / 1000).toFixed(2)} km`;
    }
}

// Export for potential module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RoadMonitoringApp;
}




