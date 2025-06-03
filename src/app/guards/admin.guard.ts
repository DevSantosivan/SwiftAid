import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { Observable, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class AdminGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(next: any): Observable<boolean> {
    const expectedRole = next.data.expectedRole;
    return new Observable<boolean>((observer) => {
      const unsubscribe = this.authService.auth.onAuthStateChanged(
        async (user) => {
          if (!user) {
            this.router.navigate(['']);
            observer.next(false);
            observer.complete();
          } else {
            try {
              const token = await user.getIdTokenResult();
              const claims = token.claims;
              this.authService.userDataSubject.next(user);
              if (claims['role'] === expectedRole) {
                const role = claims['role'];
                this.authService.userRole$.next(role);
                observer.next(true);
              } else {
                this.router.navigate(['']);
                observer.next(false);
              }
            } catch (error) {
              console.error('Error fetching user claims:', error);
              this.router.navigate(['']);
              observer.next(false);
            } finally {
              observer.complete();
            }
          }
        }
      );

      return { unsubscribe };
    }).pipe(
      catchError(() => {
        this.router.navigate(['']);
        return of(false);
      })
    );
  }
}
