import { Component, OnInit, NgZone, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Auth } from '@angular/fire/auth';
import { Router, RouterLink } from '@angular/router';
import { account } from '../../model/users';
import { UserService } from '../../core/user.service';
import { EmergencyRequestService } from '../../core/rescue_request.service';
import { Subscription } from 'rxjs';
import * as L from 'leaflet';
import { Timestamp } from 'firebase/firestore';
import { EmergencyRequest } from '../../model/emergency';
import { NavigationService } from '../../core/navigation.service';

@Component({
  selector: 'app-admin-navbar',
  imports: [CommonModule, RouterLink],
  templateUrl: './admin-navbar.component.html',
  styleUrls: ['./admin-navbar.component.scss'],
})
export class AdminNavbarComponent implements OnInit, OnDestroy {
  showSideBar = false;
  currentUser: account | null = null;
  isExiting = false;

  showNewRequestModal = false;
  currentRequest: EmergencyRequest | null = null;
  requestsQueue: EmergencyRequest[] = [];
  maps: { [key: string]: L.Map } = {};
  requestSubscription?: Subscription;

  audio = new Audio('/assets/999-social-credit-siren.mp3');

  activeRequestId: string | null = null;
  isViewingRequest = false;

  constructor(
    private afAuth: Auth,
    private router: Router,
    private authService: UserService,
    private requestService: EmergencyRequestService,
    private ngZone: NgZone,
    private navigationService: NavigationService
  ) {
    this.audio.loop = true;

    // Track if user is on EmergencyRequest page
    this.router.events.subscribe((event: any) => {
      if (event.url?.includes('/EmergencyRequest')) {
        this.isViewingRequest = true;
      } else {
        this.isViewingRequest = false;
      }
    });
  }

  async ngOnInit(): Promise<void> {
    try {
      // Silent audio unlock for browsers
      this.audio.muted = true;
      this.audio
        .play()
        .then(() => {
          this.audio.pause();
          this.audio.muted = false;
          this.audio.currentTime = 0;
        })
        .catch(() => {});

      const user = await this.afAuth.currentUser;
      if (!user) return;

      const userData = await this.authService.getUserById(user.uid);
      if (userData) this.currentUser = userData;

      this.subscribeToRequests();
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  }

  ngOnDestroy(): void {
    this.requestSubscription?.unsubscribe();
    Object.values(this.maps).forEach((map) => map.remove());
    this.stopSound();
  }

  // Sidebar toggle
  showSide() {
    this.isExiting = false;
    this.showSideBar = !this.showSideBar;
  }

  exit() {
    this.isExiting = true;
    setTimeout(() => (this.showSideBar = false), 300);
  }

  logout() {
    return this.afAuth
      .signOut()
      .then(() => this.router.navigate(['/login']))
      .catch((error) => console.error('Logout error', error));
  }

  // --- View Request ---
  viewRequest(request: EmergencyRequest) {
    this.closeNewRequestModal();
    this.activeRequestId = request.id;
    this.isViewingRequest = true;
    this.stopSound();

    if (this.currentUser?.role === 'superAdmin') {
      this.router.navigate(['/superAdmin/EmergencyRequest', request.id], {
        queryParams: { from: 'EmergencView' },
      });
    } else if (this.currentUser?.role === 'admin') {
      this.router.navigate(['/admin/EmergencyRequest', request.id], {
        queryParams: { from: 'EmergencyRescue' },
      });
    }
  }

  // --- Firestore Realtime ---
  subscribeToRequests(): void {
    this.requestSubscription = this.requestService
      .getRequestRealtime()
      .subscribe({
        next: (requests) => {
          this.ngZone.run(() => {
            const formatted = requests.map((req) => ({
              ...req,
              timestamp:
                req.timestamp instanceof Timestamp
                  ? req.timestamp.toDate()
                  : new Date(req.timestamp),
            }));

            // ✅ 1. Check if this user is responding
            const myResponding = formatted.find(
              (r) =>
                r.status === 'Responding' &&
                (r.staffId === this.currentUser?.uid ||
                  this.activeRequestId === r.id)
            );

            if (myResponding) {
              this.activeRequestId = myResponding.id;
              this.closeNewRequestModal();
              return;
            }

            // ✅ 2. If user's request is resolved/completed → resume modals
            const resolved = formatted.find(
              (r) =>
                r.staffId === this.currentUser?.uid &&
                (r.status === 'Resolved' || r.status === 'Completed')
            );

            if (resolved) {
              this.finishRequest();
            }

            // ✅ 3. Stop showing modals if currently viewing or active
            if (this.isViewingRequest || this.activeRequestId) return;

            // ✅ 4. Queue pending requests
            const pending = formatted.filter((r) => r.status === 'Pending');
            pending.forEach((req) => {
              if (!this.requestsQueue.find((q) => q.id === req.id)) {
                this.requestsQueue.push(req);
                this.playSound();
              }
            });

            // ✅ 5. Show next modal
            if (!this.showNewRequestModal && this.requestsQueue.length > 0) {
              this.showNextRequest();
            }
          });
        },
        error: (err) => console.error(err),
      });
  }

  showNextRequest(): void {
    if (this.isViewingRequest) return;
    if (this.requestsQueue.length === 0) {
      this.stopSound();
      return;
    }

    this.currentRequest = this.requestsQueue.shift()!;
    this.showNewRequestModal = true;
    setTimeout(() => this.initMap(this.currentRequest!), 400);
  }

  initMap(req: EmergencyRequest): void {
    const container = document.getElementById(`map-${req.id}`);
    if (container && !this.maps[req.id] && req.latitude && req.longitude) {
      const map = L.map(container, {
        zoomControl: false,
        dragging: false,
      }).setView([req.latitude, req.longitude], 14);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
      }).addTo(map);

      L.marker([req.latitude, req.longitude], {
        icon: L.divIcon({
          className: 'custom-pulse-marker',
          html: '<div class="pulse"></div>',
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        }),
      }).addTo(map);

      this.maps[req.id] = map;
      setTimeout(() => map.invalidateSize(), 200);
    }
  }

  closeNewRequestModal(): void {
    this.showNewRequestModal = false;
    this.currentRequest = null;
    this.stopSound();
  }

  finishRequest() {
    this.activeRequestId = null;
    this.isViewingRequest = false;
    this.showNextRequest();
  }

  playSound(): void {
    try {
      this.audio.currentTime = 0;
      this.audio.play().catch(() => {});
    } catch {}
  }

  stopSound(): void {
    try {
      this.audio.pause();
      this.audio.currentTime = 0;
    } catch {}
  }
}
