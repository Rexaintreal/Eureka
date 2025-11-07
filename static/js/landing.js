let map;
let userLat = null;
let userLon = null;
let userLocationFound = false;

// getting location form the IP (inaccurate but good for yk the inital location on the landing page)
async function getLocationFromIP() {
    try {
        const res = await fetch('https://ipapi.co/json/');
        const data = await res.json();
        userLat = data.latitude;
        userLon = data.longitude;
        userLocationFound = true;
        console.log('got location from ip:', userLat, userLon);
    } catch (err) {
        console.log('ip location failed, showing world map');
    }
}

// init map after getting location
async function initMap() {
    await getLocationFromIP();
    
    // if no location if found show the world map
    const initialView = userLocationFound 
        ? [[userLat, userLon], 13]
        : [[20, 0], 2];
    
    map = L.map('map', {
        zoomControl: false,
        dragging: true,
        scrollWheelZoom: true,
        doubleClickZoom: true,
        boxZoom: true,
        keyboard: true,
        tap: true
    }).setView(...initialView);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 19
    }).addTo(map);

    // try browser geolocation too if the users allows it use that
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                userLat = pos.coords.latitude;
                userLon = pos.coords.longitude;
                userLocationFound = true;
                map.setView([userLat, userLon], 13);
                console.log('updated to browser location:', userLat, userLon);
            },
            (err) => console.log('browser location denied')
        );
    }
}

initMap();

document.getElementById('exploreBtn').addEventListener('click', () => {
    if (userLocationFound) {
        sessionStorage.setItem('userLat', userLat);
        sessionStorage.setItem('userLon', userLon);
    }
});