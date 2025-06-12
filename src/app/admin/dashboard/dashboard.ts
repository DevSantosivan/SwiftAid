import { Component } from '@angular/core';
import { ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { EmergencyRequestService } from '../../core/rescue_request.service';
import { DashboardChartService } from '../../core/dashboard-chart.service';
import { Auth } from '@angular/fire/auth';
import { Router } from '@angular/router';
import { UserService } from '../../core/user.service';
import { OnInit } from '@angular/core';
import { Chart, registerables } from 'chart.js';
import { Firestore } from '@angular/fire/firestore';
import { NotificationService } from '../../core/notification.service';

@Component({
  selector: 'app-dashboard',
  imports: [],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
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
}
