import { Component, HostListener, OnInit } from '@angular/core';
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
import {
  Firestore,
  collection,
  getDocs,
  DocumentData,
} from '@angular/fire/firestore';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/auth.service';
import { AdminComponent } from '../../admin/admin.component';
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
export class HomeComponent implements OnInit {
  // Charts references
  chart: any;
  pieChart: any;
  yearlyChart: any;

  // Sidebar state
  isCollapsed = false;

  // Notification states
  hasUnreadNotifications = false; // For Notification collection
  unreadNotificationCount = 0;

  hasUnreadEmergencyRequests = false; // For EmergencyRequest collection
  unreadEmergencyRequestCount = 0;

  hasPendingAccounts: boolean = false;
  pendingAccountCount: number = 0;

  // User and data counts
  userCount = 0;
  emergencyRequestCount = 0;

  // Mobile view detection
  isMobileView: boolean = false;

  constructor(
    private authentication: Auth,
    private router: Router,
    private userService: UserService,
    private emergencyRequestService: EmergencyRequestService,
    private firestore: Firestore
  ) {}

  ngOnInit() {
    this.checkScreenWidth();

    (async () => {
      try {
        // Load counts in parallel
        await Promise.all([
          this.loadUnreadNotificationCount(),
          this.loadUnreadEmergencyRequestCount(),
          this.loadUserCount(),
          this.loadEmergencyRequestCount(),
          this.loadPendingAccountCount(),
        ]);
      } catch (error) {
        console.error('Error initializing dashboard:', error);
      }
    })();
  }

  // Helper method to set isMobileView based on window width
  private checkScreenWidth() {
    this.isMobileView = window.innerWidth <= 768;
  }

  toggleSidebar() {
    this.isCollapsed = !this.isCollapsed;
  }

  // Load unread notifications count from Notification collection
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

      console.log('Unread notifications:', count);
    } catch (error) {
      console.error('Failed to fetch unread notification count:', error);
      this.hasUnreadNotifications = false;
      this.unreadNotificationCount = 0;
    }
  }

  // Load unread emergency request count from EmergencyRequest collection
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

      console.log('Unread emergency requests:', count);
    } catch (error) {
      console.error('Failed to fetch unread emergency request count:', error);
      this.hasUnreadEmergencyRequests = false;
      this.unreadEmergencyRequestCount = 0;
    }
  }

  // Load total user count
  async loadUserCount() {
    try {
      this.userCount = await this.userService.getUserCount();
    } catch (error) {
      console.error('Failed to fetch user count:', error);
      this.userCount = 0;
    }
  }
  async loadPendingAccountCount() {
    try {
      const accounts = await this.userService.getPendingResidentAccounts();
      this.pendingAccountCount = accounts.length;
      this.hasPendingAccounts = accounts.length > 0;
    } catch (error) {
      console.error('Failed to fetch pending accounts:', error);
      this.pendingAccountCount = 0;
      this.hasPendingAccounts = false;
    }
  }

  // Load total emergency request count
  async loadEmergencyRequestCount() {
    try {
      this.emergencyRequestCount =
        await this.emergencyRequestService.getRequestCount();
    } catch (error) {
      console.error('Failed to fetch emergency request count:', error);
      this.emergencyRequestCount = 0;
    }
  }
}
