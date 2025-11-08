//vars
let map;
let userMarker = null;
let isSatelliteView = false;
let currentBasemap;
let satelliteBasemap;

// Basemap
const basemaps = {
    street: {
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '© OpenStreetMap contributors'
    },
    satellite: {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attribution: '© Esri'
    },
    dark: {
        url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        attribution: '© CartoDB'
    }
};

// Initialize map
function initMap() {
    // Get stored location or use default
    const storedLat = sessionStorage.getItem('userLat');
    const storedLon = sessionStorage.getItem('userLon');
    
    const initialView = (storedLat && storedLon) 
        ? [parseFloat(storedLat), parseFloat(storedLon)]
        : [20, 0];
    
    const initialZoom = (storedLat && storedLon) ? 13 : 3;
    
    // Create map
    map = L.map('mapContainer', {
        zoomControl: true,
        maxZoom: 19,
        minZoom: 2
    }).setView(initialView, initialZoom);
    
    currentBasemap = L.tileLayer(basemaps.street.url, {
        attribution: basemaps.street.attribution,
        maxZoom: 19
    }).addTo(map);
    
    satelliteBasemap = L.tileLayer(basemaps.satellite.url, {
        attribution: basemaps.satellite.attribution,
        maxZoom: 19
    });
    
    map.on('move', updateInfoPanel);
    map.on('zoom', updateInfoPanel);
    updateInfoPanel();
    
    if (storedLat && storedLon) {
        addUserMarker(parseFloat(storedLat), parseFloat(storedLon));
    }
    
    getUserLocation();
}

function updateInfoPanel() {
    const center = map.getCenter();
    const zoom = map.getZoom();
    
    document.getElementById('latValue').textContent = center.lat.toFixed(6) + '°';
    document.getElementById('lonValue').textContent = center.lng.toFixed(6) + '°';
    document.getElementById('zoomValue').textContent = zoom.toFixed(1);
}

function addUserMarker(lat, lon) {
    if (userMarker) {
        map.removeLayer(userMarker);
    }
    
    const userIcon = L.divIcon({
        className: 'user-marker',
        iconSize: [20, 20],
        html: ''
    });
    
    userMarker = L.marker([lat, lon], { icon: userIcon }).addTo(map);
    userMarker.bindPopup('<b>Your Location</b>').openPopup();
}

function getUserLocation() {
    if (!navigator.geolocation) {
        return;
    }
    
    navigator.geolocation.getCurrentPosition(
        (position) => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            
            sessionStorage.setItem('userLat', lat);
            sessionStorage.setItem('userLon', lon);
            
            addUserMarker(lat, lon);
        },
        (error) => {
            console.log('Geolocation not available:', error);
        }
    );
}

function goToMyLocation() {
    const loadingIndicator = document.getElementById('loadingIndicator');
    loadingIndicator.classList.add('active');
    
    if (!navigator.geolocation) {
        alert('Geolocation is not supported by your browser');
        loadingIndicator.classList.remove('active');
        return;
    }
    
    navigator.geolocation.getCurrentPosition(
        (position) => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            
            map.flyTo([lat, lon], 15, {
                duration: 1.5
            });
            
            addUserMarker(lat, lon);
            loadingIndicator.classList.remove('active');
        },
        (error) => {
            console.error('Geolocation error:', error);
            alert('Unable to get your location. Please enable location services.');
            loadingIndicator.classList.remove('active');
        }
    );
}

async function searchLocation(query) {
    const loadingIndicator = document.getElementById('loadingIndicator');
    loadingIndicator.classList.add('active');
    
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`
        );
        const data = await response.json();
        
        if (data && data.length > 0) {
            const result = data[0];
            const lat = parseFloat(result.lat);
            const lon = parseFloat(result.lon);
            
            map.flyTo([lat, lon], 13, {
                duration: 1.5
            });
            
            const marker = L.marker([lat, lon]).addTo(map);
            marker.bindPopup(`<b>${result.display_name}</b>`).openPopup();
            
            setTimeout(() => {
                map.removeLayer(marker);
            }, 5000);
        } else {
            alert('Location not found. Try a different search term.');
        }
    } catch (error) {
        console.error('Search error:', error);
        alert('Error searching for location. Please try again.');
    } finally {
        loadingIndicator.classList.remove('active');
    }
}

// Toggle satellite view
function toggleSatellite() {
    const satelliteBtn = document.getElementById('satelliteBtn');
    
    if (isSatelliteView) {
        map.removeLayer(satelliteBasemap);
        currentBasemap.addTo(map);
        satelliteBtn.classList.remove('active');
        isSatelliteView = false;
    } else {
        map.removeLayer(currentBasemap);
        satelliteBasemap.addTo(map);
        satelliteBtn.classList.add('active');
        isSatelliteView = true;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initMap();
    document.getElementById('searchBtn').addEventListener('click', () => {
        const query = document.getElementById('searchInput').value.trim();
        if (query) {
            searchLocation(query);
        }
    });
    
    document.getElementById('searchInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const query = e.target.value.trim();
            if (query) {
                searchLocation(query);
            }
        }
    });
    
    document.getElementById('myLocationBtn').addEventListener('click', goToMyLocation);
    document.getElementById('satelliteBtn').addEventListener('click', toggleSatellite);
});

