import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';

import { MapRequest } from './map-request/map-request';
import { Dashboard } from './dashboard/dashboard';
import { MapRequestDetails } from './map-request-details/map-request-details';

// {
//     path: '',
//     component: HomeComponent,
//     children: [
//       { path: '', redirectTo: 'Dashboard', pathMatch: 'full' },
//       { path: 'Dashboard', component: DashboardComponent },
//       { path: 'EmergencyRequest', component: EmergencyRequestComponent },
//       { path: 'Team', component: TeamComponent },

//       { path: 'Team-Details', component: TeamStaffComponent },
//       { path: 'Account', component: AccountComponent },
//       { path: 'Feedback', component: FeedbackComponent },
//       { path: 'Info', component: InfoComponent },
//     ],
//   },
export const AdminRoutes: Routes = [
  {
    path: '',
    component: HomeComponent,
    children: [
      { path: '', redirectTo: 'Dashboard', pathMatch: 'full' },
      { path: 'Dashboard', component: Dashboard },
      { path: 'EmergencyRequest', component: MapRequest },
      {
        path: 'EmergencyRequest/:id',
        loadComponent: () =>
          import('./map-request-details/map-request-details').then(
            (m) => m.MapRequestDetails
          ),
      },
    ],
  },
];
