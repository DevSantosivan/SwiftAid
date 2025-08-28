import { Component, OnInit } from '@angular/core';
import { NotificationService } from './core/notification.service';
import { RouterOutlet } from '@angular/router'; // adjust path if needed
import { AuthService } from './core/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  imports: [RouterOutlet],
})
export class AppComponent implements OnInit {
  constructor(
    private authService: AuthService, // or however you track auth
    private notificationService: NotificationService
  ) {}

  async ngOnInit(): Promise<void> {
    if (!this.authService.getCurrentUser()) {
      console.log('🔒 User not logged in, skipping FCM init');
      return;
    }

    try {
      const permission =
        await this.notificationService.requestNotificationPermission();
      console.log('🔐 Notification permission:', permission);

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
