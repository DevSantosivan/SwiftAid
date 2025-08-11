import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  query,
  orderBy,
  onSnapshot,
  Timestamp,
  getDocs,
  limit,
} from '@angular/fire/firestore';
import { Messaging, getToken, onMessage } from '@angular/fire/messaging';
import { EmergencyRequest } from '../model/emergency';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private latestRequestTimestamp: Timestamp | null = null;
  private vapidKey =
    'BLDvoUhhQC6EF4KBrEWuLm3rftMwl96vyT0KC4xiOEd66BgtiHFeUFDJCF4Rd6GMqaSX-bT5e2QGuuQsMMsyRKU';

  constructor(private firestore: Firestore, private messaging: Messaging) {}

  async requestNotificationPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.warn('Browser does not support notifications.');
      return 'denied';
    }

    if (Notification.permission === 'granted') {
      return 'granted';
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      try {
        const token = await getToken(this.messaging, {
          vapidKey: this.vapidKey,
        });
        if (token) {
          console.log('✅ FCM Token:', token);
          // Optionally send token to your backend here
        } else {
          console.warn('No registration token available.');
        }
      } catch (error) {
        console.error('Error getting FCM token', error);
      }
    } else {
      console.warn('Notification permission denied');
    }

    return permission;
  }

  async initializeLatestTimestamp(): Promise<void> {
    try {
      const emergencyRef = collection(this.firestore, 'EmergencyRequest');
      const q = query(emergencyRef, orderBy('timestamp', 'desc'), limit(1));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const data = snapshot.docs[0].data() as EmergencyRequest;
        this.latestRequestTimestamp = data.timestamp;
        console.log(
          '🕒 Initialized latest timestamp:',
          this.latestRequestTimestamp
        );
      } else {
        console.log('No existing emergency requests found.');
      }
    } catch (error) {
      console.error('Error initializing latest timestamp:', error);
    }
  }

  listenToEmergencyRequests(): void {
    const emergencyRef = collection(this.firestore, 'EmergencyRequest');
    const q = query(emergencyRef, orderBy('timestamp', 'desc'));

    onSnapshot(
      q,
      (snapshot) => {
        console.log('📥 Firestore snapshot listener triggered');

        if (!snapshot.empty) {
          const latestDoc = snapshot.docs[0];
          const data = latestDoc.data() as EmergencyRequest;
          const newTimestamp: Timestamp = data.timestamp;

          if (!this.latestRequestTimestamp) {
            this.latestRequestTimestamp = newTimestamp;
            return;
          }

          if (newTimestamp?.seconds > this.latestRequestTimestamp.seconds) {
            this.latestRequestTimestamp = newTimestamp;

            const event = data.event || 'Unknown Event';
            const location = data.address || 'Unknown Location';
            const name = data.name || 'Unknown Reporter';

            const message = `🚨 ${event} at ${location} reported by ${name}`;
            this.showForegroundNotification('New Emergency Request', message);
          }
        }
      },
      (error) => {
        console.error('❌ Firestore listener error:', error);
      }
    );
  }

  private showForegroundNotification(
    title: string,
    message: string,
    requestId?: string
  ): void {
    if ('Notification' in window && Notification.permission === 'granted') {
      console.log('🔔 Showing foreground notification:', title, message);

      const notification = new Notification(title, {
        body: message,
        icon: 'assets/logo22.png',
        data: { requestId }, // Pass requestId here
      });

      notification.onclick = () => {
        const targetUrl = requestId
          ? `/admin/EmergencyRequest/${requestId}`
          : '/admin/EmergencyRequest';

        window.focus();
        window.location.href = targetUrl; // Use full reload approach
      };
    } else {
      console.warn(
        'Notification not shown - permission not granted or not supported.'
      );
    }
  }

  listenForFCMMessages(): void {
    onMessage(this.messaging, (payload) => {
      console.log('📡 Message received in foreground:', payload);
      if (payload.notification) {
        this.showForegroundNotification(
          payload.notification.title || 'Notification',
          payload.notification.body || ''
        );
      }
    });
  }
}
