//vars
let map;
let userMarker = null;
let isSatelliteView = false;
let currentBasemap;
let satelliteBasemap;
let placesData = [];
let placeMarkers = [];
let currentBoundaryLayer = null;
let selectedPlaceId = null;

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

function getPlaceIcon(place) {
    let color = '#FF4444';
    
    if (place.hidden) {
        color = '#808080';
    } else if (place.verified) {
        color = '#4CAF50';
    }
    
    return L.icon({
        iconUrl: 'data:image/svg+xml;base64,' + btoa(`
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="${color}" stroke="#fff" stroke-width="2"/>
                <circle cx="12" cy="9" r="2.5" fill="#fff"/>
                ${place.verified ? '<path d="M12 6l1.5 3 3.5.5-2.5 2.5.5 3.5-3-1.5-3 1.5.5-3.5L7 9.5l3.5-.5z" fill="#fff"/>' : ''}
            </svg>
        `),
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32]
    });
}

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
    
    map.getPane('tilePane').classList.add('street-view');
    
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

function goToMyLocation() {
    const loadingIndicator = document.getElementById('loadingIndicator');
    loadingIndicator.classList.add('active');
    
    if (!navigator.geolocation) {
        loadingIndicator.classList.remove('active');
        showNotification('Geolocation is not supported by your browser', 'error');
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
            loadingIndicator.classList.remove('active');
            showNotification('Unable to get your location. Please enable location services.', 'error');
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
            
            map.flyTo([lat, lon], 13, { duration: 1.5 });
            
            const marker = L.marker([lat, lon]).addTo(map);
            marker.bindPopup(`<b>${result.display_name}</b>`).openPopup();
            setTimeout(() => map.removeLayer(marker), 5000);
        } else {
            showNotification('Location not found. Try a different search term.', 'error');
        }
    } catch (error) {
        showNotification('Error searching for location. Please try again.', 'error');
    } finally {
        loadingIndicator.classList.remove('active');
    }
}

async function searchAndFilterByLocation(query) {
    const loadingIndicator = document.getElementById('loadingIndicator');
    loadingIndicator.classList.add('active');
    loadingIndicator.querySelector('span').textContent = 'Searching location...';
    
    try {
        const searchResponse = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&polygon_geojson=1`
        );
        const searchData = await searchResponse.json();
        
        if (searchData && searchData.length > 0) {
            const result = searchData[0];
            const lat = parseFloat(result.lat);
            const lon = parseFloat(result.lon);
            
            map.flyTo([lat, lon], 10, { duration: 1.5 });
            
            const boundaryResponse = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&polygon_geojson=1&zoom=10`
            );
            const boundaryData = await boundaryResponse.json();
            
            if (boundaryData.geojson) {
                drawBoundary(boundaryData.geojson);
            }
            
            filterPlacesByBounds(result.boundingbox);
            
            document.getElementById('currentLocationFilter').textContent = result.display_name.split(',')[0];
            document.getElementById('locationFilterDisplay').style.display = 'flex';
            
        } else {
            alert('Location not found. Try a different search term.');
        }
    } catch (error) {
        console.error('Error searching location:', error);
        alert('Error searching for location. Please try again.');
    } finally {
        loadingIndicator.querySelector('span').textContent = 'Loading location...';
        loadingIndicator.classList.remove('active');
    }
}

function drawBoundary(geojson) {
    if (currentBoundaryLayer) {
        map.removeLayer(currentBoundaryLayer);
    }
    currentBoundaryLayer = L.geoJSON(geojson, {
        style: {
            color: '#FF4444',
            weight: 3,
            opacity: 0.8,
            fillColor: '#FF4444',
            fillOpacity: 0.1,
            dashArray: '10, 5'
        }
    }).addTo(map);
    map.fitBounds(currentBoundaryLayer.getBounds(), { padding: [50, 50] });
}

