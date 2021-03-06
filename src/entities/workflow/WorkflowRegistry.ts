import * as path from 'path';

import * as Joi from 'joi';

import { Registry } from '../Registry';
import { WorkflowType } from './WorkflowType';
import { BaseWorkflow, FTLWorkflowDef } from './BaseWorkflow';

const workflowSchema = Joi.object({
  decider: Joi.func().maxArity(1).required(),
  output: Joi.func().maxArity(1).required(),
  schema: Joi.object().required(),
  version: Joi.string().min(3).required(),
  name: Joi.string()
}).unknown(true).required();

export class WorkflowRegistry extends Registry<WorkflowType> {
  wrapModule(filename: string, workflowDefObj: FTLWorkflowDef | any): WorkflowType {
    if (workflowDefObj.default) { workflowDefObj = workflowDefObj.default; }

    let name: string = path.basename(filename, path.extname(filename));
    if (!name) {
      throw new Error('missing workflow name');
    }
    workflowDefObj.name = name;

    // Ensure the provided object has the correct shape
    const {error} = Joi.validate(workflowDefObj, workflowSchema);

    if (error) {
      throw new Error(`Error validating ${name} workflow: ` + error);
    }

    let handler: BaseWorkflow;

    // Create BaseWorkflow object with validateTask method that uses schema
    handler = new BaseWorkflow(this.config, workflowDefObj);

    if (!handler.validateTask) {
      throw new Error(`workflow object for ${name} does not have a validateTask function`);
    }

    return new WorkflowType(handler as BaseWorkflow, this.config);
  }
}
