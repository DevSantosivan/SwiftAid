import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  query,
  orderBy,
  onSnapshot,
  Timestamp,
} from '@angular/fire/firestore';
import { Messaging, getToken, onMessage } from '@angular/fire/messaging';
import { EmergencyRequest } from '../model/emergency';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private latestRequestTimestamp: Timestamp | null = null;
  private vapidKey =
    'BLDvoUhhQC6EF4KBrEWuLm3rftMwl96vyT0KC4xiOEd66BgtiHFeUFDJCF4Rd6GMqaSX-bT5e2QGuuQsMMsyRKU';

  constructor(private firestore: Firestore, private messaging: Messaging) {}

  // Request permission and get FCM token
  async requestNotificationPermission() {
    if ('Notification' in window && Notification.permission !== 'granted') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        try {
          const token = await getToken(this.messaging, {
            vapidKey: this.vapidKey,
          });
          if (token) {
            console.log('✅ FCM Token:', token);
            // Save the token to your backend if needed
          } else {
            console.warn('No registration token available.');
          }
        } catch (err) {
          console.error('Error getting FCM token', err);
        }
      } else {
        console.warn('Notification permission denied');
      }
    }
  }

  // Listen to Firestore emergency requests and show notifications if app is open
  listenToEmergencyRequests(): void {
    const emergencyRef = collection(this.firestore, 'EmergencyRequest');
    const q = query(emergencyRef, orderBy('timestamp', 'desc'));

    onSnapshot(q, (snapshot) => {
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

          const event = data.needs || 'Unknown Event';
          const location = data.address || 'Unknown Location';
          const name = data.name || 'Unknown Reporter';

          const message = `🚨 ${event} at ${location} reported by ${name}`;
          this.showForegroundNotification('New Emergency Request', message);
        }
      }
    });
  }

  // Show notifications only when app is open (foreground)
  private showForegroundNotification(title: string, message: string): void {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body: message,
        icon: 'assets/logopng.jpg',
      });
    }
  }

  // Listen for messages received when app is in foreground (from FCM)
  listenForFCMMessages() {
    onMessage(this.messaging, (payload) => {
      console.log('Message received in foreground: ', payload);
      if (payload.notification) {
        this.showForegroundNotification(
          payload.notification.title || 'Notification',
          payload.notification.body || ''
        );
      }
    });
  }
}
