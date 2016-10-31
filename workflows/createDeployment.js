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
        output:   (env) => {
          return { env: { theId: env.id, newValueThatIWant: env.newValueThatIWant } };
        }
      },

      startNewDeployment: {
        dependsOn: ['createDeploymentDoc'],
        input:     (env) => {
          return { deploymentId: env.theId };
        },
        workflow:  'startDeployment'
      },

      doSomethingWithDeployment: {
        dependsOn: ['startNewDeployment'],
        input:     (env) => {
          return { theValue: env.newValueThatIWant };
        },
        output:    (env) => {
          env.BLAMMO = 'mrow0';
          return { env };
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
