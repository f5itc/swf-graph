// workflows/startDeployment
var Joi = require('joi');

module.exports = {
  schema: Joi.object({
    theValue: Joi.number().required()
  }).required(),

  version: '1.0.0',

  decider: function(args) {
    return {
      setDeploymentStarted: {
        input:     (env) => ({ state: 'Started', id: env.theValue.toString() }),
        handler:   'setDeploymentDocState',
        activity:  'setDeploymentDocState',
      },

    };
  },

  output: function(results) {
    return {
      status: 'Complete',
      env:    {
        otherNewValue: 'weeee'
      }
    };
  }
};
