import { HomeComponent } from './home/home.component';
import { NgModule } from '@angular/core';
import { NavbarComponent } from './navbar/navbar.component';
import { LoginComponent } from './login/login.component';
import { AboutUsComponent } from './about-us/about-us.component';
import { RouterModule, Routes } from '@angular/router';
import { RegisterComponent } from './register/register.component';
import { ServicesComponent } from './services/services.component';
import { DeveloperPage } from './developer-page/developer-page';

export const PublicRoutes: Routes = [
  {
    path: '',
    component: HomeComponent,
  },
  {
    path: 'login',
    component: LoginComponent,
  },
  {
    path: 'developer-page',
    component: DeveloperPage,
  },
  {
    path: 'home',
    component: HomeComponent,
  },
  {
    path: 'AboutUs',
    component: AboutUsComponent,
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
