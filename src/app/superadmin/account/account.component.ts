import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit } from '@angular/core';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { UserService } from '../../core/user.service';
import { account } from '../../model/users';

@Component({
  selector: 'app-account',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './account.component.html',
  styleUrls: ['./account.component.scss'],
})
export class AccountComponent implements OnInit {
  // === Tabs & Search ===
  activeTab = 'all';
  searchTerm: string = '';

  // === Dropdowns ===
  openDropdownIndex: number | null = null;

  // === Modals ===
  showBlockModal = false;
  showUnblockModal = false;
  showDeleteModal = false;

  // === Account Data ===
  allAccounts: account[] = [];
  accountToView: account | null = null;
  accountToEdit: account | null = null;
  accountToDelete: account | null = null;
  accountToUnblock: account | null = null;

  // === Block modal ===
  blockReason = '';
  otherBlockReason = '';

  // === Reactive form ===
  editForm: FormGroup | null = null;

  // === Helpers ===
  defaultAvatar =
    'https://i.pinimg.com/736x/32/e4/61/32e46132a367eb48bb0c9e5d5b659c88.jpg';
  blockingInProgress = false;

  // === Pagination ===
  currentPage = 1;
  itemsPerPage = 9;
  Math: any;

  constructor(
    private accountService: UserService,
    private fb: FormBuilder,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.accountService.getAllAccounts().subscribe((accounts) => {
      this.allAccounts = accounts;
    });
  }

  // === Pagination ===
  get paginatedResidents() {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredResidents.slice(
      startIndex,
      startIndex + this.itemsPerPage
    );
  }

  get totalPages(): number {
    return Math.ceil(this.filteredResidents.length / this.itemsPerPage);
  }

  goToPage(page: number) {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
  }

  // === Filtering ===
  private matchesSearch(acc: account): boolean {
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

  // === Account categorization ===
  get residentAccounts() {
    return this.allAccounts.filter((acc) => acc.role === 'resident');
  }
  get staffAccounts() {
    return this.allAccounts.filter((acc) => acc.role === 'admin');
  }
  get blockAccounts() {
    return this.residentAccounts.filter((acc) => acc.blocked);
  }

  // === Counts ===
  get totalResidentAccountsCount() {
    return this.residentAccounts.length;
  }
  get blockedResidentAccountsCount() {
    return this.blockAccounts.length;
  }
  get pendingResidentAccountsCount() {
    return this.residentAccounts.filter(
      (acc) => acc.account_status.toLowerCase() === 'pending'
    ).length;
  }
  get registeredResidentAccountsCount() {
    return this.residentAccounts.filter(
      (acc) => acc.account_status.toLowerCase() === 'approved'
    ).length;
  }

  // === Tabs & Dropdowns ===
  setTab(tab: string) {
    this.activeTab = tab;
  }

  toggleDropdown(index: number) {
    this.openDropdownIndex = this.openDropdownIndex === index ? null : index;
  }
  closeDropdown() {
    this.openDropdownIndex = null;
  }
  @HostListener('document:click')
  onDocumentClick() {
    this.closeDropdown();
  }

  // === View, Edit & Delete ===
  viewAccount(account: account) {
    this.accountToView = account;
  }
  closeView() {
    this.accountToView = null;
  }

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
      nationalIdImageUrl: [account.validIdImageUrl || null],
      birthCertImageUrl: [account.validIdImageUrl || null],
    });
  }

  closeEdit() {
    this.accountToEdit = null;
    this.editForm = null;
  }

  async saveEdit() {
    if (!this.editForm?.valid || !this.accountToEdit) return;
    this.blockingInProgress = true;
    const updatedUser = { ...this.accountToEdit, ...this.editForm.value };
    try {
      await this.accountService.updateUser(updatedUser.id, updatedUser);
      this.accountToEdit = null;
      this.editForm = null;
      this.showSnackBar('User updated successfully.');
    } catch (err) {
      console.error(err);
      this.showSnackBar('Failed to update user.');
    } finally {
      this.blockingInProgress = false;
    }
  }

  deleteAccount(account: account) {
    this.accountToDelete = account;
    this.showDeleteModal = true;
  }
  cancelDelete() {
    this.accountToDelete = null;
    this.showDeleteModal = false;
  }

  async confirmDelete() {
    if (!this.accountToDelete) return;
    this.blockingInProgress = true;
    try {
      await this.accountService.deleteUser(this.accountToDelete.id);
      this.showSnackBar('User deleted successfully.');
      this.accountToDelete = null;
      this.showDeleteModal = false;
    } catch (err) {
      console.error(err);
      this.showSnackBar('Failed to delete user.');
    } finally {
      this.blockingInProgress = false;
    }
  }

  // === Block & Unblock ===
  openBlockModal(account: account) {
    if (account.blocked) return; // don't allow blocking if already blocked
    this.accountToView = account;
    this.showBlockModal = true;
  }

  closeBlockModal() {
    this.accountToView = null;
    this.showBlockModal = false;
    this.blockReason = '';
    this.otherBlockReason = '';
  }

  async confirmBlock() {
    if (!this.accountToView) return;

    const reason =
      this.blockReason === 'Other'
        ? this.otherBlockReason.trim()
        : this.blockReason;
    if (!reason) {
      this.showSnackBar('Please select or enter a reason for blocking.');
      return;
    }

    this.showBlockModal = false;
    this.blockingInProgress = true;

    try {
      await this.accountService.blockUsers([this.accountToView.id], reason);
      this.accountToView.blocked = true;
      this.showSnackBar('User has been blocked.');
    } catch (err) {
      console.error(err);
      this.showSnackBar('Blocking failed.');
    } finally {
      this.blockingInProgress = false;
    }
  }

  openUnblockModal(account: account) {
    if (!account.blocked) return; // only unblock if blocked
    this.accountToUnblock = account;
    this.showUnblockModal = true;
  }

  closeUnblockModal() {
    this.accountToUnblock = null;
    this.showUnblockModal = false;
  }

  async confirmUnblock() {
    if (!this.accountToUnblock) return;
    this.blockingInProgress = true;
    try {
      await this.accountService.unblockUsers([this.accountToUnblock.id]);
      this.accountToUnblock.blocked = false;
      this.showSnackBar('User has been unblocked.');
    } catch (err) {
      console.error(err);
      this.showSnackBar('Unblock failed.');
    } finally {
      this.blockingInProgress = false;
      this.closeUnblockModal();
    }
  }

  // === File Uploads ===
  onAvatarChange(event: Event) {
    this.handleFileChange(event, 'profileImageUrl');
  }
  onNationalIdChange(event: Event) {
    this.handleFileChange(event, 'nationalIdImageUrl');
  }
  onBirthCertChange(event: Event) {
    this.handleFileChange(event, 'birthCertImageUrl');
  }

  private handleFileChange(event: Event, field: string) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file && this.editForm) {
      const reader = new FileReader();
      reader.onload = () => {
        this.editForm?.patchValue({ [field]: reader.result });
        if (this.accountToEdit)
          (this.accountToEdit as any)[field] = reader.result;
      };
      reader.readAsDataURL(file);
    }
  }

  triggerProfileImageUpload() {
    document.getElementById('profileImageInput')?.click();
  }

  // === Notifications ===
  showSnackBar(message: string) {
    this.snackBar.open(message, 'Close', { duration: 3000 });
  }
}
