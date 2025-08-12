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
  chart: any;
  pieChart: any;
  yearlyChart: any;
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

  public lineChartConfig: any = {
    type: 'bar',
    data: {
      labels: this.getMonthLabels(7),
      datasets: [
        {
          label: 'Police',
          data: [120, 140, 100, 180, 150, 160, 130],
          borderColor: '#b71c1c',
          backgroundColor: 'rgba(183, 28, 28, 0.8)',
          fill: true,
          borderWidth: 1,
          pointBorderRadius: 5,
        },
        {
          label: 'Ambulance',
          data: [60, 70, 50, 90, 85, 80, 75],
          borderColor: '#d32f2f',
          backgroundColor: 'rgba(211, 47, 47, 0.6)',
          fill: true,
          borderWidth: 1,
          pointBorderRadius: 5,
        },
        {
          label: 'Fire',
          data: [30, 45, 50, 40, 60, 55, 48],
          borderColor: '#f44336',
          backgroundColor: 'rgba(244, 67, 54, 0.4)',
          fill: true,
          borderWidth: 1,
          pointBorderRadius: 5,
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

  async ngOnInit() {
    const user = this.authentication.currentUser;
    this.currentUserId = user?.uid || '';

    const role = await this.userService.getCurrentUserRole(this.currentUserId);
    this.isSuperAdmin = role === 'superAdmin';
    const admins = await this.userService.getAdmins();
    this.isAdmin = admins.some((admin) => admin.uid === this.currentUserId);

    this.chart = new Chart('MyLineChart', this.lineChartConfig);
    this.pieChart = new Chart('MyPieChart', this.pieChartConfig);
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

      // ✅ Fetch recent requests
      this.EmergencyRequestService.getRequestRealtime().subscribe(
        (requests) => {
          this.recentRequests = requests
            .sort((a, b) => {
              const dateA = a.timestamp?.toMillis?.() || 0;
              const dateB = b.timestamp?.toMillis?.() || 0;
              return dateB - dateA;
            })
            .slice(0, 5);
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
    const policeData = this.lineChartConfig.data.datasets[0].data;
    const pieLabels = this.pieChartConfig.data.labels;
    const pieData = this.pieChartConfig.data.datasets[0].data;
    const yearlyYears = this.yearlyChartConfig.data.labels;
    const yearlyCounts = this.yearlyChartConfig.data.datasets[0].data;

    const peakPoliceIndex = policeData.indexOf(Math.max(...policeData));
    const peakPoliceMonth = monthLabels[peakPoliceIndex];
    const peakPoliceValue = policeData[peakPoliceIndex];

    const maxPieIndex = pieData.indexOf(Math.max(...pieData));
    const topCategory = pieLabels[maxPieIndex];
    const topCategoryCount = pieData[maxPieIndex];

    const summary = `
      <h2>📌SwiftAid Dashboard Report</h2>
      <p><strong>🗓️ Generated on:</strong> ${currentDate}</p>
      <p><strong>🧍 Total Registered Users:</strong> ${this.userCount}</p>
      <p><strong>🚨 Total Emergency Rescue Requests:</strong> ${
        this.EmergencyRequest
      }</p>
      <h3>📊 Monthly Rescue Insights</h3>
      <p>Highest number of Police-related interventions occurred in <strong>${peakPoliceMonth}</strong> with <strong>${peakPoliceValue}</strong> reports.</p>
      <h3>🍰 Top Incident Category</h3>
      <p>Most common incident reported: "<strong>${topCategory}</strong>" with <strong>${topCategoryCount}</strong> cases.</p>
      <h3>📈 Yearly Trends</h3>
      <p>Incidents increased from <strong>${
        yearlyCounts[0]
      }</strong> in <strong>${yearlyYears[0]}</strong> to <strong>${
      yearlyCounts[yearlyCounts.length - 1]
    }</strong> in <strong>${yearlyYears[yearlyYears.length - 1]}</strong>.</p>
      <hr>
      <h3>📉 Charts Overview</h3>
    `;

    const printWindow = window.open('', '_blank', 'width=1000,height=900');
    if (!printWindow) return;

    const htmlContent = `
      <html>
        <head>
          <title>Emergency Dashboard Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 30px; color: #000; background: #fff;}
            .header { text-align: center; margin-bottom: 40px; }
            .logo { width: 100px; height: auto; }
            .report-title { font-size: 24px; font-weight: bold; color: #b71c1c; margin-top: 10px; }
            .report-date { font-size: 14px; color: #666; }
            .box, .chart, .list {
              border: 1px solid #ccc;
              padding: 15px;
              margin-bottom: 20px;
            }
            img { max-width: 100%; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="header">
            <img src="../../../assets/logo22.png" alt="Logo" class="logo" />
            <div class="report-title">Emergency Dashboard Report</div>
            <div class="report-date">${currentDate}</div>
          </div>
          <div>
            ${summary}
            ${clone.innerHTML}
          </div>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  }
}
