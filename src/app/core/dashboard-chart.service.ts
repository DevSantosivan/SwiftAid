import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  getDocs,
  DocumentData,
} from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root',
})
export class DashboardChartService {
  constructor(private firestore: Firestore) {}

  async fetchAccidentCategoryCounts(): Promise<Record<string, number>> {
    const accidentRef = collection(this.firestore, 'EmergencyRequest');
    const querySnapshot = await getDocs(accidentRef);

    const counts: Record<string, number> = {
      Assault: 0,
      'Break-in': 0,
      Vandalism: 0,
      Theft: 0,
      Accident: 0,
      'Heart Attack': 0,
      Stroke: 0,
      Explosion: 0,
      'Gas Leak': 0,
      Flood: 0,
      Fire: 0,
    };

    querySnapshot.forEach((doc) => {
      const data = doc.data() as DocumentData;
      const event = data['event']?.trim() as string;
      if (event && counts.hasOwnProperty(event)) {
        counts[event]++;
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
}
