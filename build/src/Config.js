"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var path = require("path");
var _ = require("lodash");
var aws_sdk_1 = require("aws-sdk");
var SWFConfig_1 = require("simple-swf/build/src/SWFConfig");
var entities_1 = require("simple-swf/build/src/entities");
var util_1 = require("simple-swf/build/src/util");
var Logger_1 = require("./lib/Logger");
var Notifier_1 = require("./lib/Notifier");
var MetricReporter_1 = require("./lib/MetricReporter");
var entities_2 = require("./entities");
var Config = (function () {
    function Config(configFunc) {
        this.swfDefaults = {
            activity: {
                heartbeatTimeout: 60,
                taskList: 'ftl-engine'
            },
            workflow: {
                taskList: 'ftl-engine'
            },
            decision: {
                taskList: 'ftl-engine'
            }
        };
        this.ftlDefaults = {
            maxRunningWorkflow: 50,
            maxRetry: 5
        };
        if (typeof configFunc !== 'function') {
            throw new Error('invalid argument to config constructor, must be a function returning an object');
        }
        var userConfig = this.populateUserConfig(configFunc());
        this.userConfig = userConfig;
        this.swfClient = userConfig.swfClient || new aws_sdk_1.SWF({ region: userConfig.region || 'us-east-1' });
        this.domainName = userConfig.swf.domainName;
        this.workflowName = userConfig.swf.workflowName;
        this.defaultVersion = userConfig.defaultVersion;
        this.notifier = userConfig.notifier.instance || this.buildNotifierInstance(userConfig.notifier);
        this.logger = userConfig.logger.instance || this.buildLoggerInstance(userConfig.logger);
        this.metricReporter = userConfig.metrics.instance || this.buildMetricInstance(userConfig.metrics);
        this.customOpts = this.defaultFTLConf(userConfig.ftl);
        this.swfConfig = new SWFConfig_1.SWFConfig(this.defaultSwfConf(userConfig.swf));
        this.activities = this.buildActivityRegistry(userConfig.activities);
        this.workflows = this.buildWorkflowRegistry(userConfig.workflows);
        this.deciders = this.buildDeciderRegistry();
        this.domain = userConfig.swf.domainInstance || new entities_1.Domain(this.domainName, this.swfConfig, this.swfClient);
        if (!userConfig.fieldSerializer.instance) {
            var claimCheck = userConfig.claimCheck.instance || this.buildClaimCheck(userConfig.claimCheck);
            this.fieldSerializer = this.buildFieldSerializer(claimCheck, userConfig.fieldSerializer);
        }
        else {
            this.fieldSerializer = userConfig.fieldSerializer;
        }
    }
    Config.prototype.buildNotifierInstance = function (notifierConfig) {
        this.checkRequired('notifier', {
            region: 'string',
            snsTopicName: 'string',
            awsAccountId: 'string'
        }, notifierConfig);
        return this.handleErrorOfComponent(new Notifier_1.SNSNotifier(notifierConfig, this), 'notifer');
    };
    Config.prototype.buildLoggerInstance = function (loggerConfig) {
        this.checkRequired('logger', { name: 'string' }, loggerConfig);
        return this.handleErrorOfComponent(new Logger_1.Logger(loggerConfig), 'logger');
    };
    Config.prototype.buildMetricInstance = function (metricConfig) {
        this.checkRequired('metrics', {
            host: 'string',
            port: 'number'
        }, metricConfig);
        return this.handleErrorOfComponent(new MetricReporter_1.StatsDMetricReporter(metricConfig), 'metricReporter');
    };
    // each of our logger, notifier and metricReporters can emit what should be non fatal events
    // handle them and log them here
    Config.prototype.handleErrorOfComponent = function (component, componentName) {
        var _this = this;
        component.on('error', function (err) {
            _this.logger.error("component " + componentName + " had an error", { err: err });
        });
        return component;
    };
    // these components don't need the same as above as their errors will be inline activity and decisions
    // erroring call stacks, which may be fatal
    Config.prototype.buildClaimCheck = function (claimCheckConfig) {
        this.checkRequired('claimCheck', { bucket: 'string' }, claimCheckConfig);
        return new util_1.S3ClaimCheck(claimCheckConfig.bucket, claimCheckConfig.prefix, claimCheckConfig.s3Client);
    };
    Config.prototype.buildFieldSerializer = function (claimChecker, fieldSerializerConfig) {
        return new util_1.FieldSerializer(claimChecker, fieldSerializerConfig.fields, { maxLength: fieldSerializerConfig.maxLength });
    };
    Config.prototype.buildActivityRegistry = function (activityLocations) {
        var withDefaultLocs = [path.join(__dirname, './activities')].concat(activityLocations);
        return new entities_2.ActivityRegistry(withDefaultLocs, this);
    };
    Config.prototype.buildDeciderRegistry = function () {
        var defaultLocs = [path.join(__dirname, './deciders')];
        return new entities_2.DeciderRegistry(defaultLocs, this);
    };
    Config.prototype.buildWorkflowRegistry = function (workflowLocations) {
        return new entities_2.WorkflowRegistry(workflowLocations, this);
    };
    Config.prototype.populateUserConfig = function (userConfig) {
        if (!userConfig.defaultVersion) {
            throw new Error('missing defaultVersion');
        }
        userConfig.swf = userConfig.swf || {};
        userConfig.notifier = userConfig.notifier || {};
        userConfig.logger = userConfig.logger || {};
        userConfig.metrics = userConfig.metrics || {};
        userConfig.activities = userConfig.activities || [];
        userConfig.workflows = userConfig.workflows || [];
        userConfig.ftl = userConfig.ftl || {};
        userConfig.claimCheck = userConfig.claimCheck || {};
        userConfig.fieldSerializer = userConfig.fieldSerializer || {};
        userConfig.claimCheck.prefix = userConfig.claimCheck.prefix || '';
        this.checkRequired('swf', {
            domainName: 'string',
            workflowName: 'string'
        }, userConfig.swf);
        return userConfig;
    };
    Config.prototype.defaultSwfConf = function (swfConf) {
        swfConf.activity = swfConf.activity || {};
        swfConf.workflow = swfConf.workflow || {};
        swfConf.decision = swfConf.decision || {};
        return _.merge(this.swfDefaults, swfConf);
    };
    Config.prototype.defaultFTLConf = function (ftlConfig) {
        return _.merge(this.ftlDefaults, ftlConfig || {});
    };
    Config.prototype.getOpt = function (keyName) {
        return this.customOpts[keyName];
    };
    Config.prototype.getConfigFor = function (component) {
        var parts = component.split('.');
        var ptr = this.userConfig;
        while (parts.length) {
            ptr = ptr[parts.shift()] || {};
        }
        return ptr;
    };
    Config.prototype.checkRequired = function (configName, required, parameters) {
        for (var _i = 0, _a = Object.keys(required); _i < _a.length; _i++) {
            var key = _a[_i];
            if (!parameters[key] || typeof parameters[key] !== required[key]) {
                throw new Error("missing config " + configName + "." + key + " or not of type " + required[key]);
            }
        }
    };
    return Config;
}());
exports.Config = Config;
//# sourceMappingURL=Config.js.map