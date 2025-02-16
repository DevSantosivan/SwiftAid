import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { EmergencyRequestService } from '../../core/rescue_request.service';
import { EmergencyRequest } from '../../model/emergency';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Firestore, collection, query, onSnapshot, doc, deleteDoc } from '@angular/fire/firestore'; // Import necessary Firestore methods
import { AdminNavbarComponent } from '../admin-navbar/admin-navbar.component';

@Component({
  selector: 'app-history-call',
  imports: [CommonModule, FormsModule, AdminNavbarComponent],
  templateUrl: './history-call.component.html',
  styleUrls: ['./history-call.component.scss']
})
export class HistoryCallComponent {
  request: EmergencyRequest[] = [];
  currentPage: number = 1;
  totalPages: number = 1;
  currentPageRequests: EmergencyRequest[] = [];
  itemsPerPageOptions: number[] = [5, 10, 15, 20];  // Available options for items per page
  itemsPerPage: number = 10;  // Default items per page

  constructor(
    private route: Router,
    private emergencyRequest: EmergencyRequestService,
    private firestore: Firestore  // Inject Firestore
  ) {}

  async ngOnInit(): Promise<void> {
    try {
      // Setup real-time listener for the Firestore collection
      const requestsRef = collection(this.firestore, 'EmergencyRequest');
      const q = query(requestsRef);
      
      // Listen to changes in the Firestore collection
      onSnapshot(q, (querySnapshot) => {
        // Map Firestore documents to your request array and add `id` field
        this.request = querySnapshot.docs.map(doc => ({
          id: doc.id, // Attach Firestore document ID here
          ...doc.data() as EmergencyRequest
        }));
  
        // Calculate total pages and load the first page's requests
        this.totalPages = Math.ceil(this.request.length / this.itemsPerPage);
        this.loadCurrentPageRequests();
  
        // Update the currentLocation based on latitude/longitude for each request
        this.updateCurrentLocationForRequests();
      });
  
    } catch (error) {
      console.error('Error fetching requests:', error);
    }
  }
  

  // Update currentLocation for requests based on latitude and longitude
  async updateCurrentLocationForRequests() {
    for (let user of this.request) {
      if (user.latitude && user.longitude) {
        const currentLocation = await this.getAddressFromCoordinates(user.latitude, user.longitude);
        user.currentLocation = currentLocation || user.address; // Fallback to address if no location found
      } else {
        user.currentLocation = user.address; // If no latitude/longitude, fallback to address
      }
    }
  }

  // Function to load requests for the current page
  loadCurrentPageRequests() {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.currentPageRequests = this.request.slice(startIndex, endIndex);
  }

  // Function to handle pagination change
  changePage(direction: 'previous' | 'next') {
    if (direction === 'previous' && this.currentPage > 1) {
      this.currentPage--;
    } else if (direction === 'next' && this.currentPage < this.totalPages) {
      this.currentPage++;
    }

    this.loadCurrentPageRequests();  // Reload the requests for the new page
  }

  // Function to handle change in the number of items per page
  changeItemsPerPage(event: any) {
    this.itemsPerPage = +event.target.value;  // Convert selected value to number
    this.totalPages = Math.ceil(this.request.length / this.itemsPerPage);  // Recalculate total pages
    this.currentPage = 1;  // Reset to the first page
    this.loadCurrentPageRequests();  // Reload the requests for the new page
  }

  // Function to search requests based on input
  searchRequest(event: any) {
    const query = event.target.value.toLowerCase();
    this.request = this.request.filter((req) => req.name.toLowerCase().includes(query));
    this.totalPages = Math.ceil(this.request.length / this.itemsPerPage);
    this.currentPage = 1;  // Reset to first page after search
    this.loadCurrentPageRequests(); // Reload the requests after filtering
  }

  async deleteRequest(requestId: string) {
    console.log('Delete button clicked for request ID:', requestId); // Debugging log
  
    if (!requestId) {
      console.error('Invalid request ID');
      return;
    }
  
    try {
      const requestDocRef = doc(this.firestore, 'EmergencyRequest', requestId);
      console.log('Attempting to delete document from Firestore:', requestId); // Debugging log
  
      await deleteDoc(requestDocRef); // Delete the document from Firestore
  
      console.log('Request deleted successfully from Firestore');
      this.request = this.request.filter(req => req.id !== requestId);  // Remove it from the local list
      this.totalPages = Math.ceil(this.request.length / this.itemsPerPage);  // Recalculate total pages
      this.loadCurrentPageRequests();  // Reload the requests after deletion
    } catch (error) {
      console.error('Error deleting request:', error); // Log the error if something goes wrong
    }
  }
  
  
  
  

  private async getAddressFromCoordinates(lat: number, lon: number): Promise<string> {
    const apiUrl = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`;
    try {
      const response = await fetch(apiUrl);
      const data = await response.json();
      
      if (data && data.address) {
        const road = data.address.road || '';
        const suburb = data.address.suburb || '';
        const city = data.address.city || data.address.town || data.address.village || '';
        const neighborhood = data.address.neighbourhood || '';

        let address = road ? `${road}` : 'Near ';
        if (!road && suburb) address += `${suburb}`;
        else if (!road && city) address += `${city}`;
        else if (!road && neighborhood) address += `near ${neighborhood}`;

        if (suburb && road) address += `, ${suburb}`;
        if (city) address += `, ${city}`;
        if (neighborhood) address += ` (Near ${neighborhood})`;

        return address.trim() || 'Address not found';
      }

      return 'Address not found';
    } catch (error) {
      console.error('Error fetching address:', error);
      return 'Unable to fetch address at this time.';
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
