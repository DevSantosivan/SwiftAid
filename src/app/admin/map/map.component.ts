import { AdminNavbarComponent } from '../admin-navbar/admin-navbar.component';
import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import * as L from 'leaflet';

@Component({
  selector: 'app-map',
  imports: [AdminNavbarComponent, CommonModule],
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss']
})
export class MapComponent implements OnInit {
  private map: L.Map | undefined;
  private linesLayer: L.LayerGroup = L.layerGroup(); // Layer to hold the lines

  // Store users data globally within the component
  private users = [
    { 
      id: 1, 
      name: 'Thaddeus Binasag', 
      lat: 13.4094,  // Calapan
      lng: 121.1803, 
      need: 'Police', 
      contact: '0917-111-2233'
    },
    { 
      id: 2, 
      name: 'Carlos Salvador', 
      lat: 12.9704,  // San Jose
      lng: 121.0305, 
      need: 'Ambulance', 
      contact: '0917-222-3344'
    },
    { 
      id: 3, 
      name: 'Ivan Santos', 
      lat: 12.9349,  // Magsaysay
      lng: 121.0827, 
      need: 'Fire', 
      contact: '0917-333-4455'
    }
  ];

  constructor(private route: Router) {}

  ngOnInit(): void {
    this.initializeMap();
    this.addUsersToMap();
    this.addLocationButton();
  }

