export interface CategoryDefinition {
  id: string;
  name: string;
  description?: string;
}

export interface CategoryRule {
  id: string;
  name: string;
  matcher: string;
  priority: number;
}
