import { BaseWorkflow } from './BaseWorkflow';
import { BaseHandler } from '../BaseHandler';
import { Config } from '../../Config';
import { Workflow as SWFWorkflow } from 'simple-swf/build/src/entities';
export declare class WorkflowType implements BaseHandler {
    WorkflowHandler: BaseWorkflow;
    config: Config;
    version: string;
    maxRetry: number;
    constructor(workflowObj: BaseWorkflow, config: Config);
    submit(initialEnv: any, opts: any, SWFWorkflow: SWFWorkflow, cb: {
        (err: Error | null, result?: any);
    }): void;
    getHandler(): BaseWorkflow;
    getHandlerName(): string;
    validateTask(parameters: any): string | null;
    getMaxConcurrent(): number | null;
    getMaxRetry(): number | null;
}
