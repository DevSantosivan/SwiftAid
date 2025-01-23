import { AdminNavbarComponent } from '../admin-navbar/admin-navbar.component';
import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import { environment } from '../../model/environment';
import * as L from 'leaflet';

interface EmergencyRequest {
  id?: string;
  name: string;
  address: string;
  contactNumber: string;
  email: string;
  latitude: number;
  longitude: number;
  needs: string;
  timestamp: any;
  currentLocation?: string;
}

@Component({
  selector: 'app-map',
  imports: [AdminNavbarComponent, CommonModule],
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss']
})
export class MapComponent implements OnInit {
  private map: L.Map | undefined;
  private linesLayer: L.LayerGroup = L.layerGroup();
  private users: EmergencyRequest[] = [];

  constructor(private route: Router) {}

  ngOnInit(): void {
    this.initializeMap();
    this.fetchUsersFromFirestore();
    this.addLocationButton();
  }

  private initializeMap(): void {
    const midoroCoordinates: [number, number] = [13.258066063423568, 119.43216839243894];
    this.map = L.map('map').setView(midoroCoordinates, 13);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19
    }).addTo(this.map);
  }

  private async fetchUsersFromFirestore(): Promise<void> {
    try {
      const firebaseApp = initializeApp(environment.firebaseConfig);
      const db = getFirestore(firebaseApp);
      const usersCollection = collection(db, 'EmergencyRequest');
      const snapshot = await getDocs(usersCollection);
      this.users = snapshot.docs.map(doc => {
        const data = doc.data() as EmergencyRequest;
        return {
          id: doc.id,
          name: data.name,
          address: data.address,
          contactNumber: data.contactNumber,
          email: data.email,
          latitude: data.latitude,
          longitude: data.longitude,
          needs: data.needs,
          timestamp: data.timestamp
        };
      });

      this.addUsersToMap();
    } catch (error) {
      console.error('Error fetching users from Firestore:', error);
    }
  }

  private async addUsersToMap(): Promise<void> {
    if (!this.map || this.users.length === 0) return;
  
    this.users.forEach(async (user) => {
      const customIcon = this.getUserIcon(user.needs);
  
      const marker = L.marker([user.latitude, user.longitude], { icon: customIcon }).addTo(this.map!);
  
      L.circle([user.latitude, user.longitude], {
        color: 'red',
        fillColor: 'red',
        fillOpacity: 0.2,
        radius: 500
      }).addTo(this.map!);
  
      const currentLocation = await this.getAddressFromCoordinates(user.latitude, user.longitude);
      user.currentLocation = currentLocation;
  
      const popupContent = `
        <div>
          <p><strong>Name:</strong> ${user.name}</p>
          <p><strong>Need:</strong> ${user.needs || 'Not specified'}</p>
          <p><strong>Contact:</strong> ${user.contactNumber}</p>
          <p><strong>Email:</strong> ${user.email}</p>
          <p><strong>Location:</strong> ${user.currentLocation || user.address}</p>
          <p><strong>Timestamp:</strong> ${user.timestamp?.toDate().toLocaleString()}</p>
          <button id="requestRescueBtn-${user.latitude}-${user.longitude}">Request Rescue</button>
        </div>
      `;
  
      marker.bindPopup(popupContent);
  
      // Add event listener for "Request Rescue" button
      marker.on('popupopen', () => {
        const rescueButton = document.getElementById(`requestRescueBtn-${user.latitude}-${user.longitude}`);
        if (rescueButton) {
          rescueButton.addEventListener('click', () => {
            this.requestRescue(user.latitude, user.longitude);
          });
        }
      });
    });
  
    if (this.users.length > 0) {
      const firstUser = this.users[0];
      this.map.setView([firstUser.latitude, firstUser.longitude], 9);
    }
  }
  

  private getUserIcon(service: string): L.Icon {
    let iconUrl = '';
    switch (service) {
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
        iconUrl = 'https://wallpapers.com/images/high/red-cross-ambulance-icon-mibnenxu2pklyply.png';
    }

    return L.icon({
      iconUrl: iconUrl,
      iconSize: [70, 48],
      iconAnchor: [39, 58],
      popupAnchor: [0, -58]
    });
  }

  private async getAddressFromCoordinates(lat: number, lon: number): Promise<string> {
    const apiUrl = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`;
    try {
      const response = await fetch(apiUrl);
      const data = await response.json();
      return data?.address?.road || data?.address?.municipality || 'Address not found';
    } catch (error) {
      console.error('Error fetching address:', error);
      return 'Address not found';
    }
  }

  requestRescue(latitude: number, longitude: number): void {
    console.log('Requesting rescue for user at', latitude, longitude);
  
    const nearestMDRRMO = this.getNearestMDRRMO(latitude, longitude);
  
    // Show alert with nearest MDRRMO details
    alert(`Nearest MDRRMO: ${nearestMDRRMO.name}\nLocation: ${nearestMDRRMO.location}\nContact: ${nearestMDRRMO.contact}`);
  
    if (this.map) {
      // Create marker for the nearest MDRRMO and add it to the map
      const mdrRmoMarker = L.marker([nearestMDRRMO.latitude, nearestMDRRMO.longitude]).addTo(this.map);
  
      // Bind popup content to the marker with MDRRMO details
      mdrRmoMarker.bindPopup(`
        <div>
          <p><strong>Name:</strong> ${nearestMDRRMO.name}</p>
          <p><strong>Location:</strong> ${nearestMDRRMO.location}</p>
          <p><strong>Contact:</strong> ${nearestMDRRMO.contact}</p>
        </div>
      `);
  
      // Center the map on the MDRRMO location and zoom in
      this.map.setView([nearestMDRRMO.latitude, nearestMDRRMO.longitude], 15);
    }
  }

  private getNearestMDRRMO(latitude: number, longitude: number): any {
    const mdrRmos = [
      { name: 'Calapan', latitude: 13.4100, longitude: 121.0400, location: 'Calapan City Hall', contact: '09210000001' },
      { name: 'San Jose', latitude: 12.347984417738619, longitude: 121.07006396605, location: 'San Jose Municipal Hall', contact: '09210000002' },
      { name: 'Rizal', latitude: 12.495241994028344, longitude: 121.01067571624499, location: 'Rizal Municipal Hall', contact: '09210000003' },
      { name: 'Calintaan', latitude:  12.606363170716476, longitude: 121.09197362749534, location: 'Calintaan Municipal Hall', contact: '09210000004' },
      { name: 'Abra', latitude: 17.0732, longitude: 120.6035, location: 'Abra Provincial Hall', contact: '09210000005' },
      { name: 'Sablayan', latitude: 12.9532, longitude: 120.6236, location: 'Sablayan Municipal Hall', contact: '09210000006' },
      { name: 'Mamburao', latitude: 13.1423, longitude: 120.6342, location: 'Mamburao Municipal Hall', contact: '09210000007' },
      { name: 'Santa Cruz', latitude: 13.2212, longitude: 120.8699, location: 'Santa Cruz Municipal Hall', contact: '09210000008' }
    ];
  
    let nearestMDRRMO = mdrRmos[0];
    let shortestDistance = this.calculateDistance(latitude, longitude, nearestMDRRMO.latitude, nearestMDRRMO.longitude);
  
    mdrRmos.forEach(mdrRmo => {
      const distance = this.calculateDistance(latitude, longitude, mdrRmo.latitude, mdrRmo.longitude);
      console.log(`Distance to ${mdrRmo.name}: ${distance} km`);  // Log the distance to see if it’s being calculated correctly
  
      if (distance < shortestDistance) {
        nearestMDRRMO = mdrRmo;
        shortestDistance = distance;
      }
    });
  
    return nearestMDRRMO;
  }
  

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = this.degreesToRadians(lat2 - lat1);
    const dLon = this.degreesToRadians(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.degreesToRadians(lat1)) * Math.cos(this.degreesToRadians(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private degreesToRadians(degrees: number): number {
    return degrees * Math.PI / 180;
  }

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
              const lat = position.coords.latitude;
              const lon = position.coords.longitude;
              this.map!.setView([lat, lon], 13);
            },
            (err) => alert('Could not retrieve location')
          );
        });

        return button;
      }
    });

    this.map.addControl(new locateControl());
  }

  // Navigation methods to go to different routes
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
