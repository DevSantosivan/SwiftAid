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
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit {
  pieChart: any;
  yearlyChart: any;
  requestEventBarChart: any; // <-- new for stacked bar chart
  isAdmin: boolean = false;
  currentUserId: string = '';
  isloader: boolean = false;
  userCount: number = 0;
  EmergencyRequest: number = 0;
  recentRequests: EmergencyRequest[] = [];
  isSuperAdmin: boolean = false;

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
    private EmergencyRequestService: EmergencyRequestService,
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
      scales: {
        y: { beginAtZero: true },
      },
    },
  };

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
      '#b71c1c', // Dark Red
      '#d32f2f', // Medium Red
      '#ef5350', // Light Red
      '#f44336', // Classic Red
      '#e57373', // Pale Red
      '#ff8a80', // Soft Pinkish Red
      '#ad1457', // Dark Pink-Red (Berry)
      '#c62828', // Deep Red
      '#f06292', // Pinkish
      '#ba000d', // Very Dark Red
      '#ff5252', // Bright Red
      '#880e4f', // Dark Magenta-Red
      '#ff1744', // Vivid Red
      '#ff7961', // Light Coral
      '#4a148c', // Dark Purple (works well near red)
      '#e53935', // Red Shade
      '#d81b60', // Pink-Red
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

  async ngOnInit() {
    const user = this.authentication.currentUser;
    this.currentUserId = user?.uid || '';

    const role = await this.userService.getCurrentUserRole(this.currentUserId);
    this.isSuperAdmin = role === 'superAdmin';
    const admins = await this.userService.getAdmins();
    this.isAdmin = admins.some((admin) => admin.uid === this.currentUserId);

    // Initialize Pie Chart
    this.pieChart = new Chart('MyPieChart', this.pieChartConfig);

    // Initialize Yearly Chart
    this.yearlyChart = new Chart('MyYearlyChart', this.yearlyChartConfig);

    try {
      this.userCount = await this.userService.getUserCount();
      this.EmergencyRequest =
        await this.EmergencyRequestService.getRequestCount();

      const accidentCategoryCounts =
        await this.dashboardChartService.fetchAccidentCategoryCounts();

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

      const yearlyData =
        await this.dashboardChartService.fetchYearlyAccidentData();
      this.yearlyChartConfig.data.labels = yearlyData.years;
      this.yearlyChartConfig.data.datasets[0].data = yearlyData.counts;
      this.yearlyChart.update();

      // Subscribe to realtime requests and update bar chart + recentRequests
      this.EmergencyRequestService.getRequestRealtime().subscribe(
        (requests) => {
          this.recentRequests = requests
            .sort((a, b) => {
              const dateA = a.timestamp?.toMillis?.() || 0;
              const dateB = b.timestamp?.toMillis?.() || 0;
              return dateB - dateA;
            })
            .slice(0, 5);

          this.updateMonthlyEventBarChart(requests);
        }
      );
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
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
    const dashboardContent = document.getElementById('dashboard-to-print');
    if (!dashboardContent) return;

    const clone = dashboardContent.cloneNode(true) as HTMLElement;
    const canvases = dashboardContent.querySelectorAll('canvas');
    const clonedCanvases = clone.querySelectorAll('canvas');

    canvases.forEach((canvas, index) => {
      const chartImage = document.createElement('img');
      chartImage.src = (canvas as HTMLCanvasElement).toDataURL('image/png');
      chartImage.style.width = '100%';
      chartImage.style.height = 'auto';

      const clonedCanvas = clonedCanvases[index];
      if (clonedCanvas && clonedCanvas.parentNode) {
        clonedCanvas.parentNode.replaceChild(chartImage, clonedCanvas);
      }
    });

    const currentDate = new Date().toLocaleString();
    const monthLabels = this.getMonthLabels(7);
    const policeData = this.requestEventBarChart
      ? this.requestEventBarChart.data.datasets.find((d: any) =>
          d.label.toLowerCase().includes('police')
        )?.data || []
      : [];
    const pieLabels = this.pieChartConfig.data.labels;
    const pieData = this.pieChartConfig.data.datasets[0].data;
    const yearlyYears = this.yearlyChartConfig.data.labels;
    const yearlyCounts = this.yearlyChartConfig.data.datasets[0].data;

    const peakPoliceIndex = policeData.length
      ? policeData.indexOf(Math.max(...policeData))
      : -1;
    const peakPoliceMonth =
      peakPoliceIndex >= 0 && peakPoliceIndex < monthLabels.length
        ? monthLabels[peakPoliceIndex]
        : 'N/A';
    const peakPoliceValue =
      peakPoliceIndex >= 0 ? policeData[peakPoliceIndex] : 0;

    const peakPieIndex = pieData.length
      ? pieData.indexOf(Math.max(...pieData))
      : -1;
    const peakPieLabel =
      peakPieIndex >= 0 && peakPieIndex < pieLabels.length
        ? pieLabels[peakPieIndex]
        : 'N/A';

    const peakYearlyIndex = yearlyCounts.length
      ? yearlyCounts.indexOf(Math.max(...yearlyCounts))
      : -1;
    const peakYearlyYear =
      peakYearlyIndex >= 0 && peakYearlyIndex < yearlyYears.length
        ? yearlyYears[peakYearlyIndex]
        : 'N/A';

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Dashboard Report</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 20px;
              color: #333;
            }
            h1 {
              text-align: center;
              color: #b71c1c;
            }
            h2 {
              color: #b71c1c;
              border-bottom: 2px solid #b71c1c;
              padding-bottom: 5px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 30px;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 8px;
              text-align: left;
            }
            th {
              background-color: #f2f2f2;
            }
          </style>
        </head>
        <body>
          <h1>Dashboard Report</h1>
          <p>Date Generated: ${currentDate}</p>

          <h2>Summary</h2>
          <ul>
            <li>Total Users: ${this.userCount}</li>
            <li>Total Emergency Requests: ${this.EmergencyRequest}</li>
            <li>Most Frequent Police Requests (Last 6 Months): ${peakPoliceMonth} with ${peakPoliceValue}</li>
            <li>Most Frequent Accident Category (Pie Chart): ${peakPieLabel}</li>
            <li>Year with Most Accidents (Last 5 Years): ${peakYearlyYear}</li>
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
