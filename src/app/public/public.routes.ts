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
import { AboutDeveloper } from './about-developer/about-developer';
import { ForgotPassword } from './forgot-password/forgot-password';
import { ForgotPasswordCode } from './forgot-password-code/forgot-password-code';
import { NewPassword } from './new-password/new-password';

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
    path: 'about-developer',
    component: AboutDeveloper,
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

  // ⭐ Added Forgot Password Pages
  {
    path: 'forgot-password',
    component: ForgotPassword,
  },
  {
    path: 'forgot-password/code',
    component: ForgotPasswordCode,
  },
  {
    path: 'forgot-password/new',
    component: NewPassword,
  },
];
