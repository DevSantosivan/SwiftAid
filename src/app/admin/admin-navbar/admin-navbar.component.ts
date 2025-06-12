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
    this.showSideBar = true;
  }
  exit() {
    this.showSideBar = false;
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
