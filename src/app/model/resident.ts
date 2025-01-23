// Define the interface for the user data structure
interface EmergencyRequest {
  name: string;
  latitude: number;
  longitude: number;
  service: string;
  contactNumber: string;
  address: string;
  email: string;
  timestamp: any; // 'timestamp' will remain as 'any' or use 'firebase.firestore.Timestamp' if you want to type it specifically.
}
