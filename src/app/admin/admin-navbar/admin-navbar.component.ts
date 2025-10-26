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

  // --- Pending Requests Modal ---
  showNewRequestModal = false;
  currentRequest: EmergencyRequest | null = null;
  requestsQueue: EmergencyRequest[] = [];
  maps: { [key: string]: L.Map } = {};
  requestSubscription?: Subscription;

  // --- Audio Notification ---
  audio = new Audio('/assets/999-social-credit-siren.mp3');

  constructor(
    private afAuth: Auth,
    private router: Router,
    private authService: UserService,
    private requestService: EmergencyRequestService,
    private ngZone: NgZone,
    private navigationService: NavigationService
  ) {
    // Enable looping for the audio
    this.audio.loop = true;
  }

  async ngOnInit(): Promise<void> {
    try {
      // 🔑 Silent unlock (muted autoplay is allowed by browser)
      this.audio.muted = true;
      this.audio
        .play()
        .then(() => {
          this.audio.pause();
          this.audio.muted = false; // ibalik sa normal
          this.audio.currentTime = 0;
          console.log('Audio unlocked silently');
        })
        .catch((err) => console.warn('Silent unlock failed:', err));

      const user = await this.afAuth.currentUser;
      if (!user) {
        console.warn('No user is logged in.');
        return;
      }

      const userData = await this.authService.getUserById(user.uid);
      if (userData) {
        this.currentUser = userData;
      }

      this.subscribeToRequests();
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  }

  viewRequest(request: EmergencyRequest) {
    this.closeNewRequestModal();
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

  ngOnDestroy(): void {
    this.requestSubscription?.unsubscribe();
    Object.values(this.maps).forEach((map) => map.remove());
    this.stopSound(); // Stop audio when component destroyed
  }

  // --- Sidebar ---
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

  acceptRequest(req: EmergencyRequest) {
    console.log('Accepting request', req);
    // Example: update Firestore
    // this.requestService.updateRequestStatus(req.id, "ACCEPTED");

    this.closeNewRequestModal();
  }

  // --- Subscribe to Requests ---
  subscribeToRequests(): void {
    this.requestSubscription = this.requestService
      .getRequestRealtime()
      .subscribe({
        next: (requests) => {
          this.ngZone.run(() => {
            const formatted = requests.map((req) => {
              let timestampDate: Date | null = null;
              if (req.timestamp instanceof Timestamp) {
                timestampDate = req.timestamp.toDate();
              } else if (typeof req.timestamp === 'string') {
                timestampDate = new Date(req.timestamp);
              } else if (req.timestamp instanceof Date) {
                timestampDate = req.timestamp;
              }
              return { ...req, timestamp: timestampDate };
            });

            const pending = formatted.filter((r) => r.status === 'Pending');

            pending.forEach((req) => {
              if (!this.requestsQueue.find((q) => q.id === req.id)) {
                this.requestsQueue.push(req);
                this.playSound(); // Start looping sound
              }
            });

            if (!this.showNewRequestModal && this.requestsQueue.length > 0) {
              this.showNextRequest();
            }
          });
        },
        error: (err) => console.error(err),
      });
  }

  showNextRequest(): void {
    if (this.requestsQueue.length === 0) {
      this.stopSound(); // Stop sound if no requests
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

    this.stopSound(); // Stop looping sound when modal closed

    // Show next queued request after small delay
    setTimeout(() => this.showNextRequest(), 300);
  }

  // --- Play & Stop Sound ---
  playSound(): void {
    try {
      this.audio.currentTime = 0; // restart
      this.audio.play().catch((err) => console.warn('Audio play error', err));
    } catch (err) {
      console.error('Audio error:', err);
    }
  }

  stopSound(): void {
    try {
      this.audio.pause();
      this.audio.currentTime = 0;
    } catch (err) {
      console.error('Audio stop error:', err);
    }
  }
}
