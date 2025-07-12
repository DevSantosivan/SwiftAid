import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
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

  defaultAvatar =
    'https://i.pinimg.com/736x/32/e4/61/32e46132a367eb48bb0c9e5d5b659c88.jpg';

  allAccounts: account[] = [];

  selectedResidentMap: { [key: string]: boolean } = {};
  selectedStaffMap: { [key: string]: boolean } = {};

  selectedResidents: account[] = [];
  selectedStaff: account[] = [];

  showDeleteNotification = false;
  blockingInProgress: boolean = false;

  constructor(private accountService: UserService) {}

  ngOnInit(): void {
    this.accountService.getAllAccounts().subscribe((accounts) => {
      this.allAccounts = accounts;
      this.updateSelectedResidents();
      this.updateSelectedStaff();
    });
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

  // 🔍 Filtered Lists
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

  get blockAccounts() {
    return this.allAccounts.filter(
      (acc) => acc.role === 'resident' && acc.blocked
    );
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

  editAccount(account: account) {
    this.accountToEdit = { ...account };
  }

  closeEdit() {
    this.accountToEdit = null;
  }

  onAvatarChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (file && this.accountToEdit) {
      const reader = new FileReader();
      reader.onload = () => {
        this.accountToEdit!.profilePicture = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  saveEdit() {
    if (this.accountToEdit) {
      this.accountService
        .updateUser(this.accountToEdit.id, this.accountToEdit)
        .then(() => {
          this.accountToEdit = null;
          this.showSuccess('User updated successfully.');
        });
    }
  }

  deleteAccount(account: account) {
    this.accountToDelete = account;
    this.showDeleteModal = true;
  }

  confirmDelete() {
    if (!this.accountToDelete) return;
    this.accountService.deleteUser(this.accountToDelete.id).then(() => {
      this.accountToDelete = null;
      this.showDeleteModal = false;
      this.showSuccess('User deleted successfully.');
    });
  }

  cancelDelete() {
    this.accountToDelete = null;
    this.showDeleteModal = false;
  }

  deleteSelectedAccounts() {
    this.showDeleteModalSelected = true;
  }

  confirmSeletedAccountDelete() {
    this.showDeleteModalSelected = false;
    const selectedIds = [
      ...this.selectedResidents.map((acc) => acc.id),
      ...this.selectedStaff.map((acc) => acc.id),
    ];
    this.accountService.deleteUsers(selectedIds).then(() => {
      this.selectedResidentMap = {};
      this.selectedStaffMap = {};
      this.selectedResidents = [];
      this.selectedStaff = [];
      this.showDeleteModalSelected = false;
      this.showSuccess('Selected users deleted successfully.');
    });
  }

  blockSelectedResidents() {
    this.showBlockModal = true;
  }

  closeBlockModal() {
    this.showBlockModal = false;
    this.blockReason = '';
  }

  confirmBlock() {
    if (!this.blockReason.trim()) {
      alert('Please provide a reason for blocking.');
      return;
    }
    this.showBlockModal = false;
    this.blockingInProgress = true;

    const uids = this.selectedResidents.map((acc) => acc.id);
    this.accountService
      .blockUsers(uids, this.blockReason)
      .then(() => {
        this.blockingInProgress = false;
        this.closeBlockModal(); // close modal
        this.showSuccess('Selected users have been successfully blocked.');
      })
      .catch((error) => {
        this.blockingInProgress = false;
        alert('Blocking failed: ' + error.message);
      });
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
