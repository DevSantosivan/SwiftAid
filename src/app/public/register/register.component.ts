import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { createUserWithEmailAndPassword, Auth } from '@angular/fire/auth';
import { Firestore, setDoc, doc, getFirestore } from 'firebase/firestore';
import { initializeApp } from 'firebase/app'; // Import Firebase App initialization
import { environment } from '../../model/environment'; // Your environment file for Firebase config
import { register } from '../../model/registered';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent {
  registerForm: FormGroup;
  firestore: Firestore;
  errorMessage: string = ''; // Variable to track error messages

  constructor(private fb: FormBuilder, private router: Router, private auth: Auth) {
    const firebaseApp = initializeApp(environment.firebaseConfig); // Initialize Firebase App
    this.firestore = getFirestore(firebaseApp); // Get Firestore instance

    this.registerForm = this.fb.group({
      charge: ['', Validators.required],
      office_id: ['', Validators.required],
      contactNumber: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    
    });
  }

  async register() {
    if (this.registerForm.valid) {
      const { charge, office_id,contactNumber, email, password} = this.registerForm.value;

      // Assign the role as 'admin' by default
      const accountData: register = {
        charge,
        office_id,
        contactNumber,
        email,
        password,
        role: 'admin' // Set role as 'admin' by default
      };

      try {
        // Register the user with Firebase Authentication
        const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
        const user = userCredential.user;

        // Save user data to Firestore
        const userRef = doc(this.firestore, 'users', user.uid);
        await setDoc(userRef, {
          ...accountData, // Spread the account data here
          createdAt: new Date() // Add a createdAt timestamp
        });

        // Redirect the user to the admin page (assuming the role is 'admin')
        this.router.navigate(['/admin']);
      } catch (error) {
        console.error('Error during registration: ', error);
        // Set the error message to display in the template
        this.errorMessage = 'An error occurred during registration. Please try again.';
      }
    } else {
      // If the form is invalid, set the error message
      this.errorMessage = 'Please fill in all fields correctly.';
    }
  }
}
