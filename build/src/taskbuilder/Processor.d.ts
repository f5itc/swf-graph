import { TaskGraphNode, ParentWorkflowDetails } from '../deciders/TaskGraph';
import { Config } from '../Config';
import { BaseWorkflow } from '../entities/workflow/BaseWorkflow';
import { Task } from './interfaces';
export interface ProcessorOpts {
    maxRetry?: number;
}
export interface IProcessor {
    process(args: any, graphKey: string, cb: {
        (err: null | Error, tg: TaskGraphNode | null);
    }): any;
}
export declare class Processor implements IProcessor {
    private currentPath;
    private config;
    private opts;
    workflowDef: BaseWorkflow;
    parentWorkflow?: ParentWorkflowDetails | null;
    constructor(config: Config, workflowDef: BaseWorkflow, parentWorkflow: ParentWorkflowDetails | null, path: string[] | null, opts: ProcessorOpts);
    getWorkflowName(): string;
    process(args: any, graphKey: string, cb: {
        (err: null | Error, tg: TaskGraphNode | null);
    }): void;
    processWorkflowDef(args: any, graphKey: string, workflowDef: BaseWorkflow, cb: {
        (err: Error | null, tg: TaskGraphNode | null);
    }): void;
    processNode(deciderObj: {}, args: any, nodeName: string, cb: {
        (err: Error | null, result?: any);
    }): any;
    createTaskGraph(name: string, args: any, tasks: any): TaskGraphNode;
    getParentWorkflowDetails(): ParentWorkflowDetails | null | undefined;
    getCurrentPathStr(): string;
    getCurrentPath(): string[];
    buildGraphName(prefix: any): string;
    buildId(name: string): string;
    wrapTask(args: any, name: string, taskDef: Task): TaskGraphNode;
    getMaxRetry(): number;
}
