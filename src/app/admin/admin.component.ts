import { Component, OnInit } from '@angular/core';
import { NotificationService } from '../core/notification.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.scss'],
})
export class AdminComponent implements OnInit {
  constructor(private notificationService: NotificationService) {}

  async ngOnInit(): Promise<void> {
    console.log('🚀 AdminComponent initialized');

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
  }
}
