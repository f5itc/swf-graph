// workflows/createDeployment

import * as Joi from 'joi';
import { Config } from '../../src/Config';
import { BaseWorkflow } from '../../src/entities/workflow/BaseWorkflow';

let defaultSchema = Joi.object({
  deployerId: Joi.string().guid().required(),
  name: Joi.string().min(1).required(),
}).required();

let defaultMaxRetry = 525;
let defaultVersion = '1.0';

export default class CreateDeploymentTaskCreator extends BaseWorkflow {
  version: string;
  name: string;
  schema: any;
  maxRetry: number;

  constructor(config: Config, options?: any) {
    options = options || {};
    if (!options.version) { options.version = defaultVersion; }
    if (!options.schema) { options.schema = defaultSchema; }
    if (!options.defaultMaxRetry) { options.defaultMaxRetry = defaultMaxRetry; }

    super(config, options);
  }

  getTaskGraph() {
    return {

      createDeploymentDoc: {
        activity: 'createDeploymentDoc'
      },

      startNewDeployment: {
        dependsOn: ['createDeploymentDoc'],
        input: (results) => ({deployment: results.createDeploymentDoc}),
        workflow: 'startDeployment',
      },

      setDeploymentDocState: {
        dependsOn: ['startNewDeployment'],
        input: (results) => ({deployment: results.startNewDeployment}),
        activity: 'setDeploymentDocState',
      },

    };
  }

  output(results) {
    return {
      env: {
        deployment: results.startNewDeployment
      }
    };
  }

  validateTask(parameters) { return null; }

}
