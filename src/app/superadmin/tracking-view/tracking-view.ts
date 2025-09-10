import { Component, AfterViewInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import * as L from 'leaflet';
import { Subscription } from 'rxjs';
import { EmergencyRequestService } from '../../core/rescue_request.service';
import { EmergencyRequest } from '../../model/emergency';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-tracking-view',
  templateUrl: './tracking-view.html',
  styleUrls: ['./tracking-view.scss'],
  imports: [ReactiveFormsModule, CommonModule],
})
export class TrackingView implements AfterViewInit, OnDestroy {
  requestId!: string;
  request?: EmergencyRequest | null;
  activeTab: 'details' | 'userProfile' = 'details';

  map!: L.Map;
  staffMarker?: L.Marker;
  residentMarker?: L.Marker;
  routeLine?: L.Polyline;

  distance = 0; // meters
  estimatedTime = 'Calculating...'; // human readable time string
  private readonly averageSpeedKmh = 40; // average speed km/h (adjust if needed)

  private subscription?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private requestService: EmergencyRequestService
  ) {}

  ngAfterViewInit(): void {
    this.requestId = this.route.snapshot.paramMap.get('id')!;

    // Initialize map first
    this.initializeMap();

    // Subscribe to live requests and filter for this requestId
    this.subscription = this.requestService
      .getRespondingRequestsLive()
      .subscribe((requests) => {
        this.request = requests.find((r) => r.id === this.requestId) || null;
        this.updateMapMarkers();
      });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
    this.map?.remove();
  }

  goBack() {
    this.router.navigate(['/live-tracking']);
  }

  private initializeMap() {
    this.map = L.map('tracking-map').setView([14.5995, 120.9842], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(this.map);
  }

  private updateMapMarkers() {
    if (!this.request) return;

    const { staffLat, staffLng, latitude, longitude } = this.request;

    // Update or add staff marker
    if (staffLat && staffLng) {
      if (!this.staffMarker) {
        this.staffMarker = L.marker([staffLat, staffLng], {
          icon: L.icon({
            iconUrl: 'assets/ambulance.png',
            iconSize: [40, 35],
            iconAnchor: [20, 25],
          }),
        }).addTo(this.map);
      } else {
        this.staffMarker.setLatLng([staffLat, staffLng]);
      }
    }

    // Update or add resident marker
    if (latitude && longitude) {
      if (!this.residentMarker) {
        this.residentMarker = L.marker([latitude, longitude], {
          icon: L.icon({
            iconUrl: 'assets/logo22.png',
            iconSize: [40, 35],
            iconAnchor: [20, 25],
          }),
        }).addTo(this.map);
      } else {
        this.residentMarker.setLatLng([latitude, longitude]);
      }
    }

    // Update or add route line
    if (
      staffLat != null &&
      staffLng != null &&
      latitude != null &&
      longitude != null
    ) {
      // Example waypoints — replace with real data or API results
      const latlngs: L.LatLngTuple[] = [
        [staffLat, staffLng],
        [12.352, 121.06], // intermediate point 1
        [12.354, 121.061], // intermediate point 2
        [latitude, longitude],
      ];

      if (!this.routeLine) {
        this.routeLine = L.polyline(latlngs, {
          color: 'blue', // changed color to blue to match your screenshot
          weight: 5,
          opacity: 0.8,
          dashArray: '',
          lineJoin: 'round',
        }).addTo(this.map);
      } else {
        this.routeLine.setLatLngs(latlngs);
      }

      this.map.fitBounds(this.routeLine.getBounds().pad(0.3));

      this.distance = this.map.distance(
        L.latLng(staffLat, staffLng),
        L.latLng(latitude, longitude)
      );

      this.estimatedTime = this.calculateEstimatedTime(this.distance);
    }
  }

  private calculateEstimatedTime(distanceMeters: number): string {
    const distanceKm = distanceMeters / 1000;
    const timeHours = distanceKm / this.averageSpeedKmh;

    if (timeHours <= 0) return '0 mins';

    const timeMinutes = Math.round(timeHours * 60);

    if (timeMinutes < 60) {
      return `${timeMinutes} mins`;
    } else {
      const hours = Math.floor(timeMinutes / 60);
      const minutes = timeMinutes % 60;
      return `${hours}h ${minutes}m`;
    }
  }
}
