var path = require('path');
var aws = require('aws-sdk');
var SNSNotifier = require('../src').SNSNotifier;
var snsClient = new aws.SNS({
    region: 'us-east-1',
    endpoint: process.env.SNS_ENDPOINT || "http://sns.docker"
});
var notifier = new SNSNotifier({
    snsClient: snsClient,
    region: 'us-east-1',
    awsAccountId: 'fake'
}, { domainName: 'ftl-engine-test' });
var topicName = 'ftl-engine-alerts';
var s3Client = new aws.S3({
    region: 'us-east-1',
    endpoint: process.env.S3_ENDPOINT || "http://s3.docker"
});
// just try to slip this in before anything happens, not awesome, but should work almost always
snsClient.createTopic({ Name: 'ftl-engine-alerts' }, function (err, resp) {
    if (err) {
        console.log('failed to create sns topic', err);
    }
    notifier.getArn = function () { return resp.TopicArn; };
});
module.exports = function () {
    return {
        defaultVersion: '1.0.0',
        activities: [
            path.join(__dirname, 'activities')
        ],
        notifier: {
            instance: notifier
        },
        logger: {
            name: 'ftl-engine',
            devMode: true
        },
        swf: {
            domainName: 'ftl-engine-test',
            workflowName: 'ftl-engine'
        },
        metrics: {
            host: 'statsd.docker',
            port: 8125
        },
        claimCheck: {
            s3Client: s3Client,
            bucket: 'ftl-check-store',
            prefix: ''
        }
    };
};
//# sourceMappingURL=config.js.map