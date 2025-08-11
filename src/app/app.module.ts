import { Component, OnInit } from '@angular/core';
import { NotificationService } from './core/notification.service';
import { RouterOutlet } from '@angular/router'; // adjust path if needed

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  imports: [RouterOutlet],
})
export class AppComponent implements OnInit {
  constructor(private notificationService: NotificationService) {}

  async ngOnInit(): Promise<void> {
    console.log('AppComponent initialized');

    const permission =
      await this.notificationService.requestNotificationPermission();
    console.log('Notification permission:', permission);

    if (permission === 'granted') {
      await this.notificationService.initializeLatestTimestamp();
      this.notificationService.listenToEmergencyRequests();
      this.notificationService.listenForFCMMessages();
    } else {
      console.warn('Notification permission not granted.');
    }
  }
}
