// workflows/startDeployment
var Joi = require('joi');

module.exports = {
  schema: Joi.object({
    deployerId: Joi.string().guid().required(),
    name:       Joi.string().min(1).required(),
  }).required(),

  version: '1.0.0',

  decider: function(args) {
    return {

      setDeploymentStarting: {
        activity: 'setDeploymentDocState',
        handler:  'setDeploymentDocState'
      },

      setDeploymentStarted: {
        dependsOn: ['setDeploymentStarting'],
        input:     (results) => ({ deployment: results.startNewDeployment }),
        handler:   'setDeploymentDocState',
        activity:  'setDeploymentDocState',
      },

    };
  },

  output: function(results) {
    return {
      env: {
        deployment: results.startDeployment
      }
    };
  }
};
