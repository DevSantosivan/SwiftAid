import { Component } from '@angular/core';
import { Router } from '@angular/router';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { createUserWithEmailAndPassword, Auth } from '@angular/fire/auth';
import { Firestore, setDoc, doc, getFirestore } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import { environment } from '../../model/environment';
import { register } from '../../model/registered';
import { UserService } from '../../core/user.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
})
export class RegisterComponent {
  registerForm: FormGroup;
  firestore: Firestore;
  errorMessage: string = '';

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private auth: Auth,
    private userService: UserService
  ) {
    const firebaseApp = initializeApp(environment.firebaseConfig);
    this.firestore = getFirestore(firebaseApp);

    this.registerForm = this.fb.group({
      charge: ['', Validators.required],
      office_id: ['', Validators.required],
      contactNumber: ['', Validators.required],
      first_name: ['', Validators.required],
      last_name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  async register(): Promise<void> {
    if (this.registerForm.invalid) {
      this.errorMessage = 'Please fill in all required fields';
      return;
    }

    const form = this.registerForm.value;
    const fullName = `${form.first_name} ${form.last_name}`;

    const additionalData: Partial<register> = {
      fullName,
      first_name: form.first_name,
      last_name: form.last_name,
      charge: form.charge,
      office_id: form.office_id,
      contactNumber: form.contactNumber,
      role: 'superAdmin', // 👈 set superAdmin role
    };

    try {
      await this.userService.createAccount(
        form.email,
        form.password,
        additionalData
      );

      this.router.navigate(['/login']);
    } catch (error) {
      console.error('Registration failed:', error);
      this.errorMessage = 'Failed to register. Please try again.';
    }
  }

  navigateToLogin() {
    this.router.navigate(['/login']);
  }
}
