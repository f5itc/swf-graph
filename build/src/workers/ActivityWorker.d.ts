import { ActivityWorker as SWFActivityWorker } from 'simple-swf/build/src/workers';
import { ActivityTask } from 'simple-swf/build/src/tasks';
import { Activity, Workflow } from 'simple-swf/build/src/entities';
import { ConfigOverride } from 'simple-swf/build/src/SWFConfig';
import { TaskStatus, StopReasons } from 'simple-swf/build/src/interfaces';
import { Config } from '../Config';
import { Logger, LogWorkerMixin, LogLevels } from '../lib/Logger';
export declare class ActivityWorker extends SWFActivityWorker implements LogWorkerMixin {
    FTLConfig: Config;
    workerName: string;
    logger: Logger;
    activityTimers: {
        [id: string]: Date;
    };
    constructor(workflow: Workflow, config: Config, opts: ConfigOverride);
    start(cb: any): void;
    stop(cb: {
        (err?: Error);
    }): void;
    onStartTask(task: ActivityTask, execution: Activity): void;
    onFinishedTask(task: ActivityTask, execution: Activity, success: boolean, details: TaskStatus): void;
    onWarn(err: Error): void;
    onPoll(): void;
    onTaskCompleted(task: ActivityTask, execution: Activity, details: TaskStatus): void;
    onTaskFailed(task: ActivityTask, execution: Activity, err: Error, details: TaskStatus): void;
    onTaskCanceled(task: ActivityTask, execution: Activity, reason: StopReasons): void;
    onTaskError(task: ActivityTask, execution: Activity, err: Error): void;
    onTaskHeartbeat(task: ActivityTask, execution: Activity, status: TaskStatus): void;
    onTaskHBComplete(task: ActivityTask, execution: Activity): void;
    buildTaskMeta(task: ActivityTask, meta?: Object): Object;
    identity: string;
    logDebug: (msg: string, meta?: Object) => void;
    logInfo: (msg: string, meta?: Object) => void;
    logWarn: (msg: string, meta?: Object) => void;
    logError: (msg: string, err: Error, meta?: Object) => void;
    logMeta: (level: LogLevels, msg: string, metaOverrides?: Object) => void;
}
