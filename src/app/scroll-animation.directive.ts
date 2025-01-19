// import { Component, OnInit } from '@angular/core';
// import { Router } from '@angular/router';
// import * as L from 'leaflet';
// import { GeminiService } from '../services/gemini.service';  // Import Gemini service

// @Component({
//   selector: 'app-map',
//   templateUrl: './map.component.html',
//   styleUrls: ['./map.component.scss']
// })
// export class MapComponent implements OnInit {
//   private map: L.Map | undefined;
//   private linesLayer: L.LayerGroup = L.layerGroup();
//   private users = [
//     { 
//       id: 1, 
//       name: 'Thaddeus Binasag', 
//       lat: 13.4094, 
//       lng: 121.1803, 
//       need: 'Police', 
//       contact: '0917-111-2233'
//     },
//     { 
//       id: 2, 
//       name: 'Carlos Salvador', 
//       lat: 12.9704, 
//       lng: 121.0305, 
//       need: 'Ambulance', 
//       contact: '0917-222-3344'
//     },
//     { 
//       id: 3, 
//       name: 'Ivan Santos', 
//       lat: 12.9349, 
//       lng: 121.0827, 
//       need: 'Fire', 
//       contact: '0917-333-4455'
//     }
//   ];

//   constructor(private route: Router, private geminiService: GeminiService) {}

//   ngOnInit(): void {
//     this.initializeMap();
//     this.addUsersToMap();
//     this.addLocationButton();
//     this.useGeminiForRequestPriority();  // Use Gemini AI for prioritization
//   }

//   // Initialize the map with a default view
//   private initializeMap(): void {
//     const midoroCoordinates: [number, number] = [13.232, 122.58];

//     this.map = L.map('map').setView(midoroCoordinates, 13);

//     L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
//       attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
//       subdomains: 'abcd',
//       maxZoom: 19
//     }).addTo(this.map);
//   }

//   // Add users to map
//   private addUsersToMap(): void {
//     if (!this.map) return;

//     this.users.forEach(user => {
//       const customIcon = this.getUserIcon(user.need);

//       const marker = L.marker([user.lat, user.lng], { icon: customIcon }).addTo(this.map!);

//       L.circle([user.lat, user.lng], {
//         color: 'red',
//         fillColor: 'red',
//         fillOpacity: 0.2,
//         radius: 500
//       }).addTo(this.map!);

//       const popupContent = `
//         <div>
//           <p><strong>Name:</strong> ${user.name}</p>
//           <p><strong>Need:</strong> ${user.need}</p>
//           <p><strong>Contact:</strong> ${user.contact}</p>
//           <button id="receive-${user.id}" style="background-color: #007bff; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">
//             Receive Request
//           </button>
//         </div>
//       `;

//       marker.bindPopup(popupContent);
//     });
//   }

//   // Function to get the appropriate icon based on user need
//   private getUserIcon(need: string): L.Icon {
//     let iconUrl = '';

//     switch (need) {
//       case 'Ambulance':
//         iconUrl = 'https://purepng.com/public/uploads/large/purepng.com-ambulanceambulanceinjured-peoplefor-an-illness-or-injuryhospital-medicalambulances-17015274053493pgy3.png';
//         break;
//       case 'Police':
//         iconUrl = 'https://purepng.com/public/uploads/large/purepng.com-police-carpolice-carpolice-vehiclecop-carcop-vehicle-1701527596259orec0.png';
//         break;
//       case 'Fire':
//         iconUrl = 'https://kvsh.com/wp-content/uploads/2017/01/fire_truck.png';
//         break;
//       default:
//         iconUrl = 'https://example.com/default-icon.png';
//     }

//     return L.icon({
//       iconUrl: iconUrl,
//       iconSize: [70, 48],
//       iconAnchor: [39, 58],
//       popupAnchor: [0, -58]
//     });
//   }

//   // Function to prioritize emergency requests using Gemini AI
//   private useGeminiForRequestPriority(): void {
//     const requests = this.users.map(user => user.need);
//     const requestCount = this.countRequests(requests);

//     const question = `Which emergency service needs priority based on the following requests: ${JSON.stringify(requestCount)}?`;

//     this.geminiService.askQuestion(question).subscribe(response => {
//       console.log('Gemini AI Response:', response.choices[0].text);
//       const priorityService = response.choices[0].text.trim();
//       alert(`Gemini AI recommends prioritizing: ${priorityService}`);
//     });
//   }

//   // Count the occurrences of each request type
//   private countRequests(requests: string[]): { [key: string]: number } {
//     return requests.reduce((acc, request) => {
//       acc[request] = (acc[request] || 0) + 1;
//       return acc;
//     }, {});
//   }

//   // Add location button to show user's current position
//   private addLocationButton(): void {
//     if (!this.map) return;

//     const locateControl = L.Control.extend({
//       options: { position: 'topright' },

//       onAdd: (map: L.Map) => {
//         const button = L.DomUtil.create('button', 'leaflet-bar leaflet-control leaflet-control-custom');
//         button.innerHTML = '📍 My Location';
//         button.style.backgroundColor = 'white';
//         button.style.padding = '5px';

//         L.DomEvent.on(button, 'click', () => {
//           navigator.geolocation.getCurrentPosition(
//             (position) => {
//               const { latitude, longitude } = position.coords;
//               map.setView([latitude, longitude], 15);
//             },
//             (error) => {
//               console.error('Error fetching location:', error);
//               alert('Unable to fetch your current location.');
//             }
//           );
//         });

//         return button;
//       }
//     });

//     this.map.addControl(new locateControl());
//   }
// }

// // src/app/services/gemini.service.ts

// import { Injectable } from '@angular/core';
// import { HttpClient, HttpHeaders } from '@angular/common/http';
// import { Observable } from 'rxjs';

// @Injectable({
//   providedIn: 'root',
// })
// export class GeminiService {
//   private geminiApiUrl = 'https://gemini.googleapis.com/v1/completions';  // Replace with Gemini API URL
//   private apiKey = 'YOUR_GEMINI_API_KEY';  // Replace with your Gemini API key

//   constructor(private http: HttpClient) {}

//   // Function to query Gemini for routing or other requests
//   askQuestion(question: string): Observable<any> {
//     const body = {
//       model: 'gemini-v1',  // Replace with the correct Gemini model version
//       prompt: question,
//       max_tokens: 150,
//     };

//     const headers = new HttpHeaders({
//       Authorization: `Bearer ${this.apiKey}`,
//       'Content-Type': 'application/json',
//     });

//     return this.http.post<any>(this.geminiApiUrl, body, { headers });
//   }
// }
