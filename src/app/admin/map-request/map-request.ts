import {
  Component,
  ViewChild,
  ElementRef,
  AfterViewInit,
  NgZone,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { EmergencyRequestService } from '../../core/rescue_request.service';
import { EmergencyRequest } from '../../model/emergency';
import { UserService } from '../../core/user.service';
import * as L from 'leaflet';
import { getAuth } from 'firebase/auth';

@Component({
  selector: 'app-map-request',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './map-request.html',
  styleUrls: ['./map-request.scss'],
})
export class MapRequest implements AfterViewInit, OnDestroy {
  @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef;

  map!: L.Map;
  requests: EmergencyRequest[] = [];
  filteredRequests: EmergencyRequest[] = [];
  markers: L.Marker[] = [];
  activeFilter: string = 'All';

  staffLocation: L.LatLngExpression = [12.3775, 121.0315];
  staffMarker?: L.Marker;
  routeLine?: L.Polyline;

  private watchId?: number;
  currentStaff: any = null;

  constructor(
    private requestService: EmergencyRequestService,
    private userService: UserService,
    private ngZone: NgZone
  ) {}

  async ngAfterViewInit(): Promise<void> {
    this.initializeMap();
    await this.loadCurrentStaff();

    try {
      const position = await new Promise<GeolocationPosition>(
        (resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
          });
        }
      );
      this.staffLocation = [
        position.coords.latitude,
        position.coords.longitude,
      ];
    } catch (error) {
      console.warn('Using default location due to error:', error);
    }

    this.staffMarker = L.marker(this.staffLocation, {
      icon: L.icon({
        iconUrl: 'assets/ambulance.png',
        iconSize: [70, 60],
        iconAnchor: [15, 40],
      }),
    })
      .addTo(this.map)
      .bindPopup('<strong>Staff Location</strong>');

    this.trackStaffLocation();
    await this.loadRequests();
  }

  ngOnDestroy(): void {
    if (this.watchId !== undefined) {
      navigator.geolocation.clearWatch(this.watchId);
    }
  }

  initializeMap(): void {
    this.map = L.map(this.mapContainer.nativeElement).setView(
      [14.5995, 120.9842],
      12
    );
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(this.map);
  }

  trackStaffLocation(): void {
    if (!navigator.geolocation) return;

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        this.ngZone.run(() => {
          this.staffLocation = [
            position.coords.latitude,
            position.coords.longitude,
          ];
          this.staffMarker?.setLatLng(this.staffLocation);
          console.log('Updated staff location:', this.staffLocation);
        });
      },
      (error) => console.error('Error tracking location:', error),
      {
        enableHighAccuracy: true,
        maximumAge: 3000,
        timeout: 10000,
      }
    );
  }

  async loadRequests(): Promise<void> {
    try {
      this.requests = await this.requestService.getRequest();
      this.applyFilter('All');
    } catch (error) {
      console.error('Failed to load requests:', error);
    }
  }

  applyFilter(status: string): void {
    this.activeFilter = status;
    this.filteredRequests =
      status === 'All'
        ? this.requests
        : this.requests.filter((r) => r.status === status);

    this.markers.forEach((m) => this.map.removeLayer(m));
    this.markers = [];

    this.filteredRequests.forEach((req) => {
      if (req.latitude && req.longitude) {
        const marker = L.marker([req.latitude, req.longitude], {
          icon: L.icon({
            iconUrl: 'assets/logo22.png',
            iconSize: [70, 60],
            iconAnchor: [15, 40],
          }),
          title: req.name,
        })
          .addTo(this.map)
          .bindPopup(this.generatePopupContent(req))
          .on('click', () => this.centerMapOnRequest(req));

        this.markers.push(marker);
      }
    });

    const group = L.featureGroup([...this.markers, this.staffMarker!]);
    this.map.fitBounds(group.getBounds().pad(0.2));
  }

  centerMapOnRequest(request: EmergencyRequest): void {
    if (!request.latitude || !request.longitude) return;

    const location = L.latLng(request.latitude, request.longitude);
    this.markers.forEach((m) => this.map.removeLayer(m));
    this.markers = [];

    if (this.routeLine) {
      this.map.removeLayer(this.routeLine);
      this.routeLine = undefined;
    }

    const marker = L.marker(location, {
      icon: L.icon({
        iconUrl: 'assets/logo22.png',
        iconSize: [70, 60],
        iconAnchor: [15, 40],
      }),
    })
      .addTo(this.map)
      .bindPopup(this.generatePopupContent(request, true))
      .openPopup();

    marker.on('popupopen', () => {
      const btn = document.getElementById('acceptBtn');
      if (btn) btn.onclick = () => this.acceptRequest(request);
    });

    this.markers.push(marker);

    this.routeLine = L.polyline([this.staffLocation, location], {
      color: 'red',
      weight: 4,
      opacity: 0.7,
      dashArray: '10,6',
    }).addTo(this.map);

    const group = L.featureGroup([marker, this.staffMarker!, this.routeLine]);
    this.map.fitBounds(group.getBounds().pad(0.2));
  }

  generatePopupContent(
    request: EmergencyRequest,
    detailed: boolean = false
  ): string {
    return `
      <div>
        ${
          detailed && request.image
            ? `<img src="${request.image}" alt="${request.name}" style="width:100%; height:100px; object-fit:cover;">`
            : ''
        }
        <strong>${request.name}</strong><br>
        <em>${request.address || 'No address'}</em><br>
        Contact: ${request.contactNumber || 'N/A'}<br>
        Event: ${request.event || 'N/A'}<br>
        Needs: ${request.needs || 'N/A'}<br>
        Description: ${request.description || 'N/A'}<br>
        ${
          detailed
            ? `Email: ${request.email || 'N/A'}<br>
      Staff: ${(request.staffFirstName, request.staffLastName || 'N/A')}<br>
<br>
        Status: ${request.status || 'N/A'}<br>
        <button id="acceptBtn">Accept</button>`
            : ''
        }
      </div>`;
  }

  async acceptRequest(request: EmergencyRequest) {
    if (!this.currentStaff || !this.staffLocation) {
      alert('Staff or location not available.');
      return;
    }

    try {
      await this.requestService.updateRequestWithStaffInfo(request.id!, {
        uid: this.currentStaff.uid,
        first_name: this.currentStaff.first_name,
        last_name: this.currentStaff.last_name,
        email: this.currentStaff.email,
        lat: (this.staffLocation as [number, number])[0],
        lng: (this.staffLocation as [number, number])[1],
      });
      alert(`Accepted request for ${request.name}`);
      await this.loadRequests();
    } catch (error) {
      console.error('Accept failed:', error);
      alert('Failed to accept request.');
    }
  }

  async loadCurrentStaff() {
    const user = getAuth().currentUser;
    if (user) {
      try {
        this.currentStaff = await this.userService.getUserById(user.uid);
        console.log('Loaded staff:', this.currentStaff);
      } catch (err) {
        console.error('Staff load failed:', err);
      }
    } else {
      console.warn('No user logged in');
    }
  }
}
