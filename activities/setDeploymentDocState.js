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
    this.logger.info(`setDeploymentDocState ran`, { params: params });

    return bluebird.resolve(Math.round(Math.random() * 100).toString()).delay(5000).return(params.state);
  },

  output: function(result) {
    return {
      status: { setDeploymentDocState: 'completed' },
      env:    { deploymentState: result }
    };
  },

  maxRetry: 3
};

module.exports = setDeploymentDocState;
