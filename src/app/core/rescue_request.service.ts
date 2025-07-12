import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  getDocs,
  getDoc,
  updateDoc,
  onSnapshot,
  doc,
  query,
  where,
  QuerySnapshot,
  DocumentSnapshot,
} from '@angular/fire/firestore';
import { EmergencyRequest } from '../model/emergency';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class EmergencyRequestService {
  private firestore: Firestore = inject(Firestore);
  private collectionName = 'EmergencyRequest';

  // 🔢 Get total request count
  async getRequestCount(): Promise<number> {
    try {
      const ref = collection(this.firestore, this.collectionName);
      const snap = await getDocs(ref);
      return snap.size;
    } catch (error) {
      console.error('Error getting request count: ', error);
      throw error;
    }
  }

  // 📄 Get a single request by ID
  async getRequestById(id: string): Promise<EmergencyRequest | null> {
    try {
      const ref = doc(this.firestore, this.collectionName, id);
      const snap: DocumentSnapshot = await getDoc(ref);

      if (snap.exists()) {
        return {
          id: snap.id,
          ...snap.data(),
        } as EmergencyRequest;
      } else {
        console.warn(`No request found with ID: ${id}`);
        return null;
      }
    } catch (error) {
      console.error(`Error fetching request with ID ${id}:`, error);
      return null;
    }
  }

  // 📄 Get all requests once
  async getRequest(): Promise<EmergencyRequest[]> {
    try {
      const ref = collection(this.firestore, this.collectionName);
      const snap = await getDocs(ref);
      return snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as EmergencyRequest[];
    } catch (error) {
      console.error('Error getting requests: ', error);
      throw error;
    }
  }

  // 🔁 Real-time subscription
  getRequestRealtime(): Observable<EmergencyRequest[]> {
    return new Observable((subscriber) => {
      const ref = collection(this.firestore, this.collectionName);
      const q = query(ref);

      const unsubscribe = onSnapshot(
        q,
        (snap) => {
          const list = snap.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as EmergencyRequest[];
          subscriber.next(list);
        },
        (error) => subscriber.error(error)
      );

      return { unsubscribe };
    });
  }

  // 📂 Get requests filtered by status
  async updateRequestWithStaffInfo(
    requestId: string,
    staffInfo: {
      uid?: string;
      first_name?: string;
      last_name?: string;
      email?: string;
      lat?: number;
      lng?: number;
    },
    accept: boolean = false // 👈 added flag to control status update
  ): Promise<void> {
    try {
      const docRef = doc(this.firestore, this.collectionName, requestId);
      const currentSnap = await getDoc(docRef);

      if (!currentSnap.exists()) return;

      const currentData = currentSnap.data() as EmergencyRequest;

      const updateData: any = {
        staffUpdatedAt: new Date(),
      };

      // ✅ Only update to 'Responding' if it's still 'Pending' and accept flag is true
      if (accept && currentData.status === 'Pending') {
        updateData.status = 'Responding';
      }

      // Set staff details
      if (staffInfo.uid) updateData.staffId = staffInfo.uid;

      if (staffInfo.first_name || staffInfo.last_name) {
        updateData.staffFirstName = staffInfo.first_name || '';
        updateData.staffLastName = staffInfo.last_name || '';
        updateData.staffFullName = `${staffInfo.first_name || ''} ${
          staffInfo.last_name || ''
        }`.trim();
      }

      if (staffInfo.email) updateData.staffEmail = staffInfo.email;
      if (staffInfo.lat !== undefined) updateData.staffLat = staffInfo.lat;
      if (staffInfo.lng !== undefined) updateData.staffLng = staffInfo.lng;

      await updateDoc(docRef, updateData);
      console.log(
        `Staff info updated for request ${requestId}${
          accept ? ' (accepted)' : ''
        }`
      );
    } catch (error) {
      console.error('Error updating emergency request with staff info:', error);
      throw error;
    }
  }

  // ✅ Mark a request as resolved
  async markRequestAsResolved(requestId: string): Promise<void> {
    const ref = doc(this.firestore, this.collectionName, requestId);
    await updateDoc(ref, {
      status: 'Resolved',
      resolvedAt: new Date(),
    });
    console.log(`Request ${requestId} marked as Resolved.`);
  }
}
