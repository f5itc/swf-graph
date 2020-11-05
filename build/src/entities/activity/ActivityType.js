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
var BaseActivity_1 = require("./BaseActivity");
var ActivityType = (function (_super) {
    __extends(ActivityType, _super);
    function ActivityType(HandlerClass, loadLocation, config) {
        var _this = this;
        var version = HandlerClass.version || config.defaultVersion;
        var maxRetry = HandlerClass.maxRetry || config.getOpt('maxRetry');
        _this = _super.call(this, HandlerClass.getHandlerName(), version, BaseActivity_1.BaseActivity, { maxRetry: maxRetry }) || this;
        _this.ActivityHandler = HandlerClass;
        _this.loadLocation = loadLocation;
        _this.config = config;
        return _this;
    }
    ActivityType.prototype.createExecution = function (workflow, task) {
        return new BaseActivity_1.BaseActivity(this.config, this.ActivityHandler, workflow, this, task);
    };
    ActivityType.prototype.getHandlerName = function () {
        return this.ActivityHandler.getHandlerName();
    };
    ActivityType.prototype.getSchema = function () {
        return this.ActivityHandler.getSchema();
    };
    ActivityType.prototype.validateTask = function (parameters) {
        return this.ActivityHandler.validateTask(parameters);
    };
    ActivityType.prototype.getMaxConcurrent = function () {
        return this.ActivityHandler.maxConcurrent || null;
    };
    ActivityType.prototype.getMaxRetry = function () {
        return this.ActivityHandler.maxRetry || null;
    };
    return ActivityType;
}(entities_1.ActivityType));
exports.ActivityType = ActivityType;
//# sourceMappingURL=ActivityType.js.map