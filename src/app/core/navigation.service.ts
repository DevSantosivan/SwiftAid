// src/app/core/navigation.service.ts
import { Injectable } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class NavigationService {
  private history: string[] = [];

  constructor(private router: Router) {
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.history.push(event.urlAfterRedirects);
        // keep only last 10 urls max to avoid memory bloat
        if (this.history.length > 10) {
          this.history.shift();
        }
      });
  }

  getPreviousUrl(): string {
    // traverse history backwards to find one of the desired pages
    for (let i = this.history.length - 2; i >= 0; i--) {
      const url = this.history[i];
      if (
        url.includes('/admin/Notification') ||
        url.includes('/admin/EmergencyRequest')
      ) {
        return url;
      }
    }
    return '/admin/EmergencyRequest'; // fallback if none found
  }
}
