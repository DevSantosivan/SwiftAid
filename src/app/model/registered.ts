export interface register {
  first_name: string;
  last_name: string;
  fullName: string;
  charge: string;
  office_id: string;
  contactNumber: string;
  email: string;
  password: string;
  role: 'admin' | 'superAdmin';
}
