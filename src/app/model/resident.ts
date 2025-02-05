export interface Resident {
    id?: string;      // Optional property, will be populated by Firestore's document ID
    fullName: string;  // Resident's full name
    email: string;     // Resident's email address
    address: string;   // Resident's address
    contact: string;   // Resident's contact number
    latitude?: number; // Optional: Latitude for map marker
  longitude?: number; // Optional: Longitude for map marker
  city?: string;   // Optional: Add city/province field for filtering
  province?: string;  // Optional: You could also add a province field
  type?: 'police' | 'ambulance' | 'coastGuard' | 'fire'; // Add type property
  }
  