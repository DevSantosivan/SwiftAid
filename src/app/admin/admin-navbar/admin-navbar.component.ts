import { Component, OnInit } from '@angular/core';



import { BehaviorSubject } from 'rxjs';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/auth.service';
import { Auth } from '@angular/fire/auth';
import { Router } from '@angular/router';

@Component({
    selector: 'app-admin-navbar',
    imports: [CommonModule],
    templateUrl: './admin-navbar.component.html',
    styleUrl: './admin-navbar.component.scss'
})
export class AdminNavbarComponent{

  constructor(
      private afAuth: Auth,
      private router :Router
  ){}

  showSideBar : boolean = false;
  showSide(){
    this.showSideBar = true;
  }
  exit(){
    this.showSideBar = false;
  }

  logout(){
    return this.afAuth.signOut().then(()=>{
      this.router.navigate(['/login'])
    }).catch(error =>{
        console.error('Logout error', error);
    });
    
}






}

