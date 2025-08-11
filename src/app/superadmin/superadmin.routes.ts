import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { EmergencyRequestComponent } from './emergency-request/emergency-request.component';
import { TeamComponent } from './team/team.component';
import { AccountComponent } from './account/account.component';
import { FeedbackComponent } from './feedback/feedback.component';
import { InfoComponent } from './info/info.component';
import { TeamStaffComponent } from './team-staff/team-staff.component';
import { ViewRequestDetails } from './view-request-details/view-request-details';

export const SuperAdminRoutes: Routes = [
  {
    path: '',
    component: HomeComponent,
    children: [
      { path: '', redirectTo: 'Dashboard', pathMatch: 'full' },
      { path: 'Dashboard', component: DashboardComponent },
      { path: 'EmergencyRequest', component: EmergencyRequestComponent },
      { path: 'Team', component: TeamComponent },
      { path: 'Team-Details', component: TeamStaffComponent },
      { path: 'Account', component: AccountComponent },
      { path: 'Feedback', component: FeedbackComponent },
      { path: 'Info', component: InfoComponent },
      {
        path: 'EmergencyRequest/:id',
        loadComponent: () =>
          import('./view-request-details/view-request-details').then(
            (m) => m.ViewRequestDetails
          ),
      },
    ],
  },
];
