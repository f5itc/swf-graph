export interface Task {
  workflow?: string;
  activity?: string;
  input(env: any): any;
  dependsOn?: string[];
  maxRetry?: number;
  parameters?: any;
}
