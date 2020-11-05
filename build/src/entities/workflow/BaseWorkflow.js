"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Joi = require("joi");
// FTL workflow wrapper object
// 1. Uses provided props from provided FTLWorkflowDef object
// 2. validateTask is generic joi check using provided schema
var BaseWorkflow = (function () {
    function BaseWorkflow(config, workflowDef) {
        this.version = workflowDef.version;
        this.schema = workflowDef.schema;
        this.maxRetry = workflowDef.maxRetry;
        this.decider = workflowDef.decider;
        this.output = workflowDef.output;
        this.name = workflowDef.name;
        this.config = config;
    }
    BaseWorkflow.prototype.decider = function (args) { };
    ;
    BaseWorkflow.prototype.output = function (results) { return results; };
    ;
    BaseWorkflow.prototype.validateTask = function (args) {
        var error = Joi.validate(args, this.schema).error;
        return "Error validating workflow: " + error;
    };
    BaseWorkflow.prototype.getHandlerName = function () {
        return this.name;
    };
    return BaseWorkflow;
}());
exports.BaseWorkflow = BaseWorkflow;
//# sourceMappingURL=BaseWorkflow.js.map