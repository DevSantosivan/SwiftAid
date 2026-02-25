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
  deleteDoc,
  orderBy,
} from '@angular/fire/firestore';
import { EmergencyRequest } from '../model/emergency';
import { Notification } from '../model/notification'; // <-- Import notification interface
import { Observable } from 'rxjs';
import { getAuth } from 'firebase/auth';

@Injectable({
  providedIn: 'root',
})
export class EmergencyRequestService {
  private firestore: Firestore = inject(Firestore);
  private ngZone: NgZone = inject(NgZone);
  private collectionName = 'EmergencyRequest';
  auth: any; // You may want to properly inject your auth service here

  async updateLocationByStaffId(
    staffId: string,
    lat: number,
    lng: number,
  ): Promise<void> {
    try {
      const ref = collection(this.firestore, this.collectionName);

      const q = query(
        ref,
        where('staffId', '==', staffId),
        where('status', '==', 'Responding'),
      );

      const snap = await getDocs(q);

      if (snap.empty) {
        return;
      }

      const docRef = snap.docs[0].ref;

      await updateDoc(docRef, {
        staffLat: lat,
        staffLng: lng,
        staffUpdatedAt: new Date(),
      });
    } catch (error) {
      throw error;
    }
  }

  getRespondingRequestsLive(): Observable<EmergencyRequest[]> {
    return new Observable((subscriber) => {
      const ref = collection(this.firestore, this.collectionName);
      const q = query(
        ref,
        where('status', '==', 'Responding'),
        orderBy('staffUpdatedAt', 'desc'),
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          this.ngZone.run(() => {
            const requests = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            })) as EmergencyRequest[];
            subscriber.next(requests);
          });
        },
        (error) => {
          this.ngZone.run(() => subscriber.error(error));
        },
      );

      return { unsubscribe };
    });
  }

  subscribeToLocationUpdatesByStaffId(
    staffId: string,
  ): Observable<EmergencyRequest[]> {
    return new Observable((subscriber) => {
      const ref = collection(this.firestore, this.collectionName);
      const q = query(
        ref,
        where('staffId', '==', staffId),
        where('status', '==', 'Responding'),
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          this.ngZone.run(() => {
            const requests = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            })) as EmergencyRequest[];
            subscriber.next(requests);
          });
        },
        (error) => {
          this.ngZone.run(() => subscriber.error(error));
        },
      );

      return { unsubscribe };
    });
  }

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

  async getResolvedRequestsForCurrentUser(): Promise<EmergencyRequest[]> {
    const auth = getAuth();
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('User not logged in');

    const ref = collection(this.firestore, this.collectionName);

    const q = query(
      ref,
      where('status', 'in', ['Resolved']),
      where('staffId', '==', currentUser.uid),
    );

    const snap = await getDocs(q);

    return snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as EmergencyRequest[];
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
      throw error;
    }
  }

  async getRequestResolved(): Promise<EmergencyRequest[]> {
    try {
      const ref = collection(this.firestore, this.collectionName);
      const q = query(ref, where('status', '==', 'Resolved'));

      const snap = await getDocs(q);

      // Map Firestore doc to EmergencyRequest including document ID
      const requests = snap.docs.map((doc) => ({
        id: doc.id, // ✅ Firestore document ID
        ...doc.data(),
      })) as EmergencyRequest[];

      // Sort by staffUpdatedAt descending (latest first)
      requests.sort((a, b) => {
        const dateA = a.staffUpdatedAt?.toDate
          ? a.staffUpdatedAt.toDate()
          : new Date(a.staffUpdatedAt);
        const dateB = b.staffUpdatedAt?.toDate
          ? b.staffUpdatedAt.toDate()
          : new Date(b.staffUpdatedAt);
        return dateB.getTime() - dateA.getTime();
      });

      return requests;
    } catch (error) {
      console.error('Error fetching resolved requests:', error);
      throw error;
    }
  }
  async getResolvedRequestsByStaffId(
    staffId: string,
  ): Promise<EmergencyRequest[]> {
    try {
      const ref = collection(this.firestore, this.collectionName);
      const q = query(
        ref,
        where('status', '==', 'Resolved'),
        where('staffId', '==', staffId),
      );
      const snap = await getDocs(q);

      const resolvedRequests: EmergencyRequest[] = [];
      snap.forEach((doc) => {
        const data = doc.data() as EmergencyRequest;
        resolvedRequests.push(data);
      });

      return resolvedRequests;
    } catch (error) {
      throw error;
    }
  }

  getRequestRealtime(): Observable<EmergencyRequest[]> {
    return new Observable((subscriber) => {
      const ref = collection(this.firestore, this.collectionName);

      // ✅ Order by timestamp (latest first)
      const q = query(ref, orderBy('timestamp', 'asc'));

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
          this.ngZone.run(() => subscriber.error(error));
        },
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
    accept: boolean = false,
  ): Promise<void> {
    try {
      const docRef = doc(this.firestore, this.collectionName, requestId);
      const currentSnap = await getDoc(docRef);

      if (!currentSnap.exists()) {
        console.warn(`Request ${requestId} does not exist.`);
        return;
      }

      const currentData = currentSnap.data() as EmergencyRequest;

      const updateData: any = {
        staffUpdatedAt: new Date(),
      };

      // Only update status if accepting and still pending
      if (accept && currentData.status === 'Pending') {
        updateData.status = 'Responding';
      }

      // Update staff ID
      if (staffInfo.uid) {
        updateData.staffId = staffInfo.uid;
      }

      // Update staff name and full name
      if (staffInfo.first_name || staffInfo.last_name) {
        updateData.staffFirstName = staffInfo.first_name || '';
        updateData.staffLastName = staffInfo.last_name || '';
        updateData.staffFullName = `${staffInfo.first_name || ''} ${
          staffInfo.last_name || ''
        }`.trim();
      }

      // Update email
      if (staffInfo.email) {
        updateData.staffEmail = staffInfo.email;
      }

      // Update location
      if (typeof staffInfo.lat === 'number') {
        updateData.staffLat = staffInfo.lat;
      }

      if (typeof staffInfo.lng === 'number') {
        updateData.staffLng = staffInfo.lng;
      }

      // Perform update
      await updateDoc(docRef, updateData);

      console.log(
        `✅ Emergency request ${requestId} updated successfully ${
          accept ? '(accepted)' : '(location updated)'
        }`,
      );
    } catch (error) {
      console.error('❌ Failed to update emergency request:', error);
      throw error;
    }
  }

  async markRequestAsResolved(requestId: string): Promise<void> {
    try {
      const requestRef = doc(this.firestore, this.collectionName, requestId);

      // Update the EmergencyRequest status
      await this.ngZone.run(() =>
        updateDoc(requestRef, {
          status: 'Resolved',
          resolvedAt: new Date(),
        }),
      );
      console.log(`Request ${requestId} marked as Resolved.`);

      // Now update all related notifications
      const notifRef = collection(this.firestore, 'Notifications');
      const q = query(notifRef, where('requestId', '==', requestId));
      const notifSnap = await getDocs(q);

      const updatePromises = notifSnap.docs.map((notifDoc) =>
        updateDoc(notifDoc.ref, {
          status: 'Resolved',
          resolvedAt: new Date(),
        }),
      );

      await Promise.all(updatePromises);
      console.log(
        `Notifications related to request ${requestId} marked as Resolved.`,
      );
    } catch (error) {
      console.error(
        'Error marking request and notifications as Resolved:',
        error,
      );
      throw error;
    }
  }
  async getRequestsByStaffId(staffId: string): Promise<EmergencyRequest[]> {
    const accidentRef = collection(this.firestore, 'EmergencyRequest');
    const q = query(accidentRef, where('staffId', '==', staffId));
    const querySnapshot = await getDocs(q);

    const requests: EmergencyRequest[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data() as EmergencyRequest;
      requests.push(data);
    });

    return requests;
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
  async getNotificationsWithRequestDetailsForUser(userId: string): Promise<
    (Notification & {
      request: EmergencyRequest | null;
      isReadByCurrentUser: boolean;
    })[]
  > {
    const notifRef = collection(this.firestore, 'Notifications');
    const notifSnap = await getDocs(notifRef);

    const notifications = await Promise.all(
      notifSnap.docs.map(async (notifDoc) => {
        const notifData = notifDoc.data() as Notification;
        const requestId = notifData.requestId;

        let requestData: EmergencyRequest | null = null;
        try {
          const requestDocRef = doc(
            this.firestore,
            'EmergencyRequest',
            requestId,
          );
          const requestSnap = await getDoc(requestDocRef);
          if (requestSnap.exists()) {
            requestData = {
              id: requestSnap.id,
              ...requestSnap.data(),
            } as EmergencyRequest;
          }
        } catch (error) {
          console.warn(
            `Error fetching EmergencyRequest for requestId: ${requestId}`,
            error,
          );
        }

        return {
          ...notifData, // Spread all Notification properties (including requestId, event, userId, etc)
          id: notifDoc.id,
          request: requestData,
          isReadByCurrentUser: notifData.readBy?.includes(userId) ?? false,
        };
      }),
    );

    // Filter out notifications where deletedBy array contains this userId
    const filteredNotifications = notifications.filter((notif) => {
      const deletedBy = (notif as any).deletedBy as string[] | undefined;
      return !(deletedBy && deletedBy.includes(userId));
    });

    return filteredNotifications;
  }

  // Delete a notification ONLY for the current user
  async deleteNotificationForUser(
    userId: string,
    notificationId: string,
  ): Promise<void> {
    try {
      const notifDocRef = doc(this.firestore, 'Notifications', notificationId);
      const docSnap = await getDoc(notifDocRef);

      if (!docSnap.exists()) {
        console.warn('Notification does not exist:', notificationId);
        return;
      }

      const data = docSnap.data() as Notification;

      const allowedToDelete =
        data?.userId === userId ||
        (data?.['recipients'] && data['recipients'].includes(userId)) ||
        true; // or just allow deletion for any user by default

      if (!allowedToDelete) {
        console.warn('User not authorized to delete this notification.');
        return;
      }

      // Mark as deleted for the specific user
      await updateDoc(notifDocRef, {
        deletedBy: arrayUnion(userId),
      });

      console.log(
        `Notification ${notificationId} marked deleted for user ${userId}.`,
      );
    } catch (error) {
      console.error('Failed to delete notification:', error);
      throw error;
    }
  }

  async deleteEmergencyRequest(requestId: string): Promise<void> {
    try {
      const docRef = doc(this.firestore, this.collectionName, requestId);
      await deleteDoc(docRef);
      console.log(`Emergency request ${requestId} deleted successfully.`);
    } catch (error) {
      console.error(`Failed to delete emergency request ${requestId}:`, error);
      throw error;
    }
  }

  // Mark all notifications as read by the given user (adds userId to readBy array)
  async markAllNotificationsAsReadForUser(userId: string): Promise<void> {
    try {
      const notifRef = collection(this.firestore, `Notifications`);
      const snap = await getDocs(notifRef);

      const updatePromises = snap.docs.map((docSnap) =>
        updateDoc(docSnap.ref, {
          readBy: arrayUnion(userId),
        }),
      );

      await Promise.all(updatePromises);
    } catch (error) {
      throw error;
    }
  }

  // Mark a single notification as read by user
  async markNotificationAsRead(
    notificationId: string,
    userId: string,
  ): Promise<void> {
    try {
      const notifDocRef = doc(this.firestore, 'Notifications', notificationId);
      await updateDoc(notifDocRef, {
        readBy: arrayUnion(userId),
      });
      console.log(
        `Notification ${notificationId} marked as read by user ${userId}.`,
      );
    } catch (error) {
      throw error;
    }
  }

  // Get count of unread notifications for a specific user
  async getUnreadNotificationCountForUser(userId: string): Promise<number> {
    const notifRef = collection(this.firestore, 'Notifications');
    const snap = await getDocs(notifRef);

    const unread = snap.docs.filter((docSnap) => {
      const data = docSnap.data() as Notification;

      // Check if the user hasn't read it AND it's not resolved
      return (
        (!data.readBy || !data.readBy.includes(userId)) &&
        data.status?.toLowerCase() !== 'resolved'
      );
    });

    return unread.length;
  }

  async getUnreadEmergency(userId: string): Promise<number> {
    const notifRef = collection(this.firestore, 'EmergencyRequest');
    const snap = await getDocs(notifRef);
    const unread = snap.docs.filter((docSnap) => {
      const data = docSnap.data() as EmergencyRequest;
      return !data.readBy?.includes(userId);
    });

    return unread.length;
  }

  getUnreadRespondingRequests(userId: string): Observable<number> {
    const notifRef = collection(this.firestore, 'EmergencyRequest');

    return new Observable<number>((observer) => {
      const unsubscribe = onSnapshot(notifRef, (snapshot) => {
        const count = snapshot.docs.filter((docSnap) => {
          const data = docSnap.data() as EmergencyRequest;
          return (
            data.status?.toLowerCase() === 'responding' &&
            !data.readBy?.includes(userId)
          );
        }).length;

        observer.next(count);
      });

      // Cleanup when unsubscribed
      return () => unsubscribe();
    });
  }

  getUnreadPendingRequests(): Observable<number> {
    const notifRef = collection(this.firestore, 'EmergencyRequest');

    return new Observable<number>((observer) => {
      const unsubscribe = onSnapshot(notifRef, (snapshot) => {
        const count = snapshot.docs.filter((docSnap) => {
          const data = docSnap.data() as EmergencyRequest;
          return data.status?.toLowerCase() === 'pending';
        }).length;

        observer.next(count);
      });

      return () => unsubscribe();
    });
  }
}
