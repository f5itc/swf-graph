'use strict';

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
        input:    (env) => ({}),
        output:   (env) => ({ theId: env.id, newValueThatIWant: env.newValueThatIWant})
      },

      startNewDeployment: {
        dependsOn: ['createDeploymentDoc'],
        input:     (env) => ({ deploymentId: env.theId }),
        workflow:  'startDeployment'
      },

      doSomethingWithDeployment: {
        dependsOn: ['startNewDeployment'],
        input:     (env) => {
          console.log("ENV IS:", env);

          return { theValue: env.newValueThatIWant };
        },
        workflow:  'doSomething'
      },

      setDeploymentStateCreated: {
        dependsOn: ['startNewDeployment'],
        input:     (env) => {
          return { state: 'Running', id: env.theId };
        },
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
