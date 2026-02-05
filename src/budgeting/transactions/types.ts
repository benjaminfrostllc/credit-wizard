export interface TransactionRecord {
  id: string;
  amount: number;
  currency: string;
  date: string;
  merchant?: string;
  categoryIds?: string[];
}

export interface TransactionImportRequest {
  source: 'plaid' | 'manual';
  externalId?: string;
}
