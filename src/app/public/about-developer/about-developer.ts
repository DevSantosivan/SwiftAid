import { Component } from '@angular/core';
import { FooterComponent } from '../footer/footer.component';
import { NavbarComponent } from '../navbar/navbar.component';

@Component({
  selector: 'app-about-developer',
  imports: [FooterComponent, NavbarComponent],
  templateUrl: './about-developer.html',
  styleUrl: './about-developer.scss',
})
export class AboutDeveloper {}