function filterPlacesByBounds(boundingbox) {
    if (!boundingbox || boundingbox.length < 4) {
        displayPlacesOnMap(placesData);
        displayPlacesList(placesData);
        return;
    }
    
    const [south, north, west, east] = boundingbox.map(parseFloat);
    
    const filtered = placesData.filter(place => {
        const lat = place.latitude;
        const lon = place.longitude;
        return lat >= south && lat <= north && lon >= west && lon <= east;
    });
    
    displayPlacesOnMap(filtered);
    displayPlacesList(filtered);
}

function clearLocationFilter() {
    if (currentBoundaryLayer) {
        map.removeLayer(currentBoundaryLayer);
        currentBoundaryLayer = null;
    }
    const category = document.getElementById('categoryFilter').value;
    filterPlaces(category);
    document.getElementById('locationFilterDisplay').style.display = 'none';
}

function toggleSatellite() {
    const satelliteBtn = document.getElementById('satelliteBtn');
    const tilePane = map.getPane('tilePane');
    
    if (isSatelliteView) {
        map.removeLayer(satelliteBasemap);
        currentBasemap.addTo(map);
        satelliteBtn.classList.remove('active');
        tilePane.classList.remove('satellite-view');
        tilePane.classList.add('street-view');
        isSatelliteView = false;
    } else {
        map.removeLayer(currentBasemap);
        satelliteBasemap.addTo(map);
        satelliteBtn.classList.add('active');
        tilePane.classList.remove('street-view');
        tilePane.classList.add('satellite-view');
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
        const marker = L.marker([place.latitude, place.longitude], { 
            icon: getPlaceIcon(place),
            opacity: place.hidden ? 0.5 : 1
        }).addTo(map);
        
        const verifiedBadge = place.verified ? '<span style="color: #4CAF50; font-weight: bold;"><i class="fas fa-check-circle"></i> Verified</span>' : '';
        const hiddenBadge = place.hidden ? '<span style="color: #808080; font-weight: bold;"><i class="fas fa-exclamation-triangle"></i> Unverified</span>' : '';
        
        const popupContent = `
            <div style="font-family: Inter, sans-serif; min-width: 200px;">
                <h3 style="margin: 0 0 0.5rem 0; font-size: 1rem; color: #000;">${place.name}</h3>
                ${verifiedBadge || hiddenBadge ? `<p style="margin: 0 0 0.5rem 0;">${verifiedBadge}${hiddenBadge}</p>` : ''}
                <p style="margin: 0 0 0.5rem 0; font-size: 0.85rem; color: #666;">${place.description}</p>
                <p style="margin: 0 0 0.5rem 0; font-size: 0.8rem; color: #999;">
                    <strong>Category:</strong> ${place.category}<br>
                    <strong>Address:</strong> ${place.address}
                </p>
                <div style="display: flex; gap: 1rem; margin: 0.5rem 0; font-size: 0.8rem;">
                    <span><i class="fas fa-thumbs-up"></i> ${place.upvotes || 0}</span>
                    <span><i class="fas fa-thumbs-down"></i> ${place.downvotes || 0}</span>
                    <span><i class="fas fa-comments"></i> ${place.commentCount || 0}</span>
                </div>
                <button onclick="showPlaceDetails('${place.id}')" style="background: #000; color: #fff; border: none; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; margin-top: 0.5rem; width: 100%;">
                    View Details
                </button>
            </div>
        `;
        
        marker.bindPopup(popupContent);
        placeMarkers.push(marker);
    });
}

function displayPlacesList(places) {
    const placesList = document.getElementById('placesList');
    
    if (places.length === 0) {
        placesList.innerHTML = '<p style="color: rgba(255,255,255,0.5); text-align: center; padding: 2rem;">No places found in this area. Be the first to add one!</p>';
        return;
    }
    
    placesList.innerHTML = places.map(place => {
        const verifiedBadge = place.verified ? '<span class="verified-badge"><i class="fas fa-check-circle"></i></span>' : '';
        const hiddenClass = place.hidden ? 'place-hidden' : '';
        
        return `
        <div class="place-card ${hiddenClass}" data-place-id="${place.id}">
            <div class="place-card-header">
                <h4>${place.name} ${verifiedBadge}</h4>
                <span class="place-category">${place.category}</span>
            </div>
            <p>${place.description}</p>
            <p class="place-address"><i class="fas fa-map-marker-alt"></i> ${place.address}</p>
            <div class="place-stats">
                <span><i class="fas fa-thumbs-up"></i> ${place.upvotes || 0}</span>
                <span><i class="fas fa-thumbs-down"></i> ${place.downvotes || 0}</span>
                <span><i class="fas fa-comments"></i> ${place.commentCount || 0}</span>
            </div>
        </div>
    `}).join('');
    
    document.querySelectorAll('.place-card').forEach(card => {
        card.addEventListener('click', () => {
            const placeId = card.dataset.placeId;
            showPlaceDetails(placeId);
        });
    });
}

