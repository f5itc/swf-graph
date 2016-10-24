import * as Joi from 'joi';
import { Config } from '../../Config';

// Format of object provided as workflow definitions from outside sources
export interface FTLWorkflowDef {
  name: string;
  version: string;
  schema: Joi.Schema;
  decider(args: any): any;
  output(results): any;
  maxRetry?: number;
}

// FTL workflow wrapper object
// 1. Uses provided props from provided FTLWorkflowDef object
// 2. validateTask is generic joi check using provided schema
export class BaseWorkflow {
  version: string;
  schema: Joi.Schema;
  maxRetry?: number;
  maxConcurrent?: number;
  config: Config;
  name: string;
  graphKey?;

  decider(args: any) { };

  output(results: any): any { return results; };

  constructor(config: Config, workflowDef: FTLWorkflowDef) {
    this.version = workflowDef.version;
    this.schema = workflowDef.schema;
    this.maxRetry = workflowDef.maxRetry;

    this.decider = workflowDef.decider;
    this.output = workflowDef.output;
    this.name = workflowDef.name;

    this.config = config;
  }

  validateTask(args: any): string | null {
    const {error} = Joi.validate(args, this.schema);

    return `Error validating workflow: ` + error;
  }

  getHandlerName() {
    return this.name;
  }

}
