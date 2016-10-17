'use strict';

var Joi = require('joi');
var bluebird = require('bluebird');

var setDeploymentDocState = {
  version: '1.0',

  schema: Joi.object({
    id:    Joi.string().required(),
    state: Joi.string().required()
  }).required(),

  execute: function(params) {
    console.log('setDeploymentDocState execute()', arguments);
    this.logger.info(`setDeploymentDocState ran ${params}`);

    return bluebird.resolve(Math.round(Math.random() * 100).toString()).delay(5000).return(params.state);
  },

  output: function(result) {
    return {
      status: { setDeploymentDocState: 'completed' },
      env:    { deploymentState: result }
    };
  }
};

module.exports = setDeploymentDocState;
