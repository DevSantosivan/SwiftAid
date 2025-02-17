import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { getFirestore, collection, onSnapshot, doc, updateDoc, addDoc } from 'firebase/firestore';
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
  selector: 'app-map-content',
  imports: [],
  templateUrl: './map-content.component.html',
  styleUrl: './map-content.component.scss'
})

export class MapContentComponent implements OnInit {
  private map: L.Map | undefined;
  private linesLayer: L.LayerGroup = L.layerGroup();
  private users: EmergencyRequest[] = [];

  constructor(private route: Router) {}

  ngOnInit(): void {
    this.initializeMap();
    this.fetchUsersFromFirestore();  // Real-time data
    this.addLocationButton();
  }

  private initializeMap(): void {
    const sanJoseCoordinates: [number, number] = [12.3493, 121.0179];
    this.map = L.map('map').setView(sanJoseCoordinates, 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(this.map);
  }

  private fetchUsersFromFirestore(): void {
    const firebaseApp = initializeApp(environment.firebaseConfig);
    const db = getFirestore(firebaseApp);
    const usersCollection = collection(db, 'EmergencyRequest');

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

    this.linesLayer.clearLayers();
    const showPopupContainer = document.querySelector('.show-popup') as HTMLElement;

    if (showPopupContainer) {
      showPopupContainer.style.display = 'none';
    }

    this.users.forEach(async (user) => {
      const customIcon = this.getUserIcon(user.needs);

      const marker = L.marker([user.latitude, user.longitude], { icon: customIcon }).addTo(this.map!);

      const currentLocation = await this.getAddressFromCoordinates(user.latitude, user.longitude);
      user.currentLocation = currentLocation;

      const popupContent = `
        <div class="popupContent" style="overflow: hidden;">
          <p>Request Proof</p>
          <img src="${user.image}" alt="${user.name}" style="width: 100%; height: 200px; object-fit: cover; border-radius:5px;" />
          <p><strong>Name:</strong> ${user.name}</p>
          <p><strong>Need:</strong> ${user.needs || 'Not specified'}</p>
          <p><strong>Contact:</strong> ${user.contactNumber}</p>
          <p><strong>Email:</strong> ${user.email}</p>
          <p><strong>Location:</strong> ${user.currentLocation || user.address}</p>
          <p><strong>Timestamp:</strong> ${user.timestamp?.toDate().toLocaleString()}</p>
          <p><strong>Happens:</strong> ${user.description}</p>
          <button style="width: 100%; font-size: 11px; height: 50px; background-color:red; border:none; cursor:pointer; color:white;" id="requestRescueBtn-${user.latitude}-${user.longitude}">Accept Request & Show Nearest Barangay</button>
        </div>
      `;

      marker.on('click', () => {
        if (showPopupContainer) {
          showPopupContainer.innerHTML = popupContent;
          showPopupContainer.style.display = 'block';
          showPopupContainer.classList.add('show');

          const rescueButton = document.getElementById(`requestRescueBtn-${user.latitude}-${user.longitude}`) as HTMLButtonElement;
          if (rescueButton) {
            rescueButton.addEventListener('click', async () => {
              rescueButton.innerHTML = 'Processing... <span class="spinner"></span>';
              rescueButton.style.backgroundColor = 'gray';
              rescueButton.disabled = true;

              await this.updateRescueStatus(user.id);  // Update Firestore
              this.requestRescue(user.latitude, user.longitude);  // Perform additional actions

              rescueButton.innerText = 'Already Requested';
              rescueButton.style.backgroundColor = 'green';

            });
          }
        }
      });

      this.linesLayer.addLayer(marker);
    });

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

        let address = road ? `${road}` : 'Near ';
        if (!road && suburb) address += `${suburb}`;
        else if (!road && city) address += `${city}`;

        if (suburb && road) address += `, ${suburb}`;
        if (city) address += `, ${city}`;
        if (state) address += `, ${state}`;
        if (postcode) address += `, ${postcode}`;
        if (country) address += `, ${country}`;

        return address.trim() || 'Address not found';
      }

      return 'Address not found';
    } catch (error) {
      console.error('Error fetching address:', error);
      return 'Unable to fetch address at this time.';
    }
  }

  requestRescue(latitude: number, longitude: number): void {
    const nearestMDRRMO = this.getNearestMDRRMO(latitude, longitude);

    alert(`Nearest Rescue: ${nearestMDRRMO.name}\nLocation: ${nearestMDRRMO.location}\nContact: ${nearestMDRRMO.contact}`);

    if (this.map) {
      const mdrRmoMarker = L.marker([nearestMDRRMO.latitude, nearestMDRRMO.longitude]).addTo(this.map);
      mdrRmoMarker.bindPopup(`
        <div>
          <img src="${nearestMDRRMO.image}" alt="${nearestMDRRMO.name}" style="width: 100%; height: 150px; border-radius: 5px;" />
          <p><strong>Name:</strong> ${nearestMDRRMO.name}</p>
          <p><strong>Location:</strong> ${nearestMDRRMO.location}</p>
          <p><strong>Contact:</strong> ${nearestMDRRMO.contact}</p>
          <button style="background-color: red; color: white; border: none; padding: 10px; margin-top: 10px; width: 100%;">Already Rescued</button>
        </div>
      `);

      this.map.setView([nearestMDRRMO.latitude, nearestMDRRMO.longitude], 15);
    }
  }

  private getNearestMDRRMO(latitude: number, longitude: number): any {
    const mdrRmos = [
      { name: 'Barangay 1', latitude: 12.347984417738619, longitude: 121.07006396605, location: 'San Jose Municipal Hall', contact: '09210000001', image: 'http://cavitecity.gov.ph/images/barangay.png' },
      { name: 'Barangay 2', latitude: 12.3475, longitude: 121.0712, location: 'San Jose Municipal Hall', contact: '09210000002', image: 'http://cavitecity.gov.ph/images/barangay.png' },
      { name: 'Barangay 3', latitude: 12.3480, longitude: 121.0718, location: 'San Jose Municipal Hall', contact: '09210000003', image: 'http://cavitecity.gov.ph/images/barangay.png' },
      { name: 'Barangay 4', latitude: 12.3485, longitude: 121.0724, location: 'San Jose Municipal Hall', contact: '09210000004', image: 'http://cavitecity.gov.ph/images/barangay.png' },
      { name: 'Barangay 5', latitude: 12.3490, longitude: 121.0730, location: 'San Jose Municipal Hall', contact: '09210000005', image: 'http://cavitecity.gov.ph/images/barangay.png' },
      { name: 'Barangay 6', latitude: 12.3495, longitude: 121.0736, location: 'San Jose Municipal Hall', contact: '09210000006', image: 'http://cavitecity.gov.ph/images/barangay.png' },
      { name: 'Barangay 7', latitude: 12.3500, longitude: 121.0742, location: 'San Jose Municipal Hall', contact: '09210000007', image: 'http://cavitecity.gov.ph/images/barangay.png' },
      { name: 'Barangay 8', latitude: 12.3505, longitude: 121.0748, location: 'San Jose Municipal Hall', contact: '09210000008', image: 'http://cavitecity.gov.ph/images/barangay.png' },
      { name: 'Barangay 9', latitude: 12.3510, longitude: 121.0754, location: 'San Jose Municipal Hall', contact: '09210000009', image: 'http://cavitecity.gov.ph/images/barangay.png' },
      { name: 'Barangay 10', latitude: 12.3515, longitude: 121.0760, location: 'San Jose Municipal Hall', contact: '09210000010', image: 'http://cavitecity.gov.ph/images/barangay.png' },
      { name: 'Barangay 11', latitude: 12.3520, longitude: 121.0766, location: 'San Jose Municipal Hall', contact: '09210000011', image: 'http://cavitecity.gov.ph/images/barangay.png' },
      { name: 'Barangay 12', latitude: 12.3525, longitude: 121.0772, location: 'San Jose Municipal Hall', contact: '09210000012', image: 'hhttp://cavitecity.gov.ph/images/barangay.png' },
      { name: 'Barangay 13', latitude: 12.3530, longitude: 121.0778, location: 'San Jose Municipal Hall', contact: '09210000013', image: 'http://cavitecity.gov.ph/images/barangay.png' },
      { name: 'Barangay 14', latitude: 12.3535, longitude: 121.0784, location: 'San Jose Municipal Hall', contact: '09210000014', image: 'hhttp://cavitecity.gov.ph/images/barangay.png' },
      { name: 'Barangay 15', latitude: 12.3540, longitude: 121.0790, location: 'San Jose Municipal Hall', contact: '09210000015', image: 'http://cavitecity.gov.ph/images/barangay.png' }
    ];
    

    let nearestMDRRMO = mdrRmos[0];
    let shortestDistance = this.calculateDistance(latitude, longitude, nearestMDRRMO.latitude, nearestMDRRMO.longitude);

    mdrRmos.forEach(mdrRmo => {
      const distance = this.calculateDistance(latitude, longitude, mdrRmo.latitude, mdrRmo.longitude);
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
}
