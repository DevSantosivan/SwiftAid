import { Component, OnInit } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import {
  Router,
  RouterOutlet,
  RouterLink,
  RouterLinkActive,
} from '@angular/router';
import { LoaderComponent } from '../../loader/loader.component';
import { AdminNavbarComponent } from '../admin-navbar/admin-navbar.component';
import { Chart, registerables } from 'chart.js';
import { UserService } from '../../core/user.service';
import { EmergencyRequestService } from '../../core/rescue_request.service';
import { NotificationService } from '../../core/notification.service';
import {
  Firestore,
  collection,
  getDocs,
  DocumentData,
} from '@angular/fire/firestore';
import { DashboardComponent } from '../../superadmin/dashboard/dashboard.component';

Chart.register(...registerables);

@Component({
  selector: 'app-home',
  imports: [AdminNavbarComponent, RouterOutlet, RouterLinkActive, RouterLink],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent implements OnInit {
  chart: any;
  pieChart: any; // Declare the pie chart variable
  yearlyChart: any; // Declare the yearly chart variable

  // Line Chart Configuration (Monthly)
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
    private notificationService: NotificationService
  ) {}

  userCount: number = 0;
  EmergencyRequest: number = 0;

  async ngOnInit() {
    console.log('ngOnInit called');

    // Initialize the charts
    this.chart = new Chart('MyLineChart', this.lineChartConfig);
    this.pieChart = new Chart('MyPieChart', this.pieChartConfig);
    this.yearlyChart = new Chart('MyYearlyChart', this.yearlyChartConfig);

    try {
      // Fetch user count
      const userCount = await this.userService.getUserCount();
      console.log('Total users fetched:', userCount);
      this.userCount = userCount;

      // Fetch emergency request count
      const registeredAccount =
        await this.EmergencyRequestService.getRequestCount();
      console.log('Total emergency requests fetched:', registeredAccount);
      this.EmergencyRequest = registeredAccount;

      // Fetch accident category data for pie chart
      await this.getAccidentCategoriesFromFirestore();

      // Fetch yearly accident data for line chart
      await this.getYearlyAccidentData();

      this.notificationService.requestNotificationPermission();
      this.notificationService.listenToEmergencyRequests();
      this.notificationService.listenForFCMMessages();
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  }

  // Get Month Labels (for Monthly Chart)
  getMonthLabels(count: number): string[] {
    const labels = [];
    const date = new Date();
    for (let i = 0; i < count; i++) {
      labels.push(date.toLocaleString('default', { month: 'short' }));
      date.setMonth(date.getMonth() - 1);
    }
    return labels.reverse(); // To show in the correct order (latest month first)
  }

  // Get Year Labels (for Yearly Chart)
  getYearLabels(count: number): string[] {
    const labels = [];
    const date = new Date();
    for (let i = 0; i < count; i++) {
      labels.push((date.getFullYear() - i).toString()); // Get last 'count' years
    }
    return labels.reverse();
  }

  // Fetch data for accident categories from Firestore
  async getAccidentCategoriesFromFirestore() {
    const accidentRef = collection(this.firestore, 'EmergencyRequest');
    const querySnapshot = await getDocs(accidentRef);

    // Initialize counters for each event type
    const counts: Record<string, number> = {
      Assault: 0,
      'Break-in': 0,
      Vandalism: 0,
      Theft: 0,
      Accident: 0,
      'Heart Attack': 0,
      Stroke: 0,
      Explosion: 0,
      'Gas Leak': 0,
      Flood: 0,
      Fire: 0,
    };

    querySnapshot.forEach((doc) => {
      const data = doc.data() as DocumentData;
      const event = data['event']?.trim() as string;
      if (event && counts.hasOwnProperty(event)) {
        counts[event]++;
      }
    });

    // Update pie chart with the counts
    this.pieChartConfig.data.datasets[0].data = Object.values(counts);
    this.pieChart.update();
  }

  // Fetch yearly accident data from Firestore
  async getYearlyAccidentData() {
    const accidentRef = collection(this.firestore, 'EmergencyRequest');
    const querySnapshot = await getDocs(accidentRef);

    // Aggregate data by year
    const yearCounts: { [key: string]: number } = {};

    // Loop through each document in the Firestore collection
    querySnapshot.forEach((doc) => {
      const data = doc.data() as DocumentData;
      const timestamp = data['timestamp']; // Extract the timestamp field

      if (timestamp) {
        const year = new Date(timestamp.seconds * 1000)
          .getFullYear()
          .toString(); // Extract year from timestamp
        yearCounts[year] = (yearCounts[year] || 0) + 1; // Count events by year
      }
    });

    // Prepare the years and counts for the chart
    const years = Object.keys(yearCounts).sort(
      (a, b) => parseInt(b) - parseInt(a)
    ); // Sort by year descending
    const counts = years.map((year) => yearCounts[year]);

    // Update the yearly chart with aggregated counts
    this.yearlyChartConfig.data.labels = years;
    this.yearlyChartConfig.data.datasets[0].data = counts;
    this.yearlyChart.update();
  }

  isloader: boolean = false;

  // Navigation methods
  navigateToMap() {
    this.route.navigate(['/admin/map']);
  }

  navigateToHistoryCall() {
    this.route.navigate(['/admin/history-call']);
  }

  navigateToUserList() {
    this.route.navigate(['/admin/user-list']);
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
