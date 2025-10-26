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
import { NavigationService } from '../../core/navigation.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-map-request-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './map-request-details.html',
  styleUrls: ['./map-request-details.scss'],
})
export class MapRequestDetails implements AfterViewInit, OnDestroy {
  @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef;
  @ViewChild('statusMessage') statusMessageRef!: ElementRef;

  request!: EmergencyRequest;
  isLoading = true;
  isSubmitting = false;
  submitSuccess = false;
  submitSuccessAccept = false;
  currentUserRole: string = '';

  map!: L.Map;
  staffLocation: L.LatLngExpression = [0, 0];
  staffMarker?: L.Marker;
  requestMarker?: L.Marker;
  routeLine?: L.Polyline;
  currentStaff: any = null;
  private watchId?: number;
  private requestSubscription?: Subscription;
  backLabel: string = 'Back To Emergency Request List';
  staffAddress: string = 'Fetching address...'; // For readable address
  proximityMessage: string = ''; // Message to show when close to the request
  backRoute: any[] = ['/admin/EmergencyRequest'];
  // Proximity threshold (in meters)
  proximityThreshold = 500; // 500 meters

  constructor(
    private requestService: EmergencyRequestService,
    private userService: UserService,
    private ngZone: NgZone,
    private route: ActivatedRoute,
    private router: Router,
    private navigationService: NavigationService
  ) {}

  goBack() {
    const previousUrl = this.navigationService.getPreviousUrl();
    this.router.navigateByUrl(previousUrl);
    this.router.navigate(this.backRoute);
  }

  async ngAfterViewInit(): Promise<void> {
    const prevUrl = this.navigationService.getPreviousUrl();
    const from = this.route.snapshot.queryParamMap.get('from');
    if (prevUrl.includes('Notification')) {
      this.backLabel = 'Back To Notifications';
    } else if (prevUrl.includes('EmergencyRequest')) {
      this.backLabel = 'Back To Emergency Request List';
    } else {
      this.backLabel = 'Back To Home'; // fallback
    }

    if (from === 'EmergencView') {
      this.backLabel = 'Back To Emergency Requests';
      this.backRoute = ['/superAdmin/EmergencyRequest'];
    } else if (from === 'EmergencyRescue') {
      this.backLabel = 'Back To Emergency Requests';
      this.backRoute = ['/admin/EmergencyRequest'];
    }

    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;

    const request = await this.requestService.getRequestById(id);
    if (!request) return;

    this.request = request;
    this.isLoading = false;

    await this.loadCurrentStaff();

    // Subscribe to real-time updates of requests assigned to current staff
    if (this.currentStaff?.uid) {
      this.requestSubscription = this.requestService
        .subscribeToLocationUpdatesByStaffId(this.currentStaff.uid)
        .subscribe({
          next: (requests) => {
            const updatedRequest = requests.find(
              (r) => r.id === this.request.id
            );
            if (updatedRequest) {
              this.request = updatedRequest;
              this.updateRequestMarkerAndRoute();
            }
          },
          error: (error) => {
            console.error('Error in location updates subscription:', error);
          },
        });
    }

    setTimeout(async () => {
      this.initializeMap();
      await this.setInitialStaffLocation();
      this.renderRequestMarker();
      this.trackStaffLocation();
    }, 100);
  }

  ngOnDestroy(): void {
    if (this.watchId !== undefined) {
      navigator.geolocation.clearWatch(this.watchId);
    }
    if (this.requestSubscription) {
      this.requestSubscription.unsubscribe();
    }
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
    if (this.currentStaff?.staffLat && this.currentStaff?.staffLng) {
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
        // silent fallback
      }
    }

    this.staffMarker = L.marker(this.staffLocation, {
      icon: L.icon({
        iconUrl: 'assets/ambulance.png',
        iconSize: [70, 60],
        iconAnchor: [35, 40],
      }),
    })
      .addTo(this.map)
      .bindPopup('Your Location');

