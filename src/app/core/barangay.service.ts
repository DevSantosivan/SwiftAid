import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  CollectionReference,
} from '@angular/fire/firestore';
import { Barangay } from '../model/baranggay';
import { collectionData } from '@angular/fire/firestore';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class BarangayService {
  private barangayCollection: CollectionReference;

  constructor(private firestore: Firestore) {
    this.barangayCollection = collection(this.firestore, 'barangay');
  }

  async getAll(): Promise<Barangay[]> {
    const snapshot = await getDocs(this.barangayCollection);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Barangay[];
  }

  async add(barangay: Barangay) {
    return await addDoc(this.barangayCollection, barangay);
  }

  async update(id: string, barangay: Barangay) {
    const docRef = doc(this.barangayCollection, id);
    return await updateDoc(docRef, barangay as any);
  }

  async delete(id: string) {
    const docRef = doc(this.barangayCollection, id);
    return await deleteDoc(docRef);
  }
}
