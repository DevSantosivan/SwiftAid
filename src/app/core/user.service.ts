// user.service.ts
import { Injectable } from '@angular/core';
import { collection, getDocs, getFirestore } from 'firebase/firestore'; // Firebase Firestore methods
import { User } from '../model/users';
import { environment } from '../model/environment';
import { initializeApp } from 'firebase/app';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private db; // Declare db as a private member

  constructor() {
    // Initialize Firebase and Firestore
    const firebaseApp = initializeApp(environment.firebaseConfig); // Initialize Firebase
    this.db = getFirestore(firebaseApp); // Get Firestore instance
  }
  async getUserCount(): Promise<number> {
    try {
      // Get reference to the 'users' collection
      const usersCollection = collection(this.db, 'users');
      
      // Fetch the documents
      const snapshot = await getDocs(usersCollection);
      
      // Return the count of documents in the collection
      return snapshot.size; // size property gives the count of documents
    } catch (error) {
      console.error('Error fetching user count:', error);
      throw error;
    }
  }
  // Fetch users from Firestore
  async getUsers(): Promise<User[]> {
    try {
      // Get reference to the 'users' collection
      const usersCollection = collection(this.db, 'users');
      const snapshot = await getDocs(usersCollection); // Fetch the documents
      const usersList: User[] = snapshot.docs.map(doc => doc.data() as User); // Map Firestore data to User model
      return usersList;
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  }
}
