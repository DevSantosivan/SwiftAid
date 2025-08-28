import { CommonModule } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import * as L from 'leaflet';
import 'leaflet-control-geocoder';
import { Barangay } from '../../model/baranggay';
import { BarangayService } from '../../core/barangay.service';

import { IncidentService, Incident } from '../../core/incident.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-info',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './info.component.html',
  styleUrls: ['./info.component.scss'],
})
export class InfoComponent implements OnInit, OnDestroy {
  activeTab: string = 'barangay';

  // Modals and states
  showAddModal = false;
  showAddIncidentModal = false;
  isSubmitting = false;
  showSuccessModal = false;
  editingBarangayId: string | null = null;

  // Barangay data
  allBaranggay: Barangay[] = [];
  newBarangay: Barangay = this.getEmptyBarangay();
  map: any;

  // Incident data
  allIncidents: Incident[] = [];
  newIncident: Incident = { id: '', name: '', icon: '', tips: [] };
  newTip = '';

  // Dropdown states
  openDropdownIndex: string | null = null;
  openIncidentDropdownIndex: string | null = null;

  private incidentSub?: Subscription;

  constructor(
    private barangayService: BarangayService,
    private incidentService: IncidentService
  ) {}

  ngOnInit(): void {
    this.fetchBarangays();

    // Subscribe to Firestore incident updates
    this.incidentSub = this.incidentService.getAll().subscribe({
      next: (incidents) => {
        this.allIncidents = incidents;
      },
      error: (err) => console.error('Error fetching incidents:', err),
    });
  }

  ngOnDestroy(): void {
    this.incidentSub?.unsubscribe();
  }

  setTab(tabName: string): void {
    this.activeTab = tabName;
  }

  // ===== BARANGAY LOGIC =====

  async fetchBarangays() {
    try {
      this.allBaranggay = await this.barangayService.getAll();
    } catch (error) {
      console.error('Error fetching barangays:', error);
      alert('Failed to fetch barangays. Please try again later.');
    }
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
        alert('Failed to submit barangay. Please try again.');
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
      this.isSubmitting = true;
      try {
        await this.barangayService.delete(id);
        await this.fetchBarangays();
        this.showSuccessModal = true;
        setTimeout(() => (this.showSuccessModal = false), 2000);
      } catch (error) {
        console.error('Error deleting barangay:', error);
        alert('Failed to delete barangay. Please try again.');
      } finally {
        this.isSubmitting = false;
      }
    }
  }

  toggleDropdown(id: string | undefined, event: MouseEvent) {
    event.stopPropagation();
    if (!id) return;
    this.openDropdownIndex = this.openDropdownIndex === id ? null : id;
  }

  @HostListener('document:click')
  closeDropdown() {
    this.openDropdownIndex = null;
  }

  // ===== INCIDENT LOGIC =====

  openIncidentModal() {
    this.showAddIncidentModal = true;
  }

  closeIncidentModal() {
    this.showAddIncidentModal = false;
    this.newIncident = { id: '', name: '', icon: '', tips: [] };
    this.newTip = '';
  }

  addTip() {
    if (this.newTip.trim()) {
      this.newIncident.tips.push(this.newTip.trim());
      this.newTip = '';
    }
  }

  removeTip(index: number) {
    this.newIncident.tips.splice(index, 1);
  }

  async submitIncident() {
    if (this.newIncident.name && this.newIncident.icon) {
      this.isSubmitting = true;
      try {
        if (this.newIncident.id) {
          // Update existing incident
          await this.incidentService.update(
            this.newIncident.id,
            this.newIncident
          );
        } else {
          // Add new incident
          await this.incidentService.add(this.newIncident);
        }
        this.closeIncidentModal();
        this.showSuccessModal = true;
        setTimeout(() => (this.showSuccessModal = false), 2000);
      } catch (error) {
        console.error('Error submitting incident:', error);
        alert('Failed to submit incident. Please try again.');
      } finally {
        this.isSubmitting = false;
      }
    }
  }

  toggleIncidentDropdown(id: string | undefined, event: MouseEvent) {
    event.stopPropagation();
    if (!id) return;
    this.openIncidentDropdownIndex =
      this.openIncidentDropdownIndex === id ? null : id;
  }

  @HostListener('document:click')
  closeIncidentDropdown() {
    this.openIncidentDropdownIndex = null;
  }

  viewIncident(incident: Incident) {
    alert(`Viewing Incident: ${incident.name}`);
    this.openIncidentDropdownIndex = null;
  }

  editIncident(incident: Incident) {
    this.newIncident = { ...incident };
    this.showAddIncidentModal = true;
    this.openIncidentDropdownIndex = null;
  }

  async deleteIncident(id: string | undefined) {
    if (id && confirm('Are you sure you want to delete this incident?')) {
      this.isSubmitting = true;
      try {
        await this.incidentService.delete(id);
        this.showSuccessModal = true;
        setTimeout(() => (this.showSuccessModal = false), 2000);
        this.openIncidentDropdownIndex = null;
      } catch (error) {
        console.error('Error deleting incident:', error);
        alert('Failed to delete incident. Please try again.');
      } finally {
        this.isSubmitting = false;
      }
    }
  }
}
