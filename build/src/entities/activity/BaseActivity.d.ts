import { Activity as SWFActivity, ActivityType, Workflow } from 'simple-swf/build/src/entities';
import { TaskStatus } from 'simple-swf/build/src/interfaces';
import { ActivityTask } from 'simple-swf/build/src/tasks';
import { StopReasons } from 'simple-swf/build/src/interfaces';
import { Config } from '../../Config';
export interface FTLRunCallback {
    (err: Error | null, status?: any, env?: any): any;
}
export declare class FTLActivity {
    constructor(config?: Config);
    run(params: any, cb: FTLRunCallback): void;
    status(): any;
    stop(cb: {
        (Error?);
    }): void;
    getSchema(): void;
    static getHandlerName(): string;
    static getSchema(): string;
    static validateTask(parameters: any): string | null;
    static maxConcurrent?: number;
    static maxRetry?: number;
    static version?: string;
}
export declare class BaseActivity extends SWFActivity {
    activityClass: typeof FTLActivity;
    config: Config;
    activity: FTLActivity;
    constructor(config: Config, activityClass: typeof FTLActivity, workflow: Workflow, activityType: ActivityType, task: ActivityTask);
    run(input: any, env: any, initialEnv: any | null, cb: {
        (err: Error | null, status: TaskStatus);
    }): void;
    status(): any;
    stop(reason: StopReasons, cb: {
        (Error?);
    }): void;
}
