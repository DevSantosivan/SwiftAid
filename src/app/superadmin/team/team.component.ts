import { CommonModule } from '@angular/common';
import { Component, HostListener, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { NgZone } from '@angular/core';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { account } from '../../model/users';
import { register } from '../../model/registered';
import { UserService } from '../../core/user.service';

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
  imports: [CommonModule, FormsModule, MatSnackBarModule],
  templateUrl: './team.component.html',
  styleUrls: ['./team.component.scss'],
})
export class TeamComponent {
  private userService = inject(UserService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private ngZone = inject(NgZone);
  private snackBar = inject(MatSnackBar);

  teamMembers: AccountWithStatus[] = [];
  filteredMembers: AccountWithStatus[] = [];
  openDropdownIndex: number | null = null;
  searchTerm: string = '';
  isClosing = false;
  viewedMember: AccountWithStatus | null = null;

  deleteMemberToConfirm: AccountWithStatus | null = null;

  // Shared modal state
  isModalOpen = false;
  isEditMode = false;

  // Loading states
  isSaving = false;
  isDeleting = false;

  // One object for both Create and Edit
  activeMember: Partial<AccountWithStatus> & { password?: string } = {
    fullName: '',
    email: '',
    contactNumber: '',
    office_id: '',
    charge: '',
    status: { online: false, last: null },
  };

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

  viewMember(uid: string): void {
    const found = this.filteredMembers.find((m) => m.uid === uid);
    if (found) this.viewedMember = found;
  }

  closeViewModal(): void {
    this.isClosing = true;
    setTimeout(() => {
      this.viewedMember = null;
      this.isClosing = false;
    }, 300);
  }

  onSearchChange(): void {
    const term = this.searchTerm.toLowerCase().trim();
    this.filteredMembers = this.teamMembers.filter((member) => {
      const fullName = member.fullName?.toLowerCase() || '';
      const email = member.email?.toLowerCase() || '';
      return fullName.includes(term) || email.includes(term);
    });
  }

  // === Open Modal for Create or Edit ===

  openCreateModal(): void {
    this.isEditMode = false;
    this.isModalOpen = true;

    this.activeMember = {
      fullName: '',
      email: '',
      password: '',
      contactNumber: '',
      office_id: '',
      charge: '',
      status: { online: false, last: null },
    };
  }

  editMember(member: AccountWithStatus): void {
    this.isEditMode = true;
    this.isModalOpen = true;

    this.activeMember = {
      ...member,
    };
  }

  closeModal(): void {
    if (this.isSaving) return; // Prevent close while saving
    this.isModalOpen = false;
  }

  async saveMember(): Promise<void> {
    if (this.isEditMode) {
      await this.updateMember();
    } else {
      await this.createMember();
    }
  }

  // === Create ===
  async createMember(): Promise<void> {
    if (
      !this.activeMember.fullName ||
      !this.activeMember.email ||
      !this.activeMember.password
    ) {
      alert('Please fill in Full Name, Email, and Password.');
      return;
    }
    this.isModalOpen = false;
    this.isSaving = true;
    try {
      const fullNameParts = this.activeMember.fullName.trim().split(' ');
      const first_name = fullNameParts.shift() || '';
      const last_name = fullNameParts.join(' ') || '';

      const additionalData: Partial<register> = {
        fullName: this.activeMember.fullName,
        first_name,
        last_name,
        charge: this.activeMember.charge || '',
        office_id: this.activeMember.office_id || '',
        contactNumber: this.activeMember.contactNumber || '',
      };

      await this.userService.createAccount(
        this.activeMember.email,
        this.activeMember.password,
        additionalData
      );

      this.teamMembers = await this.userService.getAdmins();
      this.filteredMembers = [...this.teamMembers];

      this.showSuccessToast('Member created successfully!');
      this.closeModal();
    } catch (error) {
      console.error('Error creating member:', error);
      alert('Failed to create member.');
    } finally {
      this.isSaving = false;
    }
  }

  // === Update ===
  async updateMember(): Promise<void> {
    if (!this.activeMember?.uid) return;

    this.isSaving = true;
    this.isModalOpen = false;
    try {
      await this.userService.updateUser(
        this.activeMember.uid,
        this.activeMember
      );
      this.teamMembers = this.teamMembers.map((member) =>
        member.uid === this.activeMember.uid
          ? ({ ...this.activeMember } as AccountWithStatus)
          : member
      );
      this.filteredMembers = [...this.teamMembers];

      this.showSuccessToast('Member updated successfully!');
      this.closeModal();
    } catch (error) {
      console.error('Error updating member:', error);
      alert('Failed to update member.');
    } finally {
      this.isSaving = false;
    }
  }

  // === Delete ===
  confirmDeleteMember(member: AccountWithStatus): void {
    this.deleteMemberToConfirm = member;
  }

  cancelDelete(): void {
    if (this.isDeleting) return; // Prevent cancel during deleting
    this.deleteMemberToConfirm = null;
  }

  async confirmDelete(): Promise<void> {
    if (!this.deleteMemberToConfirm?.uid) return;

    this.isDeleting = true;
    try {
      await this.userService.deleteUser(this.deleteMemberToConfirm.uid);
      this.teamMembers = this.teamMembers.filter(
        (m) => m.uid !== this.deleteMemberToConfirm!.uid
      );
      this.filteredMembers = [...this.teamMembers];

      this.showSuccessToast('Member deleted successfully!');
    } catch (error) {
      console.error('Error deleting member:', error);
      alert('Failed to delete member.');
    } finally {
      this.isDeleting = false;
      this.deleteMemberToConfirm = null;
    }
  }

  showSuccessToast(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      verticalPosition: 'bottom',
      panelClass: ['snackbar-success'],
    });
  }
}
