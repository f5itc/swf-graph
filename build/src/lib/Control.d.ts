import { Config } from '../Config';
import { ActivityWorker, DeciderWorker } from '../workers';
import { InitedEntities } from '../init';
import { Workflow, ActivityType } from 'simple-swf/build/src/entities';
export interface ActivityTypeCreated {
    activity: ActivityType;
    created: boolean;
}
export declare class Control {
    config: Config;
    workflow: Workflow;
    activityWorker?: ActivityWorker;
    deciderWorker?: DeciderWorker;
    constructor();
    start(args: any, cb: {
        (Error?);
    }): void;
    init(configObj: any, cb: {
        (err: Error | null, entities?: InitedEntities);
    }): void;
    startWorkers(args: any, cb: {
        (Error?);
    }): void;
    registerActivityTypes(cb: {
        (err: Error | null, res?: ActivityTypeCreated[]);
    }): void;
    startActivityWorker(shouldStart: boolean, cb: {
        (err: Error | null, s: boolean);
    }): any;
    startDeciderWorker(shouldStart: boolean, cb: {
        (err: Error | null, s: boolean);
    }): any;
    submitWorkflowExecution(workflowName: string, input: any, SWFOpts: any, cb: {
        (err?: Error | null, result?: any);
    }): any;
}
