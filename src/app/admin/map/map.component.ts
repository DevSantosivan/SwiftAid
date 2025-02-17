import { AdminNavbarComponent } from '../admin-navbar/admin-navbar.component';
import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { getFirestore, collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import { environment } from '../../model/environment';
import * as L from 'leaflet';
import { MapContentComponent } from '../map-content/map-content.component';

interface EmergencyRequest {
  id?: string;
  name: string;
  image: string;
  address: string;
  contactNumber: string;
  email: string;
  latitude: number;
  longitude: number;
  needs: string;
  timestamp: any;
  currentLocation?: string;
  description?: string;
}

@Component({
  selector: 'app-map',
  imports: [AdminNavbarComponent, CommonModule,MapContentComponent],
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss']
})
export class MapComponent  {
  
  constructor(private route: Router) {}

  navigateToDashboard() {
    this.route.navigate(['/admin']);
  }

  navigateToHistoryCall() {
    this.route.navigate(['/admin/history-call']);
  }

  navigateToUserList() {
    this.route.navigate(['/admin/user-list']);
  }
}
