import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { EmergencyRequestComponent } from './emergency-request/emergency-request.component';
import { TeamComponent } from './team/team.component';
import { AccountComponent } from './account/account.component';
import { FeedbackComponent } from './feedback/feedback.component';
import { InfoComponent } from './info/info.component';
import { TeamStaffComponent } from './team-staff/team-staff.component';
import { NotificationComponent } from './notification/notification.component';
import { HistoryCallComponent } from '../admin/history-call/history-call.component';
import { IncidentHistory } from './incident-history/incident-history';
import { AccountVerification } from './account-verification/account-verification';
import { LiveTracking } from './live-tracking/live-tracking';
import { Statistic } from './statistic/statistic';

export const SuperAdminRoutes: Routes = [
  {
    path: '',
    component: HomeComponent,
    children: [
      { path: '', redirectTo: 'Dashboard', pathMatch: 'full' },
      { path: 'Dashboard', component: DashboardComponent },

      { path: 'Verification', component: AccountVerification },
      {
        path: 'Verification/:id',
        loadComponent: () =>
          import(
            './account-verification-details/account-verification-details'
          ).then((m) => m.AccountVerificationDetails),
      },

      {
        path: 'EmergencyRequest',
        children: [
          { path: '', component: EmergencyRequestComponent },
          {
            path: ':id',
            loadComponent: () =>
              import('./view-request-details/view-request-details').then(
                (m) => m.ViewRequestDetails
              ),
          },
        ],
      },

      {
        path: 'IncidentHistory',
        children: [
          { path: '', component: IncidentHistory },
          {
            path: ':id',
            loadComponent: () =>
              import('./view-request-details/view-request-details').then(
                (m) => m.ViewRequestDetails
              ),
          },
        ],
      },

      {
        path: 'LiveTracking',
        children: [
          { path: '', component: LiveTracking },
          {
            path: ':id',
            loadComponent: () =>
              import('./tracking-view/tracking-view').then(
                (m) => m.TrackingView
              ),
          },
        ],
      },
      { path: 'Statistic-Emergency', component: Statistic },

      { path: 'Team', component: TeamComponent },
      { path: 'Team-Details', component: TeamStaffComponent },
      { path: 'Account', component: AccountComponent },
      { path: 'Feedback', component: FeedbackComponent },
      { path: 'Info', component: InfoComponent },
      { path: 'Notifications', component: NotificationComponent },
    ],
  },
];
