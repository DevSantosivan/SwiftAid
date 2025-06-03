import { Component } from '@angular/core';
import { NavbarComponent } from '../../public/navbar/navbar.component';
import { AdminNavbarComponent } from '../../admin/admin-navbar/admin-navbar.component';
import { Router, RouterLink } from '@angular/router';
import { RouterOutlet } from '@angular/router';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-home',
  imports: [AdminNavbarComponent, RouterModule, RouterOutlet, RouterLink],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent {}
