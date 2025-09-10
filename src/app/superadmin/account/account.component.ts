import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit } from '@angular/core';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { UserService } from '../../core/user.service';

import { account } from '../../model/users';

@Component({
  selector: 'app-account',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './account.component.html',
  styleUrl: './account.component.scss',
})
export class AccountComponent implements OnInit {
  activeTab = 'all';
  openDropdownIndex: number | null = null;
  showBulkMenu = false;
  searchTerm: string = '';
  showBlockModal = false;
  showDeleteModal = false;
  showDeleteModalSelected = false;
  showSuccessModal = false;
  successMessage = '';
  blockReason = '';
  accountToDelete: account | null = null;
  accountToView: account | null = null;
  accountToEdit: account | null = null;

  // NEW: Reactive form for editing
  editForm: FormGroup | null = null;

  defaultAvatar =
    'https://i.pinimg.com/736x/32/e4/61/32e46132a367eb48bb0c9e5d5b659c88.jpg';

  allAccounts: account[] = [];

  selectedResidentMap: { [key: string]: boolean } = {};
  selectedStaffMap: { [key: string]: boolean } = {};

  selectedResidents: account[] = [];
  selectedStaff: account[] = [];

  showDeleteNotification = false;

  // Central loading flag for blocking UI
  blockingInProgress: boolean = false;
  Math: any;

  currentPage: number = 1;
  itemsPerPage: number = 9; // or 10, depende sa gusto mo

  constructor(private accountService: UserService, private fb: FormBuilder) {}

  ngOnInit(): void {
    this.accountService.getAllAccounts().subscribe((accounts) => {
      this.allAccounts = accounts;
      this.updateSelectedResidents();
      this.updateSelectedStaff();
    });
  }

  goToPage(page: number) {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
  }

