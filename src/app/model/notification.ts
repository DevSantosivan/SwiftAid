export interface Notification {
  id: string;
  requestId: string;
  event: string;
  status?: string;
  timestamp?: Date;
  userId: string;
  readBy?: string[]; // array of user IDs who read this notification
  deletedBy?: string[]; // array of user IDs who deleted this notification
  request?: any; // you can replace with EmergencyRequest if you want stronger typing
  isReadByCurrentUser?: boolean; // helper flag, not stored in firestore
  [key: string]: any; // catch-all for any extra fields
}
