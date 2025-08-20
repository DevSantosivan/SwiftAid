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

  // Notification state
  hasUnreadNotifications = false;
  unreadNotificationCount = 0;

  // User and data counts
  userCount = 0;
  emergencyRequestCount = 0;

  // Add this for mobile view detection
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

    // Your existing async logic inside ngOnInit wrapped in an async function:
    (async () => {
      try {
        // Load unread notification count and state
        await this.updateUnreadNotificationStatus();

        // Fetch user count
        this.userCount = await this.userService.getUserCount();

        // Fetch emergency request count
        this.emergencyRequestCount =
          await this.emergencyRequestService.getRequestCount();
      } catch (error) {
        console.error('Error initializing dashboard:', error);
      }
    })();
  }

  // Helper method to set isMobileView based on window width
  private checkScreenWidth() {
    this.isMobileView = window.innerWidth <= 768; // breakpoint for mobile/tablet
  }

  toggleSidebar() {
    this.isCollapsed = !this.isCollapsed;
  }

  // (Rest of your existing methods below...)

  async updateUnreadNotificationStatus() {
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
    }
  }
}
