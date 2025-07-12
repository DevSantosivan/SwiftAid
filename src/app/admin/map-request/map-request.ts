import {
  Component,
  ViewChild,
  ElementRef,
  AfterViewInit,
  NgZone,
  OnDestroy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { EmergencyRequestService } from '../../core/rescue_request.service';
import { EmergencyRequest } from '../../model/emergency';
import { UserService } from '../../core/user.service';
import * as L from 'leaflet';
import 'leaflet.markercluster';
import { getAuth } from 'firebase/auth';
import { debounce } from 'lodash';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';

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
  activeFilter: string = 'All';

  staffLocation: L.LatLngExpression = [12.3775, 121.0315];
  staffMarker?: L.Marker;
  routeLine?: L.Polyline;

  loadingRequests = false;

  private watchId?: number;
  private requestSubscription?: Subscription;

  currentStaff: any = null;
  private currentRequestId: string | null = null;

  markerClusterGroup!: L.MarkerClusterGroup;

  constructor(
    private requestService: EmergencyRequestService,
    private userService: UserService,
    private ngZone: NgZone,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  async ngAfterViewInit(): Promise<void> {
    this.initializeMap();

    this.loadingRequests = true;
    try {
      await this.loadCurrentStaff();
    } finally {
      setTimeout(() => (this.loadingRequests = false));
    }

    this.requestSubscription = this.requestService
      .getRequestRealtime()
      .subscribe({
        next: (requests) => {
          this.ngZone.run(() => {
            this.requests = requests;
            this.applyFilter(this.activeFilter || 'All');
            this.loadingRequests = false;
            this.cdr.detectChanges();
          });
        },
        error: (error) => {
          console.error('Error receiving realtime requests:', error);
          this.loadingRequests = false;
        },
      });

    if (
      this.currentStaff?.staffLat !== undefined &&
      this.currentStaff?.staffLng !== undefined
    ) {
      this.staffLocation = [
        this.currentStaff.staffLat,
        this.currentStaff.staffLng,
      ];
    } else {
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
      } catch {
        // fallback
      }
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

    this.markerClusterGroup = L.markerClusterGroup();
    this.map.addLayer(this.markerClusterGroup);
  }

  trackStaffLocation(): void {
    if (!navigator.geolocation) return;

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        this.ngZone.run(async () => {
          this.staffLocation = [
            position.coords.latitude,
            position.coords.longitude,
          ];
          this.staffMarker?.setLatLng(this.staffLocation);

          if (this.currentRequestId && this.currentStaff) {
            try {
              await this.requestService.updateRequestWithStaffInfo(
                this.currentRequestId,
                {
                  uid: this.currentStaff.uid,
                  first_name: this.currentStaff.first_name,
                  last_name: this.currentStaff.last_name,
                  email: this.currentStaff.email,
                  lat: (this.staffLocation as [number, number])[0],
                  lng: (this.staffLocation as [number, number])[1],
                },
                false
              );
            } catch {}
          }
        });
      },
      () => {},
      {
        enableHighAccuracy: true,
        maximumAge: 3000,
        timeout: 10000,
      }
    );
  }

  private _applyFilterDebounced = debounce((status: string) => {
    this.activeFilter = status;

    this.filteredRequests =
      status === 'All'
        ? this.requests
        : this.requests.filter((r) => r.status === status);

    this.markerClusterGroup.clearLayers();

    this.filteredRequests.forEach((req) => {
      if (req.latitude && req.longitude) {
        const marker = L.marker([req.latitude, req.longitude], {
          icon: L.icon({
            iconUrl: 'assets/logo22.png',
            iconSize: [70, 60],
            iconAnchor: [15, 40],
          }),
          title: req.name,
        }).bindPopup(this.generatePopupContent(req));

        marker.on('click', () => this.centerMapOnRequest(req));
        this.markerClusterGroup.addLayer(marker);
      }
    });

    if (this.staffMarker) {
      const layers = [this.staffMarker, ...this.markerClusterGroup.getLayers()];
      const group = L.featureGroup(layers as L.Layer[]);
      this.map.fitBounds(group.getBounds().pad(0.2));
    }
  }, 300);

  applyFilter(status: string): void {
    this._applyFilterDebounced(status);
  }

  centerMapOnRequest(request: EmergencyRequest): void {
    if (request.staffLat !== undefined && request.staffLng !== undefined) {
      this.staffLocation = [request.staffLat, request.staffLng];
      if (this.staffMarker) {
        this.staffMarker.setLatLng(this.staffLocation);
      }
    }

    if (!request.latitude || !request.longitude) return;

    const staffLoc = L.latLng(this.staffLocation);
    const requestLoc = L.latLng(request.latitude, request.longitude);

    this.markerClusterGroup.clearLayers();

    if (this.routeLine) {
      this.map.removeLayer(this.routeLine);
      this.routeLine = undefined;
    }

    const marker = L.marker(requestLoc, {
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

    this.markerClusterGroup.addLayer(marker);

    this.routeLine = L.polyline([staffLoc, requestLoc], {
      color: 'red',
      weight: 4,
      opacity: 0.7,
      dashArray: '10,6',
    }).addTo(this.map);

    const layers: L.Layer[] = [marker];
    if (this.staffMarker) layers.push(this.staffMarker);
    if (this.routeLine) layers.push(this.routeLine);

    const group = L.featureGroup(layers);
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
        Staff: ${request.staffFirstName || 'N/A'} ${
                request.staffLastName || 'N/A'
              }<br><br>
        Status: ${request.status || 'N/A'}<br>`
            : ''
        }
      </div>`;
  }

  async ViewRequest(request: EmergencyRequest) {
    this.router.navigate(['/admin/EmergencyRequest', request.id]);
  }

  async acceptRequest(request: EmergencyRequest) {
    if (!this.currentStaff || !this.staffLocation) {
      alert('Staff or location not available.');
      return;
    }

    try {
      const latLng = L.latLng(this.staffLocation);

      if (request.status === 'Pending') {
        // ✅ Only update if it’s still Pending
        await this.requestService.updateRequestWithStaffInfo(
          request.id!,
          {
            uid: this.currentStaff.uid,
            first_name: this.currentStaff.first_name,
            last_name: this.currentStaff.last_name,
            email: this.currentStaff.email,
            lat: latLng.lat,
            lng: latLng.lng,
          },
          true
        );
      }

      this.currentRequestId = request.id!;
      this.router.navigate(['/admin/EmergencyRequest', request.id]);
    } catch {
      alert('Failed to accept request.');
    }
  }

  async loadCurrentStaff() {
    const user = getAuth().currentUser;
    if (user) {
      try {
        this.currentStaff = await this.userService.getUserById(user.uid);
      } catch {
        // silent
      }
    }
  }
}
