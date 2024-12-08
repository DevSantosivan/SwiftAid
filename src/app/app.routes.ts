
import { Routes } from '@angular/router';


export const routes: Routes = [
   {
      path: '',
      loadChildren: () =>
          import('./public/public.routes').then((m) => m.PublicRoutes)
    },
    {
      path: 'admin',
      loadChildren: () =>
          import('./admin/admin.routes').then((m) => m.AdminRoutes)
    },
    
];