async function showPlaceDetails(placeId) {
    selectedPlaceId = placeId;
    
    try {
        const response = await fetch(`/api/places/${placeId}`);
        const data = await response.json();
        
        if (data.success) {
            const place = data.place;
            displayPlaceDetails(place);
            
            const detailsSidebar = document.getElementById('placeDetailsSidebar');
            if (detailsSidebar) {
                detailsSidebar.classList.add('active');
            }
            
            map.flyTo([place.latitude, place.longitude], 16, { duration: 1.5 });
        }
    } catch (error) {
        console.error('Error loading place details:', error);
        alert('Error loading place details');
    }
}

function displayPlaceDetails(place) {
    const detailsContent = document.getElementById('placeDetailsContent');
    
    if (!detailsContent) {
        console.error('Place details content element not found');
        return;
    }
    
    const verifiedBadge = place.verified ? '<span class="verified-badge-large"><i class="fas fa-check-circle"></i> Verified Place</span>' : '';
    const hiddenBadge = place.hidden ? '<span class="hidden-badge-large"><i class="fas fa-exclamation-triangle"></i> Needs Verification</span>' : '';
    
    const upvoteActive = place.userVote === 'upvote' ? 'active' : '';
    const downvoteActive = place.userVote === 'downvote' ? 'active' : '';
    
    const commentsHtml = place.comments && place.comments.length > 0 
        ? place.comments.map(comment => `
            <div class="comment-item">
                <div class="comment-header">
                    <span class="comment-author">${comment.author}</span>
                    <span class="comment-time">${formatDate(comment.timestamp)}</span>
                </div>
                <p class="comment-text">${escapeHtml(comment.text)}</p>
                <div class="comment-actions">
                    <button class="report-btn ${comment.userReported ? 'reported' : ''}" 
                            onclick="reportComment('${comment.id}')"
                            ${comment.userReported ? 'disabled' : ''}>
                        <i class="fas fa-flag"></i> ${comment.userReported ? 'Reported' : 'Report'} 
                        ${comment.reportCount > 0 ? `(${comment.reportCount})` : ''}
                    </button>
                </div>
            </div>
        `).join('')
        : '<p class="no-comments">No comments yet. Be the first to share your experience!</p>';
    
    const commentFormHtml = place.canComment 
        ? `
        <div class="comment-form">
            <h4>Add Your Comment ${place.userCommentCount > 0 ? `(${place.userCommentCount}/5)` : ''}</h4>
            <input type="text" id="commentAuthor" placeholder="Your name (optional)" maxlength="50">
            <textarea id="commentText" placeholder="Share your experience..." maxlength="500" rows="3"></textarea>
            <div class="comment-form-footer">
                <span class="char-count"><span id="charCount">0</span>/500</span>
                <button class="btn-submit-comment" onclick="submitComment()">Post Comment</button>
            </div>
        </div>
        `
        : '<p class="comment-limit-reached">You have reached the maximum of 5 comments for this place.</p>';
    
    detailsContent.innerHTML = `
        <div class="place-detail-header">
            <h2>${place.name}</h2>
            ${verifiedBadge}${hiddenBadge}
        </div>
        
        <div class="place-detail-category">${place.category}</div>
        
        <div class="place-detail-description">
            <p>${place.description}</p>
        </div>
        
        <div class="place-detail-info">
            <div class="info-item">
                <strong><i class="fas fa-map-marker-alt"></i> Address:</strong> ${place.address}
            </div>
            ${place.contact ? `<div class="info-item"><strong><i class="fas fa-phone"></i> Contact:</strong> ${place.contact}</div>` : ''}
            ${place.openingHours ? `<div class="info-item"><strong><i class="fas fa-clock"></i> Hours:</strong> ${place.openingHours}</div>` : ''}
            <div class="info-item">
                <strong>Added by:</strong> ${place.addedBy} on ${place.addedDate}
            </div>
        </div>
        
        <div class="place-voting">
            <button class="vote-btn upvote-btn ${upvoteActive}" onclick="votePlace('${place.id}', 'upvote')">
                <i class="fas fa-thumbs-up"></i> Upvote (${place.upvotes || 0})
            </button>
            <button class="vote-btn downvote-btn ${downvoteActive}" onclick="votePlace('${place.id}', 'downvote')">
                <i class="fas fa-thumbs-down"></i> Downvote (${place.downvotes || 0})
            </button>
        </div>
        
        <div class="comments-section">
            <h3>Comments (${place.comments ? place.comments.length : 0})</h3>
            ${commentFormHtml}
            <div class="comments-list">
                ${commentsHtml}
            </div>
        </div>
    `;
    
    const commentTextArea = document.getElementById('commentText');
    if (commentTextArea) {
        commentTextArea.addEventListener('input', (e) => {
            document.getElementById('charCount').textContent = e.target.value.length;
        });
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

async function submitComment() {
    const commentText = document.getElementById('commentText').value.trim();
    const commentAuthor = document.getElementById('commentAuthor').value.trim() || 'Anonymous';
    
    if (!commentText) {
        alert('Please enter a comment');
        return;
    }
    
    try {
        const response = await fetch(`/api/places/${selectedPlaceId}/comments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                comment: commentText,
                author: commentAuthor
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showPlaceDetails(selectedPlaceId);
            loadPlaces(); 
        } else {
            alert('Error posting comment: ' + data.error);
        }
    } catch (error) {
        console.error('Error submitting comment:', error);
        alert('Error posting comment');
    }
}

async function reportComment(commentId) {
    showReportModal(commentId);
}

async function confirmReport(commentId) {
    try {
        const response = await fetch(`/api/comments/${commentId}/report`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const data = await response.json();
        
        closeReportModal();
        
        if (data.success) {
            if (data.flagged) {
                showNotification('Comment has been flagged and will no longer be visible', 'success');
            } else {
                showNotification('Comment reported successfully', 'success');
            }
            showPlaceDetails(selectedPlaceId);
        } else {
            showNotification('Error: ' + data.error, 'error');
        }
    } catch (error) {
        console.error('Error reporting comment:', error);
        closeReportModal();
        showNotification('Error reporting comment', 'error');
    }
}

function showReportModal(commentId) {
    const modal = document.getElementById('reportModal');
    if (modal) {
        modal.dataset.commentId = commentId;
        modal.classList.add('active');
    }
}

function closeReportModal() {
    const modal = document.getElementById('reportModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => notification.classList.add('show'), 10);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

async function votePlace(placeId, voteType) {
    try {
        const response = await fetch(`/api/places/${placeId}/vote`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: voteType })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showPlaceDetails(placeId);
            loadPlaces();
        } else {
            alert('Error voting: ' + data.error);
        }
    } catch (error) {
        console.error('Error voting:', error);
        alert('Error submitting vote');
    }
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
}

function filterPlaces(category) {
    let filtered = placesData;
    if (category && category !== 'All') {
        filtered = filtered.filter(p => p.category === category);
    }
    if (currentBoundaryLayer) {
        const bounds = currentBoundaryLayer.getBounds();
        filtered = filtered.filter(place => {
            return bounds.contains([place.latitude, place.longitude]);
        });
    }
    
    displayPlacesOnMap(filtered);
    displayPlacesList(filtered);
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
            alert('Place added successfully! Thank you for contributing!');
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

window.showPlaceDetails = showPlaceDetails;
window.votePlace = votePlace;
window.submitComment = submitComment;
window.reportComment = reportComment;
window.confirmReport = confirmReport;
window.closeReportModal = closeReportModal;

document.addEventListener('DOMContentLoaded', () => {
    initMap();
    
    const searchBtn = document.getElementById('searchBtn');
    const searchInput = document.getElementById('searchInput');
    const locationSearchBtn = document.getElementById('locationSearchBtn');
    const locationSearchInput = document.getElementById('locationSearchInput');
    const clearLocationFilterBtn = document.getElementById('clearLocationFilter');
    const myLocationBtn = document.getElementById('myLocationBtn');
    const satelliteBtn = document.getElementById('satelliteBtn');
    const addPlaceBtn = document.getElementById('addPlaceBtn');
    const closeModal = document.getElementById('closeModal');
    const cancelBtn = document.getElementById('cancelBtn');
    const useMapLocation = document.getElementById('useMapLocation');
    const addPlaceForm = document.getElementById('addPlaceForm');
    const toggleSidebarBtn = document.getElementById('toggleSidebar');
    const closeSidebarBtn = document.getElementById('closeSidebar');
    const closePlaceDetails = document.getElementById('closePlaceDetails');
    const categoryFilter = document.getElementById('categoryFilter');
    const addPlaceModal = document.getElementById('addPlaceModal');
    
    if (searchBtn) {
        searchBtn.addEventListener('click', () => {
            const query = searchInput.value.trim();
            if (query) searchLocation(query);
        });
    }
    
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const query = e.target.value.trim();
                if (query) searchLocation(query);
            }
        });
    }
    
    if (locationSearchBtn) {
        locationSearchBtn.addEventListener('click', () => {
            const query = locationSearchInput.value.trim();
            if (query) searchAndFilterByLocation(query);
        });
    }
    
    if (locationSearchInput) {
        locationSearchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const query = e.target.value.trim();
                if (query) searchAndFilterByLocation(query);
            }
        });
    }
    
    if (clearLocationFilterBtn) {
        clearLocationFilterBtn.addEventListener('click', clearLocationFilter);
    }
    
    if (myLocationBtn) {
        myLocationBtn.addEventListener('click', goToMyLocation);
    }
    
    if (satelliteBtn) {
        satelliteBtn.addEventListener('click', toggleSatellite);
    }
    
    if (addPlaceBtn) {
        addPlaceBtn.addEventListener('click', () => {
            addPlaceModal.classList.add('active');
        });
    }
    
    if (closeModal) {
        closeModal.addEventListener('click', () => {
            addPlaceModal.classList.remove('active');
        });
    }
    
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            addPlaceModal.classList.remove('active');
        });
    }
    
    if (useMapLocation) {
        useMapLocation.addEventListener('click', () => {
            const center = map.getCenter();
            document.getElementById('placeLatitude').value = center.lat.toFixed(6);
            document.getElementById('placeLongitude').value = center.lng.toFixed(6);
        });
    }
    
    if (addPlaceForm) {
        addPlaceForm.addEventListener('submit', (e) => {
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
    }
    
    if (toggleSidebarBtn) {
        toggleSidebarBtn.addEventListener('click', () => {
            document.getElementById('placesSidebar').classList.toggle('active');
        });
    }
    
    if (closeSidebarBtn) {
        closeSidebarBtn.addEventListener('click', () => {
            document.getElementById('placesSidebar').classList.remove('active');
        });
    }
    
    if (closePlaceDetails) {
        closePlaceDetails.addEventListener('click', () => {
            document.getElementById('placeDetailsSidebar').classList.remove('active');
        });
    }
    
    if (categoryFilter) {
        categoryFilter.addEventListener('change', (e) => {
            filterPlaces(e.target.value);
        });
    }
    
    if (addPlaceModal) {
        addPlaceModal.addEventListener('click', (e) => {
            if (e.target.id === 'addPlaceModal') {
                addPlaceModal.classList.remove('active');
            }
        });
    }
});