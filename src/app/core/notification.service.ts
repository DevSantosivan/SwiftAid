import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  query,
  orderBy,
  onSnapshot,
  Timestamp,
} from '@angular/fire/firestore';
import { EmergencyRequest } from '../model/emergency';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private latestRequestTimestamp: Timestamp | null = null;

  constructor(private firestore: Firestore) {}

  requestNotificationPermission(): void {
    if ('Notification' in window && Notification.permission !== 'granted') {
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          console.log('✅ Notification permission granted.');
        } else {
          console.warn('❌ Notification permission denied.');
        }
      });
    }
  }

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
          this.showPushNotification('New Emergency Request', message);
        }
      }
    });
  }

  private showPushNotification(title: string, message: string): void {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body: message,
        icon: 'assets/logopng.jpg', // Optional: Add your own icon
      });
    }
  }
}
