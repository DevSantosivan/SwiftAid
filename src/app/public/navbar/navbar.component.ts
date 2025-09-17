import { Component } from '@angular/core';
import { Router, RouterLinkActive, RouterModule } from '@angular/router';
import { LoaderComponent } from '../../loader/loader.component';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [LoaderComponent, RouterLinkActive, RouterModule],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'],
})
export class NavbarComponent {
  constructor(private route: Router) {}

  isloader: boolean = false;

  loader() {
    this.isloader = true;
    setTimeout(() => {
      this.isloader = false;
      this.route.navigate(['/login']);
    }, 3000);
  }
}
