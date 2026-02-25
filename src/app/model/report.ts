export interface EmergencyReport {
  id?: string;

  generatedBy: {
    uid: string;
    fullName: string;
    email: string;
    role: string;
  };

  generatedAt: any;
  dateRange?: {
    from: any;
    to: any;
  };

  totalRequests: number;
  resolvedCount: number;
  cancelledCount: number;

  eventBreakdown: { [event: string]: number };
  eventTypeBreakdown: { [type: string]: number };
  sexBreakdown: { [sex: string]: number };

  includedRequestIds: string[];

  status: 'pending' | 'reviewed' | 'approved';
  reviewedBy?: {
    uid: string;
    fullName: string;
  };
  reviewedAt?: any;
}
