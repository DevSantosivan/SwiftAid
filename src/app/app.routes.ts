import { Routes } from '@angular/router';
import { AdminGuard } from './guards/admin.guard';
import { PublicGuard } from './guards/public.guard';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    canActivate: [PublicGuard],
    loadChildren: () =>
      import('./public/public.routes').then((m) => m.PublicRoutes),
  },
  {
    path: 'admin',
    canActivate: [AdminGuard],

    loadChildren: () =>
      import('./admin/admin.routes').then((m) => m.AdminRoutes),
  },
  {
    path: 'superAdmin',
    canActivate: [AdminGuard],

    loadChildren: () =>
      import('./superadmin/superadmin.routes').then((m) => m.SuperAdminRoutes),
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)], // Root routes
  exports: [RouterModule],
})
export class AppRoutingModule {}
