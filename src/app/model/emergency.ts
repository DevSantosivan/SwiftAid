export interface EmergencyRequest {
  id?: string;
  name: string;
  address: string;
  contactNumber: string;
  email: string;
  latitude: number;
  longitude: number;
  needs: string;
  timestamp: any;
  currentLocation?: string;
  event:string;
  }
  