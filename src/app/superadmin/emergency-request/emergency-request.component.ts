import {
  Component,
  OnDestroy,
  NgZone,
  OnInit,
  ViewChild,
  ElementRef,
  AfterViewInit,
  Input,
  HostListener,
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
  selector: 'app-emergency-request',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './emergency-request.component.html',
  styleUrls: ['./emergency-request.component.scss'],
})
export class EmergencyRequestComponent
  implements OnInit, OnDestroy, AfterViewInit
{
  @Input() fallback: string = 'assets/profile-default.jpg';

  @HostListener('error', ['$event'])
  onError(event: Event) {
    const element = event.target as HTMLImageElement;
    element.src = this.fallback;
  }
  parseDate(date: any): Date | null {
    if (!date) return null;

    // Firestore Timestamp
    if (date.toDate && typeof date.toDate === 'function') {
      return date.toDate();
    }

    // If it's already a Date instance
    if (date instanceof Date) {
      return date;
    }

    // If it's a string, try converting
    if (typeof date === 'string' || date instanceof String) {
      const parsedDate = new Date(date.toString());
      return isNaN(parsedDate.getTime()) ? null : parsedDate;
    }

    return null;
  }

  requests: EmergencyRequest[] = [];
  filteredRequests: EmergencyRequest[] = [];
  activeFilter: string = 'All';

  filterStartDate?: string;
  filterEndDate?: string;
  currentPage: number = 1;
  itemsPerPage: number = 5;

  map!: L.Map;
  markers: Map<string, L.Marker> = new Map();
  activeMarker?: L.Marker;

  private requestSubscription?: Subscription;

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
  }

  ngAfterViewInit(): void {
    this.createPieChart();
    const canvas = this.pieChartCanvas.nativeElement;
    canvas.width = 600; // increase width
    canvas.height = 450;
  }

  ngOnDestroy(): void {
    this.requestSubscription?.unsubscribe();
    if (this.pieChart) {
      this.pieChart.destroy();
    }
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

  updateMarkers() {
    this.markers.forEach((m) => m.remove());
    this.markers.clear();

    this.filteredRequests.forEach((req) => {
      if (req.latitude && req.longitude) {
        const profileIcon = L.divIcon({
          className: 'custom-pulse-marker',
          html: '<div class="pulse"></div>',
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        });

        const marker = L.marker([req.latitude, req.longitude], {
          icon: profileIcon,
        }).addTo(this.map);

        marker.bindPopup(
          `<b>${req.name}</b><br>Status: ${
            req.status
          }<br>Staff: ${this.getStaffFullName(req.staffId)}`
        );

        this.markers.set(req.id, marker);
      }
    });

    //  if (req.latitude && req.longitude) {
    //    // ✅ Kung may image, gamitin bilang marker icon
    //    const profileIcon = req.profilePicture
    //      ? L.icon({
    //          iconUrl: String(req.profilePicture),
    //          iconSize: [40, 40], // size ng image
    //          iconAnchor: [20, 40], // anchor point (para sa bottom center)
    //          popupAnchor: [0, -40], // position ng popup relative sa icon
    //        })
    //      : L.divIcon({
    //          className: 'custom-pulse-marker',
    //          html: '<div class="pulse"></div>',
    //          iconSize: [20, 20],
    //          iconAnchor: [10, 10],
    //        });

    //    const marker = L.marker([req.latitude, req.longitude], {
    //      icon: profileIcon,
    //    }).addTo(this.map);

    //    marker.bindPopup(`
    //     <b>${req.name}</b><br>
    //     Status: ${req.status}<br>
    //     Staff: ${this.getStaffFullName(req.staffId)}
    //   `);

    //    this.markers.set(req.id, marker);
    //  }
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
