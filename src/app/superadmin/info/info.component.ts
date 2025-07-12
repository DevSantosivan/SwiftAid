import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import * as L from 'leaflet';
import 'leaflet-control-geocoder';

import { Barangay } from '../../model/baranggay';
import { BarangayService } from '../../core/barangay.service';

@Component({
  selector: 'app-info',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './info.component.html',
  styleUrls: ['./info.component.scss'],
})
export class InfoComponent implements OnInit {
  activeTab: string = 'barangay';
  showAddModal = false;
  isSubmitting = false;
  showSuccessModal = false;

  allBaranggay: Barangay[] = [];
  newBarangay: Barangay = this.getEmptyBarangay();
  map: any;

  constructor(private barangayService: BarangayService) {}

  ngOnInit(): void {
    this.allBaranggay = this.barangayService.getAll();
  }

  setTab(tabName: string): void {
    this.activeTab = tabName;
  }

  openAddModal() {
    this.showAddModal = true;
    setTimeout(() => this.initMap(), 100);
  }

  closeModal() {
    this.showAddModal = false;
    this.newBarangay = this.getEmptyBarangay();
    if (this.map) this.map.remove();
  }

  getEmptyBarangay(): Barangay {
    return {
      baranggay: '',
      baranggay_img: '',
      barangay_contact: '',
      captain_name: '',
      latitude: 14.5995,
      longitude: 120.9842,
      latLng: '',
      createdAt: new Date(),
    };
  }

  initMap() {
    this.map = L.map('map').setView([14.5995, 120.9842], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: 'Map data © OpenStreetMap contributors',
    }).addTo(this.map);

    const marker = L.marker([14.5995, 120.9842], { draggable: true }).addTo(
      this.map
    );

    marker.on('dragend', () => {
      const pos = marker.getLatLng();
      this.setLatLng(pos.lat, pos.lng);
    });

    this.map.on('click', (e: any) => {
      marker.setLatLng(e.latlng);
      this.setLatLng(e.latlng.lat, e.latlng.lng);
    });

    const geocoder = (L.Control as any)
      .geocoder({ defaultMarkGeocode: false })
      .on('markgeocode', (e: any) => {
        const center = e.geocode.center;
        this.map.setView(center, 16);
        marker.setLatLng(center);
        this.setLatLng(center.lat, center.lng);
      })
      .addTo(this.map);

    this.setLatLng(14.5995, 120.9842);
  }

  setLatLng(lat: number, lng: number) {
    this.newBarangay.latitude = lat;
    this.newBarangay.longitude = lng;
    this.newBarangay.latLng = `${lat},${lng}`;
  }

  async submitBarangay() {
    if (
      this.newBarangay.baranggay &&
      this.newBarangay.captain_name &&
      this.newBarangay.barangay_contact
    ) {
      this.isSubmitting = true;

      try {
        // Simulate async service with a Promise (replace this with `await` if using real backend)
        await new Promise((resolve) => setTimeout(resolve, 1000));

        this.barangayService.add(this.newBarangay);
        this.allBaranggay = this.barangayService.getAll();

        this.closeModal();
        this.showSuccessModal = true;

        // Automatically hide success modal after 2s
        setTimeout(() => {
          this.showSuccessModal = false;
        }, 2000);
      } catch (error) {
        console.error('Error submitting barangay:', error);
        // Optional: Show error modal here
      } finally {
        this.isSubmitting = false;
      }
    }
  }
}
