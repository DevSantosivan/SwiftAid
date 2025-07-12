import {
  Component,
  AfterViewInit,
  ViewChild,
  ElementRef,
  OnDestroy,
  NgZone,
} from '@angular/core';
import { EmergencyRequestService } from '../../core/rescue_request.service';
import { EmergencyRequest } from '../../model/emergency';
import * as L from 'leaflet';
import { CommonModule } from '@angular/common';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-emergency-request',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './emergency-request.component.html',
  styleUrl: './emergency-request.component.scss',
})
export class EmergencyRequestComponent implements AfterViewInit, OnDestroy {
  @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef;

  map!: L.Map;
  requests: EmergencyRequest[] = [];
  filteredRequests: EmergencyRequest[] = [];
  markers: L.Marker[] = [];
  activeFilter: string = 'All';

  staffLocation: L.LatLngExpression = [12.37752449490026, 121.03153380797781];
  staffMarker?: L.Marker;
  routeLine?: L.Polyline;

  private watchId?: number;
  private requestSubscription?: Subscription;

  staffDetailsMap: Record<string, { first_name: string; last_name: string }> =
    {};

  constructor(
    private requestService: EmergencyRequestService,
    private firestore: Firestore,
    private ngZone: NgZone
  ) {}

  ngAfterViewInit(): void {
    this.initializeMap();
    this.subscribeToRequests();
    this.startTrackingStaffLocation();
  }

  ngOnDestroy(): void {
    if (this.watchId !== undefined) {
      navigator.geolocation.clearWatch(this.watchId);
    }
    this.requestSubscription?.unsubscribe();
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
        iconUrl: 'assets/ambulance.png',
        iconSize: [70, 60],
        iconAnchor: [15, 40],
      }),
    })
      .addTo(this.map)
      .bindPopup('<strong>Staff Location</strong>');
  }

  subscribeToRequests(): void {
    this.requestSubscription = this.requestService
      .getRequestRealtime()
      .subscribe({
        next: async (requests) => {
          this.ngZone.run(async () => {
            this.requests = requests;

            const staffIdsToFetch = requests
              .map((r) => r.staffId)
              .filter((id): id is string => !!id && !this.staffDetailsMap[id]);

            for (const staffId of staffIdsToFetch) {
              try {
                const docRef = doc(this.firestore, `users/${staffId}`);
                const snap = await getDoc(docRef);
                if (snap.exists()) {
                  const data = snap.data();
                  this.staffDetailsMap[staffId] = {
                    first_name: data['first_name'] || '',
                    last_name: data['last_name'] || '',
                  };
                }
              } catch (err) {
                console.warn(`Failed to fetch user ${staffId}:`, err);
              }
            }

            this.applyFilter(this.activeFilter || 'All');
          });
        },
        error: (error) => {
          console.error('Error receiving realtime emergency requests:', error);
        },
      });
  }

  getStaffFullName(staffId?: string): string {
    if (!staffId) return '';
    const staff = this.staffDetailsMap[staffId];
    return staff ? `${staff.first_name} ${staff.last_name}` : 'Unknown Staff';
  }

  applyFilter(status: string): void {
    this.activeFilter = status;

    this.filteredRequests =
      status === 'All'
        ? this.requests
        : this.requests.filter((req) => req.status === status);

    this.markers.forEach((marker) => this.map.removeLayer(marker));
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
        }).bindPopup(
          `<strong>${req.name}</strong><br>${
            req.address
          }<br>Staff: ${this.getStaffFullName(req.staffId)}`
        );

        marker.addTo(this.map);
        this.markers.push(marker);
      }
    });

    if (this.markers.length > 0 && this.staffMarker) {
      const group = L.featureGroup([...this.markers, this.staffMarker]);
      this.map.fitBounds(group.getBounds().pad(0.2));
    } else if (this.staffMarker) {
      this.map.setView(this.staffLocation, 12);
    }
  }

  centerMapOnRequest(request: EmergencyRequest): void {
    if (!request.latitude || !request.longitude) return;

    const requestLatLng = L.latLng(request.latitude, request.longitude);

    this.markers.forEach((marker) => this.map.removeLayer(marker));
    this.markers = [];

    if (this.routeLine) {
      this.map.removeLayer(this.routeLine);
      this.routeLine = undefined;
    }

    const marker = L.marker(requestLatLng, {
      icon: L.icon({
        iconUrl: 'assets/logo22.png',
        iconSize: [70, 60],
        iconAnchor: [15, 40],
      }),
    })
      .addTo(this.map)
      .bindPopup(
        `
        <div>
          <img src="${request.image || 'assets/logo22.png'}" 
               alt="${request.name}" 
               style="width: 100%; height: 100px; object-fit: cover; margin-bottom: 5px;">
          <div><strong>${request.name}</strong></div>
          <div>${request.address}</div>
          <div>Staff: ${this.getStaffFullName(request.staffId)}</div>
        </div>
      `
      )
      .openPopup();

    this.markers.push(marker);

    const points = [this.staffLocation, requestLatLng];
    this.routeLine = L.polyline(points, {
      color: 'red',
      weight: 4,
      opacity: 0.7,
      dashArray: '10,6',
    }).addTo(this.map);

    const group = L.featureGroup([
      ...this.markers,
      this.staffMarker!,
      this.routeLine,
    ]);
    this.map.fitBounds(group.getBounds().pad(0.2));
  }

  startTrackingStaffLocation(): void {
    if (!navigator.geolocation) {
      console.warn('Geolocation is not supported by this browser.');
      return;
    }

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        const newLatLng: L.LatLngExpression = [
          position.coords.latitude,
          position.coords.longitude,
        ];

        this.staffLocation = newLatLng;

        if (this.staffMarker) {
          this.staffMarker.setLatLng(newLatLng);
        }

        if (this.routeLine && this.markers.length > 0) {
          const requestLatLng = this.markers[0].getLatLng();
          this.routeLine.setLatLngs([newLatLng, requestLatLng]);
        }
      },
      (error) => {
        console.error('Error watching position:', error);
      },
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
    );
  }
}
