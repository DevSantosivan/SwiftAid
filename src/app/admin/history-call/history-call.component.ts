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
import { ReportService } from '../../core/report.service';
import { EmergencyReport } from '../../model/report';
import { MatSnackBar } from '@angular/material/snack-bar';
import { UserService } from '../../core/user.service';
import { account } from '../../model/users';

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

  defaultAvatar =
    'https://i.pinimg.com/736x/32/e4/61/32e46132a367eb48bb0c9e5d5b659c88.jpg';
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

  toastMessage: string = '';
  toastType: 'success' | 'error' | 'info' = 'success';
  showToast: boolean = false;
  isGenerating: boolean = false;
  blockingInProgress: boolean = false;

  // Month / Year Filtering
  months = [
    'All', // index 0 = all months
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  selectedMonth: number = 0; // default = "All"
  years: number[] = [];
  selectedYear: number = new Date().getFullYear();

  constructor(
    private emergencyRequestService: EmergencyRequestService,
    private authService: AuthService,
    private reportService: ReportService,
    private userService: UserService,
    private snackBar: MatSnackBar,
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

  // -------------------------------
  // Load Requests
  // -------------------------------
  async loadRequests() {
    try {
      const currentUser = await this.authService.getCurrentUser();
      const currentUserId = currentUser?.uid;
      if (!currentUserId) return;

      const fetchedRequests =
        await this.emergencyRequestService.getRequestResolved();
      const userRequests = fetchedRequests.filter(
        (r) => r.staffId === currentUserId,
      );

      this.resolvedRequests = userRequests.filter(
        (r) => r.status?.toLowerCase() === 'resolved',
      );
      this.cancelledRequests = userRequests.filter(
        (r) => r.status?.toLowerCase() === 'cancelled',
      );
      this.allRequests = [...this.resolvedRequests, ...this.cancelledRequests];

      this.generateYearOptions(); // ✅ generate year options
      this.applyFilters();
    } catch (error) {
      console.error('Error loading requests:', error);
    }
  }

  // -------------------------------
  // Generate Year Options from Requests
  // -------------------------------
  generateYearOptions() {
    const yearsSet = new Set<number>();

    this.allRequests.forEach((req) => {
      if (req.staffUpdatedAt) {
        const date = req.staffUpdatedAt.toDate
          ? req.staffUpdatedAt.toDate()
          : new Date(req.staffUpdatedAt);
        yearsSet.add(date.getFullYear());
      }
    });

    if (yearsSet.size === 0) {
      yearsSet.add(new Date().getFullYear());
    }

    this.years = Array.from(yearsSet).sort((a, b) => a - b);
    this.selectedYear = this.years[this.years.length - 1];
  }

  // -------------------------------
  // Filter Requests by Search + Month/Year
  // -------------------------------
  applyFilters() {
    const term = this.searchTerm.trim().toLowerCase();

    // Always start from the full lists
    let baseAll = this.allRequests;
    let baseResolved = this.resolvedRequests;
    let baseCancelled = this.cancelledRequests;

    // Apply search term
    this.filteredAllRequests = this.filterBySearch(baseAll, term);
    this.filteredResolvedRequests = this.filterBySearch(baseResolved, term);
    this.filteredCancelledRequests = this.filterBySearch(baseCancelled, term);

    // Reset selectedRequests if current filtered list has none
    this.selectedRequests = this.selectedRequests.filter((selected) =>
      this.getCurrentFilteredRequests().some((r) => r.id === selected.id),
    );

    // Update chart
    this.updateMonthlyEventBarChart(this.getCurrentFilteredRequests());
  }
  filterBySearch(
    requests: EmergencyRequest[],
    term: string,
  ): EmergencyRequest[] {
    if (!term) return requests;
    return requests.filter(
      (req) =>
        (req.name?.toLowerCase().includes(term) ?? false) ||
        (req.description?.toLowerCase().includes(term) ?? false) ||
        (req.status?.toLowerCase().includes(term) ?? false),
    );
  }

  getCurrentFilteredRequests(): EmergencyRequest[] {
    let requests: EmergencyRequest[];
    switch (this.activeTab) {
      case 'resolved':
        requests = this.filteredResolvedRequests;
        break;
      case 'cancelled':
        requests = this.filteredCancelledRequests;
        break;
      default:
        requests = this.filteredAllRequests;
        break;
    }

    return requests.filter((req) => {
      if (!req.staffUpdatedAt) return false;
      const date = req.staffUpdatedAt.toDate
        ? req.staffUpdatedAt.toDate()
        : new Date(req.staffUpdatedAt);

      const monthMatch =
        this.selectedMonth === 0 || date.getMonth() === this.selectedMonth - 1;
      const yearMatch = date.getFullYear() === this.selectedYear;

      return monthMatch && yearMatch;
    });
  }

  // -------------------------------
  // Report Generation
  // -------------------------------
  async generateReport() {
    try {
      const currentUser = await this.authService.getCurrentUser();
      if (!currentUser) return this.showSnackBar('User not logged in.');

      const userAccount: account | null = await this.userService.getUserById(
        currentUser.uid,
      );
      if (!userAccount)
        return this.showSnackBar('Failed to fetch user account details.');

      const requests = await this.emergencyRequestService.getRequestResolved();
      const userRequests = this.getCurrentFilteredRequests().filter(
        (r) => r.staffId === currentUser.uid,
      );
      if (userRequests.length === 0)
        return this.showSnackBar(
          'No resolved requests available to generate report.',
        );

      this.blockingInProgress = true;

      const eventBreakdown: { [key: string]: number } = {};
      const eventTypeBreakdown: { [key: string]: number } = {};
      const sexBreakdown: { [key: string]: number } = {};

      userRequests.forEach((req) => {
        if (req.event)
          eventBreakdown[req.event] = (eventBreakdown[req.event] || 0) + 1;
        if (req.eventType)
          eventTypeBreakdown[req.eventType] =
            (eventTypeBreakdown[req.eventType] || 0) + 1;
        if (req.sex) sexBreakdown[req.sex] = (sexBreakdown[req.sex] || 0) + 1;
      });

      const report: EmergencyReport = {
        generatedBy: userAccount,
        generatedAt: new Date(),
        totalRequests: userRequests.length,
        resolvedCount: userRequests.filter(
          (r) => r.status?.toLowerCase() === 'resolved',
        ).length,
        cancelledCount: userRequests.filter(
          (r) => r.status?.toLowerCase() === 'cancelled',
        ).length,
        eventBreakdown,
        eventTypeBreakdown,
        sexBreakdown,
        includedRequestIds: userRequests.map((r) => r.id),
        status: 'pending',
      };

      await this.reportService.submitReport(report);
      this.showSnackBar('Report submitted successfully!');
    } catch (error) {
      console.error('Error generating report:', error);
      this.showSnackBar('Error generating report.');
    } finally {
      this.blockingInProgress = false;
    }
  }

  // -------------------------------
  // UI Helpers
  // -------------------------------
  showSnackBar(message: string) {
    this.snackBar.open(message, 'Close', { duration: 3000 });
  }

  setTab(tab: 'all' | 'resolved' | 'cancelled') {
    this.activeTab = tab;
    this.selectedRequests = [];
    this.applyFilters();
  }

  isChecked(req: EmergencyRequest): boolean {
    return this.selectedRequests.some((selected) => selected.id === req.id);
  }

  setChecked(req: EmergencyRequest, event: any) {
    if (event.target.checked) {
      if (!this.isChecked(req)) this.selectedRequests.push(req);
    } else {
      this.selectedRequests = this.selectedRequests.filter(
        (sel) => sel.id !== req.id,
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
          (r) => !this.selectedRequests.some((sel) => sel.id === r.id),
        ),
      ];
    } else {
      this.selectedRequests = this.selectedRequests.filter(
        (sel) => !currentRequests.some((r) => r.id === sel.id),
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

  // -------------------------------
  // Chart
  // -------------------------------
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
      (event) =>
        (countsPerEvent[event] = new Array(monthLabels.length).fill(0)),
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
        data: { labels: monthLabels, datasets },
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
      },
    );
  }
}
