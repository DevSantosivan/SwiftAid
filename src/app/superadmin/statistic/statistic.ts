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

  stats = [
    { label: 'Total Requests', value: 0 },
    { label: 'Pending', value: 0 },
  ];

  incidentLocation = '';
  recommendations: string[] = [];

  @ViewChild('eventChartCanvas')
  eventChartCanvas!: ElementRef<HTMLCanvasElement>;

  @ViewChild('streetChartCanvas')
  streetChartCanvas!: ElementRef<HTMLCanvasElement>;

  private requestSub?: Subscription;
  private streetCache: Record<string, string> = {};
  private updateTimeout?: any;

  eventChart?: Chart;
  streetChart?: Chart;
  map?: L.Map;
  markerLayer?: L.LayerGroup;

  /** ✅ SHARED COLOR MAP (Used by Chart + Map) */
  private eventColorMap: Record<string, string> = {
    // 🔴 Medical / Ambulance
    'Heart attack': '#e74c3c',
    'Cardiac arrest': '#c0392b',
    Stroke: '#8e44ad',
    Unconscious: '#34495e',
    'Difficulty breathing': '#3498db',
    'Severe bleeding': '#ff0000',
    Fracture: '#f39c12',
    'Accident injury': '#d35400',
    'High blood pressure': '#e84393',
    Seizure: '#6c5ce7',
    'Allergic reaction': '#00cec9',
    Poisoning: '#16a085',
    'Labor emergency': '#fd79a8',
    'Diabetic emergency': '#00b894',
    'Chest pain': '#ff7675',
    Trauma: '#2d3436',

    // 🔵 Existing Non-Medical (hindi inalis)
    Vehicular: '#3498db',
    Flood: '#1abc9c',
    Crime: '#9b59b6',
    Fire: '#e67e22',
    Medical: '#2ecc71',

    // 🟠 Additional Emergency Types
    'Road accident': '#e17055',
    Drowning: '#0984e3',
    Explosion: '#d63031',
    'Collapsed building': '#636e72',
    'Gas leak': '#00b894',
    'Earthquake injury': '#6c5ce7',
  };

  constructor(
    private requestService: EmergencyRequestService,
    private ngZone: NgZone,
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

  /** ✅ Real-time Firestore listener */
  subscribeToRealtimeRequests(): void {
    this.requestSub = this.requestService
      .getRequestRealtime()
      .subscribe((requests) => {
        this.ngZone.run(() => {
          this.requests = requests;
          this.updateStats();
          this.generateRecommendations();

          clearTimeout(this.updateTimeout);
          this.updateTimeout = setTimeout(() => {
            this.updateCustomMarkers();
            this.updateChartsFast();
          }, 300);
        });
      });
  }

  updateStats(): void {
    const total = this.requests.length;
    const pending = this.requests.filter((r) => r.status === 'Pending').length;
    const resolved = this.requests.filter(
      (r) => r.status === 'Resolved',
    ).length;

    this.stats = [
      { label: 'Total Requests', value: total },
      { label: 'Pending', value: pending },
      { label: 'Resolved', value: resolved },
    ];
  }

  /** ✅ Fast Chart Update */
  async updateChartsFast(): Promise<void> {
    const eventCounts: Record<string, number> = {};
    const streetCounts: Record<string, number> = {};

    // Count events
    this.requests.forEach((r) => {
      eventCounts[r.event] = (eventCounts[r.event] || 0) + 1;
    });

    /** 🔥 PIE CHART with SAME COLORS as markers */
    const eventLabels = Object.keys(eventCounts);
    const eventData = Object.values(eventCounts);

    const eventColors = eventLabels.map(
      (label) => this.eventColorMap[label] || '#95a5a6',
    );

    if (this.eventChart) this.eventChart.destroy();

    this.eventChart = new Chart(this.eventChartCanvas.nativeElement, {
      type: 'pie',
      data: {
        labels: eventLabels,
        datasets: [
          {
            data: eventData,
            backgroundColor: eventColors,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 300 },
      },
    });

    /** 🔄 Street Chart (Async reverse geocode) */
    const tasks = this.requests.map(async (r) => {
      if (r.latitude && r.longitude) {
        const key = `${r.latitude},${r.longitude}`;

        if (!this.streetCache[key]) {
          this.streetCache[key] = await this.reverseGeocode(
            r.latitude,
            r.longitude,
          );
        }

        const street = this.streetCache[key];
        streetCounts[street] = (streetCounts[street] || 0) + 1;
      }
    });

    this.renderStreetChart(streetCounts);

    Promise.allSettled(tasks).then(() => {
      this.renderStreetChart(streetCounts);
    });
  }

  renderStreetChart(dataMap: Record<string, number>): void {
    const labels = Object.keys(dataMap);
    const data = Object.values(dataMap);

    if (this.streetChart) this.streetChart.destroy();

    this.streetChart = new Chart(this.streetChartCanvas.nativeElement, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Requests',
            data,
            backgroundColor: '#e74c3c',
          },
        ],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 300 },
        scales: {
          x: { beginAtZero: true },
        },
      },
    });
  }

  /** ✅ Cached Reverse Geocode */
  async reverseGeocode(lat: number, lon: number): Promise<string> {
    const key = `${lat},${lon}`;
    if (this.streetCache[key]) return this.streetCache[key];

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`,
        { headers: { 'User-Agent': 'RescueDashboard/1.0' } },
      );

      const data = await res.json();

      // Try multiple fields for best street/place name
      const street =
        data?.address?.road ||
        data?.address?.pedestrian ||
        data?.address?.footway ||
        data?.address?.neighbourhood ||
        data?.address?.suburb ||
        data?.address?.city_district ||
        data?.address?.city ||
        data?.address?.county ||
        'Unknown Street';

      // Cache result
      this.streetCache[key] = street;
      return street;
    } catch (error) {
      console.error('Reverse geocode error:', error);
      this.streetCache[key] = 'Unknown Street';
      return 'Unknown Street';
    }
  }

  /** ✅ Map Init */
  initMap(): void {
    this.map = L.map('map').setView([12.3609, 121.0675], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(this.map);

    this.markerLayer = L.layerGroup().addTo(this.map);
  }

  /** 🔥 Map Markers using SAME COLORS */
  updateCustomMarkers(): void {
    if (!this.map || !this.markerLayer) return;

    this.markerLayer.clearLayers();

    this.requests
      .filter((r) => r.latitude && r.longitude)
      .forEach((r) => {
        const color = this.eventColorMap[r.event] || '#95a5a6';

        const icon = L.divIcon({
          className: 'custom-pulse-marker',
          html: `<div class="pulse" style="background:${color}"></div>`,
          iconSize: [10, 10],
        });

        L.marker([r.latitude!, r.longitude!], { icon })
          .bindPopup(
            `<b>${r.event}</b><br>Status: ${r.status}<br>${r.latitude!.toFixed(
              3,
            )}, ${r.longitude!.toFixed(3)}`,
          )
          .addTo(this.markerLayer!);
      });
  }

  /** ✅ Smart Recommendations */
  generateRecommendations(): void {
    const pending = this.requests.filter((r) => r.status === 'Pending').length;
    const completed = this.requests.filter(
      (r) => r.status === 'Completed',
    ).length;

    this.recommendations = [];

    if (pending > completed)
      this.recommendations.push('⚠️ Assign more staff to pending requests.');

    if (completed / (this.requests.length || 1) < 0.5)
      this.recommendations.push('📈 Improve response efficiency.');

    if (this.requests.filter((r) => r.event === 'Fire').length > 5)
      this.recommendations.push(
        '🔥 Prepare additional fire-fighting resources.',
      );

    if (this.requests.filter((r) => r.event === 'Medical').length > 5)
      this.recommendations.push('🏥 Coordinate with hospitals.');

    if (this.recommendations.length === 0)
      this.recommendations.push('✅ System stable. Keep monitoring.');
  }
}
