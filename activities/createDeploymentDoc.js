'use strict';

var Joi = require('joi');
var bluebird = require('bluebird');

var createDeploymentDoc = {
  version: '1.0',

  schema: Joi.object({
    id: Joi.string(),
  }),

  execute: function(params) {
    console.log('createDeploymentDoc execute()', arguments);
    this.logger.info(`createDeploymentDoc ran ${params}`);

    return bluebird.resolve(Math.round(Math.random() * 100).toString()).delay(2500);
  },

  output: function(result) {
    return {
      status: { createDeploymentDoc: 'completed' },
      env:    { id: result, newValueThatIWant: 10001 }
    };
  }
};

module.exports = createDeploymentDoc;
