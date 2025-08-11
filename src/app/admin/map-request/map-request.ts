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
import { getAuth, onAuthStateChanged } from 'firebase/auth';
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
  currentStaff: any = null;
  private currentRequestId: string | null = null;

  private watchId?: number;
  private requestSubscription?: Subscription;

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
    this.cdr.detectChanges();

    await this.loadCurrentStaff();

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
          this.ngZone.run(() => {
            this.loadingRequests = false;
            this.cdr.detectChanges();
          });
        },
      });

    await this.ngZone.run(async () => {
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
        } catch (err) {
          console.warn('Geolocation failed, using default.');
        }
      }
    });

    this.staffMarker = L.marker(this.staffLocation, {
      icon: L.icon({
        iconUrl: 'assets/ambulance.png',
        iconSize: [70, 60],
        iconAnchor: [15, 40],
      }),
    })
      .addTo(this.map)
      .bindPopup('<strong>Staff Location</strong>');

    // 🔥 Center the map on the actual staff location
    this.map.setView(this.staffLocation, 14);

    this.trackStaffLocation();
  }

  ngOnDestroy(): void {
    if (this.watchId !== undefined)
      navigator.geolocation.clearWatch(this.watchId);
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

    try {
      this.markerClusterGroup = L.markerClusterGroup();
      this.map.addLayer(this.markerClusterGroup);
    } catch (error) {
      console.error(
        'Failed to initialize markerClusterGroup. Ensure leaflet.markercluster is loaded.'
      );
    }
  }

  trackStaffLocation(): void {
    if (!navigator.geolocation) return;

    this.watchId = navigator.geolocation.watchPosition(
      async (position) => {
        this.ngZone.run(async () => {
          this.staffLocation = [
            position.coords.latitude,
            position.coords.longitude,
          ];
          this.staffMarker?.setLatLng(this.staffLocation);

          // Optional: Uncomment to follow staff as they move
          // this.map.setView(this.staffLocation, this.map.getZoom());

          if (this.currentRequestId && this.currentStaff) {
            try {
              await this.requestService.updateRequestWithStaffInfo(
                this.currentRequestId,
                {
                  uid: this.currentStaff.uid,
                  first_name: this.currentStaff.first_name,
                  last_name: this.currentStaff.last_name,
                  email: this.currentStaff.email,
                  lat: this.staffLocation[0],
                  lng: this.staffLocation[1],
                },
                false
              );
            } catch (err) {
              console.error('Failed to update staff location:', err);
            }
          }
        });
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
    );
  }

  private _applyFilterDebounced = debounce((status: string) => {
    this.activeFilter = status;

    this.filteredRequests =
      status === 'All'
        ? this.requests
        : this.requests.filter((r) => r.status === status);

    this.markerClusterGroup?.clearLayers();

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
        this.markerClusterGroup?.addLayer(marker);
      }
    });

    if (this.staffMarker) {
      const layers = [this.staffMarker, ...this.markerClusterGroup.getLayers()];
      const group = L.featureGroup(layers);
      this.map.fitBounds(group.getBounds().pad(0.2));
    }
  }, 300);

  applyFilter(status: string): void {
    this._applyFilterDebounced(status);
  }

  centerMapOnRequest(request: EmergencyRequest): void {
    if (!request.latitude || !request.longitude) return;

    const staffLoc = L.latLng(this.staffLocation);
    const requestLoc = L.latLng(request.latitude, request.longitude);

    this.markerClusterGroup?.clearLayers();
    if (this.routeLine) this.map.removeLayer(this.routeLine);

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

    this.markerClusterGroup?.addLayer(marker);

    this.routeLine = L.polyline([staffLoc, requestLoc], {
      color: 'red',
      weight: 4,
      opacity: 0.7,
      dashArray: '10,6',
    }).addTo(this.map);

    const layers = [marker, this.staffMarker, this.routeLine].filter(
      Boolean
    ) as L.Layer[];
    this.map.fitBounds(L.featureGroup(layers).getBounds().pad(0.2));
  }

  generatePopupContent(req: EmergencyRequest, detailed = false): string {
    return `
      <div>
        ${
          detailed && req.image
            ? `<img src="${req.image}" alt="${req.name}" style="width:100%; height:100px; object-fit:cover;">`
            : ''
        }
        <strong>${req.name}</strong><br>
        <em>${req.address || 'No address'}</em><br>
        Contact: ${req.contactNumber || 'N/A'}<br>
        Event: ${req.event || 'N/A'}<br>
        Needs: ${req.needs || 'N/A'}<br>
        Description: ${req.description || 'N/A'}<br>
        ${
          detailed
            ? `Email: ${req.email || 'N/A'}<br>
               Staff: ${req.staffFirstName || 'N/A'} ${
                req.staffLastName || 'N/A'
              }<br>
               Status: ${req.status || 'N/A'}<br>
               <button id="acceptBtn">Accept</button>`
            : ''
        }
      </div>`;
  }

  async ViewRequest(req: EmergencyRequest) {
    this.router.navigate(['/admin/EmergencyRequest', req.id]);
  }

  async acceptRequest(req: EmergencyRequest) {
    if (!this.currentStaff || !this.staffLocation) {
      alert('Staff or location not available.');
      return;
    }

    try {
      if (req.status === 'Pending') {
        const [lat, lng] = this.staffLocation as [number, number];

        await this.requestService.updateRequestWithStaffInfo(
          req.id!,
          {
            uid: this.currentStaff.uid,
            first_name: this.currentStaff.first_name,
            last_name: this.currentStaff.last_name,
            email: this.currentStaff.email,
            lat,
            lng,
          },
          true
        );
      }

      this.currentRequestId = req.id!;
      this.router.navigate(['/admin/EmergencyRequest', req.id]);
    } catch (err) {
      console.error('Accept request failed:', err);
      alert('Failed to accept request.');
    }
  }

  async loadCurrentStaff(): Promise<void> {
    const auth = getAuth();
    return new Promise((resolve) => {
      onAuthStateChanged(auth, async (user) => {
        if (user) {
          try {
            const staff = await this.userService.getUserById(user.uid);
            this.ngZone.run(() => {
              this.currentStaff = staff;
              this.cdr.detectChanges();
              resolve();
            });
          } catch (err) {
            console.error('Failed to load current staff:', err);
            resolve();
          }
        } else {
          console.warn('No authenticated user.');
          resolve();
        }
      });
    });
  }
}
