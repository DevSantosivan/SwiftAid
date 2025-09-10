export interface Barangay {
  id?: string; // Optional if you're using Firestore or similar

  baranggay: string;
  baranggay_img: string;
  latLng?: { lat: number; lng: number };
  barangay_contact: string;
  captain_name: string;
  address: string;

  // Optional fields to align with structure or potential future use
  latitude?: number; // <- optional
  longitude?: number;
  createdAt?: any;
  updatedAt?: any;
}
