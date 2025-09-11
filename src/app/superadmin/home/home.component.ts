import { Component, OnDestroy, OnInit } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import {
  Router,
  RouterOutlet,
  RouterLink,
  RouterLinkActive,
} from '@angular/router';

import { Chart, registerables } from 'chart.js';
import { UserService } from '../../core/user.service';
import { EmergencyRequestService } from '../../core/rescue_request.service';
import { NotificationService } from '../../core/notification.service';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { AdminNavbarComponent } from '../../admin/admin-navbar/admin-navbar.component';

Chart.register(...registerables);

@Component({
  selector: 'app-home',
  imports: [
    AdminNavbarComponent,
    RouterOutlet,
    RouterLinkActive,
    RouterLink,
    FormsModule,
    ReactiveFormsModule,
    CommonModule,
  ],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent implements OnInit, OnDestroy {
  // Charts references
  chart: any;
  pieChart: any;
  yearlyChart: any;

  // Sidebar state
  isCollapsed = false;

  // Notification states
  hasUnreadNotifications = false;
  unreadNotificationCount = 0;

  hasUnreadEmergencyRequests = false;
  unreadEmergencyRequestCount = 0;

  hasPendingAccounts = false;
  pendingAccountCount = 0;

  // New real-time notification flags & counts
  hasUnreadRespondingRequests = false;
  unreadRespondingRequestCount = 0;

  hasUnreadPendingRequests = false;
  unreadPendingRequestCount = 0;

  // User and data counts
  userCount = 0;
  emergencyRequestCount = 0;

  // Mobile view detection
  isMobileView = false;

  // Subscriptions for real-time listeners
  private respondingSub?: Subscription;
  private pendingSub?: Subscription;

  constructor(
    private authentication: Auth,
    private router: Router,
    private userService: UserService,
    private emergencyRequestService: EmergencyRequestService
  ) {}

  ngOnInit() {
    this.checkScreenWidth();

    // Load one-time counts in parallel
    Promise.all([
      this.loadUnreadNotificationCount(),
      this.loadUnreadEmergencyRequestCount(),
      this.loadUserCount(),
      this.loadEmergencyRequestCount(),
      this.loadPendingAccountCount(),
    ]).catch(console.error);

    // Setup real-time subscriptions for responding & pending requests
    this.subscribeToRespondingEmergencyRequests();
    this.subscribeToPendingEmergencyRequests();
  }

  ngOnDestroy(): void {
    // Cleanup subscriptions on destroy
    this.respondingSub?.unsubscribe();
    this.pendingSub?.unsubscribe();
  }

  private checkScreenWidth() {
    this.isMobileView = window.innerWidth <= 768;
  }

  toggleSidebar() {
    this.isCollapsed = !this.isCollapsed;
  }

  // Load unread notifications count (one-time)
  async loadUnreadNotificationCount() {
    try {
      const currentUser = this.authentication.currentUser;
      if (!currentUser) {
        this.hasUnreadNotifications = false;
        this.unreadNotificationCount = 0;
        return;
      }

      const count =
        await this.emergencyRequestService.getUnreadNotificationCountForUser(
          currentUser.uid
        );
      this.unreadNotificationCount = count;
      this.hasUnreadNotifications = count > 0;
    } catch (error) {
      this.hasUnreadNotifications = false;
      this.unreadNotificationCount = 0;
    }
  }

  // Load unread emergency request count (one-time)
  async loadUnreadEmergencyRequestCount() {
    try {
      const currentUser = this.authentication.currentUser;
      if (!currentUser) {
        this.hasUnreadEmergencyRequests = false;
        this.unreadEmergencyRequestCount = 0;
        return;
      }

      const count = await this.emergencyRequestService.getUnreadEmergency(
        currentUser.uid
      );
      this.unreadEmergencyRequestCount = count;
      this.hasUnreadEmergencyRequests = count > 0;
    } catch (error) {
      this.hasUnreadEmergencyRequests = false;
      this.unreadEmergencyRequestCount = 0;
    }
  }

  // Real-time subscription for Responding emergency requests
  subscribeToRespondingEmergencyRequests() {
    const currentUser = this.authentication.currentUser;
    if (!currentUser) return;

    this.respondingSub = this.emergencyRequestService
      .getUnreadRespondingRequests(currentUser.uid)
      .subscribe({
        next: (count) => {
          this.unreadRespondingRequestCount = count;
          this.hasUnreadRespondingRequests = count > 0;
        },
        error: (error) => {
          this.hasUnreadRespondingRequests = false;
          this.unreadRespondingRequestCount = 0;
        },
      });
  }

  // Real-time subscription for Pending emergency requests
  subscribeToPendingEmergencyRequests() {
    this.pendingSub = this.emergencyRequestService
      .getUnreadPendingRequests()
      .subscribe({
        next: (count) => {
          this.unreadPendingRequestCount = count;
          this.hasUnreadPendingRequests = count > 0;
        },
        error: (error) => {
          this.hasUnreadPendingRequests = false;
          this.unreadPendingRequestCount = 0;
        },
      });
  }

  // Load total user count (one-time)
  async loadUserCount() {
    try {
      this.userCount = await this.userService.getUserCount();
    } catch (error) {
      this.userCount = 0;
    }
  }

  // Load pending resident accounts count (one-time)
  async loadPendingAccountCount() {
    try {
      const accounts = await this.userService.getPendingResidentAccounts();
      this.pendingAccountCount = accounts.length;
      this.hasPendingAccounts = accounts.length > 0;
    } catch (error) {
      this.pendingAccountCount = 0;
      this.hasPendingAccounts = false;
    }
  }

  // Load total emergency request count (one-time)
  async loadEmergencyRequestCount() {
    try {
      this.emergencyRequestCount =
        await this.emergencyRequestService.getRequestCount();
    } catch (error) {
      this.emergencyRequestCount = 0;
    }
  }
}
