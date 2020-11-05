import { Workflow } from 'simple-swf/build/src/entities';
import { ConfigOverride } from 'simple-swf/build/src/SWFConfig';
import { DecisionTask, EventData } from 'simple-swf/build/src/tasks';
import { BaseDecider } from '../entities';
import { Config } from '../Config';
import { WorkflowType } from '../entities/workflow/WorkflowType';
export declare const pendingStates: string[];
export declare const revertableStates: string[];
export interface WorkflowDetails {
    name: string;
    tasks?: any;
    workflowType?: WorkflowType;
    workflowId?: string;
    runId?: string;
    initialEnv?: object;
}
export interface ParentWorkflowDetails extends WorkflowDetails {
    taskKey?: string;
    taskDefObj?: any;
}
export interface TaskGraphNode {
    type: 'decision' | 'activity';
    handler: string;
    id: string;
    name: string;
    currentPath: string[];
    parameters: any;
    maxRetry?: number;
    workflow?: WorkflowDetails | null;
    parentWorkflow?: ParentWorkflowDetails | null;
    _inputEnv?: any;
}
export interface TaskGraphActivityNode extends TaskGraphNode {
    opts?: {
        taskList?: string;
        taskPriority?: number;
        scheduleToCloseTimeout?: number;
        scheduleToStartTimeout?: number;
        startToCloseTimeout?: number;
    };
}
export interface TaskGraphGraph {
    nodes: {
        [name: string]: TaskGraphNode;
    };
    edges: {
        [name: string]: string[];
    };
    revEdges: {
        [name: string]: string[];
    };
    sourceNode: string;
    sinkNode: string;
}
export interface TaskGraphParameters {
    graph: TaskGraphGraph;
}
export interface TaskGraphGraphNode extends TaskGraphNode {
    parameters: TaskGraphParameters;
}
export interface TaskGraphMarkerNode extends TaskGraphNode {
    parameters: {
        status: string;
    };
}
export interface NodeDetails {
    id: string;
    node: TaskGraphNode;
    type: string;
    deps: string[];
    state: string;
}
export default class TaskGraph extends BaseDecider {
    maxRunningWorkflow: number;
    constructor(config: Config, workflow: Workflow);
    getInitialWorkflowEnv(workflowInfo: any, cb: {
        (err: Error | null, initialEnv?: any);
    }): any;
    makeDecisions(task: DecisionTask, cb: {
        (Error?);
    }): any;
    decide(parameters: TaskGraphParameters, decisionTask: DecisionTask, workflowDetails?: WorkflowDetails | undefined, parentWorkflowDetails?: ParentWorkflowDetails | undefined, cb?: {
        (Error?);
    }): any;
    private scheduleActivityTask(node, decisionTask, inputEnv, initialEnv?);
    private validateNodeInput(currentNodeTaskDefObj, decisionTaskEnv, node, currPath);
    private validateSchema(inputEnv, node);
    buildOpts(node: TaskGraphActivityNode): ConfigOverride;
    throttle(node: TaskGraphNode, graph: TaskGraphGraph, groupedEvents: EventData, startCountByHandler: {
        [handler: string]: number;
    }): boolean;
    throttleWorkflows(node: TaskGraphGraphNode, graph: TaskGraphGraph, groupedEvents: EventData, startCountSubWorkflows: number, maxRunningWorkflow?: number): boolean;
    getNodeDetails(graph: TaskGraphGraph, grouped: EventData, reverse: boolean | undefined, name: string): NodeDetails;
    getNextNodes(graph: any, grouped: any): {
        nodes: TaskGraphNode[];
        finished: boolean;
    };
    getLastNodes(graph: any, grouped: any): {
        nodes: TaskGraphNode[];
        finished: boolean;
    };
    static getChildren(parameters: TaskGraphParameters): TaskGraphNode[];
    static validateTask(parameters: any): string | null;
    static getHandlerName(): string;
}
