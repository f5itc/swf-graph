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
var BaseDecider = (function (_super) {
    __extends(BaseDecider, _super);
    function BaseDecider(config, workflow) {
        var _this = _super.call(this, workflow) || this;
        _this.FTLConfig = config;
        _this.activities = config.activities;
        _this.logger = config.logger;
        return _this;
    }
    BaseDecider.prototype.makeDecisions = function (task, cb) {
        throw new Error('must implement');
    };
    BaseDecider.validateTask = function (parameters) {
        throw new Error('validateTask must be overriden');
    };
    BaseDecider.getChildren = function (paramenters) {
        throw new Error('getChildren must be overriden');
    };
    // we return an empty string here as we need the method, but we want to try our default implentation
    BaseDecider.getHandlerName = function () {
        return '';
    };
    return BaseDecider;
}(entities_1.Decider));
exports.BaseDecider = BaseDecider;
//# sourceMappingURL=BaseDecider.js.map