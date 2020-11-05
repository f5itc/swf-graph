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
var entities_1 = require("../entities");
// currently, this class only exists for validation! at some point in the future
// when we have pluggable deciders, this should become a real thing
var RecordMarker = (function (_super) {
    __extends(RecordMarker, _super);
    function RecordMarker() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    RecordMarker.prototype.makeDecisions = function (task, cb) {
    };
    RecordMarker.getChildren = function () {
        return [];
    };
    RecordMarker.validateTask = function (parameters) {
        if (!parameters.status) {
            return 'missing "status" field in parameters';
        }
        return null;
    };
    return RecordMarker;
}(entities_1.BaseDecider));
exports.default = RecordMarker;
//# sourceMappingURL=recordMarker.js.map