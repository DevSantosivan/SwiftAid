import { Component } from '@angular/core';
import { FooterComponent } from '../footer/footer.component';
import { NavbarComponent } from '../navbar/navbar.component';

@Component({
  selector: 'app-contact',
  imports: [FooterComponent, NavbarComponent],
  templateUrl: './contact.html',
  styleUrl: './contact.scss',
})
export class Contact {}
