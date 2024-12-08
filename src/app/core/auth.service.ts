import { Injectable } from '@angular/core';
import { Auth , getAuth,signInWithEmailAndPassword,User,signInWithPopup, GoogleAuthProvider} from '@angular/fire/auth';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Router } from '@angular/router';
@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private failed = false;
  private progress = false;
  user: any;

  

  constructor(private auth: Auth, private router: Router) { }

  login(email:string, password:string) {
    return signInWithEmailAndPassword(this.auth, email!, password!)
  }
 
  getErrorValidation(): boolean{
         return this.failed;
         return this.progress;
  }

 setErrorValidation(status : boolean): void{
  this.failed = status;
 }
 
 loginWithGoogle() {
  const auth = getAuth();
  const provider = new GoogleAuthProvider();

  signInWithPopup(this.auth, provider)
    .then((result) => {
      const user = result.user;
      this.router.navigate(['/admin'])
      console.log('User signed in:', user);
      
    })
    .catch((error) => {
      console.error('Error during sign in:', error);
    });
}


 

   


}

// dito kapag nag login ka kukunin nya yung data sa signin with email and pass
