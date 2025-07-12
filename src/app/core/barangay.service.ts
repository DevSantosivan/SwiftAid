import { Injectable } from '@angular/core';
import { Barangay } from '../model/baranggay';

const STORAGE_KEY = 'barangay_data';

@Injectable({ providedIn: 'root' })
export class BarangayService {
  getAll(): Barangay[] {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  }

  saveAll(barangays: Barangay[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(barangays));
  }

  add(barangay: Barangay): void {
    const current = this.getAll();
    current.push(barangay);
    this.saveAll(current);
  }

  clear(): void {
    localStorage.removeItem(STORAGE_KEY);
  }
}
