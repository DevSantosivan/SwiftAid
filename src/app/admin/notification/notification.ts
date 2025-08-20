import { Component, OnDestroy, OnInit } from '@angular/core';
import { EmergencyRequestService } from '../../core/rescue_request.service';
import { AuthService } from '../../core/auth.service';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EmergencyRequest } from '../../model/emergency';
import { Router } from '@angular/router';

@Component({
  selector: 'app-notification',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './notification.html',
  styleUrls: ['./notification.scss'], // fixed typo
})
export class Notification implements OnInit, OnDestroy {
  notifications: any[] = [];
  filteredRequests: any[] = [];

  currentUserId: string = '';
  filterType: 'all' | 'unread' | 'mentions' = 'all';
  private subscription?: Subscription;

  constructor(
    private emergencyService: EmergencyRequestService,
    private authService: AuthService,
    private router: Router
  ) {}

  async ngOnInit() {
    const currentUser = this.authService.getCurrentUser();
    if (currentUser && currentUser.uid) {
      this.currentUserId = currentUser.uid;
      await this.loadNotifications();
    }
  }

  ngOnDestroy() {
    this.subscription?.unsubscribe();
  }

  private async loadNotifications() {
    this.notifications =
      await this.emergencyService.getNotificationsWithRequestDetailsForUser(
        this.currentUserId
      );
    this.applyFilter();
  }

  setFilter(type: 'all' | 'unread' | 'mentions') {
    this.filterType = type;
    this.applyFilter();
  }

  applyFilter() {
    if (!this.currentUserId) {
      this.filteredRequests = [];
      return;
    }

    if (this.filterType === 'all') {
      this.filteredRequests = this.notifications;
    } else if (this.filterType === 'unread') {
      this.filteredRequests = this.notifications.filter(
        (notif) => !notif.isReadByCurrentUser
      );
    } else if (this.filterType === 'mentions') {
      this.filteredRequests = this.notifications.filter(
        (notif) => notif.request?.staffId === this.currentUserId
      );
    }
  }
  ViewRequest(notif: any) {
    const requestId = notif?.request?.id;
    if (requestId) {
      this.router.navigate(['/admin/EmergencyRequest', requestId]);
    } else {
      console.warn('No request ID found.');
    }
  }

  async markAllAsRead() {
    if (!this.currentUserId) return;

    await this.emergencyService.markAllNotificationsAsReadForUser(
      this.currentUserId
    );
    await this.loadNotifications();
  }
}
