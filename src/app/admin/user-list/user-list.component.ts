import { Component, OnInit } from '@angular/core';
import { AdminNavbarComponent } from '../admin-navbar/admin-navbar.component';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable } from 'rxjs';

import { CommonModule } from '@angular/common';


@Component({
    selector: 'app-user-list',
    imports: [AdminNavbarComponent],
    templateUrl: './user-list.component.html',
    styleUrl: './user-list.component.scss'
})
export class UserListComponent {

 AddPopup : boolean = false;
   ResidentId = '';


constructor(private route:Router){

}


addPopup(){
     this.AddPopup = true;
}

// add new resident
onSubmit(){
 
}


// navigate router
  navigateToMap(){
    this.route.navigate(['/admin/map'])
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


