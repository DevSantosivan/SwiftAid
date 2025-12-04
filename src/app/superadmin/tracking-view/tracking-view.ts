import { Component, AfterViewInit, OnDestroy, NgZone } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import * as L from 'leaflet';
import 'leaflet-routing-machine';
import { Subscription } from 'rxjs';
import { EmergencyRequestService } from '../../core/rescue_request.service';
import { EmergencyRequest } from '../../model/emergency';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-tracking-view',
  templateUrl: './tracking-view.html',
  styleUrls: ['./tracking-view.scss'],
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
})
export class TrackingView implements AfterViewInit, OnDestroy {
  requestId!: string;
  request?: EmergencyRequest | null;

  map!: L.Map;
  staffMarker?: L.Marker;
  residentMarker?: L.Marker;

  distance = 0; // in meters
  estimatedTime = 'Calculating...';

  progressIndex = 0;
  routeSteps: any[] = [];

  private readonly averageSpeedKmh = 40;
  private subscription?: Subscription;

  private routingControl?: L.Routing.Control;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private requestService: EmergencyRequestService,
    private ngZone: NgZone
  ) {}

  ngAfterViewInit(): void {
    this.requestId = this.route.snapshot.paramMap.get('id')!;
    this.initializeMap();

    // Subscribe to live updates
    this.subscription = this.requestService
      .getRespondingRequestsLive()
      .subscribe((requests) => {
        this.ngZone.run(() => {
          this.request = requests.find((r) => r.id === this.requestId) || null;
          this.updateMapMarkersAndRoute();
        });
      });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
    this.map?.remove();
  }

  private initializeMap() {
    this.map = L.map('tracking-map').setView([14.5995, 120.9842], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(this.map);
  }

  private updateMapMarkersAndRoute() {
    if (!this.request) return;

    const { staffLat, staffLng, latitude, longitude } = this.request;

    // Update staff marker
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
        // Move marker to new position
        this.staffMarker.setLatLng([staffLat, staffLng]);
      }
    }

    // Update resident marker
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

    // Remove existing route
    if (this.routingControl) {
      this.map.removeControl(this.routingControl);
      this.routingControl = undefined;
    }

    // Draw route if both positions exist
    if (staffLat && staffLng && latitude && longitude) {
      this.routingControl = (L.Routing.control as any)({
        waypoints: [
          L.latLng(staffLat, staffLng),
          L.latLng(latitude, longitude),
        ],
        routeWhileDragging: false,
        showAlternatives: false,
        fitSelectedRoutes: true,
        addWaypoints: false,
        createMarker: () => null, // Keep your custom markers
        lineOptions: {
          styles: [{ color: '#ff3838ff', weight: 5 }],
          extendToWaypoints: false,
        },
      }).addTo(this.map);

      // Update distance and ETA after route found
      this.routingControl?.on('routesfound', (e: any) => {
        const route = e.routes[0];
        this.distance = route.summary.totalDistance;
        this.estimatedTime = this.calculateEstimatedTime(this.distance);
        this.generateRouteSteps(staffLat, staffLng, latitude, longitude);
      });
    }
  }

  private calculateEstimatedTime(distanceMeters: number): string {
    const distanceKm = distanceMeters / 1000;
    const timeHours = distanceKm / this.averageSpeedKmh;
    if (timeHours <= 0 || isNaN(timeHours)) return '0 mins';
    const timeMinutes = Math.round(timeHours * 60);
    return timeMinutes < 60
      ? `${timeMinutes} mins`
      : `${Math.floor(timeMinutes / 60)}h ${timeMinutes % 60}m`;
  }

  private initialDistance: number | null = null;

  private generateRouteSteps(
    staffLat: number,
    staffLng: number,
    userLat: number,
    userLng: number
  ) {
    // Current distance (real-time)
    const currentDistance = this.map.distance(
      L.latLng(staffLat, staffLng),
      L.latLng(userLat, userLng)
    );

    // Store initial distance once
    if (this.initialDistance === null) {
      this.initialDistance = currentDistance;
    }

    // Compute progress %
    let progress = 1 - currentDistance / this.initialDistance;
    progress = Math.max(0, Math.min(progress, 1)); // clamp 0–1

    // Determine step (0–3)
    this.progressIndex = Math.floor(progress * 4);

    // Update ETA
    this.estimatedTime = this.calculateEstimatedTime(currentDistance);

    // Steps data:
    this.routeSteps = [
      {
        label: 'Responder Station',
        time: '—',
        status: this.progressIndex > 0 ? 'On time' : 'Pending',
      },
      {
        label: 'Midway Checkpoint',
        time: '—',
        status: this.progressIndex > 1 ? 'On time' : 'Pending',
      },
      {
        label: 'Near Area',
        time: '—',
        status: this.progressIndex > 2 ? 'Approaching' : 'Pending',
      },
      {
        label: 'Resident Location',
        time: '—',
        status: this.progressIndex > 3 ? 'Arrived' : 'Pending',
      },
    ];
  }

  goBack() {
    this.router.navigate(['superAdmin/LiveTracking']);
  }
}
