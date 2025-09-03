import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  getDocs,
  DocumentData,
  query,
  where,
  Timestamp,
} from '@angular/fire/firestore';
import { getAuth } from 'firebase/auth';

@Injectable({
  providedIn: 'root',
})
export class DashboardChartService {
  constructor(private firestore: Firestore) {}

  /**
   * Fetch counts of all unique accident categories dynamically.
   */
  async fetchAccidentCategoryCounts(): Promise<Record<string, number>> {
    const accidentRef = collection(this.firestore, 'EmergencyRequest');
    const querySnapshot = await getDocs(accidentRef);

    const counts: Record<string, number> = {};

    querySnapshot.forEach((doc) => {
      const data = doc.data() as DocumentData;
      const eventRaw = data['event'] ?? '';
      const event = eventRaw.toString().trim();

      if (!event) return;

      // Normalize case so that e.g. "Accident" and "accident" are counted as the same
      const normalizedEvent =
        event.charAt(0).toUpperCase() + event.slice(1).toLowerCase();

      if (!counts[normalizedEvent]) {
        counts[normalizedEvent] = 1;
      } else {
        counts[normalizedEvent]++;
      }
    });

    return counts;
  }

  /**
   * Fetch counts of accident categories filtered by the current logged in user
   * and only for resolved/completed statuses.
   */
  async fetchAccidentCategoryCountsForCurrentUser(): Promise<
    Record<string, number>
  > {
    const auth = getAuth();
    const currentUser = auth.currentUser;

    if (!currentUser) {
      throw new Error('User not logged in');
    }

    const accidentRef = collection(this.firestore, 'EmergencyRequest');

    const q = query(
      accidentRef,
      where('staffId', '==', currentUser.uid),
      where('status', 'in', ['Resolved', 'Completed'])
    );

    const querySnapshot = await getDocs(q);

    const counts: Record<string, number> = {};

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const eventRaw = data['event'] ?? '';
      const event = eventRaw.toString().trim();

      if (!event) return;

      const normalizedEvent =
        event.charAt(0).toUpperCase() + event.slice(1).toLowerCase();

      if (!counts[normalizedEvent]) {
        counts[normalizedEvent] = 1;
      } else {
        counts[normalizedEvent]++;
      }
    });

    return counts;
  }

  async fetchYearlyAccidentData(): Promise<{
    years: string[];
    counts: number[];
  }> {
    const accidentRef = collection(this.firestore, 'EmergencyRequest');
    const querySnapshot = await getDocs(accidentRef);

    const yearCounts: { [key: string]: number } = {};

    querySnapshot.forEach((doc) => {
      const data = doc.data() as DocumentData;
      const timestamp = data['timestamp'];
      if (timestamp) {
        const year = new Date(timestamp.seconds * 1000)
          .getFullYear()
          .toString();
        yearCounts[year] = (yearCounts[year] || 0) + 1;
      }
    });

    const years = Object.keys(yearCounts).sort(
      (a, b) => parseInt(a) - parseInt(b)
    );
    const counts = years.map((year) => yearCounts[year]);

    return { years, counts };
  }

  /**
   * Fetch counts of accident categories by specific staffId (all statuses).
   */
  async fetchAccidentCategoryCountsByStaffId(
    staffId: string
  ): Promise<Record<string, number>> {
    const accidentRef = collection(this.firestore, 'EmergencyRequest');
    const q = query(accidentRef, where('staffId', '==', staffId));
    const querySnapshot = await getDocs(q);

    const counts: Record<string, number> = {};

    querySnapshot.forEach((doc) => {
      const data = doc.data() as DocumentData;
      const eventRaw = data['event'] ?? '';
      const event = eventRaw.toString().trim();

      if (!event) return;

      const normalizedEvent =
        event.charAt(0).toUpperCase() + event.slice(1).toLowerCase();

      if (!counts[normalizedEvent]) {
        counts[normalizedEvent] = 1;
      } else {
        counts[normalizedEvent]++;
      }
    });

    return counts;
  }

  async fetchMonthlyEventCounts(): Promise<{
    months: string[];
    eventCountsByMonth: { [event: string]: number[] };
  }> {
    const accidentRef = collection(this.firestore, 'EmergencyRequest');
    const querySnapshot = await getDocs(accidentRef);

    // Calculate last 6 months labels (including current month)
    const now = new Date();
    const months: string[] = [];
    const monthYearKeys: string[] = []; // keys for easy comparison like '2025-09'
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleString('default', {
        month: 'short',
        year: 'numeric',
      });
      months.push(label);
      monthYearKeys.push(
        `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`
      );
    }

    // Collect all unique events from the data
    const eventSet = new Set<string>();

    // Map of event => counts array for 6 months, initialized with zeros
    const eventCountsByMonth: { [event: string]: number[] } = {};

    // Initialize eventCountsByMonth dynamically after discovering events
    // So first pass to find events:
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const eventRaw = data['event'] ?? '';
      const event = eventRaw.toString().trim();
      if (event)
        eventSet.add(
          event.charAt(0).toUpperCase() + event.slice(1).toLowerCase()
        );
    });

    eventSet.forEach((event) => {
      eventCountsByMonth[event] = new Array(months.length).fill(0);
    });

    // Now process each doc and increment counts
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const eventRaw = data['event'] ?? '';
      const event = eventRaw.toString().trim();
      if (!event) return;

      const normalizedEvent =
        event.charAt(0).toUpperCase() + event.slice(1).toLowerCase();

      const timestamp = data['timestamp'];
      let date: Date | null = null;

      if (timestamp instanceof Timestamp) {
        date = timestamp.toDate();
      } else if (timestamp && timestamp.seconds) {
        // In case it's Firestore Timestamp object in some other shape
        date = new Date(timestamp.seconds * 1000);
      } else if (timestamp instanceof Date) {
        date = timestamp;
      }

      if (!date) return;

      // Build key 'YYYY-MM' for this date
      const key = `${date.getFullYear()}-${(date.getMonth() + 1)
        .toString()
        .padStart(2, '0')}`;

      // Find index of this month in last 6 months
      const monthIndex = monthYearKeys.indexOf(key);

      if (monthIndex !== -1 && eventCountsByMonth[normalizedEvent]) {
        eventCountsByMonth[normalizedEvent][monthIndex]++;
      }
    });

    return { months, eventCountsByMonth };
  }
}
