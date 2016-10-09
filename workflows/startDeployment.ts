// workflows/startDeployment
import { Config } from '../src/Config';

import * as Joi from 'joi';
import { BaseWorkflow } from '../src/entities';

let defaultSchema = Joi.object({
  deployerId: Joi.string().guid().required(),
  name: Joi.string().min(1).required(),
}).required();

let defaultMaxRetry = 525;
let defaultVersion = '1.0';

export default class StartDeploymentWorkflow extends BaseWorkflow {
  constructor(config: Config, options?: any) {
    options = options || {};
    if (!options.version) { options.version = defaultVersion; }
    if (!options.schema) { options.schema = defaultSchema; }
    if (!options.defaultMaxRetry) { options.defaultMaxRetry = defaultMaxRetry; }

    super(config, options);
  }

  getTaskGraph() {
    return {

      setDeploymentStarting: {
        activity: 'setDeploymentDocState',
        handler: 'setDeploymentDocState'
      },

      setDeploymentStarted: {
        dependsOn: ['setDeploymentStarting'],
        input: (results) => ({deployment: results.startNewDeployment}),
        handler: 'setDeploymentDocState',
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

  getHandlerName() { return 'startDeployment';}


  validateTask(parameters) { return null; }
}
