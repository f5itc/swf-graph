import { BaseDecider } from '../entities';
import { DecisionTask } from 'simple-swf/build/src/tasks';
export default class RecordMarker extends BaseDecider {
    makeDecisions(task: DecisionTask, cb: {
        (Error?);
    }): any;
    static getChildren(): never[];
    static validateTask(parameters: any): string | null;
}
