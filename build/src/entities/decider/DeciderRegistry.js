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
var Registry_1 = require("../Registry");
var DeciderRegistry = (function (_super) {
    __extends(DeciderRegistry, _super);
    function DeciderRegistry() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    DeciderRegistry.prototype.wrapModule = function (filename, handler) {
        if (handler.default) {
            handler = handler.default;
        }
        if (typeof handler !== 'function') {
            throw new Error("decider module " + filename + " doesn't export single class or default export");
        }
        var name;
        if (handler.getHandlerName && handler.getHandlerName()) {
            name = handler.getHandlerName();
        }
        else {
            handler.getHandlerName = function () {
                return path.basename(filename, path.extname(filename));
            };
            name = handler.getHandlerName();
        }
        if (!name) {
            throw new Error('missing decider name');
        }
        if (!handler.validateTask) {
            throw new Error("decider module " + name + " does not have a static validateTask function");
        }
        if (!handler.getChildren) {
            throw new Error("decider module " + name + " does not implement a static getChildren method");
        }
        if (!handler.prototype.makeDecisions) {
            throw new Error("decider module " + name + " does not implement a makeDecisions method");
        }
        return handler;
    };
    return DeciderRegistry;
}(Registry_1.Registry));
exports.DeciderRegistry = DeciderRegistry;
//# sourceMappingURL=DeciderRegistry.js.map