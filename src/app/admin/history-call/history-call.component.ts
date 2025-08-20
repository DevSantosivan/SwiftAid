import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { EmergencyRequest } from '../../model/emergency';
import { EmergencyRequestService } from '../../core/rescue_request.service';
import { AuthService } from '../../core/auth.service';

import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

@Component({
  selector: 'app-history-call',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './history-call.component.html',
  styleUrls: ['./history-call.component.scss'],
})
export class HistoryCallComponent implements OnInit, OnDestroy {
  activeTab: 'all' | 'accepted' | 'completed' | 'cancelled' = 'all';

  allRequests: EmergencyRequest[] = [];
  acceptedRequests: EmergencyRequest[] = [];
  completedRequests: EmergencyRequest[] = [];
  cancelledRequests: EmergencyRequest[] = [];

  filteredAllRequests: EmergencyRequest[] = [];
  filteredAcceptedRequests: EmergencyRequest[] = [];
  filteredCompletedRequests: EmergencyRequest[] = [];
  filteredCancelledRequests: EmergencyRequest[] = [];

  searchTerm: string = '';
  selectedRequests: EmergencyRequest[] = [];
  showBulkMenu = false;

  requestToView?: EmergencyRequest;

  // ✅ Separate Chart.js instances
  requestStatusChart?: Chart;
  requestEventBarChart?: Chart;

  constructor(
    private emergencyRequestService: EmergencyRequestService,
    private authService: AuthService
  ) {}

  async ngOnInit() {
    await this.loadRequests();
  }

  ngOnDestroy() {
    this.requestStatusChart?.destroy();
    this.requestEventBarChart?.destroy();
  }

  async loadRequests() {
    try {
      this.allRequests = await this.emergencyRequestService.getRequest();

      const currentUser = await this.authService.getCurrentUser();
      if (!currentUser) {
        console.error('No logged-in user');
        return;
      }

      const currentUserId = currentUser.uid;

      this.acceptedRequests = this.allRequests.filter(
        (r) =>
          r.status.toLowerCase() === 'responding' && r.staffId === currentUserId
      );

      this.completedRequests = this.allRequests.filter((r) =>
        ['resolved', 'completed'].includes(r.status.toLowerCase())
      );

      this.cancelledRequests = this.allRequests.filter(
        (r) => r.status.toLowerCase() === 'cancelled'
      );

      this.applyFilters();

      // Draw bar chart from all requests initially
      this.updateMonthlyEventBarChart(this.allRequests);
    } catch (error) {
      console.error('Error loading requests:', error);
    }
  }

  applyFilters() {
    const term = this.searchTerm.trim().toLowerCase();

    this.filteredAllRequests = this.filterBySearch(this.allRequests, term);
    this.filteredAcceptedRequests = this.filterBySearch(
      this.acceptedRequests,
      term
    );
    this.filteredCompletedRequests = this.filterBySearch(
      this.completedRequests,
      term
    );
    this.filteredCancelledRequests = this.filterBySearch(
      this.cancelledRequests,
      term
    );

    this.selectedRequests = this.selectedRequests.filter((selected) =>
      this.getCurrentFilteredRequests().some((r) => r.id === selected.id)
    );

    const currentRequests = this.getCurrentFilteredRequests();
    this.updateRequestStatusPieChart(currentRequests);
    this.updateMonthlyEventBarChart(currentRequests);
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

  setTab(tab: 'all' | 'accepted' | 'completed' | 'cancelled') {
    this.activeTab = tab;
    this.selectedRequests = [];
    this.applyFilters();
  }

  getCurrentFilteredRequests(): EmergencyRequest[] {
    switch (this.activeTab) {
      case 'accepted':
        return this.filteredAcceptedRequests;
      case 'completed':
        return this.filteredCompletedRequests;
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
      if (!this.isChecked(req)) {
        this.selectedRequests.push(req);
      }
    } else {
      this.selectedRequests = this.selectedRequests.filter(
        (selected) => selected.id !== req.id
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

  selectBy(criteria: 'all' | 'none' | 'accepted' | 'completed') {
    switch (criteria) {
      case 'all':
        this.selectedRequests = [...this.allRequests];
        break;
      case 'none':
        this.selectedRequests = [];
        break;
      case 'accepted':
        this.selectedRequests = [...this.acceptedRequests];
        break;
      case 'completed':
        this.selectedRequests = [...this.completedRequests];
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

    events.forEach((event) => {
      countsPerEvent[event] = new Array(monthLabels.length).fill(0);
    });

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
      if (index !== undefined) {
        countsPerEvent[req.event][index]++;
      }
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

    if (this.requestEventBarChart) {
      this.requestEventBarChart.destroy();
    }

    this.requestEventBarChart = new Chart('requestStatusBarChart', {
      type: 'bar',
      data: {
        labels: monthLabels,
        datasets: datasets,
      },
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
    });
  }

  updateRequestStatusPieChart(requests: EmergencyRequest[]) {
    let inProgress = 0,
      completed = 0,
      cancelled = 0,
      others = 0;

    requests.forEach((req) => {
      const status = req.status?.toLowerCase() || '';
      if (['responding', 'inprogress', 'in progress'].includes(status)) {
        inProgress++;
      } else if (['completed', 'resolved'].includes(status)) {
        completed++;
      } else if (status === 'cancelled') {
        cancelled++;
      } else {
        others++;
      }
    });

    if (this.requestStatusChart) {
      this.requestStatusChart.destroy();
    }

    this.requestStatusChart = new Chart('requestStatusChart', {
      type: 'pie',
      data: {
        labels: ['In Progress', 'Completed', 'Cancelled', 'Other'],
        datasets: [
          {
            data: [inProgress, completed, cancelled, others],
            backgroundColor: ['#FFC107', '#4CAF50', '#F44336', '#9E9E9E'],
            hoverOffset: 14,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              boxWidth: 14,
              padding: 16,
            },
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const label = context.label || '';
                const value = context.parsed || 0;
                return `${label}: ${value}`;
              },
            },
          },
        },
      },
    });
  }
}
