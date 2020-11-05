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
var path = require("path");
var Joi = require("joi");
var Registry_1 = require("../Registry");
var WorkflowType_1 = require("./WorkflowType");
var BaseWorkflow_1 = require("./BaseWorkflow");
var workflowSchema = Joi.object({
    decider: Joi.func().maxArity(1).required(),
    output: Joi.func().maxArity(1).required(),
    schema: Joi.object().required(),
    version: Joi.string().min(3).required(),
    name: Joi.string()
}).unknown(true).required();
var WorkflowRegistry = (function (_super) {
    __extends(WorkflowRegistry, _super);
    function WorkflowRegistry() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    WorkflowRegistry.prototype.wrapModule = function (filename, workflowDefObj) {
        if (workflowDefObj.default) {
            workflowDefObj = workflowDefObj.default;
        }
        var name = path.basename(filename, path.extname(filename));
        if (!name) {
            throw new Error('missing workflow name');
        }
        workflowDefObj.name = name;
        // Ensure the provided object has the correct shape
        var error = Joi.validate(workflowDefObj, workflowSchema).error;
        if (error) {
            throw new Error("Error validating " + name + " workflow: " + error);
        }
        var handler;
        // Create BaseWorkflow object with validateTask method that uses schema
        handler = new BaseWorkflow_1.BaseWorkflow(this.config, workflowDefObj);
        if (!handler.validateTask) {
            throw new Error("workflow object for " + name + " does not have a validateTask function");
        }
        return new WorkflowType_1.WorkflowType(handler, this.config);
    };
    return WorkflowRegistry;
}(Registry_1.Registry));
exports.WorkflowRegistry = WorkflowRegistry;
//# sourceMappingURL=WorkflowRegistry.js.map