import { Injectable, NgZone } from '@angular/core';
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  query,
  where,
  doc,
  setDoc,
  updateDoc,
  getDoc,
  deleteDoc,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { getDatabase, ref, onValue } from 'firebase/database';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { environment } from '../model/environment';
import { account } from '../model/users';
import { Observable } from 'rxjs';
import { collectionData } from '@angular/fire/firestore';
import { register } from '../model/registered';

export interface AccountWithStatus extends account {
  status: { online: boolean; last: number | null };
}

@Injectable({
  providedIn: 'root',
})
export class UserService {
  [x: string]: any;
  // 🔵 Primary Firebase app and auth (current logged-in user - admin)
  private primaryApp = initializeApp(environment.firebaseConfig);
  private db = getFirestore(this.primaryApp);
  private primaryAuth = getAuth(this.primaryApp);

  // 🔵 Secondary app to avoid auto-login when creating new users
  private secondaryApp = initializeApp(environment.firebaseConfig, 'Secondary');
  private secondaryAuth = getAuth(this.secondaryApp);

  constructor(private ngZone: NgZone) {}

  /**
   * ✅ Create user without affecting the current admin session
   */
  async createAccount(
    email: string,
    password: string,
    additionalData: Partial<register>
  ): Promise<void> {
    try {
      // 🔐 Use secondary auth instance to avoid logging in as new user
      const userCredential = await createUserWithEmailAndPassword(
        this.secondaryAuth,
        email,
        password
      );
      const user = userCredential.user;
      const userData: register = {
        fullName: additionalData.fullName ?? '',
        first_name: additionalData.first_name ?? '',
        last_name: additionalData.last_name ?? '',
        charge: additionalData.charge ?? '',
        office_id: additionalData.office_id ?? '',
        contactNumber: additionalData.contactNumber ?? '',
        email: user.email ?? '',
        password: '', // clear password
        role: additionalData.role ?? 'admin',
      };

      const userDocRef = doc(this.db, 'users', user.uid);
      await setDoc(userDocRef, { uid: user.uid, ...userData });

      // 🚫 Prevent session takeover
      await this.secondaryAuth.signOut();
    } catch (error) {
      console.error('Error creating account:', error);
      throw error;
    }
  }

  async saveAccessKey(key: string): Promise<void> {
    try {
      const accessKeysCollection = collection(this.db, 'accessKeys');
      await addDoc(accessKeysCollection, {
        key,
        used: false,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error saving access key:', error);
      throw error;
    }
  }

  async getUserCount(): Promise<number> {
    const usersCollection = collection(this.db, 'users');
    const snapshot = await getDocs(usersCollection);
    return snapshot.size;
  }

  async getUsers(): Promise<account[]> {
    const usersCollection = collection(this.db, 'users');
    const snapshot = await getDocs(usersCollection);
    return snapshot.docs.map((doc) => ({
      ...(doc.data() as account),
      id: doc.id,
    }));
  }
  async getUserProfile(userId: string): Promise<{ profilePicture?: string }> {
    try {
      const userDoc = await getDoc(doc(this.db, `users/${userId}`));
      if (userDoc.exists()) {
        const data = userDoc.data();
        return { profilePicture: data['profile'] || '' }; // Assuming profile is the field name
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
    return {};
  }

  getAllAccounts(): Observable<account[]> {
    const accountsRef = collection(this.db, 'users');
    return collectionData(accountsRef, { idField: 'id' }) as Observable<
      account[]
    >;
  }

  async getPendingResidentAccounts(): Promise<account[]> {
    const q = query(
      collection(this.db, 'users'),
      where('role', '==', 'resident'),
      where('account_status', '==', 'pending')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      ...(doc.data() as account),
      uid: doc.id,
    }));
  }

  async addUser(data: account): Promise<void> {
    const userDocRef = doc(this.db, 'users', data.uid);
    await setDoc(userDocRef, data);
  }

  async unblockUsers(uids: string[]): Promise<void> {
    await Promise.all(
      uids.map((uid) =>
        this.updateUser(uid, { blocked: false, blockReason: '' })
      )
    );
  }

  subscribeUserStatus(
    uid: string,
    cb: (online: boolean, last: number | null) => void
  ): void {
    const db_rt = getDatabase();
    const statusRef = ref(db_rt, `status/${uid}`);

    onValue(statusRef, (snapshot) => {
      if (!snapshot.exists()) {
        cb(false, null);
        return;
      }
      const data = snapshot.val();
      const online = data.state === 'online';
      const lastOnline = data.lastOnline ?? null;
      cb(online, lastOnline);
    });
  }

  async getAdmins(): Promise<AccountWithStatus[]> {
    const q = query(collection(this.db, 'users'), where('role', '==', 'admin'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      ...(doc.data() as account),
      uid: doc.id,
      status: { online: false, last: null },
    }));
  }

  async getCurrentUserRole(uid: string): Promise<string | null> {
    const docRef = doc(this.db, 'users', uid);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data()?.['role'] ?? null : null;
  }

  async getUserById(uid: string): Promise<account | null> {
    const userDoc = doc(this.db, 'users', uid);
    const snapshot = await getDoc(userDoc);
    return snapshot.exists()
      ? { ...(snapshot.data() as account), uid: snapshot.id }
      : null;
  }

  async updateUser(uid: string, data: Partial<account>): Promise<void> {
    const userDocRef = doc(this.db, 'users', uid);
    await updateDoc(userDocRef, data);
  }

  async updateUserStatus(uid: string, account_status: string): Promise<void> {
    const userDocRef = doc(this.db, 'users', uid);
    await this.ngZone.run(() =>
      updateDoc(userDocRef, {
        account_status,
        updatedAt: new Date(),
      })
    );
  }

  async deleteUser(uid: string): Promise<void> {
    const userDocRef = doc(this.db, 'users', uid);
    await deleteDoc(userDocRef);
  }

  async deleteUsers(uids: string[]): Promise<void> {
    await Promise.all(uids.map((uid) => this.deleteUser(uid)));
  }

  async blockUsers(uids: string[], reason: string): Promise<void> {
    await Promise.all(
      uids.map((uid) =>
        this.updateUser(uid, { blocked: true, blockReason: reason })
      )
    );
  }
}
