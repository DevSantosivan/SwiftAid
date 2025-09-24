import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { IncidentService } from '../../core/incident.service';

interface EnrichedFeedback {
  id: string;
  name: string;
  rating: number;
  comment: string;
  timestamp: any;
  profilePic?: string;
}

@Component({
  selector: 'app-feedback',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './feedback.component.html',
  styleUrls: ['./feedback.component.scss'], // <-- typo dati, dapat plural
})
export class FeedbackComponent implements OnInit {
  defaultProfile = 'assets/profile.jpg';
  showDeleteNotification = false;
  selectedIds: string[] = [];

  feedbackList: EnrichedFeedback[] = [];

  constructor(private incidentService: IncidentService) {}

  ngOnInit(): void {
    this.incidentService.getFeedbacksWithRequestNames().subscribe((data) => {
      this.feedbackList = data.map((item) => ({
        id: item.id,
        name: item.name,
        profilePic: this.defaultProfile, // replace if actual profilePic exists
        rating: item.rating,
        comment: item.feedback,
        timestamp: item.timestamp,
      }));
    });
  }

  // --- COMPUTED RATINGS ---
  get officerRating(): number {
    if (!this.feedbackList.length) return 0;
    const sum = this.feedbackList.reduce((acc, f) => acc + f.rating, 0);
    return +(sum / this.feedbackList.length).toFixed(1); // ex: 4.5
  }

  get serviceRating(): number {
    // kung may ibang field like serviceRating sa backend, palitan dito
    return this.officerRating;
  }

  // --- SELECTION LOGIC ---
  isSelected(id: string): boolean {
    return this.selectedIds.includes(id);
  }

  toggleSelection(id: string, event: any) {
    if (event.target.checked) {
      this.selectedIds.push(id);
    } else {
      this.selectedIds = this.selectedIds.filter((i) => i !== id);
    }
  }

  toggleSelectAll(event: any) {
    if (event.target.checked) {
      this.selectedIds = this.feedbackList.map((f) => f.id);
    } else {
      this.selectedIds = [];
    }
  }

  isAllSelected(): boolean {
    return this.selectedIds.length === this.feedbackList.length;
  }

  deleteSelected() {
    this.feedbackList = this.feedbackList.filter(
      (f) => !this.selectedIds.includes(f.id)
    );
    this.selectedIds = [];

    this.showDeleteNotification = true;
    setTimeout(() => (this.showDeleteNotification = false), 3000);
  }
}
