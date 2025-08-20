import { Component, OnInit } from '@angular/core';

import { BehaviorSubject } from 'rxjs';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/auth.service';
import { Auth, User } from '@angular/fire/auth';
import { Router } from '@angular/router';
import { account } from '../../model/users';
import { UserService } from '../../core/user.service';

@Component({
  selector: 'app-admin-navbar',
  imports: [CommonModule],
  templateUrl: './admin-navbar.component.html',
  styleUrl: './admin-navbar.component.scss',
})
export class AdminNavbarComponent implements OnInit {
  showSideBar: boolean = false;
  currentUser: account | null = null;
  isClosing: boolean = false;
  isExiting: boolean = false;

  constructor(
    private afAuth: Auth,
    private router: Router,
    private authService: UserService
  ) {}

  async ngOnInit(): Promise<void> {
    try {
      const user = await this.afAuth.currentUser;
      if (!user) {
        console.warn('No user is logged in.');
        return;
      }

      const userData = await this.authService.getUserById(user.uid);
      if (userData) {
        this.currentUser = userData;
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  }

  showSide() {
    this.isExiting = false;
    this.showSideBar = !this.showSideBar; // toggle open/close on click
  }

  exit() {
    this.isExiting = true;
    setTimeout(() => {
      this.showSideBar = false;
    }, 300);
  }

  logout() {
    return this.afAuth
      .signOut()
      .then(() => {
        this.router.navigate(['/login']);
      })
      .catch((error) => {
        console.error('Logout error', error);
      });
  }
}
