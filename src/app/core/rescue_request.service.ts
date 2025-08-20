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
  arrayUnion,
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
  auth: any; // You may want to properly inject your auth service here

  // === EMERGENCY REQUEST METHODS ===
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
    const currentUser = this.auth?.currentUser;
    if (!currentUser) {
      throw new Error('User not logged in');
    }

    const uid = currentUser.uid;
    const ref = collection(this.firestore, this.collectionName);
    const q = query(ref, where('staffId', '==', uid)); // Use staffId to get accepted by current user

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

  // === NOTIFICATIONS ===

  // Get all notifications with emergency request details, including if read by user
  async getNotificationsWithRequestDetailsForUser(
    userId: string
  ): Promise<any[]> {
    const notifRef = collection(this.firestore, 'Notifications');
    const notifSnap = await getDocs(notifRef);

    const notifications = await Promise.all(
      notifSnap.docs.map(async (notifDoc) => {
        const notifData = notifDoc.data();
        const requestId = notifData['requestId'];

        let requestData = null;
        try {
          const requestDocRef = doc(
            this.firestore,
            'EmergencyRequest',
            requestId
          );
          const requestSnap = await getDoc(requestDocRef);
          if (requestSnap.exists()) {
            requestData = {
              id: requestSnap.id, // ✅ Include the request ID here
              ...requestSnap.data(),
            };
          }
        } catch (error) {
          console.warn(
            `Error fetching EmergencyRequest for requestId: ${requestId}`,
            error
          );
        }

        return {
          id: notifDoc.id, // notification ID
          ...notifData,
          request: requestData, // now includes request.id
          isReadByCurrentUser: notifData['readBy']?.includes(userId) ?? false,
        };
      })
    );

    return notifications;
  }

  // Mark all notifications as read by the given user (adds userId to readBy array)
  async markAllNotificationsAsReadForUser(userId: string): Promise<void> {
    try {
      const notifRef = collection(this.firestore, `Notifications`);
      const snap = await getDocs(notifRef);

      const updatePromises = snap.docs.map((docSnap) =>
        updateDoc(docSnap.ref, {
          readBy: arrayUnion(userId),
        })
      );

      await Promise.all(updatePromises);
      console.log(`All notifications marked as read for user ${userId}.`);
    } catch (error) {
      console.error('Error marking notifications as read:', error);
      throw error;
    }
  }

  // Mark a single notification as read by user
  async markNotificationAsRead(
    notificationId: string,
    userId: string
  ): Promise<void> {
    try {
      const notifDocRef = doc(this.firestore, 'Notifications', notificationId);
      await updateDoc(notifDocRef, {
        readBy: arrayUnion(userId),
      });
      console.log(
        `Notification ${notificationId} marked as read by user ${userId}.`
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  // Get count of unread notifications for a specific user
  async getUnreadNotificationCountForUser(userId: string): Promise<number> {
    const notifRef = collection(this.firestore, 'Notifications');
    const snap = await getDocs(notifRef);
    const unread = snap.docs.filter((docSnap) => {
      const data = docSnap.data();
      return !data['readBy']?.includes(userId);
    });

    return unread.length;
  }
}
