// workflows/createDeployment
var Joi = require('joi');

module.exports = {
  schema: Joi.object({
    deployerId: Joi.string().guid().required(),
    name:       Joi.string().min(1).required(),
  }).required(),

  version: '1.0',

  decider: function(args) {
    return {

      createDeploymentDoc: {
        activity: 'createDeploymentDoc',
      },

      startNewDeployment: {
        dependsOn: ['createDeploymentDoc'],
        input:     (results) => ({ deployment: results.createDeploymentDoc }),
        workflow:  'startDeployment'
      },

      setDeploymentDocState: {
        dependsOn: ['startNewDeployment'],
        input:     (results) => ({ deployment: results.startNewDeployment }),
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
