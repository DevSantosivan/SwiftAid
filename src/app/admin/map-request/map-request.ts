import {
  Component,
  OnDestroy,
  NgZone,
  OnInit,
  ViewChild,
  ElementRef,
  AfterViewInit,
} from '@angular/core';
import { EmergencyRequestService } from '../../core/rescue_request.service';
import { EmergencyRequest } from '../../model/emergency';
import { CommonModule } from '@angular/common';
import { Firestore, doc, getDoc, Timestamp } from '@angular/fire/firestore';
import { Subscription } from 'rxjs';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import * as L from 'leaflet';
import ChartDataLabels from 'chartjs-plugin-datalabels';

import { Chart, registerables } from 'chart.js';
Chart.register(...registerables, ChartDataLabels);

@Component({
  selector: 'app-map-request',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './map-request.html',
  styleUrls: ['./map-request.scss'],
})
export class MapRequest implements AfterViewInit, OnDestroy, OnInit {
  requests: EmergencyRequest[] = [];
  filteredRequests: EmergencyRequest[] = [];
  activeFilter: string = 'All';

  filterStartDate?: string;
  filterEndDate?: string;
  currentPage: number = 1;

  map!: L.Map;

  staffLocation: L.LatLngExpression = [12.3622, 121.0671];
  staffMarker?: L.Marker;
  routeLine?: L.Polyline;

  loadingRequests = false;
  isLoading = true;

  currentStaff: any = null;
  private currentRequestId: string | null = null;

  private watchId?: number;
  private requestSubscription?: Subscription;
  itemsPerPage: number = 5;

  markers: Map<string, L.Marker> = new Map();
  activeMarker?: L.Marker;

  staffDetailsMap: Record<string, { first_name: string; last_name: string }> =
    {};

  readonly GEOFENCE_RADIUS_METERS = 10000; // 10 km
  geofenceCircle?: L.Circle;

  @ViewChild('pieChartCanvas') pieChartCanvas!: ElementRef<HTMLCanvasElement>;
  pieChart!: Chart;

  constructor(
    private requestService: EmergencyRequestService,
    private firestore: Firestore,
    private ngZone: NgZone,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initializeMap();
    this.subscribeToRequests();
    this.loadCurrentStaff(); // preload staff details
    this.setInitialStaffLocation(); // preload staff location
    document.body.style.overflow = 'hidden';
  }

  ngAfterViewInit(): void {
    this.createPieChart();
    const canvas = this.pieChartCanvas.nativeElement;
    canvas.width = 600;
    canvas.height = 450;
  }

  ngOnDestroy(): void {
    this.requestSubscription?.unsubscribe();
    if (this.pieChart) {
      this.pieChart.destroy();
    }
    document.body.style.overflow = '';
  }

  get totalPages(): number {
    return Math.ceil(this.filteredRequests.length / this.itemsPerPage);
  }

  get paginatedRequests(): EmergencyRequest[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredRequests.slice(start, start + this.itemsPerPage);
  }

  goToNextPage(): void {
    if (this.currentPage < this.totalPages) this.currentPage++;
  }

  goToPreviousPage(): void {
    if (this.currentPage > 1) this.currentPage--;
  }

  initializeMap(): void {
    const sanJoseCenter: L.LatLngExpression = [12.3622, 121.0671];

    this.map = L.map('requestMap').setView(sanJoseCenter, 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(this.map);

    this.geofenceCircle = L.circle(sanJoseCenter, {
      radius: this.GEOFENCE_RADIUS_METERS,
      color: 'red',
      weight: 3,
      fillColor: 'red',
      fillOpacity: 0.1,
    }).addTo(this.map);

    this.map.setMaxBounds(this.geofenceCircle.getBounds());
  }

  get pendingCount(): number {
    return this.filteredRequests.filter((r) => r.status === 'Pending').length;
  }

  get inProgressCount(): number {
    return this.filteredRequests.filter((r) => r.status === 'Responding')
      .length;
  }

  get resolvedCount(): number {
    return this.filteredRequests.filter((r) => r.status === 'Resolved').length;
  }

  get totalCount(): number {
    return this.filteredRequests.length;
  }

  subscribeToRequests(): void {
    this.requestSubscription = this.requestService
      .getRequestRealtime()
      .subscribe({
        next: async (requests) => {
          this.ngZone.run(async () => {
            this.requests = requests.map((req) => {
              let timestampDate: Date | null = null;
              if (req.timestamp instanceof Timestamp) {
                timestampDate = req.timestamp.toDate();
              } else if (typeof req.timestamp === 'string') {
                timestampDate = new Date(req.timestamp);
              } else if (req.timestamp instanceof Date) {
                timestampDate = req.timestamp;
              }
              return { ...req, timestamp: timestampDate };
            });

            const staffIdsToFetch = this.requests
              .map((r) => r.staffId)
              .filter((id): id is string => !!id && !this.staffDetailsMap[id]);

            for (const staffId of staffIdsToFetch) {
              try {
                const docRef = doc(this.firestore, `users/${staffId}`);
                const snap = await getDoc(docRef);
                if (snap.exists()) {
                  const data = snap.data();
                  this.staffDetailsMap[staffId] = {
                    first_name: data['first_name'] || '',
                    last_name: data['last_name'] || '',
                  };
                }
              } catch (err) {}
            }

            this.applyFilter(this.activeFilter);
          });
        },
      });
  }

  getStaffFullName(staffId?: string): string {
    if (!staffId) return '';
    const staff = this.staffDetailsMap[staffId];
    return staff ? `${staff.first_name} ${staff.last_name}` : 'Unknown Staff';
  }

  applyFilter(status: string): void {
    this.activeFilter = status;
    this.currentPage = 1;

    const from = this.filterStartDate ? new Date(this.filterStartDate) : null;
    const to = this.filterEndDate ? new Date(this.filterEndDate) : null;

    this.filteredRequests = this.requests.filter((req) => {
      const matchesStatus = status === 'All' || req.status === status;
      const requestDate = req.timestamp instanceof Date ? req.timestamp : null;
      const matchesDate =
        (!from || (requestDate && requestDate >= from)) &&
        (!to || (requestDate && requestDate <= to));
      return matchesStatus && matchesDate;
    });

    this.updateMarkers();
    this.updatePieChartData();
  }

  onDateFilterChange(): void {
    this.applyFilter(this.activeFilter);
  }

  ViewRequest(req: EmergencyRequest) {
    this.router.navigate(['/superAdmin/EmergencyRequest', req.id]);
  }

  private async loadCurrentStaff() {
    try {
      const auth = (await import('firebase/auth')).getAuth();
      const user = auth.currentUser;
      if (user) {
        const userDoc = await getDoc(doc(this.firestore, `users/${user.uid}`));
        if (userDoc.exists()) {
          this.currentStaff = { uid: user.uid, ...userDoc.data() };
        }
      }
    } catch (err) {
      console.error('Failed to load current staff', err);
    }
  }

  private async setInitialStaffLocation() {
    return new Promise<void>((resolve, reject) => {
      if (!navigator.geolocation) {
        reject('Geolocation not supported');
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          this.staffLocation = [pos.coords.latitude, pos.coords.longitude];
          resolve();
        },
        (err) => {
          console.error('Error getting location:', err);
          reject(err);
        }
      );
    });
  }

