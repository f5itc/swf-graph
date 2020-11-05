import { Registry } from '../Registry';
import { WorkflowType } from './WorkflowType';
import { FTLWorkflowDef } from './BaseWorkflow';
export declare class WorkflowRegistry extends Registry<WorkflowType> {
    wrapModule(filename: string, workflowDefObj: FTLWorkflowDef | any): WorkflowType;
}
