import { Injectable, inject, NgZone } from '@angular/core';
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
  DocumentSnapshot,
} from '@angular/fire/firestore';
import { EmergencyRequest } from '../model/emergency';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class EmergencyRequestService {
  private firestore: Firestore = inject(Firestore);
  private ngZone: NgZone = inject(NgZone);
  private collectionName = 'EmergencyRequest';
  auth: any;

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

  getRequestRealtime(): Observable<EmergencyRequest[]> {
    return new Observable((subscriber) => {
      const ref = collection(this.firestore, this.collectionName);
      const q = query(ref);

      const unsubscribe = onSnapshot(
        q,
        (snap) => {
          this.ngZone.run(() => {
            const list = snap.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            })) as EmergencyRequest[];
            subscriber.next(list);
          });
        },
        (error) => {
          this.ngZone.run(() => {
            subscriber.error(error);
          });
        }
      );

      return { unsubscribe };
    });
  }

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
    accept: boolean = false
  ): Promise<void> {
    try {
      const docRef = doc(this.firestore, this.collectionName, requestId);
      const currentSnap = await getDoc(docRef);

      if (!currentSnap.exists()) return;

      const currentData = currentSnap.data() as EmergencyRequest;

      const updateData: any = {
        staffUpdatedAt: new Date(),
      };

      if (accept && currentData.status === 'Pending') {
        updateData.status = 'Responding';
      }

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

      await this.ngZone.run(() => updateDoc(docRef, updateData));
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

  async markRequestAsResolved(requestId: string): Promise<void> {
    const ref = doc(this.firestore, this.collectionName, requestId);
    await this.ngZone.run(() =>
      updateDoc(ref, {
        status: 'Resolved',
        resolvedAt: new Date(),
      })
    );
    console.log(`Request ${requestId} marked as Resolved.`);
  }

  async getMyEmergencyRequestsById(): Promise<EmergencyRequest[]> {
    const currentUser = this.auth.currentUser;
    if (!currentUser) {
      throw new Error('User not logged in');
    }

    const uid = currentUser.uid;
    const ref = collection(this.firestore, this.collectionName);
    const q = query(ref, where('userId', '==', uid)); // or 'staffId' if that's what you need

    const snap = await getDocs(q);
    return snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as EmergencyRequest[];
  }

  async fetchAccidentCategoryCounts(): Promise<{ [event: string]: number }> {
    const ref = collection(this.firestore, 'EmergencyRequest');
    const snap = await getDocs(ref);

    const eventCount: { [event: string]: number } = {};

    snap.forEach((docSnap) => {
      const data = docSnap.data();
      const event = data['event'];

      if (event) {
        if (eventCount[event]) {
          eventCount[event]++;
        } else {
          eventCount[event] = 1;
        }
      }
    });

    return eventCount;
  }
}
