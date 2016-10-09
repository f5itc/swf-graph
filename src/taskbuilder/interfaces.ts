import * as Joi from 'joi';

export interface Task {
  workflow?: string;
  activity: string;
  input(env: any): any;
  dependsOn?: string[];
}

export interface WorkflowDef {
  version: string;
  schema: Joi.Schema;
  graphKey?: string;
  getTaskGraph(): any;
  getHandlerName(): string;
  output(results): any;
  maxRetry?: number;
}
