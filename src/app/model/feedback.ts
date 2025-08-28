export interface Feedback {
  id: string;
  feedback: string; // main comment content from DB
  rating: number;
  requestId: string;
  timestamp: any;
  name?: string; // optional, will be filled after fetch
  profilePic?: string; // optional profile picture URL
  comment?: string; // optional duplicate or UI-friendly field
}
