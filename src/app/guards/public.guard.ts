import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { Observable, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class PublicGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(next: any): Observable<boolean> {
    return new Observable<boolean>((observer) => {
      const unsubscribe = this.authService.auth.onAuthStateChanged(
        async (user) => {
          if (!user) {
            observer.next(true);
            observer.complete();
          } else {
            try {
              this.authService.userDataSubject.next(user);
              user.getIdTokenResult().then((value) => {
                const role = value.claims['role'];
                this.authService.userRole$.next(role);
              });
              observer.next(true);
            } catch (error) {
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
