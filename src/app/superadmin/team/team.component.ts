import { CommonModule } from '@angular/common';
import { Component, HostListener, inject, Input } from '@angular/core';
import { account } from '../../model/users';
import { UserService } from '../../core/user.service';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { TimeDiffPipe } from '../../../pipe/time-diff.pipe';
import { NgZone } from '@angular/core';
// Updated interface to match your service output exactly
interface AccountWithStatus extends account {
  uid: string;
  status: {
    online: boolean;
    last: number | null;
  };
}

@Component({
  selector: 'app-team',
  standalone: true,
  imports: [CommonModule, FormsModule, TimeDiffPipe],
  templateUrl: './team.component.html',
  styleUrls: ['./team.component.scss'], // fixed from styleUrl to styleUrls
})
export class TeamComponent {
  private userService = inject(UserService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private ngZone = inject(NgZone);

  teamMembers: AccountWithStatus[] = [];
  filteredMembers: AccountWithStatus[] = [];
  openDropdownIndex: number | null = null;
  searchTerm: string = '';
  isProfileVisible = false;
  viewedMember: AccountWithStatus | null = null;
  isClosing: boolean = false;

  // For editing modal/view
  selectedMember: AccountWithStatus | null = null;
  @Input() member: any;

  // For delete confirmation modal
  deleteMemberToConfirm: AccountWithStatus | null = null;

  async ngOnInit() {
    try {
      this.teamMembers = await this.userService.getAdmins();
      this.filteredMembers = [...this.teamMembers];

      this.teamMembers.forEach((member) => {
        this.userService.subscribeUserStatus(member.uid, (online, last) => {
          member.status = { online, last };
          this.filteredMembers = [...this.filteredMembers]; // trigger UI update
        });
      });
    } catch (error) {
      console.error('Error fetching admins:', error);
    }
  }

  toggleDropdown(index: number): void {
    this.openDropdownIndex = this.openDropdownIndex === index ? null : index;
  }

  @HostListener('document:click')
  closeDropdown(): void {
    this.openDropdownIndex = null;
  }

  editMember(member: AccountWithStatus): void {
    this.selectedMember = { ...member };
  }

  viewMember(uid: string): void {
    const found = this.filteredMembers.find((m) => m.uid === uid);
    if (found) {
      this.viewedMember = found;
    }
  }

  closeViewModal(): void {
    this.isClosing = true;

    setTimeout(() => {
      this.viewedMember = null;
      this.isClosing = false;
    }, 300);
  }

  closeModal(): void {
    this.selectedMember = null;
  }

  deleteMember(member: AccountWithStatus): void {
    this.selectedMember = { ...member };
  }

  async updateMember(): Promise<void> {
    if (!this.selectedMember?.uid) return;

    try {
      await this.userService.updateUser(
        this.selectedMember.uid,
        this.selectedMember
      );
      console.log('Update successful');

      this.teamMembers = this.teamMembers.map((member) =>
        member.uid === this.selectedMember!.uid
          ? { ...this.selectedMember! }
          : member
      );
      this.filteredMembers = [...this.teamMembers];

      this.closeModal();
      alert('Member updated successfully!');
    } catch (error) {
      console.error('Error updating member:', error);
      alert('Failed to update member.');
    }
  }

  confirmDeleteMember(member: AccountWithStatus): void {
    this.deleteMemberToConfirm = member;
  }

  cancelDelete(): void {
    this.deleteMemberToConfirm = null;
  }

  async confirmDelete(): Promise<void> {
    if (!this.deleteMemberToConfirm?.uid) {
      console.warn('No member selected to delete');
      return;
    }

    try {
      console.log('Deleting member:', this.deleteMemberToConfirm);
      await this.userService.deleteUser(this.deleteMemberToConfirm.uid);
      console.log('Delete successful');

      this.teamMembers = this.teamMembers.filter(
        (m) => m.uid !== this.deleteMemberToConfirm!.uid
      );
      this.filteredMembers = this.filteredMembers.filter(
        (m) => m.uid !== this.deleteMemberToConfirm!.uid
      );

      alert('Member deleted successfully!');
    } catch (error) {
      console.error('Error deleting member:', error);
      alert('Failed to delete member.');
    } finally {
      this.deleteMemberToConfirm = null;
    }
  }

  onSearchChange(): void {
    const term = this.searchTerm.toLowerCase().trim();

    this.filteredMembers = this.teamMembers.filter((member) => {
      const fullName = member.fullName?.toLowerCase() || '';
      const email = member.email?.toLowerCase() || '';
      return fullName.includes(term) || email.includes(term);
    });
  }
}
