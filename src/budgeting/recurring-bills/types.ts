export interface RecurringBill {
  id: string;
  name: string;
  amount: number;
  cadence: 'monthly' | 'weekly' | 'annual';
  nextDueDate: string;
}

export interface SubscriptionDetection {
  transactionId: string;
  confidence: number;
}
