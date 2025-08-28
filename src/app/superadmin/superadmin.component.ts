import { Component, OnInit } from '@angular/core';
import { NotificationService } from '../core/notification.service';
import { LoadingService } from '../core/laoding.service'; // if needed

@Component({
  selector: 'app-superadmin',
  templateUrl: './superadmin.component.html',
  styleUrls: ['./superadmin.component.scss'],
  standalone: true,
  imports: [],
})
export class SuperadminComponent implements OnInit {
  constructor(
    private notificationService: NotificationService,
    private loadingService: LoadingService
  ) {}

  async ngOnInit(): Promise<void> {
    this.loadingService.show(); // optional

    try {
      console.log('📦 SuperadminComponent initialized');
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
      console.error('❌ Notification init error:', error);
    } finally {
      this.loadingService.hide(); // optional
    }
  }
}
