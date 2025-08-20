export interface EmergencyRequest {
  id?: string;
  name: string;
  address: string;
  contactNumber: string;
  description: string;
  email: string;
  event: string;
  image?: string;
  latitude: number;
  longitude: number;
  needs: string;
  status: string;
  timestamp: any;

  // Staff info fields
  staffId?: string;

  staffFirstName?: string;
  staffLastName?: string;
  staffEmail?: string;
  staffLat?: number;
  staffLng?: number;
  staffUpdatedAt?: any;
  staffFullName?: string;
  readBy?: string[];
}
