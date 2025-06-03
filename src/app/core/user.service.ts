// user.service.ts
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
import { uid } from 'chart.js/dist/helpers/helpers.core';

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
      return snapshot.docs.map((doc) => doc.data() as account);
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  }

  async getAdmins(): Promise<account[]> {
    try {
      const usersCollection = collection(this.db, 'users');
      const adminQuery = query(usersCollection, where('role', '==', 'admin'));
      const snapshot = await getDocs(adminQuery);
      return snapshot.docs.map((doc) => {
        const data = doc.data() as Omit<account, 'uid'>;
        return {
          ...data,
          uid: doc.id, // <-- assign doc.id to uid
          id: data.id || '', // optionally fill id if needed
        };
      });
    } catch (error) {
      console.error('Error fetching admin users:', error);
      throw error;
    }
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
  updateUser(uid: string, data: any): Promise<void> {
    const userDocRef = doc(this.db, 'users', uid);
    return updateDoc(userDocRef, data);
  }

  deleteUser(uid: string): Promise<void> {
    const userDocRef = doc(this.db, 'users', uid);
    return deleteDoc(userDocRef);
  }
}
