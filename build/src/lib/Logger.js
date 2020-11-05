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
var bunyan_1 = require("bunyan");
var _ = require("lodash");
function buildDevOpts(level) {
    try {
        var PrettyStream = require('bunyan-prettystream');
        var stream = new PrettyStream();
        stream.pipe(process.stdout);
        return [
            {
                level: level || 'info',
                type: 'raw',
                stream: stream
            }
        ];
    }
    catch (e) {
        console.warn('unable to load prettystream');
        return null;
    }
}
var Logger = (function (_super) {
    __extends(Logger, _super);
    function Logger(loggerOpts) {
        var _this = _super.call(this) || this;
        var name = loggerOpts.name, devMode = loggerOpts.devMode;
        if (devMode) {
            var streams = buildDevOpts(loggerOpts.level);
            var opts = { name: name };
            if (streams) {
                opts.streams = streams;
            }
            _this.logger = bunyan_1.createLogger(opts);
        }
        else {
            _this.logger = bunyan_1.createLogger({ name: name });
        }
        return _this;
    }
    Logger.prototype.debug = function (msg, meta) {
        this.log('debug', msg, meta);
    };
    Logger.prototype.info = function (msg, meta) {
        this.log('info', msg, meta);
    };
    Logger.prototype.warn = function (msg, meta) {
        this.log('warn', msg, meta);
    };
    Logger.prototype.error = function (msg, meta) {
        this.log('error', msg, meta);
    };
    Logger.prototype.fatal = function (msg, meta) {
        this.log('fatal', msg, meta);
    };
    Logger.prototype.log = function (level, msg, meta) {
        if (meta) {
            this.logger[level](meta, msg);
        }
        else {
            this.logger[level](msg);
        }
    };
    return Logger;
}(events_1.EventEmitter));
exports.Logger = Logger;
var LogWorkerMixin = (function () {
    function LogWorkerMixin() {
    }
    LogWorkerMixin.prototype.logDebug = function (msg, meta) {
        this.logMeta('debug', msg, meta);
    };
    LogWorkerMixin.prototype.logInfo = function (msg, meta) {
        this.logMeta('info', msg, meta);
    };
    LogWorkerMixin.prototype.logWarn = function (msg, meta) {
        this.logMeta('warn', msg, meta);
    };
    LogWorkerMixin.prototype.logError = function (msg, err, meta) {
        this.logMeta('error', msg, { error: err });
    };
    LogWorkerMixin.prototype.logMeta = function (level, msg, metaOverrides) {
        var baseMeta = {
            from: this.workerName,
            identity: this.identity,
        };
        var allMeta = _.defaults(metaOverrides || {}, baseMeta);
        this.logger[level](msg, allMeta);
    };
    return LogWorkerMixin;
}());
exports.LogWorkerMixin = LogWorkerMixin;
//# sourceMappingURL=Logger.js.map