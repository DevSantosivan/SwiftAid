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
// import { LoaderComponent } from '../../loader/loader.component';

import { CommonModule } from '@angular/common';
import { LoadingScreenComponent } from '../loading-screen/loading-screen.component';
import { NavbarComponent } from '../navbar/navbar.component';

declare const gapi: any;
@Component({
  selector: 'app-login',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    CommonModule,
    LoadingScreenComponent,
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent implements OnInit {
  valid: boolean = false;
  email_pass: boolean = false;
  success: boolean = false;

  isLoggedIn: boolean = false;
  isProgressIn: boolean = false;
  isLoading: boolean = false;

  errorMessage: string = '';
  phoneNumber: string = '';
  otp: string = '';
  showOtpForm: boolean = false;
  showOtpInput: boolean = false;
  verificationCode: any;

  loginForm = new FormGroup({
    email: new FormControl('', Validators.required),
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

      try {
        const uid = await this.authService.login(email!, password!);
        console.log('Logged in user UID:', uid);

        this.success = true;
        this.email_pass = false;
      } catch (err: any) {
        console.error('Login failed:', err);
        this.errorMessage =
          err.message ||
          'An unexpected error occurred. Please try again later.';
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

  regiter() {
    this.router.navigate(['/register']);
  }
}
