import { Workflow, Decider } from 'simple-swf/build/src/entities';
import { DecisionTask } from 'simple-swf/build/src/tasks';
import { Config } from '../../Config';
import { ActivityRegistry } from '../activity';
import { Logger } from '../../lib';
export declare class BaseDecider extends Decider {
    FTLConfig: Config;
    activities: ActivityRegistry;
    logger: Logger;
    constructor(config: Config, workflow: Workflow);
    makeDecisions(task: DecisionTask, cb: {
        (err: Error, decision: DecisionTask);
    }): void;
    static validateTask(parameters: any): string | null;
    static getChildren(paramenters: any): any[] | any;
    static getHandlerName(): string;
}
