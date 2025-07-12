// presence.service.ts
import { Injectable } from '@angular/core';
import {
  getDatabase,
  ref,
  push,
  onDisconnect,
  onValue,
  set,
  serverTimestamp,
} from 'firebase/database';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { environment } from '../model/environment';

@Injectable({ providedIn: 'root' })
export class PresenceService {
  private db = getDatabase(initializeApp(environment.firebaseConfig));
  private auth = getAuth();

  constructor() {
    onAuthStateChanged(this.auth, (user) => {
      if (user) this.setupPresence(user.uid);
    });
  }

  private setupPresence(uid: string) {
    const connsRef = ref(this.db, `status/${uid}/connections`);
    const lastRef = ref(this.db, `status/${uid}/lastOnline`);
    const connectedRef = ref(this.db, '.info/connected');

    onValue(connectedRef, (snap) => {
      if (!snap.val()) return;

      const con = push(connsRef);
      onDisconnect(con).remove();
      onDisconnect(lastRef).set(serverTimestamp());
      set(con, true);
    });
  }
}
