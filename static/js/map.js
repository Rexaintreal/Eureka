//vars
let map;
let userMarker = null;
let isSatelliteView = false;
let currentBasemap;
let satelliteBasemap;
let placesData = [];
let placeMarkers = [];

const basemaps = {
    street: {
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '© OpenStreetMap contributors'
    },
    satellite: {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attribution: '© Esri'
    }
};

const placeIcon = L.icon({
    iconUrl: 'data:image/svg+xml;base64,' + btoa(`
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#FF4444" stroke="#fff" stroke-width="2"/>
            <circle cx="12" cy="9" r="2.5" fill="#fff"/>
        </svg>
    `),
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
});

function initMap() {
    const storedLat = sessionStorage.getItem('userLat');
    const storedLon = sessionStorage.getItem('userLon');
    
    const initialView = (storedLat && storedLon) 
        ? [parseFloat(storedLat), parseFloat(storedLon)]
        : [20, 0];
    
    const initialZoom = (storedLat && storedLon) ? 13 : 3;
    
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
    loadPlaces();
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

// Get user's current location
function getUserLocation() {
    if (!navigator.geolocation) return;
    
    navigator.geolocation.getCurrentPosition(
        (position) => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            sessionStorage.setItem('userLat', lat);
            sessionStorage.setItem('userLon', lon);
            addUserMarker(lat, lon);
        },
        (error) => console.log('Geolocation not available:', error)
    );
}

// Go to user's location
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
            map.flyTo([lat, lon], 15, { duration: 1.5 });
            addUserMarker(lat, lon);
            loadingIndicator.classList.remove('active');
        },
        (error) => {
            alert('Unable to get your location. Please enable location services.');
            loadingIndicator.classList.remove('active');
        }
    );
}

