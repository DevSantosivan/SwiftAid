import { Component } from '@angular/core';
import { AdminNavbarComponent } from '../admin-navbar/admin-navbar.component';
import { Router } from '@angular/router';
import { EmergencyRequest } from '../../model/emergency';
import { EmergencyRequestService } from '../../core/rescue_request.service';
import { HttpClient } from '@angular/common/http'; // Import HttpClient for making requests
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-history-call',
  imports: [AdminNavbarComponent, CommonModule, FormsModule],
  templateUrl: './history-call.component.html',
  styleUrls: ['./history-call.component.scss']
})
export class HistoryCallComponent {
  request: EmergencyRequest[] = [];

  constructor(
    private route: Router,
    private emergencyRequest: EmergencyRequestService,
  ) {}

  async ngOnInit(): Promise<void> {
    try {
      // Fetch the request data
      this.request = await this.emergencyRequest.getRequest();

      // Iterate through the requests and fetch their currentLocation based on latitude and longitude
      for (let user of this.request) {
        if (user.latitude && user.longitude) {
          // Fetch the address from latitude and longitude using the Nominatim API
          const currentLocation = await this.getAddressFromCoordinates(user.latitude, user.longitude);
          user.currentLocation = currentLocation || user.address; // Fallback to address if no location found
        } else {
          user.currentLocation = user.address; // If no latitude/longitude, fallback to address
        }
      }
    } catch (error) {
      console.error('Error fetching requests:', error); // Handle errors
    }
  }

  // Geocoding function to get address from coordinates using Nominatim API
  private async getAddressFromCoordinates(lat: number, lon: number): Promise<string> {
    const apiUrl = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`;
    
    try {
      const response = await fetch(apiUrl);
      const data = await response.json();

      // Return the address or fallback to 'Address not found'
      return data?.address?.road || data?.address?.municipality || 'Address not found';
    } catch (error) {
      console.error('Error fetching address:', error);
      return 'Address not found';
    }
  }

  // Navigation methods
  navigateToDashboard() {
    this.route.navigate(['/admin']);
  }

  navigateToMap() {
    this.route.navigate(['/admin/map']);
  }

  navigateToHistoryCall() {
    this.route.navigate(['/admin/history-call']);
  }

  navigateToUserList() {
    this.route.navigate(['/admin/user-list']);
  }
}
