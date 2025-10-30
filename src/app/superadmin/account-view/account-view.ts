import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { UserService } from '../../core/user.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { account } from '../../model/users';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-account-view',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './account-view.html',
  styleUrls: ['./account-view.scss'],
})
export class AccountView {
  account: account | null = null;
  blockingInProgress = false;

  showBlockModal = false;
  showUnblockModal = false;
  blockReason = '';
  otherBlockReason = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private userService: UserService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.userService.getAllAccounts().subscribe((accounts) => {
        this.account = accounts.find((a) => a.id === id) || null;
      });
    }
  }

  goBack() {
    this.router.navigate(['/accounts']);
  }

  openBlockModal() {
    this.showBlockModal = true;
  }

  closeBlockModal() {
    this.showBlockModal = false;
    this.blockReason = '';
    this.otherBlockReason = '';
  }

  async confirmBlock() {
    if (!this.account) return;
    const reason =
      this.blockReason === 'Other'
        ? this.otherBlockReason.trim()
        : this.blockReason;

    if (!reason) {
      this.snackBar.open('Please provide a reason for blocking.', 'Close', {
        duration: 3000,
      });
      return;
    }

    this.blockingInProgress = true;
    try {
      await this.userService.blockUsers([this.account.id], reason);
      this.account.blocked = true;
      this.snackBar.open('Account has been blocked.', 'Close', {
        duration: 3000,
      });
      this.closeBlockModal();
    } catch {
      this.snackBar.open('Failed to block user.', 'Close', { duration: 3000 });
    } finally {
      this.blockingInProgress = false;
    }
  }

  openUnblockModal() {
    this.showUnblockModal = true;
  }

  async confirmUnblock() {
    if (!this.account) return;
    this.blockingInProgress = true;
    try {
      await this.userService.unblockUsers([this.account.id]);
      this.account.blocked = false;
      this.snackBar.open('Account has been unblocked.', 'Close', {
        duration: 3000,
      });
    } catch {
      this.snackBar.open('Failed to unblock user.', 'Close', {
        duration: 3000,
      });
    } finally {
      this.blockingInProgress = false;
      this.showUnblockModal = false;
    }
  }
}
