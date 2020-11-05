import { SWF } from 'aws-sdk';
import { DeciderWorker as SWFDeciderWorker } from 'simple-swf/build/src/workers';
import { Decider } from 'simple-swf/build/src/entities';
import { ConfigOverride } from 'simple-swf/build/src/SWFConfig';
import { DecisionTask } from 'simple-swf/build/src/tasks';
import { Logger, LogWorkerMixin, LogLevels } from '../lib/Logger';
import { Config } from '../Config';
export interface WorkflowWithParent extends SWF.WorkflowExecution {
    parentWorkflowId: string;
}
export declare class DeciderWorker extends SWFDeciderWorker implements LogWorkerMixin {
    FTLConfig: Config;
    workerName: string;
    logger: Logger;
    decisionTimers: {
        [id: string]: Date;
    };
    constructor(decider: Decider, config: Config, opts: ConfigOverride);
    onDecision(task: DecisionTask): void;
    onDecisionMade(task: DecisionTask): void;
    onPoll(): void;
    start(cb: any): void;
    buildTaskMeta(task: DecisionTask, meta?: Object): Object;
    identity: string;
    logDebug: (msg: string, meta?: Object) => void;
    logInfo: (msg: string, meta?: Object) => void;
    logWarn: (msg: string, meta?: Object) => void;
    logError: (msg: string, err: Error, meta?: Object) => void;
    logMeta: (level: LogLevels, msg: string, metaOverrides?: Object) => void;
}
