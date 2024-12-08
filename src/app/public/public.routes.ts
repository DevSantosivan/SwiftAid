import { Routes } from "@angular/router";
import { HomeComponent } from "./home/home.component";

import { NavbarComponent } from "./navbar/navbar.component";
import { LoginComponent } from "./login/login.component";


export const PublicRoutes: Routes = [
   {
      path:'',
      component: HomeComponent,
   },
    {
      path:'login',
      component: LoginComponent,
   }

   
     
   
];