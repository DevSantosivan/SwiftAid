import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { LoginComponent } from './login/login.component';
import { AboutUsComponent } from './about-us/about-us.component';
import { RegisterComponent } from './register/register.component';
import { ServicesComponent } from './services/services.component';
import { DeveloperPage } from './developer-page/developer-page';
import { DeveloperAccessGuard } from '../guards/developer-access-guard';
import { Contact } from './contact/contact';
import { FQAs } from './fqas/fqas';

export const PublicRoutes: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
  {
    path: 'home',
    component: HomeComponent,
  },
  {
    path: 'login',
    component: LoginComponent,
  },
  {
    path: 'developer-page',
    component: DeveloperPage,
    canActivate: [DeveloperAccessGuard],
  },
  {
    path: 'about-us',
    component: AboutUsComponent,
  },
  {
    path: 'faqs',
    component: FQAs,
  },
  {
    path: 'contact',
    component: Contact,
  },
  {
    path: 'register',
    component: RegisterComponent,
  },
  {
    path: 'services',
    component: ServicesComponent,
  },
];
