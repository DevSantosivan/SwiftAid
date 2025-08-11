import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit } from '@angular/core';
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
  editingBarangayId: string | null = null;

  allBaranggay: Barangay[] = [];
  newBarangay: Barangay = this.getEmptyBarangay();
  map: any;

  constructor(private barangayService: BarangayService) {}

  ngOnInit(): void {
    this.fetchBarangays();
  }

  setTab(tabName: string): void {
    this.activeTab = tabName;
  }

  async fetchBarangays() {
    this.allBaranggay = await this.barangayService.getAll(); // async support
  }
  openAddIncident() {
    alert('Add Incident clicked! Implement your logic here.');
  }

  openAddModal(barangayToEdit?: Barangay) {
    this.showAddModal = true;

    if (barangayToEdit) {
      this.newBarangay = { ...barangayToEdit };
      this.editingBarangayId = barangayToEdit.id ?? null;
    } else {
      this.newBarangay = this.getEmptyBarangay();
      this.editingBarangayId = null;
    }

    setTimeout(() => this.initMap(), 100);
  }

  closeModal() {
    this.showAddModal = false;
    this.newBarangay = this.getEmptyBarangay();
    this.editingBarangayId = null;
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
    this.map = L.map('map').setView(
      [this.newBarangay.latitude!, this.newBarangay.longitude!],
      13
    );
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: 'Map data © OpenStreetMap contributors',
    }).addTo(this.map);

    const marker = L.marker(
      [this.newBarangay.latitude!, this.newBarangay.longitude!],
      { draggable: true }
    ).addTo(this.map);

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
        if (this.editingBarangayId) {
          await this.barangayService.update(
            this.editingBarangayId,
            this.newBarangay
          );
        } else {
          await this.barangayService.add(this.newBarangay);
        }

        await this.fetchBarangays();
        this.closeModal();
        this.showSuccessModal = true;

        setTimeout(() => (this.showSuccessModal = false), 2000);
      } catch (error) {
        console.error('Error submitting barangay:', error);
      } finally {
        this.isSubmitting = false;
      }
    }
  }

  editBarangay(barangay: Barangay) {
    this.openAddModal(barangay);
  }

  async deleteBarangay(id: string | undefined) {
    if (id && confirm('Are you sure you want to delete this barangay?')) {
      await this.barangayService.delete(id);
      await this.fetchBarangays();
    }
  }

  openDropdownIndex: string | null = null;

  toggleDropdown(id: string | undefined, event: MouseEvent) {
    event.stopPropagation();
    if (!id) return; // safety check

    if (this.openDropdownIndex === id) {
      this.openDropdownIndex = null;
    } else {
      this.openDropdownIndex = id;
    }
  }

  @HostListener('document:click')
  closeDropdown() {
    this.openDropdownIndex = null;
  }
}
