import { ActivityType as SWFActivityType, Workflow } from 'simple-swf/build/src/entities';
import { ActivityTask } from 'simple-swf/build/src/tasks';
import { BaseActivity, FTLActivity } from './BaseActivity';
import { BaseHandler } from '../BaseHandler';
import { Config } from '../../Config';
export declare class ActivityType extends SWFActivityType implements BaseHandler {
    ActivityHandler: typeof FTLActivity;
    config: Config;
    loadLocation: string;
    constructor(HandlerClass: typeof FTLActivity, loadLocation: string, config: Config);
    createExecution(workflow: Workflow, task: ActivityTask): BaseActivity;
    getHandlerName(): string;
    getSchema(): string;
    validateTask(parameters: any): string | null;
    getMaxConcurrent(): number | null;
    getMaxRetry(): number | null;
}
