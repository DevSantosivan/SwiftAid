import { Component, OnInit, OnDestroy, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterModule } from '@angular/router';
import { Auth, onAuthStateChanged } from '@angular/fire/auth';
import { UserService } from '../../core/user.service';
import { account } from '../../model/users';
import { LoaderComponent } from '../../loader/loader.component';
import { ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterModule,
    LoaderComponent,
    ReactiveFormsModule,
  ],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'],
})
export class NavbarComponent implements OnInit, OnDestroy {
  currentUser: account | null = null;
  isLoggedIn = false;
  authListener: any;
  showProfileMenu: boolean = false;

  mobileMenuOpen = false; // MOBILE MENU STATE

  constructor(
    private afAuth: Auth,
    private router: Router,
    private userService: UserService,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    this.authListener = onAuthStateChanged(this.afAuth, async (user) => {
      if (user) {
        this.isLoggedIn = true;

        const userData = await this.userService.getUserById(user.uid);
        this.ngZone.run(() => {
          this.currentUser = userData;
        });
      } else {
        this.ngZone.run(() => {
          this.isLoggedIn = false;
          this.currentUser = null;
        });
      }
    });
  }

  toggleProfile() {
    this.showProfileMenu = !this.showProfileMenu;
  }

  ngOnDestroy(): void {
    if (this.authListener) this.authListener();
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }

  goToSignUp() {
    this.router.navigate(['/register']);
  }

  logout() {
    this.afAuth.signOut().then(() => {
      this.currentUser = null;
      this.showProfileMenu = false;
      this.router.navigate(['/login']);
    });
  }

  goToDashboard() {
    if (!this.currentUser) return;

    if (this.currentUser.role === 'superAdmin') {
      this.router.navigate(['/superAdmin/Dashboard']);
    } else if (this.currentUser.role === 'admin') {
      this.router.navigate(['/admin/Dashboard']);
    } else if (this.currentUser?.role === 'resident') {
      this.router.navigate(['/user/Dashboard']);
    }
  }

  isloader: boolean = false;

  loader() {
    this.router.navigate(['/login']);
  }
}
