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
import { combineLatest, from, map, Observable, of, switchMap } from 'rxjs';
import { Feedback } from '../model/feedback';

export interface Incident {
  id?: string;
  name: string;
  icon: string;

  tips: string[];

  types: { id: string; name: string }[];
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
      switchMap((rawFeedbacks: any[]) => {
        if (!rawFeedbacks.length) return of([]); // walang feedbacks

        const feedbacks: Feedback[] = rawFeedbacks.map((f: any) => ({
          id: f.id,
          feedback: f.feedback,
          rating: f.rating,
          requestId: f.requestId,
          timestamp: f.timestamp,
        }));

        // convert bawat feedback into observable na may kasamang user data
        const observables = feedbacks.map((fb) =>
          from(getDoc(doc(this.firestore, 'users', fb.requestId))).pipe(
            map((userSnap) => {
              const userData = userSnap.exists() ? userSnap.data() : null;

              return {
                ...fb,
                name: userData?.['fullName'] || 'Unknown User',
                profilePic:
                  userData?.['profileImageUrl'] || 'assets/profile.jpg',
              } as EnrichedFeedback;
            })
          )
        );

        // pagsamahin lahat ng results
        return combineLatest(observables);
      })
    );
  }
}
