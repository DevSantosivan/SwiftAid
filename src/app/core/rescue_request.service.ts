import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  getDocs,
  QuerySnapshot,
  query,
  where,
  doc,
  updateDoc,
} from '@angular/fire/firestore';
import { EmergencyRequest } from '../model/emergency';

@Injectable({
  providedIn: 'root',
})
export class EmergencyRequestService {
  private firestore: Firestore = inject(Firestore);
  private collectionName = 'EmergencyRequest';

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
  // Get all emergency requests
  async getRequest(): Promise<EmergencyRequest[]> {
    try {
      const emergencyrequestRef = collection(
        this.firestore,
        this.collectionName
      );
      const querySnapshot: QuerySnapshot = await getDocs(emergencyrequestRef);
      return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as EmergencyRequest[];
    } catch (error) {
      console.error('Error getting requests: ', error);
      throw error;
    }
  }

  // Get requests filtered by status
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

  // Update emergency request with staff info (merge with existing user info)
  // async updateRequestWithStaffInfo(
  //   requestId: string,
  //   staffInfo: {
  //     uid?: string;
  //     name?: string;
  //     email?: string;
  //     lat?: number;
  //     lng?: number;
  //   }
  // ): Promise<void> {
  //   try {
  //     const docRef = doc(this.firestore, this.collectionName, requestId);

  //     // Build update data object dynamically, only add keys with defined values
  //     const updateData: any = {
  //       status: 'Responding', // example status
  //       staffUpdatedAt: new Date(),
  //     };

  //     if (staffInfo.uid !== undefined) updateData.staffId = staffInfo.uid;
  //     if (staffInfo.name !== undefined) updateData.staffName = staffInfo.name;
  //     if (staffInfo.email !== undefined)
  //       updateData.staffEmail = staffInfo.email;
  //     if (staffInfo.lat !== undefined) updateData.staffLat = staffInfo.lat;
  //     if (staffInfo.lng !== undefined) updateData.staffLng = staffInfo.lng;

  //     await updateDoc(docRef, updateData);

  //     console.log(`Request ${requestId} successfully updated with staff info.`);
  //   } catch (error) {
  //     console.error('Error updating emergency request with staff info:', error);
  //     throw error;
  //   }
  // }
  async updateRequestWithStaffInfo(
    requestId: string,
    staffInfo: {
      uid?: string;
      first_name?: string;
      last_name?: string;
      email?: string;
      lat?: number;
      lng?: number;
    }
  ): Promise<void> {
    try {
      const docRef = doc(this.firestore, this.collectionName, requestId);

      // Build update data object dynamically, only add keys with defined values
      const updateData: any = {
        status: 'Responding', // example status
        staffUpdatedAt: new Date(),
      };

      if (staffInfo.uid !== undefined) updateData.staffId = staffInfo.uid;
      if (
        staffInfo.first_name !== undefined ||
        staffInfo.last_name !== undefined
      ) {
        updateData.staffFirstName = staffInfo.first_name || '';
        updateData.staffLastName = staffInfo.last_name || '';
        updateData.staffFullName = `${staffInfo.first_name || ''} ${
          staffInfo.last_name || ''
        }`.trim();
      }

      if (staffInfo.email !== undefined)
        updateData.staffEmail = staffInfo.email;
      if (staffInfo.lat !== undefined) updateData.staffLat = staffInfo.lat;
      if (staffInfo.lng !== undefined) updateData.staffLng = staffInfo.lng;

      await updateDoc(docRef, updateData);

      console.log(`Request ${requestId} successfully updated with staff info.`);
    } catch (error) {
      console.error('Error updating emergency request with staff info:', error);
      throw error;
    }
  }
}
