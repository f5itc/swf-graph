// workflows/createDeployment
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
var Joi = require("joi");
var BaseWorkflow_1 = require("../../src/entities/workflow/BaseWorkflow");
var defaultSchema = Joi.object({
    deployerId: Joi.string().guid().required(),
    name: Joi.string().min(1).required(),
}).required();
var defaultMaxRetry = 525;
var defaultVersion = '1.0';
var CreateDeploymentTaskCreator = (function (_super) {
    __extends(CreateDeploymentTaskCreator, _super);
    function CreateDeploymentTaskCreator(config, options) {
        var _this = this;
        options = options || {};
        if (!options.version) {
            options.version = defaultVersion;
        }
        if (!options.schema) {
            options.schema = defaultSchema;
        }
        if (!options.defaultMaxRetry) {
            options.defaultMaxRetry = defaultMaxRetry;
        }
        _this = _super.call(this, config, options) || this;
        return _this;
    }
    CreateDeploymentTaskCreator.prototype.getTaskGraph = function () {
        return {
            createDeploymentDoc: {
                activity: 'createDeploymentDoc'
            },
            startNewDeployment: {
                dependsOn: ['createDeploymentDoc'],
                input: function (results) { return ({ deployment: results.createDeploymentDoc }); },
                workflow: 'startDeployment',
            },
            setDeploymentDocState: {
                dependsOn: ['startNewDeployment'],
                input: function (results) { return ({ deployment: results.startNewDeployment }); },
                activity: 'setDeploymentDocState',
            },
        };
    };
    CreateDeploymentTaskCreator.prototype.output = function (results) {
        return {
            env: {
                deployment: results.startNewDeployment
            }
        };
    };
    CreateDeploymentTaskCreator.prototype.validateTask = function (parameters) { return null; };
    return CreateDeploymentTaskCreator;
}(BaseWorkflow_1.BaseWorkflow));
exports.default = CreateDeploymentTaskCreator;
//# sourceMappingURL=testWorkflowdef.js.map