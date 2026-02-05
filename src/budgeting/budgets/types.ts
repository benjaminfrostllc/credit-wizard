export interface BudgetAllocation {
  categoryId: string;
  amount: number;
}

export interface BudgetPlan {
  id: string;
  period: 'monthly' | 'weekly';
  allocations: BudgetAllocation[];
}
