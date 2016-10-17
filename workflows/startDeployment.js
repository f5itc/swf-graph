// workflows/startDeployment
var Joi = require('joi');

module.exports = {
  schema: Joi.object({
    deployerId: Joi.string().required(),
    name:       Joi.string().min(1).required(),
  }).required(),

  version: '1.0.0',

  decider: function(args) {
    return {

      setDeploymentStarting: {
        activity: 'setDeploymentDocState',
        input:    (env) => ({ state: 'Starting', id: env.deploymentId }),
        handler:  'setDeploymentDocState'
      },

      setDeploymentStarted: {
        dependsOn: ['setDeploymentStarting'],
        input:     (env) => ({ state: 'Started', id: env.deploymentId }),
        handler:   'setDeploymentDocState',
        activity:  'setDeploymentDocState',
      },

    };
  },

  output: function(results) {
    return {
      status: 'Complete',
      env:    {
        deployment: results.startDeployment
      }
    };
  }
};