    const latLng = this.staffLocation as [number, number];
    this.staffAddress = await this.reverseGeocode(latLng[0], latLng[1]); // Initial address fetch
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

    const group = L.featureGroup([this.staffMarker!]);
    this.map.fitBounds(group.getBounds().pad(0.2));
  }

  updateRequestMarkerAndRoute() {
    if (!this.map || !this.request.latitude || !this.request.longitude) return;

    const requestLoc = L.latLng(this.request.latitude, this.request.longitude);

    if (this.requestMarker) {
      this.requestMarker.setLatLng(requestLoc);
    } else {
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
        );
    }

    if (this.routeLine && this.staffLocation) {
      this.routeLine.setLatLngs([L.latLng(this.staffLocation), requestLoc]);
    } else if (this.staffLocation) {
      this.routeLine = L.polyline([L.latLng(this.staffLocation), requestLoc], {
        color: 'red',
        weight: 4,
        opacity: 0.7,
        dashArray: '10,6',
      }).addTo(this.map);
    }

    // Adjust map bounds to fit markers
    const group = L.featureGroup([this.staffMarker!, this.requestMarker]);
    this.map.fitBounds(group.getBounds().pad(0.2));
  }

  trackStaffLocation(): void {
    if (!navigator.geolocation) return;

    this.watchId = navigator.geolocation.watchPosition(
      async (position) => {
        this.ngZone.run(async () => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;

          // Log current device location sa console
          console.log('Current device location:', { lat, lng });

          this.staffLocation = [lat, lng];
          this.staffMarker?.setLatLng(this.staffLocation);

          if (
            this.map &&
            this.routeLine &&
            this.request.latitude &&
            this.request.longitude
          ) {
            const requestLoc = L.latLng(
              this.request.latitude,
              this.request.longitude
            );
            this.routeLine.setLatLngs([
              L.latLng(this.staffLocation),
              requestLoc,
            ]);
          }

          // Update currentStaff's lat/lng locally
          if (this.currentStaff) {
            this.currentStaff.staffLat = lat;
            this.currentStaff.staffLng = lng;
          }

          // Check proximity and display message if close
          this.checkProximityToRequest(lat, lng);

          try {
            if (
              this.currentStaff?.uid &&
              this.request?.staffId === this.currentStaff.uid
            ) {
              await this.requestService.updateLocationByStaffId(
                this.currentStaff.uid,
                lat,
                lng
              );
            }
          } catch (error) {
            console.error('Failed to update staff location:', error);
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

  // Check proximity to the request
  checkProximityToRequest(lat: number, lng: number): void {
    const requestLoc = L.latLng(this.request.latitude, this.request.longitude);
    const staffLoc = L.latLng(lat, lng);
    const distance = staffLoc.distanceTo(requestLoc); // distance in meters

    // Display message if within proximity threshold
    if (distance <= this.proximityThreshold) {
      this.proximityMessage = `You are within ${Math.round(
        distance
      )} meters of the request location.`;
    } else {
      this.proximityMessage = ''; // No proximity message if outside threshold
    }
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
    this.router.navigate(['/admin/EmergencyRequest']);
  }

  navigateToNone() {
    this.submitSuccessAccept = false;
  }

  async acceptRequest(request: EmergencyRequest) {
    if (!this.currentStaff || !this.staffLocation) {
      alert('Staff or location not available.');
      return;
    }

    this.isSubmitting = true;
    this.submitSuccessAccept = false;

    try {
      const latLng = L.latLng(this.staffLocation);

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

      const updated = await this.requestService.getRequestById(request.id!);
      if (updated) {
        this.request = updated;
      }

      this.submitSuccessAccept = true;
    } catch {
      alert('Failed to accept request.');
      this.submitSuccessAccept = false;
    } finally {
      this.isSubmitting = false;
    }
  }
}
