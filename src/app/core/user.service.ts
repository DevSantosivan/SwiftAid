import { Injectable } from '@angular/core';
import {
  collection,
  getDocs,
  getFirestore,
  query,
  where,
  deleteDoc,
  doc,
  updateDoc,
  getDoc,
  setDoc,
} from 'firebase/firestore';
import { account } from '../model/users';
import { environment } from '../model/environment';
import { initializeApp } from 'firebase/app';
import {
  getDatabase,
  ref,
  onValue,
  set,
  onDisconnect,
  serverTimestamp,
} from 'firebase/database';
import { Observable } from 'rxjs';
import { collectionData } from '@angular/fire/firestore';

export interface AccountWithStatus extends account {
  status: { online: boolean; last: number | null };
}

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private db;

  constructor() {
    const firebaseApp = initializeApp(environment.firebaseConfig);
    this.db = getFirestore(firebaseApp);
  }

  async getUserCount(): Promise<number> {
    try {
      const usersCollection = collection(this.db, 'users');
      const snapshot = await getDocs(usersCollection);
      return snapshot.size;
    } catch (error) {
      console.error('Error fetching user count:', error);
      throw error;
    }
  }

  async getUsers(): Promise<account[]> {
    try {
      const usersCollection = collection(this.db, 'users');
      const snapshot = await getDocs(usersCollection);
      return snapshot.docs.map(
        (doc) => ({ ...doc.data(), id: doc.id } as account)
      );
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  }

  getAllAccounts(): Observable<account[]> {
    const accountsRef = collection(this.db, 'users');
    return collectionData(accountsRef, { idField: 'id' }) as Observable<
      account[]
    >;
  }

  async addUser(data: account): Promise<void> {
    try {
      const newDocRef = doc(this.db, 'users', data.uid);
      await setDoc(newDocRef, data);
    } catch (error) {
      console.error('Error adding user:', error);
      throw error;
    }
  }

  async unblockUsers(uids: string[]): Promise<void> {
    try {
      await Promise.all(
        uids.map((uid) =>
          this.updateUser(uid, { blocked: false, blockReason: '' })
        )
      );
    } catch (error) {
      console.error('Error unblocking users:', error);
      throw error;
    }
  }

  subscribeUserStatus(
    uid: string,
    cb: (online: boolean, last: number | null) => void
  ) {
    const db_rt = getDatabase();
    const statusRef = ref(db_rt, `status/${uid}`);

    onValue(statusRef, (snap) => {
      if (!snap.exists()) {
        cb(false, null);
        return;
      }
      const data = snap.val();
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
    if (docSnap.exists()) {
      const data = docSnap.data();
      return data['role'] || null;
    }
    return null;
  }

  async getUserById(uid: string): Promise<account | null> {
    try {
      const userRef = doc(this.db, 'users', uid);
      const snapshot = await getDoc(userRef);
      if (snapshot.exists()) {
        return {
          ...(snapshot.data() as account),
          uid: snapshot.id,
        };
      }
      return null;
    } catch (error) {
      console.error('Error fetching user by ID:', error);
      throw error;
    }
  }

  updateUser(uid: string, data: Partial<account>): Promise<void> {
    const userDocRef = doc(this.db, 'users', uid);
    return updateDoc(userDocRef, data);
  }

  deleteUser(uid: string): Promise<void> {
    const userDocRef = doc(this.db, 'users', uid);
    return deleteDoc(userDocRef);
  }

  async deleteUsers(uids: string[]): Promise<void> {
    try {
      await Promise.all(uids.map((uid) => this.deleteUser(uid)));
    } catch (error) {
      console.error('Error deleting multiple users:', error);
      throw error;
    }
  }

  async blockUsers(uids: string[], reason: string): Promise<void> {
    try {
      await Promise.all(
        uids.map((uid) =>
          this.updateUser(uid, { blocked: true, blockReason: reason })
        )
      );
    } catch (error) {
      console.error('Error blocking users:', error);
      throw error;
    }
  }
}
