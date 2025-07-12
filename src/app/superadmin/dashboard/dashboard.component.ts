import { Component } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { Router } from '@angular/router';
import { Chart, registerables } from 'chart.js';
import { UserService } from '../../core/user.service';
import { EmergencyRequestService } from '../../core/rescue_request.service';
import { NotificationService } from '../../core/notification.service';
import { OnInit } from '@angular/core';
import {
  Firestore,
  collection,
  getDocs,
  DocumentData,
} from '@angular/fire/firestore';
import { DashboardChartService } from '../../core/dashboard-chart.service';

Chart.register(...registerables);
@Component({
  selector: 'app-dashboard',
  imports: [],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  chart: any;
  pieChart: any; // Declare the pie chart variable
  yearlyChart: any; // Declare the yearly chart variable
  isAdmin: boolean = false;
  currentUserId: string = '';
  isloader: boolean = false;
  userCount: number = 0;
  EmergencyRequest: number = 0;
  // Line Chart Configuration (Monthly)
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
  public lineChartConfig: any = {
    type: 'bar',
    data: {
      labels: this.getMonthLabels(7), // Keeps monthly data as per your original request
      datasets: [
        {
          label: 'Police',
          data: [120, 140, 100, 180, 150, 160, 130],
          borderColor: 'red',
          backgroundColor: 'rgba(255, 0, 0, 0.8)',
          fill: true,
          borderWidth: 1,
          pointBorderRadius: 5,
        },
        {
          label: 'Ambulance',
          data: [60, 70, 50, 90, 85, 80, 75],
          borderColor: 'red',
          backgroundColor: 'rgba(255, 0, 0, 0.6)',
          fill: true,
          borderWidth: 1,
          pointBorderRadius: 5,
        },
        {
          label: 'Fire',
          data: [30, 45, 50, 40, 60, 55, 48],
          borderColor: 'red',
          backgroundColor: 'rgba(255, 0, 0, 0.4)',
          fill: true,
          borderWidth: 1,
          pointBorderRadius: 5,
        },
      ],
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
        },
      },
    },
  };

  // Pie Chart Configuration (Accident Categories)
  public pieChartConfig: any = {
    type: 'pie',
    data: {
      labels: [
        'Assault',
        'Break-in',
        'Vandalism',
        'Theft',
        'Accident',
        'Heart Attack',
        'Stroke',
        'Breathing Issues',
        'Fire',
        'Explosion',
        'Gas Leak',
        'Flood',
      ],
      datasets: [
        {
          label: 'Accident Categories',
          data: [5, 3, 25, 12, 10, 7, 6, 4, 8, 5, 9, 6], // Example data for each category
          backgroundColor: [
            'rgb(245, 18, 75)', // Assault
            'rgb(241, 69, 69)', // Break-in
            'rgb(255, 102, 102)', // Vandalism
            'rgb(255, 77, 77)', // Theft
            'rgb(204, 0, 0)', // Accident
            'rgb(255, 87, 34)', // Heart Attack
            'rgb(255, 153, 153)', // Stroke
            'rgb(255, 128, 128)', // Breathing Issues
            'rgb(255, 69, 0)', // Fire
            'rgb(255, 85, 85)', // Explosion
            'rgb(204, 51, 51)', // Gas Leak
            'rgb(255, 102, 85)', // Flood
          ],
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'top',
        },
      },
    },
  };

  // Yearly Chart Configuration (Accident Data)
  public yearlyChartConfig: any = {
    type: 'line',
    data: {
      labels: this.getYearLabels(5), // Get the last 5 years for example
      datasets: [
        {
          label: 'Accident Data',
          data: [20, 30, 40, 25, 50], // Sample data (replace with actual data)
          fill: false,
          borderColor: 'rgb(255, 8, 0)', // Blue line color
          tension: 0.1,
        },
      ],
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
        },
      },
    },
  };

  constructor(
    private authentication: Auth,
    private route: Router,
    private userService: UserService,
    private EmergencyRequestService: EmergencyRequestService,
    private firestore: Firestore,
    private notificationService: NotificationService,
    private dashboardChartService: DashboardChartService
  ) {}

  async ngOnInit() {
    const admins = await this.userService.getAdmins();
    this.isAdmin = admins.some((admin) => admin.uid === this.currentUserId);
    console.log('Is current user an admin?', this.isAdmin);

    // Initialize the charts
    this.chart = new Chart('MyLineChart', this.lineChartConfig);
    this.pieChart = new Chart('MyPieChart', this.pieChartConfig);
    this.yearlyChart = new Chart('MyYearlyChart', this.yearlyChartConfig);

    try {
      const userCount = await this.userService.getUserCount();
      console.log('Total users fetched:', userCount);
      this.userCount = userCount;

      // Fetch emergency request count
      const registeredAccount =
        await this.EmergencyRequestService.getRequestCount();
      console.log('Total emergency requests fetched:', registeredAccount);
      this.EmergencyRequest = registeredAccount;

      // Use DashboardChartService to fetch data for charts
      const accidentCategoryCounts =
        await this.dashboardChartService.fetchAccidentCategoryCounts();
      this.pieChartConfig.data.datasets[0].data = Object.values(
        accidentCategoryCounts
      );
      this.pieChart.update();

      const yearlyData =
        await this.dashboardChartService.fetchYearlyAccidentData();
      this.yearlyChartConfig.data.labels = yearlyData.years;
      this.yearlyChartConfig.data.datasets[0].data = yearlyData.counts;
      this.yearlyChart.update();

      // Continue with other data fetching as needed
      // ...
    } catch (error) {
      console.error('Error fetching chart data:', error);
    }
  }

  signout() {
    return this.authentication.signOut().then(() => {
      setTimeout(() => {
        this.route.navigate(['/login']);
      }, 3000);
      this.isloader = true;
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
            body {
              font-family: Arial, sans-serif;
              padding: 30px;
              color: #000;
            }
            .header { text-align: center; margin-bottom: 40px; }
            .logo { width: 100px; height: auto; }
            .report-title { font-size: 24px; font-weight: bold; color: #d32f2f; margin-top: 10px; }
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