  get paginatedResidents() {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return this.filteredResidents.slice(startIndex, endIndex);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredResidents.length / this.itemsPerPage);
  }

  private matchesSearch(acc: any): boolean {
    const term = this.searchTerm.toLowerCase();
    return (
      acc.fullName?.toLowerCase().includes(term) ||
      acc.email?.toLowerCase().includes(term) ||
      acc.contactNumber?.toLowerCase().includes(term) ||
      acc.address?.toLowerCase().includes(term) ||
      acc.office_id?.toLowerCase().includes(term) ||
      acc.role?.toLowerCase().includes(term)
    );
  }

  get filteredAllAccounts() {
    return this.allAccounts.filter((acc) => this.matchesSearch(acc));
  }
  get filteredResidents() {
    return this.residentAccounts.filter((acc) => this.matchesSearch(acc));
  }

  get filteredStaff() {
    return this.staffAccounts.filter((acc) => this.matchesSearch(acc));
  }

  get filteredBlocked() {
    return this.blockAccounts.filter((acc) => this.matchesSearch(acc));
  }

  get residentAccounts() {
    return this.allAccounts.filter(
      (acc) => acc.role === 'resident' && !acc.blocked
    );
  }

  get totalResidentAccountsCount(): number {
    return this.residentAccounts.length;
  }

  get blockAccounts() {
    return this.allAccounts.filter((acc) => acc.role === 'resident');
  }

  get blockedResidentAccountsCount(): number {
    return this.blockAccounts.length;
  }
  get pendingResidentAccountsCount(): number {
    return this.residentAccounts.filter(
      (acc) => acc.account_status.toLowerCase() === 'pending'
    ).length;
  }

  get registeredResidentAccountsCount(): number {
    return this.residentAccounts.filter(
      (acc) => acc.account_status.toLowerCase() === 'approved'
    ).length;
  }

  get staffAccounts() {
    return this.allAccounts.filter((acc) => acc.role === 'admin');
  }

  get selectedAccounts() {
    return this.allAccounts.filter(
      (acc) => this.selectedResidentMap[acc.id] || this.selectedStaffMap[acc.id]
    );
  }

  toggleDropdown(index: number): void {
    this.openDropdownIndex = this.openDropdownIndex === index ? null : index;
  }

  closeDropdown(): void {
    this.openDropdownIndex = null;
    this.showBulkMenu = false;
  }

  setTab(tab: string) {
    this.activeTab = tab;
    this.showBulkMenu = false;
  }

  toggleBulkMenu(event: MouseEvent) {
    event.stopPropagation();
    this.showBulkMenu = !this.showBulkMenu;
  }

  isChecked(acc: account): boolean {
    return acc.role === 'resident'
      ? this.selectedResidentMap[acc.id] || false
      : this.selectedStaffMap[acc.id] || false;
  }

  setChecked(acc: account, event: Event) {
    const target = event.target as HTMLInputElement;
    const isChecked = target?.checked ?? false;

    if (acc.role === 'resident') {
      this.selectedResidentMap[acc.id] = isChecked;
      this.updateSelectedResidents();
    } else if (acc.role === 'admin') {
      this.selectedStaffMap[acc.id] = isChecked;
      this.updateSelectedStaff();
    }
  }

  toggleSelectAllResident(event: Event) {
    const target = event.target as HTMLInputElement;
    const checked = target?.checked ?? false;

    this.allAccounts.forEach((acc) => {
      if (acc.role === 'resident') {
        this.selectedResidentMap[acc.id] = checked;
      } else if (acc.role === 'admin') {
        this.selectedStaffMap[acc.id] = checked;
      }
    });

    this.updateSelectedResidents();
    this.updateSelectedStaff();
  }

  isAllSelected(): boolean {
    return (
      this.allAccounts.length > 0 &&
      this.allAccounts.every((acc) => this.isChecked(acc))
    );
  }

  selectBy(type: 'all' | 'none' | 'resident' | 'staff') {
    this.allAccounts.forEach((acc) => {
      if (type === 'all') {
        if (acc.role === 'resident') this.selectedResidentMap[acc.id] = true;
        if (acc.role === 'admin') this.selectedStaffMap[acc.id] = true;
      } else if (type === 'none') {
        this.selectedResidentMap[acc.id] = false;
        this.selectedStaffMap[acc.id] = false;
      } else if (type === 'resident') {
        this.selectedResidentMap[acc.id] = acc.role === 'resident';
        this.selectedStaffMap[acc.id] = false;
      } else if (type === 'staff') {
        this.selectedStaffMap[acc.id] = acc.role === 'admin';
        this.selectedResidentMap[acc.id] = false;
      }
    });

    this.updateSelectedResidents();
    this.updateSelectedStaff();
    this.showBulkMenu = false;
  }

  updateSelectedResidents() {
    this.selectedResidents = this.residentAccounts.filter(
      (acc) => this.selectedResidentMap[acc.id]
    );
  }

  updateSelectedStaff() {
    this.selectedStaff = this.staffAccounts.filter(
      (acc) => this.selectedStaffMap[acc.id]
    );
  }

  viewAccount(account: account) {
    this.accountToView = account;
  }

  closeView() {
    this.accountToView = null;
  }

  // --- EDIT with Reactive Form ---
  editAccount(account: account) {
    this.accountToEdit = { ...account };

    this.editForm = this.fb.group({
      fullName: [account.fullName, Validators.required],
      email: [account.email, [Validators.required, Validators.email]],
      contactNumber: [account.contactNumber, Validators.required],
      address: [account.address, Validators.required],
      office_id: [account.office_id],
      role: [account.role, Validators.required],
      profileImageUrl: [account.profileImageUrl || this.defaultAvatar],
      nationalIdImageUrl: [account.validIdImageUrl || null], // Added
      birthCertImageUrl: [account.validIdImageUrl || null], // Added
      // add other fields as needed
    });
  }

  closeEdit() {
    this.accountToEdit = null;
    this.editForm = null;
  }

  onAvatarChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (file && this.editForm) {
      const reader = new FileReader();
      reader.onload = () => {
        this.editForm!.patchValue({ profileImageUrl: reader.result });
        if (this.accountToEdit) {
          this.accountToEdit.profileImageUrl = reader.result as string;
        }
      };
      reader.readAsDataURL(file);
    }
  }

  onNationalIdChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (file && this.editForm) {
      const reader = new FileReader();
      reader.onload = () => {
        this.editForm!.patchValue({ nationalIdImageUrl: reader.result });
        if (this.accountToEdit) {
          this.accountToEdit.validIdImageUrl = reader.result as string;
        }
      };
      reader.readAsDataURL(file);
    }
  }
  triggerProfileImageUpload() {
    const input = document.getElementById(
      'profileImageInput'
    ) as HTMLElement | null;
    if (input) {
      input.click();
    }
  }

  onBirthCertChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (file && this.editForm) {
      const reader = new FileReader();
      reader.onload = () => {
        this.editForm!.patchValue({ birthCertImageUrl: reader.result });
        if (this.accountToEdit) {
          this.accountToEdit.validIdImageUrl = reader.result as string;
        }
      };
      reader.readAsDataURL(file);
    }
  }

  async saveEdit() {
    if (!this.editForm || !this.editForm.valid || !this.accountToEdit) return;

    this.blockingInProgress = true;

    const updatedUser = {
      ...this.accountToEdit,
      ...this.editForm.value,
    };

    try {
      await this.accountService.updateUser(updatedUser.id, updatedUser);
      this.accountToEdit = null;
      this.editForm = null;
      this.showSuccess('User updated successfully.');
    } catch (error) {
      console.error('Update failed:', error);
      alert('Failed to update user. Please try again.');
    } finally {
      this.blockingInProgress = false;
    }
  }

  deleteAccount(account: account) {
    this.accountToDelete = account;
    this.showDeleteModal = true;
  }

  async confirmDelete() {
    if (!this.accountToDelete) return;

    this.blockingInProgress = true;
    try {
      await this.accountService.deleteUser(this.accountToDelete.id);
      this.accountToDelete = null;
      this.showDeleteModal = false;
      this.showSuccess('User deleted successfully.');
    } catch (error) {
      console.error('Delete failed:', error);
      alert('Failed to delete user. Please try again.');
    } finally {
      this.blockingInProgress = false;
    }
  }

  cancelDelete() {
    this.accountToDelete = null;
    this.showDeleteModal = false;
  }

  deleteSelectedAccounts() {
    this.showDeleteModalSelected = true;
  }

  async confirmSeletedAccountDelete() {
    this.showDeleteModalSelected = false;
    const selectedIds = [
      ...this.selectedResidents.map((acc) => acc.id),
      ...this.selectedStaff.map((acc) => acc.id),
    ];

    if (selectedIds.length === 0) return;

    this.blockingInProgress = true;
    try {
      await this.accountService.deleteUsers(selectedIds);
      this.selectedResidentMap = {};
      this.selectedStaffMap = {};
      this.selectedResidents = [];
      this.selectedStaff = [];
      this.showSuccess('Selected users deleted successfully.');
    } catch (error) {
      console.error('Bulk delete failed:', error);
      alert('Failed to delete selected users. Please try again.');
    } finally {
      this.blockingInProgress = false;
    }
  }

  blockSelectedResidents() {
    this.showBlockModal = true;
  }

  closeBlockModal() {
    this.showBlockModal = false;
    this.blockReason = '';
  }

  async confirmBlock() {
    if (!this.blockReason.trim()) {
      alert('Please provide a reason for blocking.');
      return;
    }

    this.showBlockModal = false;
    this.blockingInProgress = true;

    const uids = this.selectedResidents.map((acc) => acc.id);
    try {
      await this.accountService.blockUsers(uids, this.blockReason);
      this.showSuccess('Selected users have been successfully blocked.');
      this.blockReason = '';
    } catch (error) {
      if (error instanceof Error) {
        alert('Blocking failed: ' + error.message);
      } else {
        alert('Blocking failed: Unknown error');
      }
    } finally {
      this.blockingInProgress = false;
    }
  }

  showSuccess(message: string) {
    this.successMessage = message;
    this.showSuccessModal = true;
    setTimeout(() => {
      this.showSuccessModal = false;
      this.successMessage = '';
    }, 3000);
  }

  @HostListener('document:click')
  onDocumentClick() {
    this.closeDropdown();
  }
}
