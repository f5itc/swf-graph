import { ActivityType } from './ActivityType';
import { Registry } from '../Registry';
export declare class ActivityRegistry extends Registry<ActivityType> {
    wrapModule(filename: string, activityDefObj: any): ActivityType;
}
