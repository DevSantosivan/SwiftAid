import { Injectable, inject } from '@angular/core';
import {
  Auth,
  getAuth,
  signInWithEmailAndPassword,
  User,
  signInWithPopup,
  GoogleAuthProvider,
} from '@angular/fire/auth';
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
  public userDataSubject = new BehaviorSubject<User>(<User>{});
  public userRole$ = new BehaviorSubject<string | unknown>(null);
  public users$ = this.userDataSubject.asObservable();
  private failed = false;
  private progress = false;
  user: any;
  private firestore: Firestore;

  constructor(private router: Router) {
    const firebaseApp = initializeApp(environment.firebaseConfig);
    this.firestore = getFirestore(firebaseApp);

    // ✅ Auto-redirect if user is already logged in
    this.auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          this.userDataSubject.next(user);
          const userRef = doc(this.firestore, 'users', user.uid);
          const userDoc = await getDoc(userRef);

          if (userDoc.exists()) {
            const userData = userDoc.data();
            const role = userData?.['role'];

            this.userRole$.next(role); // Optional: if you use this elsewhere

            // Redirect based on role
            if (role === 'admin') {
              this.router.navigate(['/admin']);
            } else if (role === 'superAdmin') {
              this.router.navigate(['/superAdmin']);
            } else {
              this.router.navigate(['/home']);
            }
          }
        } catch (error) {
          console.error('Error fetching user data on init:', error);
        }
      }
    });

    this.getBearerToken();
  }

  getBearerToken(): Promise<string> | null {
    return this.auth.currentUser?.getIdToken() ?? null;
  }

  async logout() {
    this.auth.signOut();
    this.router.navigate(['/home']);
  }
  async login(email: string, password: string): Promise<string> {
    try {
      const userCredential = await signInWithEmailAndPassword(
        this.auth,
        email,
        password
      );
      const user = userCredential.user;

      const userRef = doc(this.firestore, 'users', user.uid);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        const role = userData?.['role'];

        // Redirect base sa role
        if (role === 'admin') {
          this.router.navigate(['/admin']);
        } else if (role === 'superAdmin') {
          this.router.navigate(['/superAdmin']);
        } else {
          this.router.navigate(['/home']);
        }

        // Return UID para magamit sa caller
        return user.uid;
      } else {
        throw new Error('User data not found in Firestore.');
      }
    } catch (error) {
      console.error('Login failed:', error);
      throw new Error('Invalid email or password. Please try again.');
    }
  }

  getErrorValidation(): boolean {
    return this.failed;
  }

  setErrorValidation(status: boolean): void {
    this.failed = status;
  }

  loginWithGoogle() {
    const provider = new GoogleAuthProvider();

    signInWithPopup(this.auth, provider)
      .then(async (result) => {
        const user = result.user;
        const userRef = doc(this.firestore, 'users', user.uid);
        const userDoc = await getDoc(userRef);

        if (userDoc.exists()) {
          const userData = userDoc.data();
          const role = userData?.['role'];

          if (role === 'admin') {
            this.router.navigate(['/admin']);
          } else if (role === 'superAdmin') {
            this.router.navigate(['/superAdmin']);
          } else {
            this.router.navigate(['/home']);
          }
        } else {
          console.error('No user data found after Google login.');
        }
      })
      .catch((error) => {
        console.error('Error during Google sign in:', error);
      });
  }
}
