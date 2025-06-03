import { CommonModule } from '@angular/common';
import { Component, HostListener, inject } from '@angular/core';
import { account } from '../../model/users';
import { UserService } from '../../core/user.service';
import { FormsModule } from '@angular/forms';
import { Router, RouterOutlet } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-team',
  standalone: true, // add standalone to use imports here
  imports: [CommonModule, FormsModule],
  templateUrl: './team.component.html',
  styleUrl: './team.component.scss',
})
export class TeamComponent {
  private userService = inject(UserService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  teamMembers: account[] = [];
  filteredMembers: account[] = [];
  openDropdownIndex: number | null = null;
  searchTerm: string = '';

  // For editing modal/view
  selectedMember: account | null = null;

  // For delete confirmation modal
  deleteMemberToConfirm: account | null = null;

  async ngOnInit() {
    try {
      this.teamMembers = await this.userService.getAdmins();
      this.filteredMembers = [...this.teamMembers];
    } catch (error) {
      console.error('Error loading admins:', error);
    }
  }

  toggleDropdown(index: number): void {
    this.openDropdownIndex = this.openDropdownIndex === index ? null : index;
  }

  @HostListener('document:click')
  closeDropdown(): void {
    this.openDropdownIndex = null;
  }

  editMember(member: account): void {
    this.selectedMember = { ...member }; // Clone to avoid direct mutation
  }

  viewMember(uid: string): void {
    if (!uid) {
      console.warn('Member ID not found');
      return;
    }

    this.router.navigate(['superAdmin/Team-Details'], {
      queryParams: { uid: uid },
    });
  }

  closeModal(): void {
    this.selectedMember = null;
  }
  deleteMember(member: account): void {
    this.selectedMember = { ...member }; // Clone to avoid direct mutation
  }

  async updateMember(): Promise<void> {
    if (!this.selectedMember?.uid) {
      console.warn('No selectedMember or uid to update!');
      return;
    }

    try {
      console.log('Updating member:', this.selectedMember);
      await this.userService.updateUser(
        this.selectedMember.uid,
        this.selectedMember
      );
      console.log('Update successful');

      // Update the local teamMembers array
      this.teamMembers = this.teamMembers.map((member) =>
        member.uid === this.selectedMember!.uid
          ? { ...this.selectedMember! }
          : member
      );

      // Sync filteredMembers to reflect updates
      this.filteredMembers = [...this.teamMembers];

      this.closeModal();
      alert('Member updated successfully!');
    } catch (error) {
      console.error('Error updating member:', error);
      alert('Failed to update member.');
    }
  }

  confirmDeleteMember(member: account): void {
    this.deleteMemberToConfirm = member;
  }

  // Cancel delete modal
  cancelDelete(): void {
    this.deleteMemberToConfirm = null;
  }

  // Confirm delete action from modal
  async confirmDelete(): Promise<void> {
    if (!this.deleteMemberToConfirm?.uid) {
      console.warn('No member selected to delete');
      return;
    }

    try {
      console.log('Deleting member:', this.deleteMemberToConfirm);
      await this.userService.deleteUser(this.deleteMemberToConfirm.uid);
      console.log('Delete successful');

      // Remove deleted member from local arrays
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
      this.deleteMemberToConfirm = null; // Close modal regardless of success/fail
    }
  }

  onSearchChange(): void {
    const term = this.searchTerm.toLowerCase();
    this.filteredMembers = this.teamMembers.filter(
      (member) =>
        member.fullName?.toLowerCase().includes(term) ||
        member.email?.toLowerCase().includes(term)
    );
  }
}
