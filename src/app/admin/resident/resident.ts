import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { UserService } from '../../core/user.service';
import { account } from '../../model/users';

@Component({
  selector: 'app-resident',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './resident.html',
  styleUrl: './resident.scss',
})
export class Resident implements OnInit {
  activeTab: string = 'all';
  searchTerm: string = '';
  showBulkMenu: boolean = false;

  showBlockModal: boolean = false;
  showDeleteModal: boolean = false;
  showDeleteModalSelected: boolean = false;
  showSuccessModal: boolean = false;

  successMessage: string = '';
  blockReason: string = '';

  accountToDelete: account | null = null;
  accountToView: account | null = null;
  accountToEdit: account | null = null;

  allAccounts: account[] = [];
  selectedResidentMap: { [key: string]: boolean } = {};
  selectedResidents: account[] = [];

  blockingInProgress: boolean = false;
  isMobile = false;
  defaultAvatar: string =
    'https://i.pinimg.com/736x/32/e4/61/32e46132a367eb48bb0c9e5d5b659c88.jpg';

  constructor(private accountService: UserService) {}

  ngOnInit(): void {
    this.accountService.getAllAccounts().subscribe((accounts) => {
      this.allAccounts = accounts;
      this.updateSelectedResidents();
    });

    this.checkScreenWidth();
  }

  setTab(tab: string) {
    this.activeTab = tab;
    this.showBulkMenu = false;
  }
  @HostListener('window:resize')
  checkScreenWidth() {
    this.isMobile = window.innerWidth <= 768;
  }

  private matchesSearch(acc: account): boolean {
    const term = this.searchTerm.toLowerCase();
    return (
      (acc.fullName || '').toLowerCase().includes(term) ||
      (acc.email || '').toLowerCase().includes(term) ||
      (acc.contactNumber || '').toLowerCase().includes(term) ||
      (acc.address || '').toLowerCase().includes(term)
    );
  }

  // -------------------------
  // Filtering
  // -------------------------
  get filteredAllAccounts() {
    return this.allAccounts.filter(
      (acc) => acc.role === 'resident' && this.matchesSearch(acc)
    );
  }

  get filteredResidents() {
    return this.residentAccounts.filter((acc) => this.matchesSearch(acc));
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

  // -------------------------
  // Selection
  // -------------------------
  toggleBulkMenu(event: MouseEvent) {
    event.stopPropagation();
    this.showBulkMenu = !this.showBulkMenu;
  }

  isChecked(acc: account): boolean {
    return this.selectedResidentMap[acc.id] || false;
  }

  setChecked(acc: account, event: Event) {
    const target = event.target as HTMLInputElement;
    this.selectedResidentMap[acc.id] = target.checked;
    this.updateSelectedResidents();
  }

  toggleSelectAllResident(event: Event) {
    const checked = (event.target as HTMLInputElement)?.checked ?? false;
    this.allAccounts.forEach((acc) => {
      if (acc.role === 'resident') {
        this.selectedResidentMap[acc.id] = checked;
      }
    });
    this.updateSelectedResidents();
  }

  isAllSelected(): boolean {
    const residents = this.allAccounts.filter((acc) => acc.role === 'resident');
    return (
      residents.length > 0 &&
      residents.every((acc) => this.selectedResidentMap[acc.id])
    );
  }

  selectBy(type: 'all' | 'none' | 'resident') {
    this.allAccounts.forEach((acc) => {
      if (type === 'all' || (type === 'resident' && acc.role === 'resident')) {
        this.selectedResidentMap[acc.id] = true;
      } else if (type === 'none') {
        this.selectedResidentMap[acc.id] = false;
      }
    });
    this.updateSelectedResidents();
    this.showBulkMenu = false;
  }

  updateSelectedResidents() {
    this.selectedResidents = this.allAccounts.filter(
      (acc) => this.selectedResidentMap[acc.id] && acc.role === 'resident'
    );
  }

  // -------------------------
  // Account Actions
  // -------------------------
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
        this.accountToEdit!.profileImageUrl = reader.result as string;
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
    const selectedIds = this.selectedResidents.map((acc) => acc.id);
    this.accountService.deleteUsers(selectedIds).then(() => {
      this.selectedResidentMap = {};
      this.selectedResidents = [];
      this.showSuccess('Selected users deleted successfully.');
    });
  }

  // -------------------------
  // Block / Unblock
  // -------------------------
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
        this.closeBlockModal();
        this.showSuccess('Selected users have been successfully blocked.');
      })
      .catch((error) => {
        this.blockingInProgress = false;
        alert('Blocking failed: ' + error.message);
      });
  }

  unblockSelectedResidents() {
    if (this.selectedResidents.length === 0) return;

    const uids = this.selectedResidents.map((acc) => acc.id);

    this.accountService
      .unblockUsers(uids)
      .then(() => {
        this.selectedResidentMap = {};
        this.selectedResidents = [];
        this.showSuccess('Selected users have been successfully unblocked.');
      })
      .catch((error) => {
        alert('Unblocking failed: ' + error.message);
      });
  }

  // -------------------------
  // Utilities
  // -------------------------
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
    this.showBulkMenu = false;
  }
}
