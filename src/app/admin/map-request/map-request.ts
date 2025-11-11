import {
  Component,
  OnDestroy,
  NgZone,
  OnInit,
  ViewChild,
  ElementRef,
  AfterViewInit,
} from '@angular/core';
import { EmergencyRequestService } from '../../core/rescue_request.service';
import { EmergencyRequest } from '../../model/emergency';
import { CommonModule } from '@angular/common';
import { Firestore, doc, getDoc, Timestamp } from '@angular/fire/firestore';
import { Subscription } from 'rxjs';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import * as L from 'leaflet';

@Component({
  selector: 'app-map-request',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './map-request.html',
  styleUrls: ['./map-request.scss'],
})
export class MapRequest implements AfterViewInit, OnDestroy, OnInit {
  requests: EmergencyRequest[] = [];
  filteredRequests: EmergencyRequest[] = [];
  currentPage = 1;
  itemsPerPage = 5;

  map!: L.Map;
  staffLocation: L.LatLngExpression = [12.3622, 121.0671];
  markers: Map<string, L.Marker> = new Map();
  activeMarker?: L.Marker;

  private requestSubscription?: Subscription;
  staffDetailsMap: Record<string, { first_name: string; last_name: string }> =
    {};
  readonly GEOFENCE_RADIUS_METERS = 10000; // 10 km

  isLoading = true;
  currentStaff: any = null;

  constructor(
    private requestService: EmergencyRequestService,
    private firestore: Firestore,
    private ngZone: NgZone,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initializeMap();
    this.loadCurrentStaff();
    this.setInitialStaffLocation();
    this.subscribeToPendingRequests();
    document.body.style.overflow = 'hidden';
  }

  ngAfterViewInit(): void {}
  ngOnDestroy(): void {
    this.requestSubscription?.unsubscribe();
    document.body.style.overflow = '';
  }

  get totalPages(): number {
    return Math.ceil(this.filteredRequests.length / this.itemsPerPage);
  }
  get paginatedRequests(): EmergencyRequest[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredRequests.slice(start, start + this.itemsPerPage);
  }

  goToNextPage(): void {
    if (this.currentPage < this.totalPages) this.currentPage++;
  }
  goToPreviousPage(): void {
    if (this.currentPage > 1) this.currentPage--;
  }

  // ✅ Initialize Map with Geofence
  initializeMap(): void {
    const sanJoseCenter: L.LatLngExpression = [12.3622, 121.0671];
    this.map = L.map('requestMap').setView(sanJoseCenter, 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(this.map);

    const geofence = L.circle(sanJoseCenter, {
      radius: this.GEOFENCE_RADIUS_METERS,
      color: 'red',
      weight: 3,
      fillColor: 'red',
      fillOpacity: 0.1,
    }).addTo(this.map);

    this.map.setMaxBounds(geofence.getBounds());
  }

  // ✅ Fetch only PENDING requests, ordered by timestamp (latest first)
  subscribeToPendingRequests(): void {
    this.requestSubscription = this.requestService
      .getRequestRealtime()
      .subscribe({
        next: async (requests) => {
          this.ngZone.run(async () => {
            // Convert timestamps safely
            this.requests = requests
              .map((req) => ({
                ...req,
                timestamp:
                  req.timestamp instanceof Timestamp
                    ? req.timestamp.toDate()
                    : new Date(req.timestamp),
              }))
              // ✅ Filter only Pending
              .filter((req) => req.status === 'Pending')
              // ✅ Sort by timestamp (latest first)
              .sort(
                (a, b) =>
                  (b.timestamp as Date).getTime() -
                  (a.timestamp as Date).getTime()
              );

            // Fetch staff details once per unique staff ID
            const staffIdsToFetch = this.requests
              .map((r) => r.staffId)
              .filter((id): id is string => !!id && !this.staffDetailsMap[id]);

            if (staffIdsToFetch.length > 0) {
              await Promise.all(
                staffIdsToFetch.map(async (staffId) => {
                  try {
                    const snap = await getDoc(
                      doc(this.firestore, `users/${staffId}`)
                    );
                    if (snap.exists()) {
                      const data = snap.data();
                      this.staffDetailsMap[staffId] = {
                        first_name: data['first_name'] || '',
                        last_name: data['last_name'] || '',
                      };
                    }
                  } catch (err) {
                    console.warn('Failed to fetch staff info:', err);
                  }
                })
              );
            }

            // ✅ Apply to filteredRequests directly
            this.filteredRequests = this.requests;

            this.updateMarkers();
            this.isLoading = false;
          });
        },
      });
  }

  getStaffFullName(staffId?: string): string {
    if (!staffId) return '';
    const s = this.staffDetailsMap[staffId];
    return s ? `${s.first_name} ${s.last_name}` : 'Unknown';
  }

  ViewRequest(req: EmergencyRequest): void {
    this.router.navigate(['/superAdmin/EmergencyRequest', req.id]);
  }

  async loadCurrentStaff(): Promise<void> {
    try {
      const { getAuth } = await import('firebase/auth');
      const auth = getAuth();
      const user = auth.currentUser;
      if (user) {
        const docSnap = await getDoc(doc(this.firestore, `users/${user.uid}`));
        if (docSnap.exists()) {
          this.currentStaff = { uid: user.uid, ...docSnap.data() };
        }
      }
    } catch (err) {
      console.error('Load staff error:', err);
    }
  }

  async setInitialStaffLocation(): Promise<void> {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        (this.staffLocation = [pos.coords.latitude, pos.coords.longitude]),
      (err) => console.warn('Geolocation error:', err)
    );
  }

  async acceptRequest(req: EmergencyRequest): Promise<void> {
    try {
      if (!this.currentStaff) await this.loadCurrentStaff();
      if (!this.staffLocation) await this.setInitialStaffLocation();
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
      this.router.navigate(['/admin/EmergencyRequest', req.id]);
    } catch (err) {
      console.error('Accept request failed:', err);
      alert('Failed to accept request.');
    }
  }

  updateMarkers(): void {
    this.markers.forEach((m) => m.remove());
    this.markers.clear();

    this.filteredRequests.forEach((req) => {
      if (!req.latitude || !req.longitude) return;

      const marker = L.marker([req.latitude, req.longitude], {
        icon: L.divIcon({
          className: 'profile-marker',
          html: `<div style="
            width: 40px; height: 40px; border-radius: 50%;
            background-image: url('${req.image || 'assets/logo22.png'}');
            background-size: cover; border: 3px solid white;">
          </div>`,
        }),
      }).addTo(this.map);

      marker.bindPopup(`
        <div style="text-align:center;">
          <b>${req.name}</b><br>
          Status: ${req.status}<br>
          Staff: ${this.getStaffFullName(req.staffId)}
        </div>
      `);
      this.markers.set(req.id, marker);
    });
  }

  highlightMarker(req: EmergencyRequest): void {
    if (this.activeMarker) {
      const prev = this.activeMarker.getElement();
      if (prev)
        (prev.querySelector('div') as HTMLElement).style.border =
          '3px solid white';
    }

    const marker = this.markers.get(req.id);
    if (marker) {
      const el = marker.getElement();
      if (el)
        (el.querySelector('div') as HTMLElement).style.border = '3px solid red';
      marker.openPopup();
      this.map.setView(marker.getLatLng(), 14, { animate: true });
      this.activeMarker = marker;
    }
  }
}
