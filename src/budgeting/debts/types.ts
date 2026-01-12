export interface DebtAccount {
  id: string;
  name: string;
  balance: number;
  apr?: number;
  utilization?: number;
}

export interface UtilizationSnapshot {
  accountId: string;
  balance: number;
  creditLimit: number;
  asOf: string;
}
