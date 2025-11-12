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
    this.stats = [
      { label: 'Total Requests', value: total },
      { label: 'Pending', value: pending },
    ];
  }

  /** ⚡ Faster chart update (no waiting for API) */
  async updateChartsFast(): Promise<void> {
    const eventCounts: Record<string, number> = {};
    const streetCounts: Record<string, number> = {};

    // Quick event chart (no delay)
    this.requests.forEach((r) => {
      eventCounts[r.event] = (eventCounts[r.event] || 0) + 1;
    });
    this.renderChart(
      this.eventChartCanvas,
      'pie',
      eventCounts,
      this.eventChart,
      (chart) => (this.eventChart = chart)
    );

    // Start async background street processing
    const tasks = this.requests.map(async (r) => {
      if (r.latitude && r.longitude) {
        const key = `${r.latitude},${r.longitude}`;
        if (!this.streetCache[key]) {
          this.streetCache[key] = await this.reverseGeocode(
            r.latitude,
            r.longitude
          );
        }
        const street = this.streetCache[key];
        streetCounts[street] = (streetCounts[street] || 0) + 1;
      }
    });

    // ⚡ Don't wait — update immediately with placeholders
    this.renderChart(
      this.streetChartCanvas,
      'bar',
      streetCounts,
      this.streetChart,
      (chart) => (this.streetChart = chart),
      true
    );

    // ✅ When reverse geocoding finishes, refresh only once
    Promise.allSettled(tasks).then(() => {
      this.renderChart(
        this.streetChartCanvas,
        'bar',
        streetCounts,
        this.streetChart,
        (chart) => (this.streetChart = chart),
        true
      );
    });
  }

  renderChart(
    canvasRef: ElementRef<HTMLCanvasElement>,
    type: 'pie' | 'bar',
    dataMap: Record<string, number>,
    existingChart: Chart | undefined,
    setChart: (chart: Chart) => void,
    isHorizontal = false
  ): void {
    const labels = Object.keys(dataMap);
    const data = Object.values(dataMap);
    if (!canvasRef?.nativeElement) return;

    if (existingChart) existingChart.destroy();

    const newChart = new Chart(canvasRef.nativeElement, {
      type,
      data: {
        labels,
        datasets: [
          {
            label: 'Count',
            data,
            backgroundColor:
              type === 'pie'
                ? ['#e74c3c', '#3498db', '#2ecc71', '#9b59b6', '#f1c40f']
                : '#e74c3c',
          },
        ],
      },
      options: {
        indexAxis: isHorizontal ? 'y' : 'x',
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: type === 'pie' } },
        scales: { x: { beginAtZero: true } },
        animation: { duration: 300 }, // smoother, faster
      },
    });

    setChart(newChart);
  }

  /** ✅ Cached reverse geocode with fail-safe */
  async reverseGeocode(lat: number, lon: number): Promise<string> {
    const key = `${lat},${lon}`;
    if (this.streetCache[key]) return this.streetCache[key];

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`,
        { headers: { 'User-Agent': 'RescueDashboard/1.0' } }
      );
      const data = await res.json();
      const street = data?.address?.road || 'Unknown Street';
      this.streetCache[key] = street;
      return street;
    } catch {
      this.streetCache[key] = 'Unknown Street';
      return 'Unknown Street';
    }
  }

  /** ✅ Map + glowing markers */
  initMap(): void {
    this.map = L.map('map').setView([12.3609, 121.0675], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(this.map);
    this.markerLayer = L.layerGroup().addTo(this.map);
  }

  updateCustomMarkers(): void {
    if (!this.map || !this.markerLayer) return;
    this.markerLayer.clearLayers();

    this.requests
      .filter((r) => r.latitude && r.longitude)
      .forEach((r) => {
        const color =
          r.event === 'Heart attack'
            ? 'red'
            : r.event === 'Vehicular'
            ? 'blue'
            : r.event === 'Flood'
            ? 'aqua'
            : r.event === 'Crime'
            ? 'purple'
            : 'orange';

        const icon = L.divIcon({
          className: 'custom-pulse-marker',
          html: `<div class="pulse" style="background:${color}"></div>`,
          iconSize: [20, 20],
        });

        L.marker([r.latitude!, r.longitude!], { icon })
          .bindPopup(
            `<b>${r.event}</b><br>Status: ${r.status}<br>${r.latitude.toFixed(
              3
            )}, ${r.longitude.toFixed(3)}`
          )
          .addTo(this.markerLayer!);
      });
  }

  generateRecommendations(): void {
    const pending = this.requests.filter((r) => r.status === 'Pending').length;
    const completed = this.requests.filter(
      (r) => r.status === 'Completed'
    ).length;

    this.recommendations = [];
    if (pending > completed)
      this.recommendations.push('⚠️ Assign more staff to pending requests.');
    if (completed / (this.requests.length || 1) < 0.5)
      this.recommendations.push('📈 Improve response efficiency.');
    if (this.requests.filter((r) => r.event === 'Fire').length > 5)
      this.recommendations.push(
        '🔥 Prepare additional fire-fighting resources.'
      );
    if (this.requests.filter((r) => r.event === 'Medical').length > 5)
      this.recommendations.push('🏥 Coordinate with hospitals.');
    if (this.recommendations.length === 0)
      this.recommendations.push('✅ System stable. Keep monitoring.');
  }
}
