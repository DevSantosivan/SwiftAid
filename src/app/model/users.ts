export interface account {
  id: string;
  uid: string;
  profilePicture: string;
  fullName: string;
  contactNumber: string;
  email: string;
  password: string;
  address: string;
  office_id: string;
  charge: string;
  role: 'admin' | 'superAdmin';
}
