import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-forgot-password',
  imports: [ReactiveFormsModule, FormsModule, CommonModule],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.scss',
})
export class ForgotPassword {
  email: string = '';

  showSuccessModal = false;
  showErrorModal = false;
  errorMessage = '';

  constructor(private router: Router, private authService: AuthService) {}

  async sendCode() {
    if (!this.email.trim()) {
      this.errorMessage = 'Please enter an email.';
      this.showErrorModal = true;
      return;
    }

    const result = await this.authService.resetPassword(this.email);

    if (result === null) {
      this.showSuccessModal = true;
    } else {
      this.errorMessage = result;
      this.showErrorModal = true;
    }
  }

  closeSuccess() {
    this.showSuccessModal = false;
    this.router.navigate(['/login']);
  }

  closeError() {
    this.showErrorModal = false;
  }

  goLogin() {
    this.router.navigate(['/login']);
  }
}
