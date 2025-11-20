import { Injectable, inject } from '@angular/core';
import {
  Auth,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  User,
} from '@angular/fire/auth';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import {
  getFirestore,
  Firestore,
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
} from 'firebase/firestore';
import { environment } from '../model/environment';
import { initializeApp } from 'firebase/app';

import {
  getDatabase,
  ref,
  set,
  serverTimestamp,
  remove,
} from 'firebase/database';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  auth = inject(Auth);
  private firestore: Firestore;
  private db_rt = getDatabase(initializeApp(environment.firebaseConfig));

  public userDataSubject = new BehaviorSubject<User | null>(null);
  public userRole$ = new BehaviorSubject<string | null>(null);

  private failed = false;

  constructor(private router: Router) {
    const firebaseApp = initializeApp(environment.firebaseConfig);
    this.firestore = getFirestore(firebaseApp);

    this.auth.onAuthStateChanged(async (user) => {
      if (user) {
        this.userDataSubject.next(user);
        const role = await this.fetchUserRole(user.uid);
        this.userRole$.next(role);

        this.redirectUserByRole(role);
      } else {
        this.userDataSubject.next(null);
        this.userRole$.next(null);
      }
    });
  }
  async resetPassword(email: string): Promise<string | null> {
    try {
      await sendPasswordResetEmail(this.auth, email);
      return null;
    } catch (e: any) {
      return e.message ?? 'Something went wrong.';
    }
  }
  async validateAccessKey(keyInput: string): Promise<boolean> {
    try {
      const accessKeyRef = collection(this.firestore, 'accessKeys');
      const q = query(
        accessKeyRef,
        where('key', '==', keyInput),
        where('used', '==', false)
      );
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        return false; // Key not found or already used
      }

      // Optional: Mark the key as used
      const docToUpdate = querySnapshot.docs[0];
      await updateDoc(doc(this.firestore, 'accessKeys', docToUpdate.id), {
        used: true,
      });

      return true;
    } catch (error) {
      console.error('Error validating access key:', error);
      return false;
    }
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
    const currentUser = this.getCurrentUser();
    if (currentUser) {
      await this.clearPresence(currentUser.uid);
    }

    await this.auth.signOut();
    this.userDataSubject.next(null);
    this.userRole$.next(null);
    this.router.navigate(['/home']);
  }
  private async clearPresence(uid: string): Promise<void> {
    const statusRef = ref(this.db_rt, `status/${uid}`);

    // Set the user state as offline, update lastOnline and last_changed
    await set(statusRef, {
      state: 'offline',
      lastOnline: Date.now(),
      last_changed: Date.now(),
    });
  }

  getErrorValidation(): boolean {
    return this.failed;
  }

  setErrorValidation(status: boolean): void {
    this.failed = status;
  }
}
