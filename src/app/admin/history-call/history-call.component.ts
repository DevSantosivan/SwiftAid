import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { EmergencyRequest } from '../../model/emergency';
import { EmergencyRequestService } from '../../core/rescue_request.service';
import { AuthService } from '../../core/auth.service';

import { Chart, registerables } from 'chart.js';
import { RouterLink } from '@angular/router';
Chart.register(...registerables);

@Component({
  selector: 'app-history-call',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './history-call.component.html',
  styleUrls: ['./history-call.component.scss'],
})
export class HistoryCallComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('requestStatusBarChart')
  requestStatusBarChart!: ElementRef<HTMLCanvasElement>;

  activeTab: 'all' | 'resolved' | 'cancelled' = 'all';

  allRequests: EmergencyRequest[] = [];
  resolvedRequests: EmergencyRequest[] = [];
  cancelledRequests: EmergencyRequest[] = [];

  filteredAllRequests: EmergencyRequest[] = [];
  filteredResolvedRequests: EmergencyRequest[] = [];
  filteredCancelledRequests: EmergencyRequest[] = [];

  searchTerm: string = '';
  selectedRequests: EmergencyRequest[] = [];
  showBulkMenu = false;

  requestToView?: EmergencyRequest;

  requestEventBarChart?: Chart;

  constructor(
    private emergencyRequestService: EmergencyRequestService,
    private authService: AuthService
  ) {}

  async ngOnInit() {
    await this.loadRequests();
  }

  ngAfterViewInit() {
    this.updateMonthlyEventBarChart(this.getCurrentFilteredRequests());
  }

  ngOnDestroy() {
    this.requestEventBarChart?.destroy();
  }

  async loadRequests() {
    try {
      const currentUser = await this.authService.getCurrentUser();
      const currentUserId = currentUser?.uid;
      if (!currentUserId) return;

      const fetchedRequests =
        await this.emergencyRequestService.getRequestResolved();
      const userRequests = fetchedRequests.filter(
        (r) => r.staffId === currentUserId
      );

      this.resolvedRequests = userRequests.filter(
        (r) => r.status?.toLowerCase() === 'resolved'
      );
      this.cancelledRequests = userRequests.filter(
        (r) => r.status?.toLowerCase() === 'cancelled'
      );
      this.allRequests = [...this.resolvedRequests, ...this.cancelledRequests];

      this.applyFilters();
    } catch (error) {
      console.error('Error loading requests:', error);
    }
  }

  applyFilters() {
    const term = this.searchTerm.trim().toLowerCase();

    this.filteredResolvedRequests = this.filterBySearch(
      this.resolvedRequests,
      term
    );
    this.filteredCancelledRequests = this.filterBySearch(
      this.cancelledRequests,
      term
    );
    this.filteredAllRequests = this.filterBySearch(this.allRequests, term);

    this.selectedRequests = this.selectedRequests.filter((selected) =>
      this.getCurrentFilteredRequests().some((r) => r.id === selected.id)
    );

    this.updateMonthlyEventBarChart(this.getCurrentFilteredRequests());
  }

  filterBySearch(
    requests: EmergencyRequest[],
    term: string
  ): EmergencyRequest[] {
    if (!term) return requests;
    return requests.filter(
      (req) =>
        (req.name?.toLowerCase().includes(term) ?? false) ||
        (req.description?.toLowerCase().includes(term) ?? false) ||
        (req.status?.toLowerCase().includes(term) ?? false)
    );
  }

  setTab(tab: 'all' | 'resolved' | 'cancelled') {
    this.activeTab = tab;
    this.selectedRequests = [];
    this.applyFilters();
  }

  getCurrentFilteredRequests(): EmergencyRequest[] {
    switch (this.activeTab) {
      case 'resolved':
        return this.filteredResolvedRequests;
      case 'cancelled':
        return this.filteredCancelledRequests;
      default:
        return this.filteredAllRequests;
    }
  }

  isChecked(req: EmergencyRequest): boolean {
    return this.selectedRequests.some((selected) => selected.id === req.id);
  }

  setChecked(req: EmergencyRequest, event: any) {
    if (event.target.checked) {
      if (!this.isChecked(req)) this.selectedRequests.push(req);
    } else {
      this.selectedRequests = this.selectedRequests.filter(
        (sel) => sel.id !== req.id
      );
    }
  }

  isAllSelected(): boolean {
    const currentRequests = this.getCurrentFilteredRequests();
    return (
      currentRequests.length > 0 &&
      currentRequests.every((r) => this.isChecked(r))
    );
  }

  toggleSelectAllRequests(event: any) {
    const checked = event.target.checked;
    const currentRequests = this.getCurrentFilteredRequests();

    if (checked) {
      this.selectedRequests = [
        ...this.selectedRequests,
        ...currentRequests.filter(
          (r) => !this.selectedRequests.some((sel) => sel.id === r.id)
        ),
      ];
    } else {
      this.selectedRequests = this.selectedRequests.filter(
        (sel) => !currentRequests.some((r) => r.id === sel.id)
      );
    }
  }

  toggleBulkMenu(event: MouseEvent) {
    event.stopPropagation();
    this.showBulkMenu = !this.showBulkMenu;
  }

  selectBy(criteria: 'resolved' | 'cancelled' | 'all' | 'none') {
    switch (criteria) {
      case 'resolved':
        this.selectedRequests = [...this.resolvedRequests];
        break;
      case 'cancelled':
        this.selectedRequests = [...this.cancelledRequests];
        break;
      case 'all':
        this.selectedRequests = [...this.allRequests];
        break;
      case 'none':
        this.selectedRequests = [];
        break;
    }
    this.showBulkMenu = false;
  }

  viewRequest(req: EmergencyRequest) {
    this.requestToView = req;
  }

  closeView() {
    this.requestToView = undefined;
  }

  deleteSelectedRequests() {
    console.log('Deleting:', this.selectedRequests);
    this.selectedRequests = [];
  }

  updateMonthlyEventBarChart(requests: EmergencyRequest[]) {
    if (!this.requestStatusBarChart) return;

    const monthLabels: string[] = [];
    const monthMap: Map<string, number> = new Map();
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleString('default', {
        month: 'short',
        year: 'numeric',
      });
      monthLabels.push(label);
      monthMap.set(label, monthLabels.length - 1);
    }

    const eventSet = new Set<string>();
    requests.forEach((req) => {
      if (req.event) eventSet.add(req.event);
    });
    const events = Array.from(eventSet);
    const countsPerEvent: { [event: string]: number[] } = {};
    events.forEach(
      (event) => (countsPerEvent[event] = new Array(monthLabels.length).fill(0))
    );

    requests.forEach((req) => {
      if (!req.timestamp || !req.event) return;
      const date = req.timestamp.toDate
        ? req.timestamp.toDate()
        : new Date(req.timestamp);
      const label = date.toLocaleString('default', {
        month: 'short',
        year: 'numeric',
      });
      const index = monthMap.get(label);
      if (index !== undefined) countsPerEvent[req.event][index]++;
    });

    const colors = [
      '#FF6384',
      '#36A2EB',
      '#6d6b65ff',
      '#4BC0C0',
      '#9966FF',
      '#FF9F40',
      '#C9CBCF',
      '#8E44AD',
    ];
    const datasets = events.map((event, i) => ({
      label: event,
      data: countsPerEvent[event],
      backgroundColor: colors[i % colors.length],
    }));

    this.requestEventBarChart?.destroy();

    this.requestEventBarChart = new Chart(
      this.requestStatusBarChart.nativeElement,
      {
        type: 'bar',
        data: { labels: monthLabels, datasets: datasets },
        options: {
          responsive: true,
          plugins: {
            legend: { position: 'bottom' },
            tooltip: { mode: 'index', intersect: false },
          },
          scales: {
            x: { stacked: true, title: { display: true, text: 'Month' } },
            y: {
              stacked: true,
              beginAtZero: true,
              title: { display: true, text: 'Number of Requests' },
              ticks: { stepSize: 1 },
            },
          },
        },
      }
    );
  }
}
