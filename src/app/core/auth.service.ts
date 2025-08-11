import { Injectable, inject } from '@angular/core';
import { Auth, signInWithEmailAndPassword, User } from '@angular/fire/auth';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { getFirestore, Firestore, doc, getDoc } from 'firebase/firestore';
import { environment } from '../model/environment';
import { initializeApp } from 'firebase/app';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  auth = inject(Auth);
  private firestore: Firestore;

  public userDataSubject = new BehaviorSubject<User | null>(null);
  public userRole$ = new BehaviorSubject<string | null>(null);

  // Flags for UI state (error/progress)
  private failed = false;

  constructor(private router: Router) {
    const firebaseApp = initializeApp(environment.firebaseConfig);
    this.firestore = getFirestore(firebaseApp);

    // Listen to Firebase auth state changes once app starts
    this.auth.onAuthStateChanged(async (user) => {
      if (user) {
        this.userDataSubject.next(user);
        const role = await this.fetchUserRole(user.uid);
        this.userRole$.next(role);

        // Optional: auto-redirect on page reload if already logged in
        this.redirectUserByRole(role);
      } else {
        this.userDataSubject.next(null);
        this.userRole$.next(null);
      }
    });
  }

  getCurrentUser(): User | null {
    return this.auth.currentUser;
  }

  private async fetchUserRole(uid: string): Promise<string | null> {
    try {
      const userRef = doc(this.firestore, 'users', uid);
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        return userDoc.data()?.['role'] ?? null;
      }
      return null;
    } catch (error) {
      console.error('Error fetching user role:', error);
      return null;
    }
  }

  private redirectUserByRole(role: string | null) {
    if (role === 'admin') {
      this.router.navigate(['/admin']);
    } else if (role === 'superAdmin') {
      this.router.navigate(['/superAdmin']);
    } else if (role) {
      this.router.navigate(['/home']);
    }
  }

  async login(email: string, password: string): Promise<string> {
    try {
      const userCredential = await signInWithEmailAndPassword(
        this.auth,
        email,
        password
      );
      const user = userCredential.user;

      this.userDataSubject.next(user);

      const role = await this.fetchUserRole(user.uid);
      this.userRole$.next(role);

      this.redirectUserByRole(role);

      this.failed = false;
      return user.uid;
    } catch (error) {
      this.failed = true;
      throw error;
    }
  }

  async logout() {
    await this.auth.signOut();
    this.userDataSubject.next(null);
    this.userRole$.next(null);
    this.router.navigate(['/home']);
  }

  getErrorValidation(): boolean {
    return this.failed;
  }

  setErrorValidation(status: boolean): void {
    this.failed = status;
  }
}
