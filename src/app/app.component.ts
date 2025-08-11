import { Component, OnInit } from '@angular/core';
import { NotificationService } from './core/notification.service';
import { RouterOutlet } from '@angular/router'; // adjust path if needed
import { LoadingService } from './core/laoding.service';
import { LoaderComponent } from './loader/loader.component';
import { LoadingAutgate } from './loading-autgate/loading-autgate';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  template: `
    <app-loading-autgate *ngIf="isLoading"></app-loading-autgate>
    <router-outlet></router-outlet>
  `,
  styleUrls: ['./app.component.scss'],
  imports: [RouterOutlet, LoadingAutgate, CommonModule],
})
export class AppComponent implements OnInit {
  isLoading = false;

  constructor(
    private notificationService: NotificationService,
    private loadingService: LoadingService
  ) {}

  ngOnInit(): void {
    this.loadingService.loading$.subscribe(
      (loading: boolean) => (this.isLoading = loading)
    );

    this.initializeNotifications();
  }

  private async initializeNotifications() {
    this.loadingService.show();

    try {
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
    } catch (err) {
      console.error('Error initializing notifications:', err);
    } finally {
      this.loadingService.hide();
    }
  }
}
