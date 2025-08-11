import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../core/auth.service';

@Injectable({
  providedIn: 'root',
})
export class PublicGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  async canActivate(): Promise<boolean> {
    const user = this.authService.getCurrentUser();

    if (user) {
      try {
        this.authService.userDataSubject.next(user);
        const token = await user.getIdTokenResult();
        const role = token.claims['role'] as string | null;

        this.authService.userRole$.next(role);

        if (role === 'admin') {
          await this.router.navigate(['/admin']);
          return false;
        } else if (role === 'superAdmin') {
          await this.router.navigate(['/superAdmin']);
          return false;
        }
        return true;
      } catch {
        this.router.navigate(['']);
        return false;
      }
    } else {
      // User not loaded synchronously, fallback to listener:
      return new Promise<boolean>((resolve) => {
        const unsubscribe = this.authService.auth.onAuthStateChanged(
          async (user) => {
            if (!user) {
              resolve(true);
            } else {
              try {
                this.authService.userDataSubject.next(user);
                const token = await user.getIdTokenResult();
                const role = token.claims['role'] as string | null;

                this.authService.userRole$.next(role);

                if (role === 'admin') {
                  await this.router.navigate(['/admin']);
                  resolve(false);
                } else if (role === 'superAdmin') {
                  await this.router.navigate(['/superAdmin']);
                  resolve(false);
                } else {
                  resolve(true);
                }
              } catch {
                this.router.navigate(['']);
                resolve(false);
              }
            }
            unsubscribe();
          }
        );
      });
    }
  }
}
