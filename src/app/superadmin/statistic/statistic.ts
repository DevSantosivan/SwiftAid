import {
  Component,
  OnInit,
  NgZone,
  ViewChild,
  ElementRef,
  AfterViewInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { EmergencyRequestService } from '../../core/rescue_request.service';
import { EmergencyRequest } from '../../model/emergency';
import { Subscription } from 'rxjs';
import { Chart, registerables } from 'chart.js';
import * as L from 'leaflet';
import 'leaflet.heat';

Chart.register(...registerables);

@Component({
  selector: 'app-statistic',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './statistic.html',
  styleUrls: ['./statistic.scss'],
})
export class Statistic implements OnInit, AfterViewInit, OnDestroy {
  requests: EmergencyRequest[] = [];
  incidentLocation: string = '';
  stats = [
    { label: 'Total Requests', value: 0 },
    { label: 'Pending', value: 0 },
    { label: 'Completed', value: 0 },
    { label: 'Cancelled', value: 0 },
  ];

  recommendations: string[] = [];

  @ViewChild('eventChartCanvas')
  eventChartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('streetChartCanvas')
  streetChartCanvas!: ElementRef<HTMLCanvasElement>;

  eventChart!: Chart;
  streetChart!: Chart;
  map!: L.Map;
  private requestSub?: Subscription;
  private streetCache: { [key: string]: string } = {};

  constructor(
    private requestService: EmergencyRequestService,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    this.subscribeToRealtimeRequests();
  }

  ngAfterViewInit(): void {
    this.initMap();
  }

  ngOnDestroy(): void {
    this.requestSub?.unsubscribe();
    this.eventChart?.destroy();
    this.streetChart?.destroy();
    this.map?.remove();
  }

  subscribeToRealtimeRequests(): void {
    this.requestSub = this.requestService
      .getRequestRealtime()
      .subscribe(async (requests) => {
        this.ngZone.run(async () => {
          this.requests = requests;
          this.updateStats();
          this.generateRecommendations();
          this.updateMapMarkers();
          await this.updateEventChart();
          await this.updateStreetChart();
        });
      });
  }

  updateStats(): void {
    const total = this.requests.length;
    const pending = this.requests.filter((r) => r.status === 'Pending').length;
    const completed = this.requests.filter(
      (r) => r.status === 'Completed'
    ).length;
    const cancelled = this.requests.filter(
      (r) => r.status === 'Cancelled'
    ).length;

    this.stats = [
      { label: 'Total Requests', value: total },
      { label: 'Pending', value: pending },
      { label: 'Completed', value: completed },
      { label: 'Cancelled', value: cancelled },
    ];
  }

  async updateEventChart(): Promise<void> {
    const eventCounts: { [event: string]: number } = {};
    this.requests.forEach((req) => {
      eventCounts[req.event] = (eventCounts[req.event] || 0) + 1;
    });

    if (this.eventChart) this.eventChart.destroy();

    this.eventChart = new Chart(this.eventChartCanvas.nativeElement, {
      type: 'pie',
      data: {
        labels: Object.keys(eventCounts),
        datasets: [
          {
            data: Object.values(eventCounts),
            backgroundColor: ['#e74c3c', '#3498db', '#2ecc71', '#9b59b6'],
          },
        ],
      },
      options: {
        responsive: true,
      },
    });
  }

  async updateStreetChart(): Promise<void> {
    const streetCounts: { [street: string]: number } = {};

    for (const req of this.requests) {
      if (!req.latitude || !req.longitude) continue;
      const key = `${req.latitude},${req.longitude}`;
      const street = await this.reverseGeocode(req.latitude, req.longitude);
      streetCounts[street] = (streetCounts[street] || 0) + 1;
    }

    if (this.streetChart) this.streetChart.destroy();

    this.streetChart = new Chart(this.streetChartCanvas.nativeElement, {
      type: 'bar',
      data: {
        labels: Object.keys(streetCounts),
        datasets: [
          {
            label: 'Requests per Street',
            data: Object.values(streetCounts),
            backgroundColor: '#c93e3eff',
          },
        ],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        plugins: {
          legend: { display: false },
        },
        scales: {
          x: { beginAtZero: true },
        },
      },
    });
  }

  async reverseGeocode(lat: number, lon: number): Promise<string> {
    const key = `${lat},${lon}`;
    if (this.streetCache[key]) return this.streetCache[key];

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`
      );
      const data = await res.json();
      const street = data?.address?.road || 'Unknown Street';
      this.streetCache[key] = street;
      return street;
    } catch (e) {
      console.error('Reverse geocoding error:', e);
      return 'Unknown Street';
    }
  }

  generateRecommendations(): void {
    const pending = this.requests.filter((r) => r.status === 'Pending').length;
    const completed = this.requests.filter(
      (r) => r.status === 'Completed'
    ).length;

    this.recommendations = [];

    if (pending > completed) {
      this.recommendations.push('⚠️ Assign more staff to pending requests.');
    }
    if (completed / (this.requests.length || 1) < 0.5) {
      this.recommendations.push('📈 Improve response efficiency and training.');
    }
    if (this.requests.filter((r) => r.event === 'Fire').length > 5) {
      this.recommendations.push(
        '🔥 Prepare additional fire-fighting resources.'
      );
    }
    if (this.requests.filter((r) => r.event === 'Medical').length > 5) {
      this.recommendations.push(
        '🏥 Coordinate with hospitals for surge capacity.'
      );
    }
    if (this.recommendations.length === 0) {
      this.recommendations.push(
        '✅ System stable. Keep monitoring ongoing requests.'
      );
    }
  }

  initMap(): void {
    this.map = L.map('map').setView([12.3609, 121.0675], 13); // San Jose Occidental Mindoro
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(this.map);
  }

  updateMapMarkers(): void {
    if (!this.map) return;

    // Remove old heat layers if any
    this.map.eachLayer((layer) => {
      if ((layer as any)._heat) {
        this.map.removeLayer(layer);
      }
    });

    const heatPoints: [number, number, number][] = this.requests
      .filter((r) => r.latitude && r.longitude)
      .map((r) => [r.latitude!, r.longitude!, 0.5]); // 0.5 is intensity

    if (heatPoints.length === 0) return;

    const heatLayer = (L as any).heatLayer(heatPoints, {
      radius: 25,
      blur: 15,
      maxZoom: 17,
      gradient: {
        0.1: 'blue',
        0.3: 'lime',
        0.6: 'orange',
        1.0: 'red',
      },
    });

    heatLayer.addTo(this.map);
  }

  getEventColor(event: string): string {
    switch (event.toLowerCase()) {
      case 'car accident':
        return 'red';
      case 'stroke':
        return 'blue';
      case 'medical':
        return 'green';
      case 'fire':
        return 'orange';
      default:
        return 'purple';
    }
  }
}