  async acceptRequest(req: EmergencyRequest) {
    try {
      if (!this.currentStaff) {
        await this.loadCurrentStaff();
      }
      if (!this.staffLocation) {
        await this.setInitialStaffLocation();
      }

      if (!this.currentStaff || !this.staffLocation) {
        alert('Staff or location not available.');
        return;
      }

      if (req.status === 'Pending') {
        const [lat, lng] = this.staffLocation as [number, number];
        await this.requestService.updateRequestWithStaffInfo(
          req.id!,
          {
            uid: this.currentStaff.uid,
            first_name: this.currentStaff.first_name,
            last_name: this.currentStaff.last_name,
            email: this.currentStaff.email,
            lat,
            lng,
          },
          true
        );
      }

      this.currentRequestId = req.id!;
      this.router.navigate(['/admin/EmergencyRequest', req.id]);
    } catch (err) {
      console.error('Accept request failed:', err);
      alert('Failed to accept request.');
    }
  }

  updateMarkers() {
    this.markers.forEach((m) => m.remove());
    this.markers.clear();

    this.filteredRequests.forEach((req) => {
      if (req.latitude && req.longitude) {
        const profileIcon = L.divIcon({
          className: 'profile-marker',
          html: `<div style="
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background-image: url('${req.image || 'assets/logo22.png'}');
            background-size: cover;
            background-position: center;
            border: 3px solid white;
          "></div>`,
          iconSize: [40, 40],
          iconAnchor: [20, 20],
          popupAnchor: [0, -20],
        });

        const marker = L.marker([req.latitude, req.longitude], {
          icon: profileIcon,
        }).addTo(this.map);

        marker.bindPopup(`
  <div style="text-align: center;">
    <img src="${req.image || 'assets/logo22.png'}" 
         alt="User Image" 
         style="width: 100%; height: 80px; border-radius: 2%; margin-bottom: 5px; object-fit: cover; border: 2px solid #ccc;" />
    <br>
    <b>${req.name}</b><br>
    Status: ${req.status}<br>
    Staff: ${this.getStaffFullName(req.staffId)}
  </div>
`);

        this.markers.set(req.id, marker);
      }
    });
  }

  highlightMarker(req: EmergencyRequest) {
    if (this.activeMarker) {
      const prevDiv = this.activeMarker.getElement();
      if (prevDiv) {
        const circle = prevDiv.querySelector('div') as HTMLElement;
        if (circle) circle.style.border = '3px solid white';
      }
    }

    const marker = this.markers.get(req.id);
    if (marker) {
      const iconDiv = marker.getElement();
      if (iconDiv) {
        const circle = iconDiv.querySelector('div') as HTMLElement;
        if (circle) circle.style.border = '3px solid red';
      }

      marker.openPopup();
      this.map.setView(marker.getLatLng(), 14, { animate: true });
      this.activeMarker = marker;
    }
  }

  createPieChart() {
    if (this.pieChart) {
      this.pieChart.destroy();
    }

    this.pieChart = new Chart(this.pieChartCanvas.nativeElement, {
      type: 'doughnut',
      data: {
        labels: ['Pending', 'In Progress', 'Resolved'],
        datasets: [
          {
            data: [this.pendingCount, this.inProgressCount, this.resolvedCount],
            backgroundColor: ['#FFCE56', '#36A2EB', '#236e2dff'],
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              font: { size: 14 },
            },
          },
          tooltip: {
            enabled: true,
          },
          datalabels: {
            color: '#fff',
            font: {
              size: 14,
              weight: 'bold',
            },
            formatter: (value: number, ctx: any) => {
              const total = ctx.chart.data.datasets[0].data.reduce(
                (acc: number, curr: number) => acc + curr,
                0
              );
              const percentage = ((value / total) * 100).toFixed(1);
              return `${value} (${percentage}%)`;
            },
          },
        },
      },
      plugins: [ChartDataLabels], // ✅ Attach plugin
    });
  }

  updatePieChartData() {
    if (this.pieChart) {
      this.pieChart.data.datasets[0].data = [
        this.pendingCount,
        this.inProgressCount,
        this.resolvedCount,
      ];
      this.pieChart.update();
    }
  }
}
