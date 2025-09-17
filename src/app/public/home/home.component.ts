import { Component, OnInit, OnDestroy } from '@angular/core';
import { NavbarComponent } from '../navbar/navbar.component';
import { FooterComponent } from '../footer/footer.component';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

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

  // Stats (sample data for now, replace with Firestore later)
  totalRequests = 120;
  resolvedRequests = 95;
  pendingRequests = 25;

  // User feedbacks (sample)
  feedbacks = [
    {
      user: 'Juan Dela Cruz',
      avatar: '../../../assets/profile-deafault.jpg',
      date: new Date(2025, 8, 12, 14, 30), // Sep 12, 2025 2:30 PM
      message: 'The response was quick and efficient!',
      likes: 5,
      comments: 3,
    },
    {
      user: 'Maria Santos',
      avatar: '../../../assets/profile-deafault.jpg',
      date: new Date(2025, 8, 14, 10, 15), // Sep 14, 2025 10:15 AM
      message: 'Thank you to the staff for the fast help.',
      likes: 5,
      comments: 5,
    },
    {
      user: 'Pedro Ramirez',
      avatar: '../../../assets/profile-deafault.jpg',
      date: new Date(2025, 8, 16, 18, 45), // Sep 16, 2025 6:45 PM
      message: 'Very reliable system during emergencies.',
      likes: 5,
      comments: 2,
    },
    {
      user: 'Pedro Ramirez',
      avatar: '../../../assets/profile-deafault.jpg',
      date: new Date(2025, 8, 16, 18, 45), // Sep 16, 2025 6:45 PM
      message: 'Very reliable system during emergencies.',
      likes: 5,
      comments: 2,
    },
    {
      user: 'Pedro Ramirez',
      avatar: '../../../assets/profile-deafault.jpg',
      date: new Date(2025, 8, 16, 18, 45), // Sep 16, 2025 6:45 PM
      message: 'Very reliable system during emergencies.',
      likes: 5,
      comments: 2,
    },
    {
      user: 'Pedro Ramirez',
      avatar: '../../../assets/profile-deafault.jpg',
      date: new Date(2025, 8, 16, 18, 45), // Sep 16, 2025 6:45 PM
      message: 'Very reliable system during emergencies.',
      likes: 4,
      comments: 2,
    },
  ];

  ngOnInit() {
    this.startAutoSlide();
  }

  startAutoSlide() {
    this.intervalId = setInterval(() => {
      this.currentIndex = (this.currentIndex + 1) % this.carouselItems.length;
    }, 3000); // slide every 3s
  }

  ngOnDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }
}
