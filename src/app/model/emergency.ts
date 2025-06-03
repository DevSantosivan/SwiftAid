export interface EmergencyRequest {
  id?: string;
  name: string;
  image: string;
  address: string;
  contactNumber: string;
  email: string;
  latitude: number;
  longitude: number;
  needs: string;
  timestamp: any;
  currentLocation?: string;
  description?: string;
  status: string; // e.g., 'pending', 'in-progress', 'resolved'
  assignedTo?: string; // ID of the staff member assigned to this request
}
