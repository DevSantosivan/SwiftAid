import { CommonModule } from '@angular/common';
import {
  Component,
  HostListener,
  OnDestroy,
  OnInit,
  AfterViewInit,
} from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import * as L from 'leaflet';
import 'leaflet-control-geocoder';
import { BarangayService } from '../../core/barangay.service';
import { IncidentService, Incident } from '../../core/incident.service';
import { Subscription } from 'rxjs';
import { Barangay } from '../../model/baranggay';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

@Component({
  selector: 'app-info',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, MatSnackBarModule],
  templateUrl: './info.component.html',
  styleUrls: ['./info.component.scss'],
})
export class InfoComponent implements OnInit, OnDestroy, AfterViewInit {
  activeTab: string = 'barangay';

  // Modal and states
  showAddModal = false;
  showAddIncidentModal = false;
  isSubmitting = false;
  editingBarangayId: string | null = null;

  // Barangay
  allBaranggay: Barangay[] = [];
  newBarangay: Barangay = this.getEmptyBarangay();
  map: L.Map | null = null;

  // For file upload
  imageFile: File | null = null;
  imagePreview: string | null = null;

  // Incident
  allIncidents: Incident[] = [];
  newIncident: Incident = { id: '', name: '', icon: '', tips: [], types: [] };
  newTip = '';
  newTypeName = '';

  // Dropdown states
  openDropdownIndex: string | null = null;
  openIncidentDropdownIndex: string | null = null;

  private incidentSub?: Subscription;

  defaultIcons = [
    // 🚗 VEHICLE / ROAD
    { name: 'Vehicle Accident', class: 'bx bxs-car-crash' },
    { name: 'Hit and Run', class: 'bx bx-walk' },
    { name: 'Road Obstruction', class: 'bx bx-traffic-cone' },

    // 🔥 FIRE / HAZARD
    { name: 'Fire Incident', class: 'bx bxs-fire' },
    { name: 'Gas Leak', class: 'bx bx-gas-pump' },
    { name: 'Explosion', class: 'bx bx-bomb' },

    // 💧 NATURAL DISASTER
    { name: 'Flooding', class: 'bx bxs-droplet' },
    { name: 'Earthquake', class: 'bx bxs-building-house' },
    { name: 'Landslide', class: 'bx bxs-landscape' },
    { name: 'Typhoon', class: 'bx bx-wind' },

    // 🏥 MEDICAL
    { name: 'Heart Attack', class: 'bx bx-heart-circle' },
    { name: 'Stroke', class: 'bx bx-brain' },
    { name: 'Severe Injury', class: 'bx bxs-band-aid' },
    { name: 'Unconscious Person', class: 'bx bx-user-voice' },
    { name: 'Pregnancy Emergency', class: 'bx bx-female' },

    // ⚖️ CRIME / SAFETY
    { name: 'Robbery', class: 'bx bxs-bank' },
    { name: 'Assault', class: 'bx bx-user-x' },
    { name: 'Domestic Violence', class: 'bx bx-home-heart' },
    { name: 'Missing Person', class: 'bx bx-search-alt-2' },
    { name: 'Vandalism', class: 'bx bx-paint-roll' },

    // ⚡ OTHER EMERGENCIES
    { name: 'Power Outage', class: 'bx bx-bolt' },
    { name: 'Animal Attack', class: 'bx bx-dog' },
    { name: 'Collapsed Structure', class: 'bx bx-building-house' },
    { name: 'Chemical Spill', class: 'bx bx-test-tube' },
    { name: 'Explosion Threat', class: 'bx bx-error' },
  ];

