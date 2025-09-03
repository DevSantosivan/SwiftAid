import { Component, OnDestroy, OnInit } from '@angular/core';
import { EmergencyRequestService } from '../../core/rescue_request.service';
import { AuthService } from '../../core/auth.service';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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

  // Set to track selected notification IDs for bulk actions
  selectedNotifications = new Set<string>();

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
    this.clearSelection();
  }

  setFilter(type: 'all' | 'unread' | 'mentions') {
    this.filterType = type;
    this.applyFilter();
    this.clearSelection();
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

  async deleteNotification(notif: any) {
    try {
      await this.emergencyService.deleteNotificationForUser(
        this.currentUserId,
        notif.id
      );
      await this.loadNotifications();
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  }

  // Multi-select toggle for checkboxes
  toggleSelection(notificationId: string, event: any) {
    if (event.target.checked) {
      this.selectedNotifications.add(notificationId);
    } else {
      this.selectedNotifications.delete(notificationId);
    }
  }

  // Check if all filtered notifications are selected
  isAllSelected(): boolean {
    return (
      this.filteredRequests.length > 0 &&
      this.filteredRequests.every((notif) =>
        this.selectedNotifications.has(notif.id)
      )
    );
  }

  // Select or deselect all visible notifications
  toggleSelectAll(event: any) {
    if (event.target.checked) {
      this.filteredRequests.forEach((notif) =>
        this.selectedNotifications.add(notif.id)
      );
    } else {
      this.selectedNotifications.clear();
    }
  }

  clearSelection() {
    this.selectedNotifications.clear();
  }

  // Delete all selected notifications for current user
  async deleteSelected() {
    const idsToDelete = Array.from(this.selectedNotifications);
    for (const id of idsToDelete) {
      await this.emergencyService.deleteNotificationForUser(
        this.currentUserId,
        id
      );
    }
    this.clearSelection();
    await this.loadNotifications();
  }
}
