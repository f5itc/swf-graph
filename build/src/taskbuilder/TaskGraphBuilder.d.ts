import { Processor } from './Processor';
import { TaskGraphNode, TaskGraphGraph, TaskGraphGraphNode, TaskGraphMarkerNode } from '../deciders/TaskGraph';
export interface TaskGraphNodeDeps extends TaskGraphNode {
    deps: string[];
}
export declare class TaskGraphBuilder {
    name: string;
    id: string;
    processor: Processor;
    graph: TaskGraphGraph;
    sourceTask: TaskGraphMarkerNode;
    sinkTask: TaskGraphMarkerNode;
    byName: {
        [nodeName: string]: TaskGraphNode;
    };
    constructor(name: string, args: any, tasks: TaskGraphNode[], processor: Processor);
    createCheckTask(args: any, tasks: any, name: any, label: any): TaskGraphMarkerNode;
    getGraph(): TaskGraphGraphNode;
    addSinkNodeEdges(): void;
    addSourceSinkNodes(): void;
    reduceToGraph(graph: TaskGraphGraph, task: TaskGraphNodeDeps): TaskGraphGraph;
}
