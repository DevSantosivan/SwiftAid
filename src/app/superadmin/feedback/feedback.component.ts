import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-feedback',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './feedback.component.html',
  styleUrl: './feedback.component.scss',
})
export class FeedbackComponent {
  activeTab = 'barangay';
  defaultProfile = 'https://via.placeholder.com/50';
  showDeleteNotification = false;
  selectedIds: string[] = [];

  feedbackList = [
    {
      id: '1',
      name: 'Juan Dela Cruz',
      profilePic: 'https://randomuser.me/api/portraits/men/32.jpg',
      rating: 5,
      comment: 'Great service and support from the barangay!',
    },
    {
      id: '2',
      name: 'Maria Santos',
      profilePic: 'https://randomuser.me/api/portraits/women/44.jpg',
      rating: 4,
      comment: 'Fast response but room for improvement in follow-ups.',
    },
    {
      id: '3',
      name: 'Carlos Reyes',
      profilePic: '',
      rating: 3,
      comment: 'Okay lang. Medyo matagal pero maayos naman.',
    },
  ];

  setTab(tabName: string): void {
    this.activeTab = tabName;
  }

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

    // ✅ Show deleted message
    this.showDeleteNotification = true;

    // ✅ Hide after 3 seconds
    setTimeout(() => {
      this.showDeleteNotification = false;
    }, 3000);
  }
}
