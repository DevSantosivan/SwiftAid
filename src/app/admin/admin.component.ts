import { Component, OnInit } from '@angular/core';
import { NotificationService } from '../core/notification.service';
import { CommonModule } from '@angular/common';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.scss'],
})
export class AdminComponent implements OnInit {
  constructor(
    private authService: AuthService,
    private notificationService: NotificationService
  ) {}

  async ngOnInit(): Promise<void> {
    const user = this.authService.getCurrentUser();

    if (!user) {
      console.log('🔒 No user logged in — skipping FCM init.');
      return;
    }

    try {
      const permission =
        await this.notificationService.requestNotificationPermission();

      if (permission === 'granted') {
        await this.notificationService.initializeLatestTimestamp();
        this.notificationService.listenToEmergencyRequests();
        this.notificationService.listenForFCMMessages();
      } else {
        console.warn('⚠️ Notification permission not granted');
      }
    } catch (error) {
      console.error('❌ Error initializing notifications:', error);
    }
  }
}
