export interface account {
  twoFactorEnabled?: boolean;
  twoFactorSecret?: string | null;
  id: string;
  uid: string;
  profileImageUrl: string;
  fullName: string;
  contactNumber: string;
  email: string;
  password: string;
  address?: string; // Optional for staff
  office_id?: string; // Optional for residents
  charge?: string; // Optional field, depending on your logic
  role: 'resident' | 'admin' | 'superAdmin'; // Include 'resident' for UI consistency
  dateOfBirth: string;
  validIdImageUrl: string;
  idNumber: string;
  status: {
    online: boolean;
    last: number | null;
  };
  sex: string;
  account_status: 'pending' | 'approved' | 'rejected';
  blocked?: boolean; // Optional - for block modal logic
  blockReason?: string;
  createdAt: number;
  updatedAt: number;
  idType?: string; // Optional - for different types of IDs
}
