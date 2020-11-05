"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var entities_1 = require("simple-swf/build/src/entities");
// we make this nicer for non-TS implementors by throwing erros instead
// of using an abstract class
var FTLActivity = (function () {
    function FTLActivity(config) {
    }
    FTLActivity.prototype.run = function (params, cb) {
        throw new Error('run must be extended by child class');
    };
    FTLActivity.prototype.status = function () {
        throw new Error('status must be extended by child class');
    };
    FTLActivity.prototype.stop = function (cb) {
        throw new Error('stop must be extended by child class');
    };
    FTLActivity.prototype.getSchema = function () { };
    FTLActivity.getHandlerName = function () {
        return '';
    };
    FTLActivity.getSchema = function () {
        return '';
    };
    FTLActivity.validateTask = function (parameters) {
        throw new Error('must provide validateTask function');
    };
    return FTLActivity;
}());
exports.FTLActivity = FTLActivity;
var BaseActivity = (function (_super) {
    __extends(BaseActivity, _super);
    function BaseActivity(config, activityClass, workflow, activityType, task) {
        var _this = _super.call(this, workflow, activityType, task) || this;
        _this.activityClass = activityClass;
        _this.config = config;
        return _this;
    }
    BaseActivity.prototype.run = function (input, env, initialEnv, cb) {
        var _this = this;
        this.activity = new this.activityClass(this.config);
        // input is activity descriptor node
        var activityInput = input || {};
        var thisActivityDefObj;
        var workflowName;
        var isWorkflowTask = input.workflow;
        if (isWorkflowTask) {
            // Running as a workflow.
            workflowName = input.workflow.name;
            var workflowType = this.config.workflows.getModule(workflowName);
            if (!workflowType) {
                throw new Error('missing workflow type ' + workflowName);
            }
            var workflowHandler = workflowType.getHandler();
            var activities = workflowHandler.decider(initialEnv);
            thisActivityDefObj = activities[input.name];
            activityInput = env;
        }
        this.activity.run(activityInput, function (err, status, env) {
            if (err) {
                _this.config.logger.fatal('ERROR:', { err: err });
                _this.config.logger.fatal(err.stack || '');
                return cb(err, { status: 'failure' });
            }
            var info = null;
            var textStatus;
            if (typeof status === 'string') {
                textStatus = status;
            }
            else {
                textStatus = 'success';
                info = status;
            }
            // If workflow task node defines its own output(), run env through it
            if (isWorkflowTask && thisActivityDefObj && thisActivityDefObj.output) {
                var outputValue = thisActivityDefObj.output(env).env;
                if (!outputValue) {
                    _this.config.logger.fatal('ERROR: Output returned no value in ' + input.workflow.name + ' for ' + input.name);
                    return cb(new Error('ERROR: Output returned no value in ' + input.workflow.name + ' for ' + input.name), { status: 'failure' });
                }
                _this.config.logger.info(input.currentPath.join('->'), {
                    preOutput: env,
                    output: outputValue
                });
                env = outputValue;
            }
            cb(null, { status: textStatus, info: info, env: env });
        });
    };
    BaseActivity.prototype.status = function () {
        return this.activity.status();
    };
    BaseActivity.prototype.stop = function (reason, cb) {
        var _this = this;
        this.config.logger.debug('calling stop on activity');
        this.activity.stop(function (err) {
            if (err) {
                return cb(err);
            }
            _this.config.logger.debug('activity stopped');
            cb();
        });
    };
    return BaseActivity;
}(entities_1.Activity));
exports.BaseActivity = BaseActivity;
//# sourceMappingURL=BaseActivity.js.map