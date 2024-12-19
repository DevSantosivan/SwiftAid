import { Component ,OnInit} from '@angular/core';
import { AdminNavbarComponent } from '../admin-navbar/admin-navbar.component';
import { Router } from '@angular/router';
// import { LocationService } from '../../core/location.service';
import { CommonModule } from '@angular/common';
import * as L from 'leaflet';

@Component({
  selector: 'app-map',
  imports: [AdminNavbarComponent, CommonModule],
  templateUrl: './map.component.html',
  styleUrl: './map.component.scss'
})
export class MapComponent implements OnInit {
  private map: L.Map | undefined;

  constructor(private route: Router){

  }
  ngOnInit(): void {
    this.initializeMap();
    this.addUsersToMap();

    this.addLocationButton();
  }
  
  private initializeMap(): void {
    const midoroCoordinates: [number, number] = [13.232, 122.58]; // Coordinates for Occidental Mindoro
  
    // Set the map's view to the coordinates for Occidental Mindoro
    this.map = L.map('map').setView(midoroCoordinates, 13); // Adjust the zoom level as necessary
  
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19
    }).addTo(this.map);
  }
  
  private addUsersToMap(): void {
    if (!this.map) return;
  
    const users = [
      { 
        id: 1, 
        name: 'Police', 
        lat: 13.4094,  // Calapan
        lng: 121.1803, 
        icon: 'https://purepng.com/public/uploads/large/purepng.com-police-carpolice-carpolice-vehiclecop-carcop-vehicle-1701527596259orec0.png' 
      },
      { 
        id: 2, 
        name: 'Ambulance', 
        lat: 12.9704,  // San Jose
        lng: 121.0305, 
        icon: 'https://purepng.com/public/uploads/large/purepng.com-ambulanceambulanceinjured-peoplefor-an-illness-or-injuryhospital-medicalambulances-17015274053493pgy3.png' 
      },
      { 
        id: 3, 
        name: 'Fire', 
        lat: 12.9349,  // Magsaysay
        lng: 121.0827, 
        icon: 'https://kvsh.com/wp-content/uploads/2017/01/fire_truck.png' 
      }
    ];
  
    // Add user markers
    users.forEach(user => {
      const customIcon = L.icon({
        iconUrl: user.icon,
        iconSize: [78, 58],
        iconAnchor: [39, 58],
        popupAnchor: [0, -58]
      });
  
      const marker = L.marker([user.lat, user.lng], { icon: customIcon }).addTo(this.map!);
  
      // HTML content for the popup
      const popupContent = `
        <div>
          <p>${user.name}</p>
          <button id="receive-${user.id}" style="background-color: #007bff; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">
            Receive
          </button>
        </div>
      `;
  
      marker.bindPopup(popupContent);
  
      marker.on('popupopen', () => {
        const button = document.getElementById(`receive-${user.id}`);
        if (button) {
          button.addEventListener('click', () => {
            alert(`Received request from ${user.name}`);
            this.showNearestMDRRO([user.lat, user.lng]); // Trigger to show nearest MDRRO
          });
        }
      });
    });
  
    const firstUser = users[0];
    this.map.setView([firstUser.lat, firstUser.lng], 13);
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

// Find nearest MDRRO
private findNearestMDRRO(userLocation: [number, number]): [number, number] {
  const mdrroLocations = [
    { name: 'MDRRO Calapan', lat: 13.4094, lng: 121.1803 },
    { name: 'MDRRO San Jose', lat: 12.9704, lng: 121.0305 },
    { name: 'MDRRO Magsaysay', lat: 12.9349, lng: 121.0827 },
  ];

  let nearestLocation = mdrroLocations[0];
  let minDistance = this.calculateDistance(userLocation[0], userLocation[1], nearestLocation.lat, nearestLocation.lng);

  // Find the nearest MDRRO by comparing distances
  mdrroLocations.forEach(location => {
    const distance = this.calculateDistance(userLocation[0], userLocation[1], location.lat, location.lng);
    if (distance < minDistance) {
      nearestLocation = location;
      minDistance = distance;
    }
  });

  return [nearestLocation.lat, nearestLocation.lng];
}

// Call this function from the user's click event
private showNearestMDRRO(userLocation: [number, number]): void {
  const nearestMDRRO = this.findNearestMDRRO(userLocation);

  const mdrroIcon = L.icon({
    iconUrl: 'https://montalbanrizalph.com/wp-content/uploads/2022/08/Picture1.png', // Replace with your MDRRO icon URL
    iconSize: [100, 60],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30]
  });

  // Create an MDRRO marker at the nearest location
  const mdrroMarker = L.marker(nearestMDRRO, { icon: mdrroIcon }).addTo(this.map!);
  mdrroMarker.bindPopup('MDRRO - Nearest Emergency Office').openPopup();


}

  
  
  
  
  private addLocationButton(): void {
    if (!this.map) return;
  
    // Create a custom control
    const locateControl = L.Control.extend({
      options: { position: 'topright' },
  
      onAdd: (map: L.Map) => {
        const button = L.DomUtil.create('button', 'leaflet-bar leaflet-control leaflet-control-custom');
        button.innerHTML = '📍 My Location';
        button.style.backgroundColor = 'white';
        button.style.padding = '5px';
  
        // Button click handler
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
  
    // Add the custom control to the map
    this.map.addControl(new locateControl());
  }
  
  
  
  navigateToDashboard(){
    this.route.navigate(['/admin'])
   }
   navigateToHistoryCall(){
     this.route.navigate(['/admin/history-call'])
   }
   navigateToUserList(){
     this.route.navigate(['/admin/user-list'])
   }
}
