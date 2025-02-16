import { AdminNavbarComponent } from '../admin-navbar/admin-navbar.component';
import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { getFirestore, collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import { environment } from '../../model/environment';
import * as L from 'leaflet';

interface EmergencyRequest {
  id?: string;
  name: string;
  image: string;
  address: string;
  contactNumber: string;
  email: string;
  latitude: number;
  longitude: number;
  needs: string;
  timestamp: any;
  currentLocation?: string;
  description?: string;
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
  slideOpen: boolean = false;
  selectedRequest: EmergencyRequest | null = null;

  constructor(private route: Router) {}

  ngOnInit(): void {
    this.initializeMap();
    this.fetchUsersFromFirestore();  // Real-time data
    this.addLocationButton();
  }

  private initializeMap(): void {
    // Coordinates for San Jose, Occidental Mindoro
    const sanJoseCoordinates: [number, number] = [12.3493, 121.0179];
    
    // Initialize the map with a view centered on San Jose
    this.map = L.map('map').setView(sanJoseCoordinates, 13);  // Zoom level of 13 for closer focus
  
    // Define the bounds to restrict the panning and zooming around San Jose
   

  
    // OpenStreetMap tile layer for street view
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,  // Maximum zoom level
    }).addTo(this.map);
  }
  
  

  private fetchUsersFromFirestore(): void {
    const firebaseApp = initializeApp(environment.firebaseConfig);
    const db = getFirestore(firebaseApp);
    const usersCollection = collection(db, 'EmergencyRequest');

    // Listen for real-time updates in Firestore
    onSnapshot(usersCollection, (snapshot) => {
      this.users = snapshot.docs.map(doc => {
        const data = doc.data() as EmergencyRequest;
        return {
          id: doc.id,
          image: data.image,
          name: data.name,
          address: data.address,
          contactNumber: data.contactNumber,
          email: data.email,
          latitude: data.latitude,
          longitude: data.longitude,
          needs: data.needs,
          timestamp: data.timestamp,
          description: data.description
        };
      });

      this.addUsersToMap();
    });
  }

  private async addUsersToMap(): Promise<void> {
    if (!this.map || this.users.length === 0) return;

    // Clear existing markers before adding new ones
    this.linesLayer.clearLayers();

    this.users.forEach(async (user) => {
      const customIcon = this.getUserIcon(user.needs);

      const marker = L.marker([user.latitude, user.longitude], { icon: customIcon }).addTo(this.map!);

      const currentLocation = await this.getAddressFromCoordinates(user.latitude, user.longitude);
      user.currentLocation = currentLocation;

      const popupContent = `
        <div class="popupContent" style= "overflow: hidden;" >
          <p>Request Proof</p>
           <img src="${user.image}" alt="${user.name}" style="width: 100%; height: 200px; object-fit: cover;" />
          <p><strong>Name:</strong> ${user.name}</p>
          <p><strong>Need:</strong> ${user.needs || 'Not specified'}</p>
          <p><strong>Contact:</strong> ${user.contactNumber}</p>
          <p><strong>Email:</strong> ${user.email}</p>
          <p><strong>Location:</strong> ${user.currentLocation || user.address}</p>
          <p><strong>Timestamp:</strong> ${user.timestamp?.toDate().toLocaleString()}</p>
          <p><strong>Happens:</strong> ${user.description}</p>
          <button style="width: 100%; height: 50px; background-color:red; border:none; color:white;" id="requestRescueBtn-${user.latitude}-${user.longitude}">Request Rescue</button>
        </div>
      `;

      marker.bindPopup(popupContent);

      // Add event listener for "Request Rescue" button
      marker.on('popupopen', () => {
        const rescueButton = document.getElementById(`requestRescueBtn-${user.latitude}-${user.longitude}`);
        if (rescueButton) {
          rescueButton.addEventListener('click', async () => {
            await this.updateRescueStatus(user.id);  // Assuming the user.id is the document ID in Firestore
            this.requestRescue(user.latitude, user.longitude);  // Perform any additional actions if needed
          });
        }
      });

      // Store the marker in the layer group
      this.linesLayer.addLayer(marker);
    });

    // Add the layer group to the map
    this.linesLayer.addTo(this.map);

    if (this.users.length > 0) {
      const firstUser = this.users[0];
      this.map.setView([firstUser.latitude, firstUser.longitude], 9);
    }
  }

  private async updateRescueStatus(userId: string | undefined): Promise<void> {
    if (!userId) {
      console.error('User ID is missing.');
      return;
    }

    try {
      const firebaseApp = initializeApp(environment.firebaseConfig);
      const db = getFirestore(firebaseApp);
      const userRef = doc(db, 'EmergencyRequest', userId);

      // Update the status field to "Accepted"
      await updateDoc(userRef, {
        status: 'Accepted'
      });

      console.log('Status updated to Accepted for user:', userId);
    } catch (error) {
      console.error('Error updating rescue status:', error);
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
      iconSize: [50, 38],
      iconAnchor: [39, 58],
      popupAnchor: [0, -58]
    });
  }

  private async getAddressFromCoordinates(lat: number, lon: number): Promise<string> {
    const apiUrl = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`;
    try {
      const response = await fetch(apiUrl);
      const data = await response.json();
      
      if (data && data.address) {
        const road = data.address.road || '';
        const suburb = data.address.suburb || '';
        const city = data.address.city || data.address.town || data.address.village || '';
        const state = data.address.state || '';
        const postcode = data.address.postcode || '';
        const country = data.address.country || '';
        
        const neighborhood = data.address.neighbourhood || '';

        let address = road ? `${road}` : 'Near ';
        if (!road && suburb) address += `${suburb}`;
        else if (!road && city) address += `${city}`;
        else if (!road && neighborhood) address += `near ${neighborhood}`;

        if (suburb && road) address += `, ${suburb}`;
        if (city) address += `, ${city}`;
        if (state) address += `, ${state}`;
        if (postcode) address += `, ${postcode}`;
        if (country) address += `, ${country}`;
        if (neighborhood) address += ` (Near ${neighborhood})`;

        return address.trim() || 'Address not found';
      }

      return 'Address not found';
    } catch (error) {
      console.error('Error fetching address:', error);
      return 'Unable to fetch address at this time.';
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
      { name: 'Barangay 1', latitude: 12.347984417738619, longitude: 121.07006396605, location: 'San Jose Municipal Hall', contact: '09210000001' },
      { name: 'Barangay 2', latitude: 12.3475, longitude: 121.0712, location: 'San Jose Municipal Hall', contact: '09210000002' },
      { name: 'Barangay 3', latitude: 12.3480, longitude: 121.0718, location: 'San Jose Municipal Hall', contact: '09210000003' },
      { name: 'Barangay 4', latitude: 12.3485, longitude: 121.0724, location: 'San Jose Municipal Hall', contact: '09210000004' },
      { name: 'Barangay 5', latitude: 12.3490, longitude: 121.0730, location: 'San Jose Municipal Hall', contact: '09210000005' },
      { name: 'Barangay 6', latitude: 12.3495, longitude: 121.0736, location: 'San Jose Municipal Hall', contact: '09210000006' },
      { name: 'Barangay 7', latitude: 12.3500, longitude: 121.0742, location: 'San Jose Municipal Hall', contact: '09210000007' },
      { name: 'Barangay 8', latitude: 12.3505, longitude: 121.0748, location: 'San Jose Municipal Hall', contact: '09210000008' },
      { name: 'Barangay 9', latitude: 12.3510, longitude: 121.0754, location: 'San Jose Municipal Hall', contact: '09210000009' },
      { name: 'Barangay 10', latitude: 12.3515, longitude: 121.0760, location: 'San Jose Municipal Hall', contact: '09210000010' },
      { name: 'Barangay 11', latitude: 12.3520, longitude: 121.0766, location: 'San Jose Municipal Hall', contact: '09210000011' },
      { name: 'Barangay 12', latitude: 12.3525, longitude: 121.0772, location: 'San Jose Municipal Hall', contact: '09210000012' },
      { name: 'Barangay 13', latitude: 12.3530, longitude: 121.0778, location: 'San Jose Municipal Hall', contact: '09210000013' },
      { name: 'Barangay 14', latitude: 12.3535, longitude: 121.0784, location: 'San Jose Municipal Hall', contact: '09210000014' },
      { name: 'Barangay 15', latitude: 12.3540, longitude: 121.0790, location: 'San Jose Municipal Hall', contact: '09210000015' }
    ];

    let nearestMDRRMO = mdrRmos[0];
    let shortestDistance = this.calculateDistance(latitude, longitude, nearestMDRRMO.latitude, nearestMDRRMO.longitude);

    mdrRmos.forEach(mdrRmo => {
      const distance = this.calculateDistance(latitude, longitude, mdrRmo.latitude, mdrRmo.longitude);
      console.log(`Distance to ${mdrRmo.name}: ${distance} km`);

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
        const button = L.DomUtil.create('button', 'leaflet-bar');
        button.innerHTML = '🔍 Locate Me';

        L.DomEvent.on(button, 'click', () => {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const lat = position.coords.latitude;
              const lon = position.coords.longitude;
              this.map?.setView([lat, lon], 15);
              L.marker([lat, lon]).addTo(this.map!).bindPopup('Your Location').openPopup();
            },
            (err) => {
              console.error('Geolocation error:', err);
              alert('Could not get your location');
            }
          );
        });

        return button;
      }
    });

    this.map.addControl(new locateControl());
  }


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
