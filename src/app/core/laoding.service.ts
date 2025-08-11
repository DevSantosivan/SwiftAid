import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root', // This makes the service available app-wide
})
export class LoadingService {
  // BehaviorSubject to hold loading state, initialized to false
  private loadingSubject = new BehaviorSubject<boolean>(false);

  // Observable that components can subscribe to for loading status
  loading$ = this.loadingSubject.asObservable();

  // Call this method to show loading spinner
  show(): void {
    this.loadingSubject.next(true);
  }

  // Call this method to hide loading spinner
  hide(): void {
    this.loadingSubject.next(false);
  }
}
