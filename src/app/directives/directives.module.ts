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
      const role = (token.claims['role'] as string)?.toLowerCase() ?? '';

      if (role === 'superadmin') {
        this.router.navigate(['/superAdmin']);
        return false;
      } else if (role === 'staff') {
        this.router.navigate(['/staff-dashboard']);
        return false;
      } else if (role === 'admin') {
        this.router.navigate(['/admin']);
        return false;
      }
    }

    // Not logged in or no matching role, allow access
    return true;
  }
}