  selectIcon(iconClass: string) {
    this.newIncident.icon = iconClass;
  }
  constructor(
    private barangayService: BarangayService,
    private incidentService: IncidentService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.fetchBarangays();
    this.incidentSub = this.incidentService.getAll().subscribe({
      next: (incidents) => (this.allIncidents = incidents),
      error: (err) => console.error('Error fetching incidents:', err),
    });
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.allBaranggay.forEach((barangay) => {
        this.initBarangayMap(barangay);
        this.reverseGeocode(barangay);
      });
    }, 500);
  }

  ngOnDestroy(): void {
    this.incidentSub?.unsubscribe();
  }

  // ============ TAB SWITCHING ============
  setTab(tabName: string): void {
    this.activeTab = tabName;

    if (tabName === 'barangay') {
      setTimeout(() => {
        this.allBaranggay.forEach((barangay) => {
          if (!barangay.id) return;

          const mapId = 'map-' + barangay.id;
          const mapElement = document.getElementById(mapId);

          if (mapElement && (mapElement as any)._leaflet_map) {
            const map = (mapElement as any)._leaflet_map as L.Map;
            map.invalidateSize();
          } else {
            this.initBarangayMap(barangay);
            this.reverseGeocode(barangay);
          }
        });
      }, 300);
    }
  }

  // ============ BARANGAY LOGIC ============
  async fetchBarangays() {
    try {
      this.allBaranggay = await this.barangayService.getAll();
    } catch (error) {
      console.error('Error fetching barangays:', error);
      this.snackBar.open(
        'Failed to fetch barangays. Please try again.',
        'Close',
        {
          duration: 3000,
        }
      );
    }
  }

  openAddModal(barangayToEdit?: Barangay) {
    this.showAddModal = true;

    if (barangayToEdit) {
      this.newBarangay = { ...barangayToEdit };
      this.imagePreview = this.newBarangay.baranggay_img || null;
      this.editingBarangayId = barangayToEdit.id ?? null;
    } else {
      this.newBarangay = this.getEmptyBarangay();
      this.imageFile = null;
      this.imagePreview = null;
      this.editingBarangayId = null;
    }

    setTimeout(() => {
      if (this.map) this.map.remove();
      this.initModalMap();
    }, 300);
  }

  closeModal() {
    this.showAddModal = false;
    this.newBarangay = this.getEmptyBarangay();
    this.imageFile = null;
    this.imagePreview = null;
    this.editingBarangayId = null;
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }

  getEmptyBarangay(): Barangay {
    return {
      baranggay: '',
      baranggay_img: '',
      barangay_contact: '',
      captain_name: '',
      latitude: 14.5995,
      longitude: 120.9842,
      latLng: { lat: 14.5995, lng: 120.9842 },
      address: '',
      createdAt: new Date(),
    };
  }

  // ============ FILE UPLOAD HANDLER ============
  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.imageFile = file;

      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreview = reader.result as string;
        this.newBarangay.baranggay_img = this.imagePreview!;
      };
      reader.readAsDataURL(file);
    }
  }

  initModalMap() {
    const lat = this.newBarangay.latitude ?? 14.5995;
    const lng = this.newBarangay.longitude ?? 120.9842;

    const mapContainer = document.getElementById('map');
    if (!mapContainer) return;

    if ((mapContainer as any)._leaflet_map) {
      this.map = (mapContainer as any)._leaflet_map as L.Map;
      this.map.invalidateSize();
      this.map.setView([lat, lng], 13);
      return;
    }

    this.map = L.map('map').setView([lat, lng], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: 'Map data © OpenStreetMap contributors',
    }).addTo(this.map);

    const marker = L.marker([lat, lng], { draggable: true }).addTo(this.map);

    marker.on('dragend', () => {
      const pos = marker.getLatLng();
      this.setLatLng(pos.lat, pos.lng);
    });

    this.map.on('click', (e: any) => {
      marker.setLatLng(e.latlng);
      this.setLatLng(e.latlng.lat, e.latlng.lng);
    });

    (L.Control as any)
      .geocoder({ defaultMarkGeocode: false })
      .on('markgeocode', (e: any) => {
        const center = e.geocode.center;
        this.map!.setView(center, 16);
        marker.setLatLng(center);
        this.setLatLng(center.lat, center.lng);
      })
      .addTo(this.map);

    (mapContainer as any)._leaflet_map = this.map;
    setTimeout(() => this.map?.invalidateSize(), 300);
  }

  setLatLng(lat: number, lng: number) {
    this.newBarangay.latitude = lat;
    this.newBarangay.longitude = lng;
    this.newBarangay.latLng = { lat, lng };
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
          this.snackBar.open('Barangay updated successfully!', 'Close', {
            duration: 3000,
          });
        } else {
          await this.barangayService.add(this.newBarangay);
          this.snackBar.open('Barangay added successfully!', 'Close', {
            duration: 3000,
          });
        }
        await this.fetchBarangays();
        this.closeModal();
      } catch (error) {
        console.error('Error submitting barangay:', error);
        this.snackBar.open(
          'Failed to submit barangay. Please try again.',
          'Close',
          {
            duration: 3000,
          }
        );
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
        this.snackBar.open('Barangay deleted successfully!', 'Close', {
          duration: 3000,
        });
      } catch (error) {
        console.error('Error deleting barangay:', error);
        this.snackBar.open('Failed to delete barangay.', 'Close', {
          duration: 3000,
        });
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

  initBarangayMap(barangay: Barangay) {
    if (!barangay.latitude || !barangay.longitude) return;

    const mapId = 'map-' + barangay.id;
    const mapElement = document.getElementById(mapId);
    if (!mapElement) return;

    if ((mapElement as any)._leaflet_map) {
      const existingMap = (mapElement as any)._leaflet_map as L.Map;
      existingMap.invalidateSize();
      return;
    }

    const map = L.map(mapId).setView(
      [barangay.latitude, barangay.longitude],
      16
    );

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: 'Map data © OpenStreetMap contributors',
    }).addTo(map);

    L.marker([barangay.latitude, barangay.longitude])
      .addTo(map)
      .bindPopup(`<b>${barangay.baranggay}</b>`);

    (mapElement as any)._leaflet_map = map;
  }

  reverseGeocode(barangay: Barangay) {
    if (!barangay.latitude || !barangay.longitude) return;

    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${barangay.latitude}&lon=${barangay.longitude}`;
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        barangay.address = data.display_name;
      })
      .catch((err) => console.error('Geocoding error:', err));
  }

  // ============ INCIDENT LOGIC ============
  openIncidentModal() {
    this.showAddIncidentModal = true;
  }

  closeIncidentModal() {
    this.showAddIncidentModal = false;
    this.newIncident = { id: '', name: '', icon: '', tips: [], types: [] };
    this.newTip = '';
    this.newTypeName = '';
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

  addType() {
    if (this.newTypeName.trim()) {
      const newType = {
        id: Date.now().toString(),
        name: this.newTypeName.trim(),
      };
      this.newIncident.types.push(newType);
      this.newTypeName = '';
    }
  }

  removeType(index: number) {
    this.newIncident.types.splice(index, 1);
  }

  async submitIncident() {
    if (this.newIncident.name && this.newIncident.icon) {
      this.isSubmitting = true;
      try {
        if (this.newIncident.id) {
          await this.incidentService.update(
            this.newIncident.id,
            this.newIncident
          );
          this.snackBar.open('Incident updated successfully!', 'Close', {
            duration: 3000,
          });
        } else {
          await this.incidentService.add(this.newIncident);
          this.snackBar.open('Incident added successfully!', 'Close', {
            duration: 3000,
          });
        }
        this.closeIncidentModal();
      } catch (error) {
        this.snackBar.open(
          'Failed to submit incident. Please try again.',
          'Close',
          {
            duration: 3000,
          }
        );
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
        this.snackBar.open('Incident deleted successfully!', 'Close', {
          duration: 3000,
        });
        this.openIncidentDropdownIndex = null;
      } catch (error) {
        this.snackBar.open('Failed to delete incident.', 'Close', {
          duration: 3000,
        });
      } finally {
        this.isSubmitting = false;
      }
    }
  }
}
