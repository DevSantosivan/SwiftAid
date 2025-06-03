import { Component, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { EmergencyRequestService } from '../../core/rescue_request.service';
import { EmergencyRequest } from '../../model/emergency';

import * as L from 'leaflet';
import 'leaflet-routing-machine';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-emergency-request',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './emergency-request.component.html',
  styleUrl: './emergency-request.component.scss',
})
export class EmergencyRequestComponent implements AfterViewInit {
  @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef;

  map!: L.Map;
  requests: EmergencyRequest[] = [];
  filteredRequests: EmergencyRequest[] = [];
  markers: L.Marker[] = [];
  activeFilter: string = 'All';

  staffLocation: L.LatLngExpression = [12.37752449490026, 121.03153380797781];
  staffMarker?: L.Marker;
  routingControl?: any;

  constructor(private requestService: EmergencyRequestService) {}

  ngAfterViewInit(): void {
    this.initializeMap();
    this.loadRequests();
  }

  initializeMap(): void {
    this.map = L.map(this.mapContainer.nativeElement).setView(
      [14.5995, 120.9842],
      12
    );

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(this.map);

    this.staffMarker = L.marker(this.staffLocation, {
      icon: L.icon({
        iconUrl: 'assets/logopng.jpg',
        iconSize: [30, 40],
        iconAnchor: [15, 40],
      }),
    })
      .addTo(this.map)
      .bindPopup('<strong>Staff Location</strong>');
  }

  async loadRequests(): Promise<void> {
    try {
      this.requests = await this.requestService.getRequest();
      this.applyFilter('All'); // Default to show all
    } catch (error) {
      console.error('Failed to load emergency requests:', error);
    }
  }

  applyFilter(status: string): void {
    this.activeFilter = status;

    // Filter list
    if (status === 'All') {
      this.filteredRequests = this.requests;
    } else {
      this.filteredRequests = this.requests.filter(
        (req) => req.status === status
      );
    }

    // Clear old markers
    this.markers.forEach((marker) => this.map.removeLayer(marker));
    this.markers = [];

    // Add filtered markers
    this.filteredRequests.forEach((req) => {
      if (req.latitude && req.longitude) {
        const requestIcon = L.divIcon({
          html: `
            <div style="
              width: 80px;
              height: 80px;
              background: white url('${
                req.image || 'assets/default-request-icon.png'
              }') center/cover no-repeat;
              box-shadow: 0 0 6px rgba(0,0,0,0.4);
            "></div>
          `,
          iconSize: [40, 40],
          iconAnchor: [20, 40],
          className: '',
        });

        const marker = L.marker([req.latitude, req.longitude], {
          icon: requestIcon,
          title: req.name,
        })
          .addTo(this.map)
          .bindPopup(`<strong>${req.name}</strong><br>${req.address}`);

        this.markers.push(marker);
      }
    });

    // Adjust view to fit markers
    const group = L.featureGroup([...this.markers, this.staffMarker!]);
    this.map.fitBounds(group.getBounds().pad(0.2));
  }

  centerMapOnRequest(request: EmergencyRequest): void {
    if (!request.latitude || !request.longitude) return;

    const requestLatLng = L.latLng(request.latitude, request.longitude);

    this.markers.forEach((marker) => this.map.removeLayer(marker));
    this.markers = [];

    if (this.routingControl) {
      this.map.removeControl(this.routingControl);
      this.routingControl = undefined;
    }

    const marker = L.marker(requestLatLng)
      .addTo(this.map)
      .bindPopup(
        `
        <div>
          <img src="${request.image || 'assets/default-request-icon.png'}" 
               alt="${request.name}" 
               style="width: 100%; height: 100px; object-fit: cover; margin-bottom: 5px;">
          <div><strong>${request.name}</strong></div>
          <div>${request.address}</div>
        </div>
      `
      )
      .openPopup();

    this.markers.push(marker);

    this.routingControl = (L as any).Routing.control({
      waypoints: [L.latLng(this.staffLocation), requestLatLng],
      router: (L as any).Routing.osrmv1({
        serviceUrl: 'https://router.project-osrm.org/route/v1',
      }),
      lineOptions: {
        styles: [{ color: 'red', opacity: 0.8, weight: 5 }],
        extendToWaypoints: false,
        missingRouteTolerance: 50,
      },
      createMarker: () => null,
      addWaypoints: false,
      draggableWaypoints: false,
      fitSelectedRoutes: true,
      show: false,
    }).addTo(this.map);
  }
}
