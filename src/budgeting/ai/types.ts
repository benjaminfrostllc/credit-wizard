export interface InsightRequest {
  id: string;
  topic: string;
  context: Record<string, unknown>;
}

export interface ChatbotContext {
  userId: string;
  summary: string;
  tokens: string[];
}
