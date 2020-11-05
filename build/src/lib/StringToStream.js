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
var stream_1 = require("stream");
var StringToStream = (function (_super) {
    __extends(StringToStream, _super);
    function StringToStream(str) {
        var _this = _super.call(this) || this;
        _this.str = str;
        return _this;
    }
    StringToStream.prototype._read = function (size) {
        var _this = this;
        if (!this.ended) {
            process.nextTick(function () {
                _this.push(new Buffer(_this.str));
                _this.push(null);
            });
            this.ended = true;
        }
    };
    return StringToStream;
}(stream_1.Readable));
exports.StringToStream = StringToStream;
//# sourceMappingURL=StringToStream.js.map