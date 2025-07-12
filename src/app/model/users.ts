export interface account {
  id: string;
  uid: string;
  profilePicture: string;
  fullName: string;
  contactNumber: string;
  email: string;
  password: string;
  address?: string; // Optional for staff
  office_id?: string; // Optional for residents
  charge?: string; // Optional field, depending on your logic
  role: 'resident' | 'admin' | 'superAdmin'; // Include 'resident' for UI consistency
  status: {
    online: boolean;
    last: number | null;
  };
  blocked?: boolean; // Optional - for block modal logic
  blockReason?: string;
}
