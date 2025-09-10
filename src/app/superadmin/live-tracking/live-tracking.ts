import {
  Component,
  AfterViewInit,
  OnDestroy,
  ViewChildren,
  QueryList,
  ElementRef,
} from '@angular/core';
import * as L from 'leaflet';
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
  private routeLines = new Map<string, L.Polyline>();

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
    this.routeLines.clear();
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
      this.updateMarker(
        this.staffMarkers,
        request.id,
        request.staffLat,
        request.staffLng,
        'assets/ambulance.png',
        map
      );

      // --- Add/Update Request Marker ---
      this.updateMarker(
        this.requestMarkers,
        request.id,
        request.latitude,
        request.longitude,
        'assets/logo22.png',
        map
      );

      // --- Draw Route Line ---
      this.updateRouteLine(request, map);
    });
  }

  private updateMarker(
    markerMap: Map<string, L.Marker>,
    id: string,
    lat?: number,
    lng?: number,
    iconUrl: string = 'assets/default-icon.png',

    map?: L.Map
  ): void {
    if (!lat || !lng || !map) return;

    let marker = markerMap.get(id);
    const position: L.LatLngTuple = [lat, lng];

    if (!marker) {
      marker = L.marker(position, {
        icon: L.icon({
          iconUrl,
          iconSize: [40, 35],
          iconAnchor: [20, 25],
        }),
      }).addTo(map);

      markerMap.set(id, marker);
    } else {
      marker.setLatLng(position);
    }
  }

  private updateRouteLine(request: EmergencyRequest, map: L.Map): void {
    const { id, staffLat, staffLng, latitude, longitude } = request;

    if (
      staffLat == null ||
      staffLng == null ||
      latitude == null ||
      longitude == null ||
      !id
    )
      return;

    const latlngs: L.LatLngTuple[] = [
      [staffLat, staffLng],
      [latitude, longitude],
    ];

    let routeLine = this.routeLines.get(id);

    if (!routeLine) {
      routeLine = L.polyline(latlngs, {
        color: 'red',
        weight: 3,
        opacity: 0.7,
        dashArray: '6, 4',
      }).addTo(map);

      this.routeLines.set(id, routeLine);
    } else {
      routeLine.setLatLngs(latlngs);
    }

    const bounds = L.latLngBounds(latlngs);
    if (!map.getBounds().contains(bounds)) {
      map.fitBounds(bounds.pad(0.3));
    }
  }
}
