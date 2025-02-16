import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators} from '@angular/forms';

import { AuthService } from '../../core/auth.service';
// import { LoaderComponent } from '../../loader/loader.component';


import { CommonModule } from '@angular/common';

declare const gapi: any;
@Component({
    selector: 'app-login',
    imports: [FormsModule, ReactiveFormsModule, CommonModule],
    templateUrl: './login.component.html',
    styleUrl: './login.component.scss'
})
export class LoginComponent implements OnInit{

   valid :  boolean = false;
  email_pass :  boolean = false;
   success :  boolean = false;

   isLoggedIn: boolean = false;
   isProgressIn : boolean = false;
   errorMessage: string = '';
   phoneNumber: string = '';
  otp: string = '';
  showOtpForm: boolean = false;
  showOtpInput: boolean = false;
  verificationCode: any;
   


loginForm = new FormGroup ({
     email: new FormControl('',Validators.required),
     password: new FormControl('', Validators.required)
})

 constructor(private authService: AuthService, private router: Router){
   
 }
 
ngOnInit(): void {
   
   this.isLoggedIn = this.authService.getErrorValidation();
   this.isProgressIn = this.authService.getErrorValidation();
   this.loadGoogleApi();
}
// load google api kapag click then may pagpipilian

 loadGoogleApi() {
   gapi.load('auth2', () => {
     gapi.auth2.init({
      client_id: '176588748781-4mj7evd61lkpob6kkglat3v1odj8oeab.apps.googleusercontent.com',
     }).then(() => {
       console.log('Google Auth initialized successfully');
     }).catch((error:any) => {
       console.error('Error initializing Google Auth:', error);
     });
   });
 }
 
      
logins(): void {
   if (this.loginForm.valid) {
      const { email, password } = this.loginForm.value;
      
      try {
         this.authService.login(email!, password!).then((res) => {
            this.success = true;
            this.router.navigate(['/admin']);
         }).catch((err) => {
            this.errorMessage = err.message;
            this.email_pass = true;
            this.success = false;
         });
      } catch (err) {
         // Handle any synchronous errors here
         console.error("Login failed:", err);
         this.errorMessage = "An unexpected error occurred. Please try again later.";
         this.success = false;
      }
   } else {
      this.valid = true;
      this.email_pass = false;
   }
}
 
regiter(){
   this.router.navigate(['/register']);
}
loginWithGoogle():void {
   this.authService.loginWithGoogle();     
}   



}
 


  // const auth2 = gapi.auth2.getAuthInstance();
         
         // if (!auth2) {
         //   console.error('Google Auth instance is not available');
         //   return;
         // }
     
         // auth2.signIn().then((user:any) => {
         // this.router.navigate(['/admin'])
         //   const profile = user.getBasicProfile();
         //   console.log('User signed in:', profile.getName());
         // }).catch((err:any) => {
         //   console.error('Error during sign in:', err);
         // });