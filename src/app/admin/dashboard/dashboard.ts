import { Component, OnInit, OnDestroy } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { Router } from '@angular/router';
import { UserService } from '../../core/user.service';
import { EmergencyRequestService } from '../../core/rescue_request.service';
import { DashboardChartService } from '../../core/dashboard-chart.service';
import { NotificationService } from '../../core/notification.service';
import { Firestore } from '@angular/fire/firestore';
import { EmergencyRequest } from '../../model/emergency';
import { Chart } from 'chart.js';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss'],
})
export class Dashboard implements OnInit, OnDestroy {
  pieChart: any;
  yearlyChart: any;
  requestEventBarChart?: Chart;

  isAdmin: boolean = false;
  currentUserId: string = '';
  isloader: boolean = false;
  userCount: number = 0;
  totalRequestRescueCount: number = 0;
  totalRescueCount: number = 0;
  recentRequests: EmergencyRequest[] = [];
  isSuperAdmin: boolean = false;

  totalTeam = 0;
  totalresident = 0;
  totalPendingResident = 0;

  EmergencyRequest = 0;
  totalresolveRequest = 0;
  totalPendingRequests = 0;
  pieChartLegend: { label: string; color: string }[] = [];

  private RED_PALETTE = [
    '#b71c1c',
    '#d32f2f',
    '#f44336',
    '#ef5350',
    '#c62828',
    '#212121',
    '#424242',
    '#e0e0e0',
    '#ffffff',
  ];

  constructor(
    private authentication: Auth,
    private route: Router,
    private userService: UserService,
    private emergencyRequestService: EmergencyRequestService,
    private firestore: Firestore,
    private notificationService: NotificationService,
    private dashboardChartService: DashboardChartService
  ) {}

  getMonthLabels(monthCount: number): string[] {
    const monthNames = [
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
    const labels = [];
    const today = new Date();
    let month = today.getMonth();

    for (let i = monthCount - 1; i >= 0; i--) {
      const index = (month - i + 12) % 12;
      labels.push(monthNames[index]);
    }
    return labels;
  }

  getYearLabels(yearCount: number): string[] {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = yearCount - 1; i >= 0; i--) {
      years.push((currentYear - i).toString());
    }
    return years;
  }

  generateThemedColor(index: number): string {
    return this.RED_PALETTE[index % this.RED_PALETTE.length];
  }

