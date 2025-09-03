import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { UserService } from '../../core/user.service';
import { account } from '../../model/users';

@Component({
  selector: 'app-account-verification',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './account-verification.html',
  styleUrls: ['./account-verification.scss'],
})
export class AccountVerification {
  pendingAccounts: account[] = [];

  isLoading = false; // loading flag
  showSuccessModal = false;
  successMessage = '';

  constructor(private router: Router, private userService: UserService) {
    this.loadPendingAccounts();
  }

  async loadPendingAccounts() {
    try {
      this.pendingAccounts =
        await this.userService.getPendingResidentAccounts();
    } catch (error) {
      console.error('Error loading pending residents', error);
    }
  }

  viewDetails(id: string) {
    this.router.navigate(['/superAdmin/Verification', id]);
  }

  async accept(accountId: string) {
    if (!accountId) return;

    this.isLoading = true;
    try {
      await this.userService.updateUserStatus(accountId, 'approved');
      await this.loadPendingAccounts();
      this.showSuccess('Account approved successfully.');
    } catch (error) {
      console.error('Approval error:', error);
      this.showSuccess('Failed to approve the account.');
    } finally {
      this.isLoading = false;
    }
  }

  async decline(accountId: string) {
    if (!accountId) return;

    this.isLoading = true;
    try {
      await this.userService.updateUserStatus(accountId, 'rejected');
      await this.loadPendingAccounts();
      this.showSuccess('Account rejected successfully.');
    } catch (error) {
      console.error('Rejection error:', error);
      this.showSuccess('Failed to reject the account.');
    } finally {
      this.isLoading = false;
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
}
