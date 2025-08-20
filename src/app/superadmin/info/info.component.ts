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

  // Modals and states
  showAddModal = false;
  showAddIncidentModal = false;
  isSubmitting = false;
  showSuccessModal = false;
  editingBarangayId: string | null = null;
  editingIncidentId: string | null = null; // to track which incident is being edited
  isEditingIncident: boolean = false; // optional flag to toggle edit mode

  // Barangay data
  allBaranggay: Barangay[] = [];
  newBarangay: Barangay = this.getEmptyBarangay();
  map: any;

  // Incident data
  allIncidents: { id: string; name: string; icon: string; tips: string[] }[] =
    [];
  newIncident = { id: '', name: '', icon: '', tips: [] as string[] };
  newTip = '';

  // Dropdown states
  openDropdownIndex: string | null = null;
  openIncidentDropdownIndex: string | null = null;

  constructor(private barangayService: BarangayService) {}

  ngOnInit(): void {
    this.fetchBarangays();

    // Example incidents with IDs for managing dropdown
    this.allIncidents = [
      {
        id: '1',
        name: 'Fire',
        icon: 'bx bxs-hot',
        tips: ['Call fire department', 'Evacuate area'],
      },
      {
        id: '2',
        name: 'Flood',
        icon: 'bx bx-water',
        tips: ['Move to higher ground', 'Avoid water currents'],
      },
    ];
  }

  setTab(tabName: string): void {
    this.activeTab = tabName;
  }

  // ===== BARANGAY LOGIC =====

  async fetchBarangays() {
    this.allBaranggay = await this.barangayService.getAll();
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

  toggleDropdown(id: string | undefined, event: MouseEvent) {
    event.stopPropagation();
    if (!id) return;
    this.openDropdownIndex = this.openDropdownIndex === id ? null : id;
  }

  // Close barangay dropdown on outside click
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

  submitIncident() {
    if (this.newIncident.name && this.newIncident.icon) {
      if (this.newIncident.id) {
        // Edit existing incident
        const index = this.allIncidents.findIndex(
          (inc) => inc.id === this.newIncident.id
        );
        if (index !== -1) {
          this.allIncidents[index] = { ...this.newIncident };
        }
      } else {
        // Add new incident with generated ID
        this.newIncident.id = Date.now().toString();
        this.allIncidents.push({ ...this.newIncident });
      }
      this.closeIncidentModal();
    }
  }

  toggleIncidentDropdown(id: string | undefined, event: MouseEvent) {
    event.stopPropagation();
    if (!id) return;
    this.openIncidentDropdownIndex =
      this.openIncidentDropdownIndex === id ? null : id;
  }

  // Close incident dropdown on outside click
  @HostListener('document:click')
  closeIncidentDropdown() {
    this.openIncidentDropdownIndex = null;
  }

  viewIncident(incident: {
    id: string;
    name: string;
    icon: string;
    tips: string[];
  }) {
    alert(`Viewing Incident: ${incident.name}`);
    this.openIncidentDropdownIndex = null;
  }

  editIncident(incident: {
    id: string;
    name: string;
    icon: string;
    tips: string[];
  }) {
    this.newIncident = { ...incident };
    this.showAddIncidentModal = true;
    this.openIncidentDropdownIndex = null;
  }

  deleteIncident(id: string | undefined) {
    if (id && confirm('Are you sure you want to delete this incident?')) {
      this.allIncidents = this.allIncidents.filter((inc) => inc.id !== id);
      this.openIncidentDropdownIndex = null;
    }
  }
}