  // Initialize the map with a default view
  private initializeMap(): void {
    const midoroCoordinates: [number, number] = [13.232, 122.58]; // Coordinates for Occidental Mindoro

    this.map = L.map('map').setView(midoroCoordinates, 13);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19
    }).addTo(this.map);
  }

  // Add users to map
  private addUsersToMap(): void {
    if (!this.map) return;

    this.users.forEach(user => {
      const customIcon = this.getUserIcon(user.need);

      const marker = L.marker([user.lat, user.lng], { icon: customIcon }).addTo(this.map!);

      // Add a red circle around the marker
      L.circle([user.lat, user.lng], {
        color: 'red',
        fillColor: 'red',
        fillOpacity: 0.2,
        radius: 500
      }).addTo(this.map!);

      // Fetch the address from the coordinates using OpenStreetMap's Nominatim API
      this.getAddressFromCoordinates(user.lat, user.lng).then(address => {
        // Popup content with the user's name, need, and contact info
        const popupContent = `  
          <div>
            <p><strong>Name:</strong> ${user.name}</p>
            <p><strong>Need:</strong> ${user.need}</p>
            <p><strong>Contact:</strong> ${user.contact}</p>
            <p><strong>Location:</strong> ${address}</p> <!-- Display the fetched address -->
            <button id="receive-${user.id}" style="background-color: #007bff; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">
              Receive Request
            </button>
          </div>
        `;

        // Bind the popup content to the marker
        marker.bindPopup(popupContent);

        marker.on('popupopen', () => {
          const button = document.getElementById(`receive-${user.id}`);
          if (button) {
            button.addEventListener('click', () => {
              alert(`Received request from ${user.name}`);
              this.showNearestMDRRO([user.lat, user.lng], user);
            });
          }
        });
      });

      // Show notification for new user
      this.showNotification(`New User Added: ${user.name}`);
    });

    // Focus on the first user on map load
    const firstUser = this.users[0];
    this.map.setView([firstUser.lat, firstUser.lng], 13);
  }

  // Function to get the appropriate icon based on user need
  private getUserIcon(need: string): L.Icon {
    let iconUrl = '';

    // Set the icon URL based on the user's need
    switch (need) {
      case 'Ambulance':
        iconUrl = 'https://purepng.com/public/uploads/large/purepng.com-ambulanceambulanceinjured-peoplefor-an-illness-or-injuryhospital-medicalambulances-17015274053493pgy3.png';
        break;
      case 'Police':
        iconUrl = 'https://purepng.com/public/uploads/large/purepng.com-police-carpolice-carpolice-vehiclecop-carcop-vehicle-1701527596259orec0.png';
        break;
      case 'Fire':
        iconUrl = 'https://kvsh.com/wp-content/uploads/2017/01/fire_truck.png';
        break;
      default:
        iconUrl = 'https://example.com/default-icon.png';
    }

    return L.icon({
      iconUrl: iconUrl,
      iconSize: [70, 48],
      iconAnchor: [39, 58],
      popupAnchor: [0, -58]
    });
  }

  // Function to fetch the address from coordinates using OpenStreetMap's Nominatim API
  private async getAddressFromCoordinates(lat: number, lng: number): Promise<string> {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
      const data = await response.json();
      return data.display_name || 'Address not available';
    } catch (error) {
      console.error('Error fetching address:', error);
      return 'Address not available';
    }
  }

  // Function to show notification
  private showNotification(message: string): void {
    const notificationContainer = document.getElementById('notification-container');
    if (!notificationContainer) return;

    const notification = document.createElement('div');
    notification.classList.add('notification');
    notification.innerText = message;

    notificationContainer.appendChild(notification);

    setTimeout(() => {
      notification.classList.add('show');
    }, 100);

    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 500);
    }, 5000); // Notification disappears after 5 seconds
  }

  // Function to calculate distance between two lat/lng points
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radius of Earth in kilometers
    const dLat = this.degreesToRadians(lat2 - lat1);
    const dLon = this.degreesToRadians(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(this.degreesToRadians(lat1)) * Math.cos(this.degreesToRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in kilometers
  }

  // Convert degrees to radians
  private degreesToRadians(degrees: number): number {
    return degrees * Math.PI / 180;
  }

  // Find nearest 2 MDRRO locations
  private findNearestMDRRO(userLocation: [number, number]): Array<[number, number, string, string, string]> {
    const mdrroLocations = [
      {
        name: 'MDRRMO Calapan',
        lat: 13.4094,
        lng: 121.1803,
        contact: '0917-123-4567',
        address: 'Calapan City, Occidental Mindoro'
      },
      {
        name: 'MDRRMO San Jose',
        lat: 12.9704,
        lng: 121.0305,
        contact: '0917-234-5678',
        address: 'San Jose, Occidental Mindoro'
      },
      {
        name: 'MDRRMO Magsaysay',
        lat: 12.9349,
        lng: 121.0827,
        contact: '0917-345-6789',
        address: 'Magsaysay, Occidental Mindoro'
      }
    ];

    // Sort MDRRMO locations by distance to userLocation
    const sortedLocations = mdrroLocations.map(location => {
      const distance = this.calculateDistance(userLocation[0], userLocation[1], location.lat, location.lng);
      return { ...location, distance };
    }).sort((a, b) => a.distance - b.distance);

    return sortedLocations.slice(0, 2).map(location => [location.lat, location.lng, location.name, location.contact, location.address]);
  }

  // Show the nearest MDRROs to the user on the map
  private showNearestMDRRO(userLocation: [number, number], user: any): void {
    const nearestMDRROs = this.findNearestMDRRO(userLocation);

    nearestMDRROs.forEach(([lat, lng, name, contact, address]) => {
      const mdrroIcon = L.icon({
        iconUrl: 'https://montalbanrizalph.com/wp-content/uploads/2022/08/Picture1.png',
        iconSize: [100, 60],
        iconAnchor: [15, 30],
        popupAnchor: [0, -30]
      });

      const mdrroMarker = L.marker([lat, lng], { icon: mdrroIcon }).addTo(this.map!);

      // Calculate the distance to each nearest MDRRO
      const distance = this.calculateDistance(userLocation[0], userLocation[1], lat, lng);

      const popupContent = ` 
       <p>Nearest rescue</p>
        <div class="mdrro-popup">
          <h3 class="mdrro-name">${name}</h3>
          <p class="mdrro-contact">Contact: <strong>${contact}</strong></p>
          <p class="mdrro-address">Address: <strong>${address}</strong></p>
          <p class="mdrro-distance">Distance from user: <strong>${distance.toFixed(2)} km</strong></p>
        </div>
      `;

      mdrroMarker.bindPopup(popupContent).openPopup();

      // Draw a line from the user to the nearest MDRRO
      const line = L.polyline([userLocation, [lat, lng]], {
        color: 'blue',
        weight: 1,
        opacity: 0.7,
        dashArray: '5,10'
      }).addTo(this.linesLayer);

      this.linesLayer.addTo(this.map!);

      let bounds = new L.LatLngBounds([userLocation, [lat, lng]]);
      this.linesLayer.eachLayer((layer) => {
        if (layer instanceof L.Polyline) {
          bounds.extend(layer.getBounds());
        }
      });
      this.map?.fitBounds(bounds);
    });
  }

  // Add location button to show user's current position
  private addLocationButton(): void {
    if (!this.map) return;

    const locateControl = L.Control.extend({
      options: { position: 'topright' },

      onAdd: (map: L.Map) => {
        const button = L.DomUtil.create('button', 'leaflet-bar leaflet-control leaflet-control-custom');
        button.innerHTML = '📍 My Location';
        button.style.backgroundColor = 'white';
        button.style.padding = '5px';

        L.DomEvent.on(button, 'click', () => {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const { latitude, longitude } = position.coords;
              map.setView([latitude, longitude], 15);
            },
            (error) => {
              console.error('Error fetching location:', error);
              alert('Unable to fetch your current location.');
            }
          );
        });

        return button;
      }
    });

    this.map.addControl(new locateControl());
  }

  // Navigation methods (keep or update based on requirements)
  navigateToDashboard() {
    this.route.navigate(['/admin']);
  }

  navigateToHistoryCall() {
    this.route.navigate(['/admin/history-call']);
  }

  navigateToUserList() {
    this.route.navigate(['/admin/user-list']);
  }
}
