'use strict';

var Joi = require('joi');
var bluebird = require('bluebird');

var createDeploymentDoc = {
  version: '1.0',

  schema: Joi.object({
    id: Joi.string().guid().required(),
  }).required(),

  execute: function(params) {
    console.log('createDeploymentDoc execute()', arguments);
    this.logger.info(`createDeploymentDoc ran ${params.mult}`);

    return bluebird.resolve({
      status: { hay: 'yallz' },
      env:    { createDeploymentDoc: Math.round(Math.random() * params.mult) }
    }).delay(5000);
  },

  output: function(result) {
    return {
      env: {
        deployment: result,
      }
    }
  }
};

module.exports = createDeploymentDoc;
