import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  setDoc,
  updateDoc,
  deleteDoc,
  doc,
  CollectionReference,
  getDoc,
  DocumentData,
} from '@angular/fire/firestore';
import { collectionData } from '@angular/fire/firestore';
import { from, Observable, switchMap } from 'rxjs';
import { Feedback } from '../model/feedback';

export interface Incident {
  id?: string;
  name: string;
  icon: string;
  tips: string[];
}

export interface EnrichedFeedback extends Feedback {
  name: string; // Requester's name fetched from EmergencyRequest collection
}

@Injectable({
  providedIn: 'root',
})
export class IncidentService {
  private incidentCollection: CollectionReference<Incident>;

  constructor(private firestore: Firestore) {
    this.incidentCollection = collection(
      this.firestore,
      'incident'
    ) as CollectionReference<Incident>;
  }

  getAll(): Observable<Incident[]> {
    return collectionData(this.incidentCollection, {
      idField: 'id',
    }) as Observable<Incident[]>;
  }

  async add(incident: Incident): Promise<void> {
    const newDocRef = doc(this.incidentCollection);
    await setDoc(newDocRef, { ...incident, id: newDocRef.id });
  }

  update(id: string, incident: Incident): Promise<void> {
    const docRef = doc(this.incidentCollection, id);
    return updateDoc(docRef, incident as any);
  }

  delete(id: string): Promise<void> {
    const docRef = doc(this.incidentCollection, id);
    return deleteDoc(docRef);
  }

  /**
   * Fetch feedbacks and enrich each feedback with the requester's name
   * fetched from the EmergencyRequest collection by requestId.
   */
  getFeedbacksWithRequestNames(): Observable<EnrichedFeedback[]> {
    const feedbacksRef = collection(this.firestore, 'feedbacks');

    return collectionData(feedbacksRef, { idField: 'id' }).pipe(
      switchMap(async (rawFeedbacks: DocumentData[]) => {
        // Map raw feedback data to typed Feedback[]
        const feedbacks: Feedback[] = rawFeedbacks.map((f: any) => ({
          id: f.id,
          feedback: f.feedback,
          rating: f.rating,
          requestId: f.requestId,
          timestamp: f.timestamp,
        }));

        // For each feedback, fetch EmergencyRequest to get requester's name
        const enrichedFeedbacks = await Promise.all(
          feedbacks.map(async (fb) => {
            let requesterName = 'Unknown';

            try {
              const reqDoc = doc(
                this.firestore,
                `EmergencyRequest/${fb.requestId}`
              );
              const reqSnap = await getDoc(reqDoc);
              if (reqSnap.exists()) {
                requesterName = (reqSnap.data() as any)?.name || 'Unknown';
              }
            } catch (error) {
              console.error(
                'Error fetching EmergencyRequest for',
                fb.requestId,
                error
              );
            }

            return {
              ...fb,
              name: requesterName,
            } as EnrichedFeedback;
          })
        );

        return enrichedFeedbacks;
      })
    );
  }
}
