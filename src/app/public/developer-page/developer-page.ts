import { Component } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { Clipboard } from '@angular/cdk/clipboard'; // Optional for clipboard copy
import { MatSnackBar } from '@angular/material/snack-bar'; // Optional for notifications
import { UserService } from '../../core/user.service';

@Component({
  selector: 'app-developer-page',
  imports: [ReactiveFormsModule],
  templateUrl: './developer-page.html',
  styleUrl: './developer-page.scss',
})
export class DeveloperPage {
  generatedKey = new FormControl('');
  isSaving = false;

  constructor(
    private userService: UserService,
    private clipboard: Clipboard,
    private snackBar: MatSnackBar
  ) {}

  // Generate random access key (e.g. 16 characters alphanumeric)
  generateAccessKey() {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let key = '';
    for (let i = 0; i < 16; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    this.generatedKey.setValue(key);
  }

  // Copy to clipboard
  copyKey() {
    if (this.generatedKey.value) {
      this.clipboard.copy(this.generatedKey.value);
      this.snackBar.open('Access key copied!', '', { duration: 2000 });
    }
  }

  // Save generated key to Firestore
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
}
