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
    private auth: Auth
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

  async register() {
    if (this.registerForm.valid) {
      const {
        charge,
        office_id,
        first_name,
        last_name,
        contactNumber,
        email,
        password,
      } = this.registerForm.value;

      const accountData: register = {
        charge,
        office_id,
        first_name,
        last_name,
        contactNumber,
        email,
        password,
        role: 'admin',
      };

      try {
        const userCredential = await createUserWithEmailAndPassword(
          this.auth,
          email,
          password
        );

        const user = userCredential.user;
        const userRef = doc(this.firestore, 'users', user.uid);

        await setDoc(userRef, {
          ...accountData,
          createdAt: new Date(),
        });

        this.router.navigate(['/admin']);
      } catch (error) {
        console.error('Error during registration:', error);
        this.errorMessage =
          'An error occurred during registration. Please try again.';
      }
    } else {
      this.errorMessage = 'Please fill in all fields correctly.';
    }
  }

  navigateToLogin() {
    this.router.navigate(['/login']);
  }
}
