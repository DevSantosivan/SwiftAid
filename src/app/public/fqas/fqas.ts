import { Component } from '@angular/core';
import { FooterComponent } from '../footer/footer.component';
import { NavbarComponent } from '../navbar/navbar.component';

@Component({
  selector: 'app-fqas',
  imports: [FooterComponent, NavbarComponent],
  templateUrl: './fqas.html',
  styleUrl: './fqas.scss',
})
export class FQAs {}
