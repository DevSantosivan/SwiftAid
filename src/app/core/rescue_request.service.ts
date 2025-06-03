import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  getDocs,
  QuerySnapshot,
  query,
  where,
} from '@angular/fire/firestore';
import { inject } from '@angular/core';
import { EmergencyRequest } from '../model/emergency';

@Injectable({
  providedIn: 'root',
})
export class EmergencyRequestService {
  private firestore: Firestore = inject(Firestore); // Inject Firestore instance
  private collectionName = 'EmergencyRequest'; // Firestore collection name

  // Method to get the count of emergency requests
  async getRequestCount(): Promise<number> {
    try {
      const emergencyrequestRef = collection(
        this.firestore,
        this.collectionName
      ); // Get the reference to the collection
      const querySnapshot: QuerySnapshot = await getDocs(emergencyrequestRef); // Fetch the documents from Firestore
      return querySnapshot.size; // Return the count of documents
    } catch (error) {
      console.error('Error getting request count: ', error);
      throw error; // Rethrow the error if it occurs
    }
  }

  // Other methods (like getRequest) can stay as they are...
  async getRequest(): Promise<EmergencyRequest[]> {
    try {
      const emergencyrequestRef = collection(
        this.firestore,
        this.collectionName
      ); // Get the reference to the collection
      const querySnapshot: QuerySnapshot = await getDocs(emergencyrequestRef); // Fetch the documents from Firestore
      return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as EmergencyRequest[]; // Map the document data to the EmergencyRequest model
    } catch (error) {
      console.error('Error getting requests: ', error);
      throw error;
    }
  }

  async getRequestsByStatus(status: string): Promise<EmergencyRequest[]> {
    try {
      const emergencyrequestRef = collection(
        this.firestore,
        this.collectionName
      );

      const statusQuery = query(
        emergencyrequestRef,
        where('status', '==', status)
      );

      const querySnapshot: QuerySnapshot = await getDocs(statusQuery);

      return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as EmergencyRequest[];
    } catch (error) {
      console.error(`Error getting ${status} requests: `, error);
      throw error;
    }
  }
}
