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
  onSnapshot,
  orderBy,
} from 'firebase/firestore';

import { getDatabase, ref, onValue } from 'firebase/database';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';

import { environment } from '../model/environment';
import { account } from '../model/users';
import { Observable } from 'rxjs';
import { collectionData } from '@angular/fire/firestore';
import { register } from '../model/registered';

// ✅ Firebase Storage (CORRECT IMPORT)
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from 'firebase/storage';

export interface AccountWithStatus extends account {
  status: { online: boolean; last: number | null };
}

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private primaryApp = initializeApp(environment.firebaseConfig);
  private db = getFirestore(this.primaryApp);
  private primaryAuth = getAuth(this.primaryApp);

  private secondaryApp = initializeApp(environment.firebaseConfig, 'Secondary');
  private secondaryAuth = getAuth(this.secondaryApp);

  // ✅ Initialize Firebase Storage
  private storage = getStorage(this.primaryApp);

  constructor(private ngZone: NgZone) {}

  /**
   * ✅ Create user without affecting admin login
   */
  async createAccount(
    email: string,
    password: string,
    additionalData: Partial<register>
  ): Promise<void> {
    try {
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
        password: '',
        role: additionalData.role ?? 'admin',
      };

      await setDoc(doc(this.db, 'users', user.uid), {
        uid: user.uid,
        ...userData,
      });

      await this.secondaryAuth.signOut();
    } catch (error) {
      console.error('Error creating account:', error);
      throw error;
    }
  }

  async saveAccessKey(key: string): Promise<void> {
    const accessKeysCollection = collection(this.db, 'accessKeys');
    await addDoc(accessKeysCollection, {
      key,
      used: false,
      createdAt: serverTimestamp(),
    });
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
        return { profilePicture: data['profile'] || '' };
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

  getPendingResidentAccountsCount(): Observable<number> {
    const q = query(
      collection(this.db, 'users'),
      where('role', '==', 'resident'),
      where('account_status', '==', 'pending')
    );

    return new Observable((observer) => {
      const unsubscribe = onSnapshot(q, (snapshot) => {
        observer.next(snapshot.size);
      });

      return () => unsubscribe();
    });
  }

  getPendingResidentAccountsRealtime(): Observable<account[]> {
    const q = query(
      collection(this.db, 'users'),
      where('role', '==', 'resident'),
      where('account_status', '==', 'pending')
    );

    return new Observable((observer) => {
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const result = snapshot.docs.map((doc) => ({
          ...(doc.data() as account),
          uid: doc.id,
        }));
        observer.next(result);
      });

      return () => unsubscribe();
    });
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
    await setDoc(doc(this.db, 'users', data.uid), data);
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
      cb(data.state === 'online', data.lastOnline ?? null);
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

  /**
   * ✅ FINAL FIXED FIREBASE STORAGE UPLOADER
   */
  async uploadProfileImage(uid: string, file: File): Promise<string> {
    const imgRef = storageRef(this.storage, `profile_images/${uid}.jpg`);
    await uploadBytes(imgRef, file);
    return await getDownloadURL(imgRef);
  }

  async getUserById(uid: string): Promise<account | null> {
    const userDoc = doc(this.db, 'users', uid);
    const snapshot = await getDoc(userDoc);
    return snapshot.exists()
      ? { ...(snapshot.data() as account), id: snapshot.id }
      : null;
  }

  async updateUser(uid: string, data: Partial<account>): Promise<void> {
    await updateDoc(doc(this.db, 'users', uid), data);
  }

  async updateUserStatus(uid: string, account_status: string): Promise<void> {
    await this.ngZone.run(() =>
      updateDoc(doc(this.db, 'users', uid), {
        account_status,
        updatedAt: new Date(),
      })
    );
  }

  async deleteUser(uid: string): Promise<void> {
    await deleteDoc(doc(this.db, 'users', uid));
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
