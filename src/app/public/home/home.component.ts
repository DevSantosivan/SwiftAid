import { Component, OnInit, OnDestroy } from '@angular/core';
import { NavbarComponent } from '../navbar/navbar.component';
import { FooterComponent } from '../footer/footer.component';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { IncidentService } from '../../core/incident.service';
import { EmergencyRequestService } from '../../core/rescue_request.service';
import { Router, RouterLink } from '@angular/router';

interface EnrichedFeedback {
  id: string;
  name: string;
  profilePic: string;
  rating: number;
  comment: string;
  timestamp: any;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    NavbarComponent,
    FooterComponent,
    ReactiveFormsModule,
    CommonModule,
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements OnInit, OnDestroy {
  // Carousel images
  carouselItems = [
    '../../../assets/dashboard.png',
    '../../../assets/emergency_map.png',
    '../../../assets/emergency_map1.png',
    '../../../assets/dashboard.png',
  ];

  currentIndex = 0;
  intervalId: any;

  // Stats (dynamic)
  totalRequests = 0;
  resolvedRequests = 0;
  pendingRequests = 0;

  // Feedbacks fetched from Firestore
  feedbackList: EnrichedFeedback[] = [];
  defaultProfile = '../../../assets/profile-deafault.jpg';

  private subscriptions: any[] = [];

  constructor(
    private incidentService: IncidentService,
    private emergencyService: EmergencyRequestService,
    private route: Router
  ) {}

  ngOnInit() {
    this.startAutoSlide();

    // ✅ Fetch live feedbacks
    const feedbackSub = this.incidentService
      .getFeedbacksWithRequestNames()
      .subscribe((data) => {
        this.feedbackList = data.map((item) => ({
          id: item.id,
          name: this.maskName(item.name),
          profilePic: this.defaultProfile,
          rating: item.rating,
          comment: item.feedback,
          timestamp: item.timestamp,
        }));
      });

    // ✅ Fetch live stats (subscribe once)
    const statsSub = this.emergencyService
      .getRequestRealtime()
      .subscribe((requests) => {
        this.totalRequests = requests.length;
        this.resolvedRequests = requests.filter(
          (r) => r.status?.toLowerCase() === 'resolved'
        ).length;
        this.pendingRequests = requests.filter(
          (r) => r.status?.toLowerCase() === 'pending'
        ).length;
      });

    this.subscriptions.push(feedbackSub, statsSub);
  }

  startAutoSlide() {
    this.intervalId = setInterval(() => {
      this.currentIndex = (this.currentIndex + 1) % this.carouselItems.length;
    }, 3000);
  }

  ngOnDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  // 🔒 Mask the feedback name
  maskName(fullName: string): string {
    if (!fullName) return 'Anonymous';

    const parts = fullName.split(' ');
    return parts
      .map((part, idx) => {
        if (idx === 0) {
          return part[0] + '*'.repeat(part.length - 1); // J***
        } else {
          return part[0] + '.'; // D.
        }
      })
      .join(' ');
  }

  goToLogin() {
    this.route.navigate(['/login']);
  }
}
