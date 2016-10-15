'use strict';

let path = require('path');

module.exports = function getConfig() {
  return {
    defaultVersion: '1.0.0',

    region: process.env.AWS_REGION || 'us-west-1',

    activities: [
      path.join(__dirname, 'activities')
    ],

    workflows: [
      path.join(__dirname, 'workflows')
    ],

    notifier:   {
      region:       process.env.AWS_REGION || 'us-west-1',
      snsTopicName: 'ftl-engine-alerts',
      awsAccountId: '548238529753'
    },
    logger:     {
      name: 'ftl-engine'
    },
    swf:        {
      domainName:   process.env.SWF_DOMAIN || 'DCF5',
      workflowName: 'TestWorkflow'
    },
    metrics:    {
      host: 'localhost',
      port: 8125
    },
    claimCheck: {
      bucket: 'ftl-check-store',
      prefix: ''
    }
  }
};
