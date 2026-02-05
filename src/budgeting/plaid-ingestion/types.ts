export interface PlaidIngestionJob {
  id: string;
  source: 'plaid';
  status: 'queued' | 'running' | 'completed' | 'failed';
}

export interface PlaidWebhookPayload {
  eventType: string;
  eventCode: string;
  itemId?: string;
}
