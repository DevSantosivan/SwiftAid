import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  addDoc,
  doc,
  updateDoc,
  getDocs,
} from '@angular/fire/firestore';
import { EmergencyReport } from '../model/report';

@Injectable({
  providedIn: 'root',
})
export class ReportService {
  private firestore = inject(Firestore);

  async submitReport(report: EmergencyReport) {
    const ref = collection(this.firestore, 'EmergencyReports');
    return await addDoc(ref, report);
  }

  async markAsReviewed(reportId: string, adminInfo: any) {
    const ref = doc(this.firestore, 'EmergencyReports', reportId);
    return await updateDoc(ref, {
      status: 'reviewed',
      reviewedBy: adminInfo,
      reviewedAt: new Date(),
    });
  }

  async getReports(): Promise<EmergencyReport[]> {
    const ref = collection(this.firestore, 'EmergencyReports');
    const snap = await getDocs(ref);
    return snap.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() }) as EmergencyReport,
    );
  }
}
