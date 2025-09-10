import { Component, AfterViewInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import * as L from 'leaflet';
import 'leaflet-routing-machine'; // Make sure you have this import for routing
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
    private requestService: EmergencyRequestService
  ) {}

  ngAfterViewInit(): void {
    this.requestId = this.route.snapshot.paramMap.get('id')!;
    this.initializeMap();

    this.subscription = this.requestService
      .getRespondingRequestsLive()
      .subscribe((requests) => {
        this.request = requests.find((r) => r.id === this.requestId) || null;
        this.updateMapMarkersAndRoute();
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

    // Remove existing route if any
    if (this.routingControl) {
      this.map.removeControl(this.routingControl);
      this.routingControl = undefined;
    }

    if (staffLat && staffLng && latitude && longitude) {
      // Create new routing control
      this.routingControl = (L.Routing.control as any)({
        waypoints: [
          L.latLng(staffLat, staffLng),
          L.latLng(latitude, longitude),
        ],
        routeWhileDragging: false,
        showAlternatives: false,
        fitSelectedRoutes: true,
        addWaypoints: false,
        createMarker: () => null, // Disable default markers, since you handle custom markers
        lineOptions: {
          styles: [{ color: '#ff3838ff', weight: 5 }],
          extendToWaypoints: false,
        },
      }).addTo(this.map);

      // After route is found, update distance and estimated time
      if (this.routingControl) {
        this.routingControl.on('routesfound', (e: any) => {
          const route = e.routes[0];
          this.distance = route.summary.totalDistance;
          this.estimatedTime = this.calculateEstimatedTime(this.distance);
          this.generateRouteSteps(staffLat, staffLng, latitude, longitude);
        });
      }
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

  private generateRouteSteps(
    staffLat: number,
    staffLng: number,
    userLat: number,
    userLng: number
  ) {
    const totalDistance = this.map.distance(
      L.latLng(staffLat, staffLng),
      L.latLng(userLat, userLng)
    );

    this.estimatedTime = this.calculateEstimatedTime(totalDistance); // ✅ Set ETA here

    // Determine progress index (e.g. 0 to 4)
    // Since there's no GPS tracking history, simulate progress by dividing distance into 4 zones
    let progress = 1 - this.distance / totalDistance;
    progress = Math.max(0, Math.min(progress, 1)); // Clamp between 0 and 1

    this.progressIndex = Math.floor(progress * 4);

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
    this.router.navigate(['/live-tracking']);
  }
}
