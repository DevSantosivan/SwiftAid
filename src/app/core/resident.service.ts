import { Injectable } from '@angular/core';
import { Firestore, collection, getDocs, addDoc, doc, deleteDoc, QuerySnapshot } from '@angular/fire/firestore';
import { inject } from '@angular/core';
import { Resident } from '../model/resident';

@Injectable({
  providedIn: 'root',
})
export class ResidentService {
  private firestore: Firestore = inject(Firestore);  // Inject Firestore instance
  private collectionName = 'residents';

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
  

  // Add a new resident and return the resident's id
  async addResident(resident: Resident): Promise<{ id: string }> {
    try {
      const residentsRef = collection(this.firestore, this.collectionName);  // Get the collection reference
      const docRef = await addDoc(residentsRef, resident);  // Add the new document to the collection
      console.log('Resident added with ID: ', docRef.id);
      return { id: docRef.id };  // Return the id of the newly added resident
    } catch (error) {
      console.error('Error adding resident: ', error);
      throw error;
    }
  }

  // Delete a resident by ID
  async deleteResident(id: string): Promise<void> {
    try {
      const residentRef = doc(this.firestore, this.collectionName, id);  // Get the document reference
      await deleteDoc(residentRef);  // Delete the document
      console.log('Resident deleted with ID: ', id);
    } catch (error) {
      console.error('Error deleting resident: ', error);
      throw error;
    }
  }
}
