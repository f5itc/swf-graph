// workflows/createDeployment
var Joi = require('joi');

module.exports = {
  schema: Joi.object({
    deployerId: Joi.string().required(),
    name:       Joi.string().min(1).required(),
  }).required().unknown(true),

  version: '1.0',

  decider: function(args) {
    return {

      createDeploymentDoc: {
        activity: 'createDeploymentDoc',
        input:     (env) => ({}),
      },

      startNewDeployment: {
        dependsOn: ['createDeploymentDoc'],
        // input:     (env) => ({ deployment: results.createDeploymentDoc }),
        workflow:  'startDeployment'
      },

      setDeploymentStateCreated: {
        dependsOn: ['startNewDeployment'],
        input:     (env) => ({ state: 'Running', id: env.deploymentId }),
        activity:  'setDeploymentDocState',
      },

    }
  },

  output: function(results) {
    return {
      env: {
        deployment: results.startNewDeployment
      }
    };
  }
};
