export interface Barangay {
  id?: string; // Optional if you're using Firestore or similar

  baranggay: string;
  baranggay_img: string;
  latLng?: string; // Can be parsed into lat/lng if needed
  barangay_contact: string;
  captain_name: string;

  // Optional fields to align with structure or potential future use
  latitude?: number;
  longitude?: number;
  createdAt?: any;
  updatedAt?: any;
}
