import { Component, HostListener, OnInit } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import {
  Router,
  RouterOutlet,
  RouterLink,
  RouterLinkActive,
} from '@angular/router';
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
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/auth.service';

Chart.register(...registerables);

@Component({
  selector: 'app-home',
  imports: [
    AdminNavbarComponent,
    RouterOutlet,
    RouterLinkActive,
    RouterLink,
    FormsModule,
    ReactiveFormsModule,
    CommonModule,
  ],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent implements OnInit {
  // Charts references
  chart: any;
  pieChart: any;
  yearlyChart: any;

  // Sidebar state
  isCollapsed = false;

  // Notification state
  hasUnreadNotifications = false;
  unreadNotificationCount = 0;

  // User and data counts
  userCount = 0;
  emergencyRequestCount = 0;

  // Add this for mobile view detection
  isMobileView: boolean = false;

  constructor(
    private authentication: Auth,
    private router: Router,
    private userService: UserService,
    private emergencyRequestService: EmergencyRequestService,
    private firestore: Firestore,
    private notificationService: NotificationService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.checkScreenWidth();

    // Your existing async logic inside ngOnInit wrapped in an async function:
    (async () => {
      try {
        // Load unread notification count and state
        await this.updateUnreadNotificationStatus();

        // Fetch user count
        this.userCount = await this.userService.getUserCount();

        // Fetch emergency request count
        this.emergencyRequestCount =
          await this.emergencyRequestService.getRequestCount();

        // TODO: Load pie chart data for accident categories here
        await this.getAccidentCategoriesFromFirestore();

        // Load yearly accident data and update chart
        await this.getYearlyAccidentData();

        // Initialize your charts here if needed, e.g.:
        // this.chart = new Chart(<canvasRef>, this.lineChartConfig);
        // this.yearlyChart = new Chart(<canvasRef>, this.yearlyChartConfig);
      } catch (error) {
        console.error('Error initializing dashboard:', error);
      }
    })();
  }

  // HostListener to listen to window resize and update isMobileView accordingly
  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.checkScreenWidth();
  }

  // Helper method to set isMobileView based on window width
  private checkScreenWidth() {
    this.isMobileView = window.innerWidth <= 768; // breakpoint for mobile/tablet
  }

  toggleSidebar() {
    this.isCollapsed = !this.isCollapsed;
  }

  // (Rest of your existing methods below...)

  // Line Chart Config for Monthly Data (example static data)
  public lineChartConfig: any = {
    type: 'bar',
    data: {
      labels: this.getMonthLabels(7),
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
        y: { beginAtZero: true },
      },
    },
  };

  // Yearly Chart Config (Accident Data)
  public yearlyChartConfig: any = {
    type: 'line',
    data: {
      labels: this.getYearLabels(5),
      datasets: [
        {
          label: 'Accident Data',
          data: [20, 30, 40, 25, 50], // placeholder data, replaced on load
          fill: false,
          borderColor: 'rgb(255, 8, 0)',
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

  // Your other methods...

  getMonthLabels(count: number): string[] {
    const labels: string[] = [];
    const date = new Date();
    for (let i = 0; i < count; i++) {
      labels.unshift(date.toLocaleString('default', { month: 'short' }));
      date.setMonth(date.getMonth() - 1);
    }
    return labels;
  }

  getYearLabels(count: number): string[] {
    const labels: string[] = [];
    const year = new Date().getFullYear();
    for (let i = count - 1; i >= 0; i--) {
      labels.push((year - i).toString());
    }
    return labels;
  }

  async getAccidentCategoriesFromFirestore() {
    const accidentRef = collection(this.firestore, 'EmergencyRequest');
    const querySnapshot = await getDocs(accidentRef);
    // TODO: aggregate data here to build your pie chart dataset
  }

  async getYearlyAccidentData() {
    const accidentRef = collection(this.firestore, 'EmergencyRequest');
    const querySnapshot = await getDocs(accidentRef);

    const yearCounts: { [year: string]: number } = {};

    querySnapshot.forEach((doc) => {
      const data = doc.data() as DocumentData;
      const timestamp = data['timestamp'];

      if (timestamp) {
        const year = new Date(timestamp.seconds * 1000)
          .getFullYear()
          .toString();
        yearCounts[year] = (yearCounts[year] || 0) + 1;
      }
    });

    const years = Object.keys(yearCounts).sort(
      (a, b) => parseInt(a) - parseInt(b)
    );
    const counts = years.map((year) => yearCounts[year]);

    this.yearlyChartConfig.data.labels = years;
    this.yearlyChartConfig.data.datasets[0].data = counts;

    if (this.yearlyChart) this.yearlyChart.update();
  }

  navigateToMap() {
    this.router.navigate(['/admin/map']);
  }

  navigateToHistoryCall() {
    this.router.navigate(['/admin/history-call']);
  }

  navigateToUserList() {
    this.router.navigate(['/admin/user-list']);
  }

  signout() {
    this.authentication.signOut().then(() => {
      this.router.navigate(['/login']);
    });
  }

  async updateUnreadNotificationStatus() {
    try {
      const currentUser = this.authentication.currentUser;
      if (!currentUser) {
        this.hasUnreadNotifications = false;
        this.unreadNotificationCount = 0;
        return;
      }

      const count =
        await this.emergencyRequestService.getUnreadNotificationCountForUser(
          currentUser.uid
        );

      this.unreadNotificationCount = count;
      this.hasUnreadNotifications = count > 0;

      console.log('Unread notifications:', count);
    } catch (error) {
      console.error('Failed to fetch unread notification count:', error);
    }
  }
}
