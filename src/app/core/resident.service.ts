import { Injectable } from '@angular/core';
import { Firestore, collection, getDocs, addDoc, doc, deleteDoc, QuerySnapshot } from '@angular/fire/firestore';
import { inject } from '@angular/core';
import { Resident } from '../model/resident';

@Injectable({
  providedIn: 'root',
})
export class ResidentService {
  private firestore: Firestore = inject(Firestore);  // Inject Firestore instance
  private collectionName = 'users';

  // Get all residents
  async getResidents(): Promise<Resident[]> {
    try {
      const residentsRef = collection(this.firestore, this.collectionName);  // Get the reference to the collection
      const querySnapshot: QuerySnapshot = await getDocs(residentsRef);  // Fetch the documents from Firestore
      return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Resident[];  // Map the document data to the Resident model
    } catch (error) {
      console.error('Error getting residents: ', error);
      throw error;
    }
  }
  
}
