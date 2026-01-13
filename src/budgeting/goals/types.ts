export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  dueDate?: string;
}

export interface GoalProgress {
  goalId: string;
  currentAmount: number;
}
