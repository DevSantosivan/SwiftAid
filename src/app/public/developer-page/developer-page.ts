import { Component, OnInit } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Clipboard } from '@angular/cdk/clipboard';
import { MatSnackBar } from '@angular/material/snack-bar';
import { UserService } from '../../core/user.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-developer-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './developer-page.html',
  styleUrls: ['./developer-page.scss'],
})
export class DeveloperPage implements OnInit {
  generatedKey = new FormControl('');
  isSaving = false;
  showLogoutDropdown = false;

  constructor(
    private userService: UserService,
    private clipboard: Clipboard,
    private snackBar: MatSnackBar,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Optionally preload key from localStorage
    const storedKey = localStorage.getItem('developer-access-key');
    if (storedKey) {
      this.generatedKey.setValue(storedKey);
    }
  }

  // 🔐 Generate random key
  generateAccessKey() {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let key = '';
    for (let i = 0; i < 16; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    this.generatedKey.setValue(key);
  }

  // 📋 Copy key to clipboard
  copyKey() {
    if (this.generatedKey.value) {
      this.clipboard.copy(this.generatedKey.value);
      this.snackBar.open('Access key copied!', '', { duration: 2000 });
    }
  }

  // 💾 Save key to Firestore
  async saveKey() {
    if (!this.generatedKey.value) return;
    this.isSaving = true;
    try {
      await this.userService.saveAccessKey(this.generatedKey.value);
      this.snackBar.open('Access key saved successfully!', '', {
        duration: 2000,
      });
      this.generatedKey.reset();
    } catch (error) {
      console.error(error);
      this.snackBar.open('Failed to save access key.', '', { duration: 3000 });
    } finally {
      this.isSaving = false;
    }
  }

  // 🔽 Toggle logout dropdown
  toggleLogoutDropdown() {
    this.showLogoutDropdown = !this.showLogoutDropdown;
  }

  closeLogoutDropdown() {
    setTimeout(() => {
      this.showLogoutDropdown = false;
    }, 150);
  }

  // 🚪 Logout handler
  logout() {
    localStorage.removeItem('developer-access-key');
    this.generatedKey.reset();
    this.showLogoutDropdown = false;
    this.snackBar.open('Logged out', '', { duration: 1500 });
    this.router.navigate(['/login']);
  }
}
