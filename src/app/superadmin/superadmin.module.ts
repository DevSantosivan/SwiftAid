import { NgModule, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouterModule } from '@angular/router';

import { SuperAdminRoutes } from './superadmin.routes';
import { HomeComponent } from './home/home.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { EmergencyRequest } from '../model/emergency';
import { EmergencyRequestComponent } from './emergency-request/emergency-request.component';
import { AccountComponent } from './account/account.component';
import { TeamComponent } from './team/team.component';
import { FeedbackComponent } from './feedback/feedback.component';
import { InfoComponent } from './info/info.component';
import { TeamStaffComponent } from './team-staff/team-staff.component';
import { TimeDiffPipe } from '../../pipe/time-diff.pipe';
import { NotificationService } from '../core/notification.service';

@NgModule({
  imports: [
    CommonModule,
    BrowserAnimationsModule,
    RouterModule.forChild(SuperAdminRoutes),
    HomeComponent,
    DashboardComponent,
    EmergencyRequestComponent,
    AccountComponent,
    TeamComponent,
    Notification,
    FeedbackComponent,
    InfoComponent,
    TeamStaffComponent,
  ],
  declarations: [
    HomeComponent,
    DashboardComponent,
    EmergencyRequestComponent,
    AccountComponent,
    TeamComponent,
    FeedbackComponent,
    InfoComponent,
    TeamStaffComponent,
    TimeDiffPipe,
  ],
})
export class SuperAdminModule implements OnInit {
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
