import { Component, OnInit } from '@angular/core';
import { NotificationService } from './core/notification.service';
import { RouterOutlet } from '@angular/router';
import { LoadingService } from './core/laoding.service';
import { LoadingAutgate } from './loading-autgate/loading-autgate';
import { CommonModule } from '@angular/common';
import { MatProgressBarModule } from '@angular/material/progress-bar';

@Component({
  selector: 'app-root',
  standalone: true,
  template: `
    <!-- 🔴 Progress bar sa pinaka taas -->
    <mat-progress-bar
      *ngIf="isLoading"
      mode="indeterminate"
      class="loading-bar ambulance-bar"
    ></mat-progress-bar>

    <!-- Ambulance image overlay -->
    <img
      *ngIf="isLoading"
      src="../assets/ambulancia.gif"
      alt="ambulance"
      class="ambulance-icon"
    />

    <router-outlet></router-outlet>
  `,
  styleUrls: ['./app.component.scss'],
  imports: [RouterOutlet, CommonModule, MatProgressBarModule],
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
