import * as Joi from 'joi';
import { Config } from '../../Config';
export interface FTLWorkflowDef {
    name: string;
    version: string;
    schema: Joi.Schema;
    decider(args: any): any;
    output(results: any): any;
    maxRetry?: number;
}
export declare class BaseWorkflow {
    version: string;
    schema: Joi.Schema;
    maxRetry?: number;
    maxConcurrent?: number;
    config: Config;
    name: string;
    graphKey?: any;
    decider(args: any): void;
    output(results: any): any;
    constructor(config: Config, workflowDef: FTLWorkflowDef);
    validateTask(args: any): string | null;
    getHandlerName(): string;
}
