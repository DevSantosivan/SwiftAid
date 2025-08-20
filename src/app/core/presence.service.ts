import { Injectable } from '@angular/core';
import {
  getDatabase,
  ref,
  onDisconnect,
  onValue,
  set,
  serverTimestamp,
} from 'firebase/database';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { environment } from '../model/environment';

@Injectable({ providedIn: 'root' })
export class PresenceService {
  private db = getDatabase(initializeApp(environment.firebaseConfig));
  private auth = getAuth();

  constructor() {
    onAuthStateChanged(this.auth, (user) => {
      if (user) {
        this.setupPresence(user.uid);
      }
    });
  }

  private setupPresence(uid: string) {
    const statusRef = ref(this.db, `status/${uid}`);
    const connectedRef = ref(this.db, '.info/connected');

    onValue(connectedRef, (snap) => {
      if (!snap.val()) {
        // If disconnected, set user status to offline with timestamp
        set(statusRef, {
          state: 'offline',
          lastOnline: Date.now(),
          last_changed: Date.now(),
        });
        return;
      }

      // When connected, set state to online and update last_changed
      set(statusRef, {
        state: 'online',
        lastOnline: null,
        last_changed: Date.now(),
      });

      // When disconnected, set state to offline with lastOnline timestamp
      onDisconnect(statusRef).set({
        state: 'offline',
        lastOnline: Date.now(),
        last_changed: Date.now(),
      });
    });
  }
}
