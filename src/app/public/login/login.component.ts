import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import {
  FormControl,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  FormsModule,
} from '@angular/forms';
import { CommonModule } from '@angular/common';

import { AuthService } from '../../core/auth.service';
import { LoadingScreenComponent } from '../loading-screen/loading-screen.component';
import { FooterComponent } from '../footer/footer.component';
import { Footer } from 'docx';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    CommonModule,
    LoadingScreenComponent,
    FormsModule,
    FooterComponent,
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnInit {
  // Login state
  valid = false;
  email_pass = false;
  success = false;
  isLoggedIn = false;
  isProgressIn = false;
  isLoading = false;
  errorMessage = '';

  // Developer Access Key modal state
  showDevAccessKeyModal = false;
  devAccessKeyInput = '';
  devAccessKeyError = '';
  readonly DEFAULT_DEV_ACCESS_KEY = 'IVAN-DEVELOPER-KEY';

  // Admin Access Key modal state
  showAdminAccessKeyModal = false;
  adminAccessKeyInput = '';
  adminAccessKeyError = '';

  // Reactive login form
  loginForm = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', Validators.required),
  });

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit(): void {
    this.isLoggedIn = this.authService.getErrorValidation();
    this.isProgressIn = this.authService.getErrorValidation();
  }

  goBack() {
    this.router.navigate(['/home']);
  }
  goForgotPassword() {
    this.router.navigate(['/forgot-password']);
  }
  // 🔐 LOGIN FUNCTION
  async logins(): Promise<void> {
    if (!this.loginForm.valid) {
      this.valid = true;
      this.email_pass = false;
      return;
    }

    const { email, password } = this.loginForm.value;
    this.isLoading = true;
    this.email_pass = false;
    this.errorMessage = '';
    this.valid = false;

    try {
      const uid = await this.authService.login(email!, password!);
      console.log('✅ Logged in user UID:', uid);
      this.success = true;
    } catch (err: any) {
      this.errorMessage = err.message || 'An unexpected error occurred.';
      this.email_pass = true;
      this.success = false;
    } finally {
      this.isLoading = false;
    }
  }

  // Helper: SHA-256 hash function using Web Crypto API
  private async hashKey(input: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    return hashHex;
  }

  // ================================
  // ✅ DEVELOPER ACCESS KEY METHODS
  // ================================

  openDevAccessKeyModal() {
    this.devAccessKeyInput = '';
    this.devAccessKeyError = '';
    this.showDevAccessKeyModal = true;
  }

  closeDevAccessKeyModal() {
    this.showDevAccessKeyModal = false;
  }

  async verifyDevAccessKey() {
    this.devAccessKeyError = '';
    const trimmedKey = this.devAccessKeyInput.trim();

    if (!trimmedKey) {
      this.devAccessKeyError = 'Access key cannot be empty';
      return;
    }

    this.isLoading = true;

    try {
      const isValid =
        trimmedKey === this.DEFAULT_DEV_ACCESS_KEY ||
        (await this.authService.validateAccessKey(trimmedKey));

      if (isValid) {
        // Hash the key before storing and navigating
        const hashedKey = await this.hashKey(trimmedKey);

        // Store hashed key in localStorage (optional, useful for guards)
        localStorage.setItem('developer-access-key', hashedKey);

        // Close modal and navigate with hashed key
        this.closeDevAccessKeyModal();
        this.router.navigate(['/developer-page'], {
          queryParams: { key: hashedKey },
        });
      } else {
        this.devAccessKeyError = 'Invalid or used developer key';
      }
    } catch (error) {
      this.devAccessKeyError = 'Error validating developer key';
    } finally {
      this.isLoading = false;
    }
  }

  // =============================
  // ✅ ADMIN ACCESS KEY METHODS
  // =============================

  openAdminAccessKeyModal() {
    this.adminAccessKeyInput = '';
    this.adminAccessKeyError = '';
    this.showAdminAccessKeyModal = true;
  }

  closeAdminAccessKeyModal() {
    this.showAdminAccessKeyModal = false;
  }

  async verifyAdminAccessKey() {
    this.adminAccessKeyError = '';
    const trimmedKey = this.adminAccessKeyInput.trim();

    if (!trimmedKey) {
      this.adminAccessKeyError = 'Admin key cannot be empty';
      return;
    }

    this.isLoading = true;

    try {
      const isValid = await this.authService.validateAccessKey(trimmedKey);

      if (isValid) {
        // Navigate to registration with key (raw or hashed if you want)
        this.closeAdminAccessKeyModal();
        this.router.navigate(['/register'], {
          queryParams: { key: trimmedKey },
        });
      } else {
        this.adminAccessKeyError = 'Invalid or expired registration key';
      }
    } catch (error) {
      this.adminAccessKeyError = 'Error validating admin key';
    } finally {
      this.isLoading = false;
    }
  }
}
