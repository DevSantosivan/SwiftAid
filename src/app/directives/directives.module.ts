import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { getAuth } from 'firebase/auth';

@Injectable({ providedIn: 'root' })
export class RedirectGuard implements CanActivate {
  constructor(private router: Router) {}

  async canActivate(): Promise<boolean> {
    const auth = getAuth();
    const user = auth.currentUser;

    if (user) {
      const token = await user.getIdTokenResult();
      const role = token.claims['role'];

      if (role === 'superadmin') {
        this.router.navigate(['/admin']);
        return false;
      } else if (role === 'staff') {
        this.router.navigate(['/staff-dashboard']);
        return false;
      }
    }

    return true; // allow access to the default route if not logged in
  }
}
