import {
  Component,
  ViewChild,
  ElementRef,
  AfterViewInit,
  NgZone,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import * as L from 'leaflet';
import 'leaflet.markercluster';
import { EmergencyRequest } from '../../model/emergency';
import { EmergencyRequestService } from '../../core/rescue_request.service';
import { UserService } from '../../core/user.service';
import { getAuth } from 'firebase/auth';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-view-request-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './view-request-details.html',
  styleUrl: './view-request-details.scss',
})
export class ViewRequestDetails implements AfterViewInit, OnDestroy {
  @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef;
  @ViewChild('statusMessage') statusMessageRef!: ElementRef;

  request!: EmergencyRequest;
  isLoading = true;
  isSubmitting = false;
  submitSuccess = false;
  submitSuccessAccept = false;
  currentUserRole: string = '';

  map!: L.Map;
  staffLocation: L.LatLngExpression = [12.3775, 121.0315];
  staffMarker?: L.Marker;
  requestMarker?: L.Marker;
  routeLine?: L.Polyline;
  currentStaff: any = null;

  staffAddress: string = 'Fetching address...';

  // NEW: For back navigation
  fromPage: string | null = null;

  constructor(
    private requestService: EmergencyRequestService,
    private userService: UserService,
    private ngZone: NgZone,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  async ngAfterViewInit(): Promise<void> {
    this.fromPage = this.route.snapshot.queryParamMap.get('from'); // get 'from' value

    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;

    const request = await this.requestService.getRequestById(id);
    if (!request) return;

    this.request = request;
    this.isLoading = false;

    await this.loadCurrentStaff();

    setTimeout(async () => {
      this.initializeMap();
      await this.setInitialStaffLocation();
      this.renderRequestMarker();
    }, 100);
  }

  ngOnDestroy(): void {
    // Clean up if needed in future
  }

  initializeMap(): void {
    if (!this.mapContainer?.nativeElement) return;

    this.map = L.map(this.mapContainer.nativeElement).setView(
      [14.5995, 120.9842],
      13
    );

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(this.map);
  }

  async setInitialStaffLocation(): Promise<void> {
    if (this.request?.staffLat && this.request?.staffLng) {
      this.staffLocation = [this.request.staffLat, this.request.staffLng];
    } else {
      this.staffLocation = [12.3775, 121.0315];
    }

    this.staffMarker = L.marker(this.staffLocation, {
      icon: L.icon({
        iconUrl: 'assets/ambulance.png',
        iconSize: [70, 60],
        iconAnchor: [35, 40],
      }),
    })
      .addTo(this.map)
      .bindPopup('Staff Location');

    const latLng = this.staffLocation as [number, number];
    this.staffAddress = await this.reverseGeocode(latLng[0], latLng[1]);
  }

  renderRequestMarker(): void {
    if (!this.request.latitude || !this.request.longitude) return;

    const requestLoc = L.latLng(this.request.latitude, this.request.longitude);
    const staffLoc = L.latLng(this.staffLocation);

    this.requestMarker = L.marker(requestLoc, {
      icon: L.icon({
        iconUrl: 'assets/logo22.png',
        iconSize: [70, 60],
        iconAnchor: [35, 40],
      }),
    })
      .addTo(this.map)
      .bindPopup(
        `<strong>${this.request.name}</strong><br>${this.request.address}`
      )
      .openPopup();

    this.routeLine = L.polyline([staffLoc, requestLoc], {
      color: 'red',
      weight: 4,
      opacity: 0.7,
      dashArray: '10,6',
    }).addTo(this.map);

    const group = L.featureGroup([
      this.staffMarker!,
      this.requestMarker!,
      this.routeLine,
    ]);
    this.map.fitBounds(group.getBounds().pad(0.2));
  }

  async reverseGeocode(lat: number, lng: number): Promise<string> {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`;

    try {
      const response = await fetch(url);
      const data = await response.json();
      return data.display_name || 'Address not found';
    } catch (error) {
      console.error('Geocoding error:', error);
      return 'Address lookup failed';
    }
  }

  async loadCurrentStaff() {
    const user = getAuth().currentUser;
    if (user) {
      try {
        this.currentStaff = await this.userService.getUserById(user.uid);
        this.currentUserRole = this.currentStaff?.role || '';
      } catch {
        // fail silently
      }
    }
  }

  async markAsResolved() {
    if (!this.request?.id) return;

    this.isSubmitting = true;
    this.submitSuccess = false;

    try {
      await this.requestService.markRequestAsResolved(this.request.id);

      const updated = await this.requestService.getRequestById(this.request.id);
      if (updated) {
        this.request = updated;
      }

      this.submitSuccess = true;
    } catch {
      this.submitSuccess = false;
    } finally {
      this.isSubmitting = false;
    }
  }
  navigateToEmergencyRequest() {
    this.router.navigate(['/superAdmin/EmergencyRequest']);
  }

  // ✅ Dynamic back navigation function
  navigateBackToList() {
    if (this.fromPage === 'incident') {
      this.router.navigate(['/superAdmin/IncidentHistory']);
    } else {
      this.router.navigate(['/superAdmin/EmergencyRequest']);
    }
  }
}
