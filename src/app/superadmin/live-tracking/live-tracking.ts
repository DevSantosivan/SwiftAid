import {
  Component,
  AfterViewInit,
  OnDestroy,
  ViewChildren,
  QueryList,
  ElementRef,
} from '@angular/core';
import * as L from 'leaflet';
import 'leaflet-routing-machine'; // Import leaflet-routing-machine here
import { Subscription } from 'rxjs';
import { EmergencyRequest } from '../../model/emergency';
import { EmergencyRequestService } from '../../core/rescue_request.service';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-live-tracking',
  templateUrl: './live-tracking.html',
  imports: [ReactiveFormsModule, CommonModule, RouterLink],
  styleUrls: ['./live-tracking.scss'],
})
export class LiveTracking implements AfterViewInit, OnDestroy {
  respondingRequests: EmergencyRequest[] = [];

  // Map references
  private maps = new Map<string, L.Map>();
  private staffMarkers = new Map<string, L.Marker>();
  private requestMarkers = new Map<string, L.Marker>();

  // Use routing controls map instead of routeLines
  private routingControls = new Map<string, L.Routing.Control>();

  private subscription?: Subscription;

  @ViewChildren('mapContainer') mapContainers!: QueryList<ElementRef>;

  constructor(private requestService: EmergencyRequestService) {}

  ngAfterViewInit(): void {
    this.subscription = this.requestService
      .getRespondingRequestsLive()
      .subscribe((requests) => {
        this.respondingRequests = requests;
        setTimeout(() => this.updateMaps(), 0); // allow DOM to settle
      });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
    this.maps.forEach((map) => map.remove());
    this.maps.clear();
    this.staffMarkers.clear();
    this.requestMarkers.clear();

    this.routingControls.forEach((rc) => rc.remove());
    this.routingControls.clear();
  }

  private updateMaps(): void {
    if (!this.mapContainers || this.mapContainers.length === 0) return;

    this.mapContainers.forEach((containerRef, index) => {
      const request = this.respondingRequests[index];
      if (!request || !request.id) return;

      let map = this.maps.get(request.id);

      // Initialize map if not exists
      if (!map) {
        map = L.map(containerRef.nativeElement, {
          zoomControl: false,
          dragging: false,
          scrollWheelZoom: false,
          doubleClickZoom: false,
          boxZoom: false,
          keyboard: false,
        }).setView([14.5995, 120.9842], 13);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
        }).addTo(map);

        this.maps.set(request.id, map);

        setTimeout(() => {
          map?.invalidateSize();
        }, 100);
      }

      // --- Add/Update Staff Marker ---
      // this.updateMarker(
      //   this.staffMarkers,
      //   request.id,
      //   request.staffLat,
      //   request.staffLng,
      //   'assets/ambulance.png',
      //   map
      // );

      // --- Add/Update Request Marker ---
      this.updateMarker(
        this.requestMarkers,
        request.id,
        request.latitude,
        request.longitude,
        'assets/logo22.png',
        map
      );

      // --- Draw Route Using Routing Machine ---
      this.updateRouteUsingRoutingMachine(request, map);
    });
  }

  private updateMarker(
    markerMap: Map<string, L.Marker>,
    id: string,
    lat?: number,
    lng?: number,
    p0?: string,
    map?: L.Map
  ): void {
    if (lat == null || lng == null || !map) return;

    const position: L.LatLngTuple = [lat, lng];
    let marker = markerMap.get(id);

    const pulsingIcon = L.divIcon({
      className: 'custom-pulse-marker',
      html: '<div class="pulse"></div>',
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });

    if (!marker) {
      marker = L.marker(position, { icon: pulsingIcon }).addTo(map);
      markerMap.set(id, marker);

      // Center map sa unang marker
      map.setView(position, 15);
    } else {
      marker.setLatLng(position);
    }

    map.invalidateSize();
  }

  private updateRouteUsingRoutingMachine(
    request: EmergencyRequest,
    map: L.Map
  ): void {
    const { id, staffLat, staffLng, latitude, longitude } = request;
    if (
      !id ||
      staffLat == null ||
      staffLng == null ||
      latitude == null ||
      longitude == null
    )
      return;

    const from = L.latLng(staffLat, staffLng);
    const to = L.latLng(latitude, longitude);

    // Remove old route if exists
    const existingControl = this.routingControls.get(id);
    if (existingControl) {
      map.removeControl(existingControl);
      this.routingControls.delete(id);
    }

    // const routingControl = (L.Routing.control as any)({
    //   waypoints: [from, to],
    //   routeWhileDragging: false,
    //   showAlternatives: false,
    //   fitSelectedRoutes: true,
    //   addWaypoints: false,
    //   createMarker: () => null,
    //   lineOptions: {
    //     styles: [{ color: '#ff4e42', weight: 4, dashArray: '6, 4' }],
    //   },
    // }).addTo(map);

    // routingControl.on('routesfound', (e: any) => {
    //   const route = e.routes[0];
    //   const distance = route.summary.totalDistance; // in meters
    //   const time = route.summary.totalTime; // in seconds

    //   const eta = this.formatETA(time);
    // });

    // this.routingControls.set(id, routingControl);
  }

  private formatETA(seconds: number): string {
    const minutes = Math.round(seconds / 60);
    return minutes < 60
      ? `${minutes} mins`
      : `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  }

  private formatDistance(meters: number): string {
    return meters < 1000
      ? `${Math.round(meters)} m`
      : `${(meters / 1000).toFixed(1)} km`;
  }
}
