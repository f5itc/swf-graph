"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var shortId = require("shortid");
var _ = require("lodash");
var Processor_1 = require("../../taskbuilder/Processor");
var WorkflowType = (function () {
    function WorkflowType(workflowObj, config) {
        this.WorkflowHandler = workflowObj;
        this.version = workflowObj.version || config.defaultVersion;
        this.maxRetry = workflowObj.maxRetry || config.getOpt('maxRetry');
        this.config = config;
    }
    WorkflowType.prototype.submit = function (initialEnv, opts, SWFWorkflow, cb) {
        var _this = this;
        var processor = new Processor_1.Processor(this.config, this.WorkflowHandler, null, null, {});
        processor.process(_.clone(initialEnv), '', function (err, taskGraph) {
            if (err) {
                return cb(err);
            }
            SWFWorkflow.startWorkflow(_this.getHandlerName() + '_' + shortId.generate(), taskGraph, initialEnv, opts, function (err, info) {
                if (err) {
                    return cb(err);
                }
                // TODO: fix type declaration
                // this.config.logger.info(info);
                cb(null, info);
            });
        });
    };
    WorkflowType.prototype.getHandler = function () {
        return this.WorkflowHandler;
    };
    WorkflowType.prototype.getHandlerName = function () {
        return this.WorkflowHandler.getHandlerName();
    };
    WorkflowType.prototype.validateTask = function (parameters) {
        return this.WorkflowHandler.validateTask(parameters);
    };
    WorkflowType.prototype.getMaxConcurrent = function () {
        return this.WorkflowHandler.maxConcurrent || null;
    };
    WorkflowType.prototype.getMaxRetry = function () {
        return this.WorkflowHandler.maxRetry || null;
    };
    return WorkflowType;
}());
exports.WorkflowType = WorkflowType;
//# sourceMappingURL=WorkflowType.js.map