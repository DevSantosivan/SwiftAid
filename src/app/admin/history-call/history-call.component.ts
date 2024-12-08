import { Component } from '@angular/core';
import { AdminNavbarComponent } from '../admin-navbar/admin-navbar.component';
import { Router } from '@angular/router';

@Component({
    selector: 'app-history-call',
    imports: [AdminNavbarComponent],
    templateUrl: './history-call.component.html',
    styleUrl: './history-call.component.scss'
})
export class HistoryCallComponent {
constructor(private route : Router){

}

  navigateToDashboard(){
   this.route.navigate(['/admin'])
  }
  navigateToMap(){
    this.route.navigate(['/admin/map'])
  }
  navigateToHistoryCall(){
    this.route.navigate(['/admin/history-call'])
  }
  navigateToUserList(){
    this.route.navigate(['/admin/user-list'])
  }
  
}
