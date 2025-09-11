import { Component, OnInit } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { Router } from '@angular/router';
import { Chart, registerables } from 'chart.js';
import { UserService } from '../../core/user.service';
import { EmergencyRequestService } from '../../core/rescue_request.service';
import { NotificationService } from '../../core/notification.service';
import { Firestore } from '@angular/fire/firestore';
import { DashboardChartService } from '../../core/dashboard-chart.service';
import { CommonModule } from '@angular/common';
import { EmergencyRequest } from '../../model/emergency';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit {
  pieChart: any;
  yearlyChart: any;
  requestEventBarChart: any;

  isAdmin = false;
  isSuperAdmin = false;
  currentUserId = '';
  isloader = false;

  userCount = 0;
  totalTeam = 0;
  totalresident = 0;
  totalPendingResident = 0;

  EmergencyRequest = 0;
  totalresolveRequest = 0;
  totalPendingRequests = 0;

  recentRequests: EmergencyRequest[] = [];
  pieChartLegend: { label: string; color: string }[] = [];

  public currentDateTime: Date = new Date();

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
    private EmergencyRequestService: EmergencyRequestService,
    private firestore: Firestore,
    private notificationService: NotificationService,
    private dashboardChartService: DashboardChartService
  ) {}

  ngOnInit(): void {
    this.initializeDashboard();
    setInterval(() => {
      this.currentDateTime = new Date();
    }, 60000);
  }

  private async initializeDashboard() {
    const user = this.authentication.currentUser;
    this.currentUserId = user?.uid || '';

    const role = await this.userService.getCurrentUserRole(this.currentUserId);
    this.isSuperAdmin = role === 'superAdmin';

    const admins = await this.userService.getAdmins();
    this.isAdmin = admins.some((a) => a.uid === this.currentUserId);

    this.pieChart = new Chart('MyPieChart', this.pieChartConfig);
    this.yearlyChart = new Chart('MyYearlyChart', this.yearlyChartConfig);

    try {
      // User stats
      const users = await this.userService.getUsers();
      this.userCount = users.length;
      this.totalTeam = users.filter((u) => u.role === 'admin').length;
      this.totalresident = users.filter(
        (u) => u.role === 'resident' && u.account_status === 'approved'
      ).length;
      this.totalPendingResident = users.filter(
        (u) => u.role === 'resident' && u.account_status === 'pending'
      ).length;

      // Emergency Requests
      const requests = await this.EmergencyRequestService.getRequest();
      this.EmergencyRequest = requests.length;
      this.totalresolveRequest = requests.filter(
        (r) => r.status?.toLowerCase() === 'resolved'
      ).length;
      this.totalPendingRequests = requests.filter(
        (r) => r.status?.toLowerCase() === 'pending'
      ).length;

      // Pie Chart (accident category breakdown)
      const accCounts =
        await this.dashboardChartService.fetchAccidentCategoryCounts();
      const pieLabels: string[] = [];
      const pieData: number[] = [];
      const pieColors: string[] = [];

      Object.entries(accCounts).forEach(([cat, cnt]) => {
        if (cnt > 0) {
          pieLabels.push(cat);
          pieData.push(cnt);
          pieColors.push(this.generateThemedColor(pieColors.length));
        }
      });

      this.pieChartConfig.data.labels = pieLabels;
      this.pieChartConfig.data.datasets[0].data = pieData;
      this.pieChartConfig.data.datasets[0].backgroundColor = pieColors;
      this.pieChartLegend = pieLabels.map((l, i) => ({
        label: l,
        color: pieColors[i],
      }));
      this.pieChart.update();

      // Yearly Chart (yearly request trend)
      const yearlyData =
        await this.dashboardChartService.fetchYearlyAccidentData();
      this.yearlyChartConfig.data.labels = yearlyData.years;
      this.yearlyChartConfig.data.datasets[0].data = yearlyData.counts;
      this.yearlyChart.update();

      // Real-time request updates and stacked bar chart
      this.EmergencyRequestService.getRequestRealtime().subscribe(
        (realTimeRequests) => {
          this.recentRequests = realTimeRequests
            .sort(
              (a, b) =>
                (b.timestamp?.toMillis?.() || 0) -
                (a.timestamp?.toMillis?.() || 0)
            )
            .slice(0, 5);

          this.updateMonthlyEventBarChart(realTimeRequests);
        }
      );
    } catch (error) {}
  }

  // Charts Config
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
      plugins: { legend: { display: false } },
    },
  };

  public yearlyChartConfig: any = {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          label: 'Accident Data',
          data: [],
          fill: false,
          borderColor: '#b71c1c',
          tension: 0.1,
        },
      ],
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: true },
      },
    },
  };

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
    const today = new Date();
    let month = today.getMonth();
    const labels = [];

    for (let i = monthCount - 1; i >= 0; i--) {
      const index = (month - i + 12) % 12;
      labels.push(monthNames[index]);
    }

    return labels;
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

  generateThemedColor(index: number): string {
    return this.RED_PALETTE[index % this.RED_PALETTE.length];
  }

  updateMonthlyEventBarChart(requests: EmergencyRequest[]) {
    const now = new Date();
    const labels: string[] = [];
    const monthMap: Map<string, number> = new Map();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleString('default', {
        month: 'short',
        year: 'numeric',
      });
      labels.push(label);
      monthMap.set(label, labels.length - 1);
    }

    const events = Array.from(
      new Set(requests.map((r) => r.event).filter(Boolean))
    );
    const eventData: { [key: string]: number[] } = {};

    events.forEach((e) => (eventData[e] = new Array(labels.length).fill(0)));

    requests.forEach((req) => {
      const date = req.timestamp?.toDate?.() || new Date(req.timestamp);
      const label = date.toLocaleString('default', {
        month: 'short',
        year: 'numeric',
      });
      const index = monthMap.get(label);
      if (index !== undefined && req.event) {
        eventData[req.event][index]++;
      }
    });

    const datasets = events.map((event, i) => ({
      label: event,
      data: eventData[event],
      backgroundColor: this.generateThemedColor(i),
    }));

    if (this.requestEventBarChart) this.requestEventBarChart.destroy();

    this.requestEventBarChart = new Chart('requestStatusBarChart', {
      type: 'bar',
      data: { labels, datasets },
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

  signout() {
    return this.authentication.signOut().then(() => {
      this.isloader = true;
      setTimeout(() => this.route.navigate(['/login']), 3000);
    });
  }

  printDashboard(): void {
    const content = document.getElementById('dashboard-to-print');
    if (!content) return;

    const clone = content.cloneNode(true) as HTMLElement;
    const canvases = content.querySelectorAll('canvas');
    const clonedCanvases = clone.querySelectorAll('canvas');

    canvases.forEach((canvas, index) => {
      const img = document.createElement('img');
      img.src = (canvas as HTMLCanvasElement).toDataURL('image/png');
      img.style.width = '100%';
      img.style.height = 'auto';
      const clonedCanvas = clonedCanvases[index];
      if (clonedCanvas && clonedCanvas.parentNode) {
        clonedCanvas.parentNode.replaceChild(img, clonedCanvas);
      }
    });

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Dashboard Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { text-align: center; color: #b71c1c; }
            ul { margin-bottom: 20px; }
            img { max-width: 100%; height: auto; }
          </style>
        </head>
        <body>
          <h1>Dashboard Report</h1>
          <p>Date Generated: ${new Date().toLocaleString()}</p>
          <h2>Summary</h2>
          <ul>
            <li>Total Users: ${this.userCount}</li>
            <li>Total Emergency Requests: ${this.EmergencyRequest}</li>
          </ul>
          <h2>Dashboard Content</h2>
          ${clone.outerHTML}
          <script>
            window.onload = () => {
              window.print();
              setTimeout(() => window.close(), 300);
            };
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
  }
}
