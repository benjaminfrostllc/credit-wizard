export interface BudgetAlert {
  id: string;
  type: 'threshold' | 'overspend' | 'due-soon';
  message: string;
  createdAt: string;
}

export interface NotificationChannel {
  id: string;
  type: 'email' | 'sms' | 'push' | 'in-app';
}