  public pieChartConfig: any = {
    type: 'pie',
    data: {
      labels: [],
      datasets: [
        {
          label: 'Accident Categories',
          data: [],
          backgroundColor: [],
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
      },
    },
  };

  public yearlyChartConfig: any = {
    type: 'line',
    data: {
      labels: this.getYearLabels(5),
      datasets: [
        {
          label: 'Accident Data',
          data: [20, 30, 40, 25, 50],
          fill: false,
          borderColor: '#b71c1c',
          tension: 0.1,
        },
      ],
    },
    options: {
      responsive: true,
      scales: { y: { beginAtZero: true } },
    },
  };

  updatePieChart(accidentCategoryCounts: { [category: string]: number }) {
    const filteredLabels: string[] = [];
    const filteredData: number[] = [];
    const filteredColors: string[] = [];

    for (const [category, count] of Object.entries(accidentCategoryCounts)) {
      if (count > 0) {
        filteredLabels.push(category);
        filteredData.push(count);
        filteredColors.push(this.generateThemedColor(filteredColors.length));
      }
    }

    this.pieChartConfig.data.labels = filteredLabels;
    this.pieChartConfig.data.datasets[0].data = filteredData;
    this.pieChartConfig.data.datasets[0].backgroundColor = filteredColors;

    this.pieChartLegend = filteredLabels.map((label, i) => ({
      label,
      color: filteredColors[i],
    }));

    this.pieChart.update();
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

    const redShades = [
      '#FFCDD2',
      '#EF9A9A',
      '#E57373',
      '#EF5350',
      '#F44336',
      '#E53935',
      '#D32F2F',
      '#C62828',
      '#B71C1C',
    ];

    const datasets = events.map((event, i) => ({
      label: event,
      data: countsPerEvent[event],
      backgroundColor: redShades[i % redShades.length],
    }));

    if (this.requestEventBarChart) {
      this.requestEventBarChart.destroy();
    }

    this.requestEventBarChart = new Chart('requestEventBarChart', {
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

  async ngOnInit() {
    const user = this.authentication.currentUser;
    this.currentUserId = user?.uid || '';

    const role = await this.userService.getCurrentUserRole(this.currentUserId);
    this.isSuperAdmin = role === 'admin';
    const admins = await this.userService.getAdmins();
    this.isAdmin = admins.some((admin) => admin.uid === this.currentUserId);

    this.pieChart = new Chart('MyPieChart', this.pieChartConfig);
    this.yearlyChart = new Chart('MyYearlyChart', this.yearlyChartConfig);

    try {
      const users = await this.userService.getUsers();
      this.userCount = users.length;
      this.totalTeam = users.filter((u) => u.role === 'admin').length;
      this.totalresident = users.filter(
        (u) => u.role === 'resident' && u.account_status === 'approved'
      ).length;
      this.totalPendingResident = users.filter(
        (u) => u.role === 'resident' && u.account_status === 'pending'
      ).length;

      const requests = await this.emergencyRequestService.getRequestResolved();
      this.EmergencyRequest = requests.length;
      this.totalresolveRequest = requests.filter(
        (r) => r.status?.toLowerCase() === 'resolved'
      ).length;
      this.totalPendingRequests = requests.filter(
        (r) => r.status?.toLowerCase() === 'pending'
      ).length;

      if (this.isSuperAdmin || this.isAdmin) {
        const accidentCategoryCounts =
          await this.dashboardChartService.fetchAccidentCategoryCountsForCurrentUser();
        this.updatePieChart(accidentCategoryCounts);
      }

      const resolvedRequests =
        await this.emergencyRequestService.getRequestsByStaffId(
          this.currentUserId
        );
      this.totalRescueCount = resolvedRequests.length;

      const yearlyData =
        await this.dashboardChartService.fetchYearlyAccidentData();
      this.yearlyChartConfig.data.labels = yearlyData.years;
      this.yearlyChartConfig.data.datasets[0].data = yearlyData.counts;
      this.yearlyChart.update();

      // ✅ New: Update Monthly Bar Chart
      this.updateMonthlyEventBarChart(requests);

      this.recentRequests = requests
        .sort(
          (a, b) =>
            (b.timestamp?.toMillis() || 0) - (a.timestamp?.toMillis() || 0)
        )
        .slice(0, 5);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  }

  ngOnDestroy() {
    this.pieChart?.destroy();
    this.yearlyChart?.destroy();
    this.requestEventBarChart?.destroy(); // ✅ Clean up
  }

  signout() {
    return this.authentication.signOut().then(() => {
      this.isloader = true;
      setTimeout(() => {
        this.route.navigate(['/login']);
      }, 3000);
    });
  }

  printDashboard(): void {
    // Add print logic here if needed
  }

  getStatusLabel(status: string | undefined): string {
    if (!status) return 'Unknown';
    switch (status.toLowerCase()) {
      case 'pending':
      case 'requesting':
        return 'Requesting';
      case 'responding':
        return 'In Progress';
      case 'completed':
      case 'resolved':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  }

  getStatusClass(status: string | undefined): string {
    if (!status) return 'unknown';
    switch (status.toLowerCase()) {
      case 'pending':
      case 'requesting':
        return 'requesting';
      case 'responding':
        return 'in-progress';
      case 'completed':
      case 'resolved':
        return 'completed';
      case 'cancelled':
        return 'cancelled';
      default:
        return 'other';
    }
  }
}