// Search for a location
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
            
            map.flyTo([lat, lon], 13, { duration: 1.5 });
            
            const marker = L.marker([lat, lon]).addTo(map);
            marker.bindPopup(`<b>${result.display_name}</b>`).openPopup();
            setTimeout(() => map.removeLayer(marker), 5000);
        } else {
            alert('Location not found. Try a different search term.');
        }
    } catch (error) {
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

async function loadPlaces() {
    try {
        const response = await fetch('/api/places');
        const data = await response.json();
        
        if (data.success) {
            placesData = data.places;
            displayPlacesOnMap(placesData);
            displayPlacesList(placesData);
        }
    } catch (error) {
        console.error('Error loading places:', error);
    }
}

function displayPlacesOnMap(places) {
    placeMarkers.forEach(marker => map.removeLayer(marker));
    placeMarkers = [];
    
    places.forEach(place => {
        const marker = L.marker([place.latitude, place.longitude], { icon: placeIcon }).addTo(map);
        
        const popupContent = `
            <div style="font-family: Inter, sans-serif; min-width: 200px;">
                <h3 style="margin: 0 0 0.5rem 0; font-size: 1rem; color: #000;">${place.name}</h3>
                <p style="margin: 0 0 0.5rem 0; font-size: 0.85rem; color: #666;">${place.description}</p>
                <p style="margin: 0; font-size: 0.8rem; color: #999;">
                    <strong>Category:</strong> ${place.category}<br>
                    <strong>Address:</strong> ${place.address}
                </p>
                ${place.openingHours ? `<p style="margin: 0.5rem 0 0 0; font-size: 0.8rem; color: #666;">⏰ ${place.openingHours}</p>` : ''}
            </div>
        `;
        
        marker.bindPopup(popupContent);
        placeMarkers.push(marker);
    });
}

function displayPlacesList(places) {
    const placesList = document.getElementById('placesList');
    
    if (places.length === 0) {
        placesList.innerHTML = '<p style="color: rgba(255,255,255,0.5); text-align: center; padding: 2rem;">No places found. Be the first to add one!</p>';
        return;
    }
    
    placesList.innerHTML = places.map(place => `
        <div class="place-card" data-lat="${place.latitude}" data-lon="${place.longitude}">
            <div class="place-card-header">
                <h4>${place.name}</h4>
                <span class="place-category">${place.category}</span>
            </div>
            <p>${place.description}</p>
            <p class="place-address">📍 ${place.address}</p>
        </div>
    `).join('');
    
    document.querySelectorAll('.place-card').forEach(card => {
        card.addEventListener('click', () => {
            const lat = parseFloat(card.dataset.lat);
            const lon = parseFloat(card.dataset.lon);
            map.flyTo([lat, lon], 16, { duration: 1.5 });
        });
    });
}

function filterPlaces(category) {
    if (category === 'All') {
        displayPlacesOnMap(placesData);
        displayPlacesList(placesData);
    } else {
        const filtered = placesData.filter(p => p.category === category);
        displayPlacesOnMap(filtered);
        displayPlacesList(filtered);
    }
}

async function submitPlace(formData) {
    const loadingIndicator = document.getElementById('loadingIndicator');
    loadingIndicator.querySelector('span').textContent = 'Adding place...';
    loadingIndicator.classList.add('active');
    
    try {
        const response = await fetch('/api/places', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('🎉 Place added successfully! Thank you for contributing!');
            document.getElementById('addPlaceModal').classList.remove('active');
            document.getElementById('addPlaceForm').reset();
            loadPlaces();
        } else {
            alert('Error adding place: ' + data.error);
        }
    } catch (error) {
        alert('Error adding place. Please try again.');
    } finally {
        loadingIndicator.querySelector('span').textContent = 'Loading location...';
        loadingIndicator.classList.remove('active');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initMap();
    
    document.getElementById('searchBtn').addEventListener('click', () => {
        const query = document.getElementById('searchInput').value.trim();
        if (query) searchLocation(query);
    });
    
    document.getElementById('searchInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const query = e.target.value.trim();
            if (query) searchLocation(query);
        }
    });
    
    document.getElementById('myLocationBtn').addEventListener('click', goToMyLocation);
    document.getElementById('satelliteBtn').addEventListener('click', toggleSatellite);
    
    document.getElementById('addPlaceBtn').addEventListener('click', () => {
        document.getElementById('addPlaceModal').classList.add('active');
    });
    
    document.getElementById('closeModal').addEventListener('click', () => {
        document.getElementById('addPlaceModal').classList.remove('active');
    });
    
    document.getElementById('cancelBtn').addEventListener('click', () => {
        document.getElementById('addPlaceModal').classList.remove('active');
    });
    
    document.getElementById('useMapLocation').addEventListener('click', () => {
        const center = map.getCenter();
        document.getElementById('placeLatitude').value = center.lat.toFixed(6);
        document.getElementById('placeLongitude').value = center.lng.toFixed(6);
    });
    
    document.getElementById('addPlaceForm').addEventListener('submit', (e) => {
        e.preventDefault();
        
        const formData = {
            name: document.getElementById('placeName').value,
            category: document.getElementById('placeCategory').value,
            description: document.getElementById('placeDescription').value,
            address: document.getElementById('placeAddress').value,
            latitude: document.getElementById('placeLatitude').value,
            longitude: document.getElementById('placeLongitude').value,
            contact: document.getElementById('placeContact').value,
            openingHours: document.getElementById('placeHours').value,
            addedBy: document.getElementById('placeAddedBy').value || 'Anonymous',
            tags: []
        };
        
        submitPlace(formData);
    });
    
    document.getElementById('toggleSidebar').addEventListener('click', () => {
        document.getElementById('placesSidebar').classList.toggle('active');
    });
    
    document.getElementById('closeSidebar').addEventListener('click', () => {
        document.getElementById('placesSidebar').classList.remove('active');
    });
    
    document.getElementById('categoryFilter').addEventListener('change', (e) => {
        filterPlaces(e.target.value);
    });
    
    document.getElementById('addPlaceModal').addEventListener('click', (e) => {
        if (e.target.id === 'addPlaceModal') {
            document.getElementById('addPlaceModal').classList.remove('active');
        }
    });
});