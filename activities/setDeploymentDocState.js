'use strict';

var Joi = require('joi');
var bluebird = require('bluebird');

var setDeploymentDocState = {
  version:     '1.0',

  schema: Joi.object({
    id:    Joi.string().guid().required(),
    state: Joi.string().required()
  }).required(),

  execute: function(params) {
    console.log('setDeploymentDocState execute()', arguments);
    this.logger.info(`setDeploymentDocState ran ${params.mult}`);

    return bluebird.resolve({
      status: { hay: 'yallz' },
      env:    { setDeploymentDocState: Math.round(Math.random() * params.mult) }
    }).delay(5000);
  },

  output: function(result) {
    return { status: 'complete', env: result };
  }
};

module.exports = setDeploymentDocState;
