import { Component, OnInit } from '@angular/core';
import { AdminNavbarComponent } from '../admin-navbar/admin-navbar.component';
import { UserService } from '../../core/user.service';
import { account } from '../../model/users';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable } from 'rxjs';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';


@Component({
    selector: 'app-user-list',
    imports: [AdminNavbarComponent,FormsModule,CommonModule],
    templateUrl: './user-list.component.html',
    styleUrl: './user-list.component.scss'
})
export class UserListComponent {
  users: account[] = [];
 AddPopup : boolean = false;
   ResidentId = '';


constructor(private route:Router,private userService: UserService){

}


// get resident 

async ngOnInit(): Promise<void> {
  try {
    this.users = await this.userService.getUsers(); // Await the Promise returned by getUsers
  } catch (error) {
    console.error('Error fetching users:', error); // Handle errors
  }
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


