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
var events_1 = require("events");
var SDC = require("statsd-client");
var StatsDMetricReporter = (function (_super) {
    __extends(StatsDMetricReporter, _super);
    function StatsDMetricReporter(config) {
        var _this = _super.call(this) || this;
        _this.config = config;
        _this.client = config.statsdClient || new SDC(config);
        return _this;
    }
    StatsDMetricReporter.prototype.increment = function (name, count, meta) {
        this.client.increment(name, count);
    };
    StatsDMetricReporter.prototype.decrement = function (name, count, meta) {
        this.client.decrement(name, count);
    };
    StatsDMetricReporter.prototype.counter = function (name, count, meta) {
        this.client.counter(name, count);
    };
    StatsDMetricReporter.prototype.gauge = function (name, value, meta) {
        this.client.gauge(name, value);
    };
    StatsDMetricReporter.prototype.gaugeDelta = function (name, delta, meta) {
        this.client.gaugeDelta(name, delta);
    };
    StatsDMetricReporter.prototype.set = function (name, value, meta) {
        this.client.set(name, value);
    };
    StatsDMetricReporter.prototype.timing = function (name, value, meta) {
        if (typeof value === 'number') {
            this.client.timing(name, value);
        }
        else {
            this.client.timing(name, value);
        }
    };
    return StatsDMetricReporter;
}(events_1.EventEmitter));
exports.StatsDMetricReporter = StatsDMetricReporter;
//# sourceMappingURL=MetricReporter.js.map