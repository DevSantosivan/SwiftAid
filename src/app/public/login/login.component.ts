import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { AuthService } from '../../core/auth.service';
import { CommonModule } from '@angular/common';
import { LoadingScreenComponent } from '../loading-screen/loading-screen.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    CommonModule,
    LoadingScreenComponent,
    FormsModule,
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnInit {
  valid = false;
  email_pass = false;
  success = false;
  isLoggedIn = false;
  isProgressIn = false;
  isLoading = false;
  errorMessage = '';

  // Developer Key State
  showDevAccessKeyModal = false;
  devAccessKeyInput = '';
  devAccessKeyError = '';
  readonly DEFAULT_DEV_ACCESS_KEY = 'IVAN-DEVELOPER-KEY';

  // Admin Key State
  showAdminAccessKeyModal = false;
  adminAccessKeyInput = '';
  adminAccessKeyError = '';

  loginForm = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', Validators.required),
  });

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit(): void {
    this.isLoggedIn = this.authService.getErrorValidation();
    this.isProgressIn = this.authService.getErrorValidation();
  }

  async logins(): Promise<void> {
    if (this.loginForm.valid) {
      const { email, password } = this.loginForm.value;
      this.isLoading = true;
      this.email_pass = false;
      this.errorMessage = '';
      this.valid = false;

      try {
        const uid = await this.authService.login(email!, password!);
        console.log('Logged in user UID:', uid);
        this.success = true;
      } catch (err: any) {
        this.errorMessage = err.message || 'An unexpected error occurred.';
        this.email_pass = true;
        this.success = false;
      } finally {
        this.isLoading = false;
      }
    } else {
      this.valid = true;
      this.email_pass = false;
    }
  }

  // === Developer Access ===
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
      if (trimmedKey === this.DEFAULT_DEV_ACCESS_KEY) {
        this.closeDevAccessKeyModal();
        this.router.navigate(['/developer-page'], {
          queryParams: { key: trimmedKey },
        });
        return;
      }

      const isValid = await this.authService.validateAccessKey(trimmedKey);
      if (isValid) {
        this.closeDevAccessKeyModal();
        this.router.navigate(['/developer-page'], {
          queryParams: { key: trimmedKey },
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

  // === Admin Access ===
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
