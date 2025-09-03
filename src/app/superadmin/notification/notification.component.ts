import { Component, OnDestroy, OnInit } from '@angular/core';
import { EmergencyRequestService } from '../../core/rescue_request.service';
import { AuthService } from '../../core/auth.service';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-notification',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, FormsModule],
  templateUrl: './notification.component.html',
  styleUrls: ['./notification.component.scss'],
})
export class NotificationComponent implements OnInit, OnDestroy {
  notifications: any[] = [];
  filteredRequests: any[] = [];

  currentUserId: string = '';
  filterType: 'all' | 'unread' | 'mentions' = 'all';
  private subscription?: Subscription;

  selectedNotifications = new Set<string>();

  isLoading: boolean = false;
  showSuccessModal: boolean = false;
  modalMessage: string = '';

  // Modal control variables
  showDeleteConfirmModal: boolean = false;
  deleteTargetSingleId: string | null = null; // single notification id
  deleteTargetMultiple: boolean = false; // bulk delete flag

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
    try {
      this.notifications =
        await this.emergencyService.getNotificationsWithRequestDetailsForUser(
          this.currentUserId
        );
      this.applyFilter();
      this.clearSelection();
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
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
      this.router.navigate(['/superAdmin/EmergencyRequest', requestId]);
    } else {
      console.warn('No request ID found.');
    }
  }

  async markAllAsRead() {
    if (!this.currentUserId) return;

    try {
      await this.emergencyService.markAllNotificationsAsReadForUser(
        this.currentUserId
      );
      await this.loadNotifications();
      this.showModalMessage('All notifications marked as read.');
    } catch (error) {
      console.error('Error marking all as read:', error);
      this.showModalMessage('Failed to mark all as read.');
    }
  }

  // === Modal confirm instead of direct delete ===
  confirmDeleteNotification(notifId: string) {
    this.deleteTargetSingleId = notifId;
    this.deleteTargetMultiple = false;
    this.showDeleteConfirmModal = true;
  }

  confirmDeleteSelected() {
    if (this.selectedNotifications.size === 0) return;

    this.deleteTargetSingleId = null;
    this.deleteTargetMultiple = true;
    this.showDeleteConfirmModal = true;
  }

  async onConfirmDelete() {
    this.showDeleteConfirmModal = false;
    this.isLoading = true;

    try {
      if (this.deleteTargetMultiple) {
        const idsToDelete = Array.from(this.selectedNotifications);
        for (const id of idsToDelete) {
          await this.emergencyService.deleteNotificationForUser(
            this.currentUserId,
            id
          );
        }
        this.clearSelection();
        this.showModalMessage('Selected notifications deleted.');
      } else if (this.deleteTargetSingleId) {
        await this.emergencyService.deleteNotificationForUser(
          this.currentUserId,
          this.deleteTargetSingleId
        );
        this.showModalMessage('Notification deleted successfully.');
      }
      await this.loadNotifications();
    } catch (error) {
      console.error('Delete error:', error);
      this.showModalMessage('Failed to delete notification(s).');
    } finally {
      this.isLoading = false;
      this.deleteTargetSingleId = null;
      this.deleteTargetMultiple = false;
    }
  }

  onCancelDelete() {
    this.showDeleteConfirmModal = false;
    this.deleteTargetSingleId = null;
    this.deleteTargetMultiple = false;
  }

  toggleSelection(notificationId: string, event: any) {
    if (event.target.checked) {
      this.selectedNotifications.add(notificationId);
    } else {
      this.selectedNotifications.delete(notificationId);
    }
  }

  isAllSelected(): boolean {
    return (
      this.filteredRequests.length > 0 &&
      this.filteredRequests.every((notif) =>
        this.selectedNotifications.has(notif.id)
      )
    );
  }

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

  showModalMessage(message: string) {
    this.modalMessage = message;
    this.showSuccessModal = true;
    setTimeout(() => {
      this.showSuccessModal = false;
    }, 3000);
  }
}
