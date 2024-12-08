import { Component ,OnInit} from '@angular/core';
import { AdminNavbarComponent } from '../admin-navbar/admin-navbar.component';
import { Router } from '@angular/router';
// import { LocationService } from '../../core/location.service';
import { CommonModule } from '@angular/common';



declare const L: any;

@Component({
    selector: 'app-map',
    imports: [AdminNavbarComponent, CommonModule],
    templateUrl: './map.component.html',
    styleUrl: './map.component.scss'
})

export class MapComponent {
  phoneNumber : string = '';
  constructor(
     private route : Router
    //  private locationService: LocationService
  ){}
  

  

  trackLocation() {
    // this.locationService.trackLocation(this.phoneNumber);
  }
  
  navigateToDashboard(){
   this.route.navigate(['/admin'])
  }
  navigateToHistoryCall(){
    this.route.navigate(['/admin/history-call'])
  }
  navigateToUserList(){
    this.route.navigate(['/admin/user-list'])
  }
}
