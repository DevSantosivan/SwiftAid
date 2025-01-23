import { Component, OnInit } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { Router } from '@angular/router';
import { LoaderComponent } from "../../loader/loader.component";
import { NavbarComponent } from "../../public/navbar/navbar.component";
import { AdminNavbarComponent } from '../admin-navbar/admin-navbar.component';
import { Chart,registerables } from 'chart.js';
import { Util } from 'leaflet';
import { UserService } from '../../core/user.service';
import { EmergencyRequestService } from '../../core/rescue_request.service';


Chart.register(...registerables);


@Component({
    selector: 'app-home',
    imports: [LoaderComponent, AdminNavbarComponent],
    templateUrl: './home.component.html',
    styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit{
  chart:any;
  public config: any = {
    type: 'line',
    data: {
      labels: this.getMonthLabels(7),  // Generates 7 months' labels (you can adjust as needed)
      datasets: [
        {
          label: 'Police',
          data: [120, 140, 100, 180, 150, 160, 130],  
          borderColor: 'blue',
          backgroundColor: 'rgba(0, 0, 255, 0.2)',
          fill: true,
          borderWidth: 1,
          pointBorderRadius: 5,  // Set border radius of the points (rounded corners)
        },
        {
          label: 'Ambulance',
          data: [60, 70, 50, 90, 85, 80, 75],
          borderColor: 'green',
          backgroundColor: 'rgba(0, 255, 0, 0.2)',
          fill: true,
          borderWidth: 1,
          pointBorderRadius: 5,  // Set border radius of the points (rounded corners)
        },
        {
          label: 'Fire',
          data: [30, 45, 50, 40, 60, 55, 48],
          borderColor: 'red',
          backgroundColor: 'rgba(255, 0, 0, 0.23)',
          fill: true,
          borderWidth: 1,
          pointBorderRadius: 5,  // Set border radius of the points (rounded corners)
        }
      ],
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
        },
      },
    },
  };
  
  
  getMonthLabels(count: number): string[] {
    const labels = [];
    const date = new Date();
    for (let i = 0; i < count; i++) {
      labels.push(date.toLocaleString('default', { month: 'short' }));
      date.setMonth(date.getMonth() - 1); // Move back one month
    }
    return labels.reverse(); // To show in the correct order (latest month first)
  }
  
  
constructor(private authentication : Auth, private route: Router,private userService: UserService,private EmergencyRequestService :EmergencyRequestService){
  
}
userCount: number = 0;
EmergencyRequest: number = 0;
async ngOnInit() {
  console.log('ngOnInit called');
  
  this.chart = new Chart('Mychart', this.config);

  try {
    // Fetch user count
    const userCount = await this.userService.getUserCount(); 
    console.log('Total users fetched:', userCount);
    this.userCount = userCount;  // Update the component's userCount state

    // Fetch emergency request count (call the method correctly)
    const registeredAccount = await this.EmergencyRequestService.getRequestCount(); 
    console.log('Total emergency requests fetched:', registeredAccount);
    this.EmergencyRequest = registeredAccount;  // Update the component's emergencyRequest state

  } catch (error) {
    console.error('Error fetching data:', error);
  }
}



isloader : boolean = false;

navigateToMap(){
  this.route.navigate(['/admin/map'])
}
navigateToHistoryCall(){
  this.route.navigate(['/admin/history-call'])
}
navigateToUserList(){
  this.route.navigate(['/admin/user-list'])
} 

  signout(){
   return this.authentication.signOut().then(()=>{[    
    setTimeout(()=>{
      this.route.navigate(['/login'])
      
     },3000),
     this.isloader= true
   ]})
  }
   
}
