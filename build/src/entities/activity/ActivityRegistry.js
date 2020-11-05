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
var bluebird = require("bluebird");
var retry = require("bluebird-retry");
var ActivityType_1 = require("./ActivityType");
var Registry_1 = require("../Registry");
var activitySchema = Joi.object({
    execute: Joi.func().maxArity(1).required(),
    output: Joi.func().maxArity(1).required(),
    schema: Joi.object().required(),
    version: Joi.string().min(3).required(),
    getHandlerName: Joi.func()
}).unknown(true).required();
var ActivityRegistry = (function (_super) {
    __extends(ActivityRegistry, _super);
    function ActivityRegistry() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    ActivityRegistry.prototype.wrapModule = function (filename, activityDefObj) {
        if (activityDefObj.default) {
            activityDefObj = activityDefObj.default;
        }
        var name;
        activityDefObj.getHandlerName = function () {
            return path.basename(filename, path.extname(filename));
        };
        name = activityDefObj.getHandlerName();
        if (!name) {
            throw new Error('missing activity name');
        }
        // Ensure the provided object has the correct shape
        var error = Joi.validate(activityDefObj, activitySchema).error;
        if (error) {
            throw new Error("Error validating " + name + " activity: " + error);
        }
        var FTLWrapper = (function () {
            function FTLWrapper(config) {
                this.logger = config.logger;
            }
            ;
            FTLWrapper.prototype.getSchema = function () { return activityDefObj.schema; };
            ;
            FTLWrapper.getSchema = function () { return activityDefObj.schema; };
            ;
            FTLWrapper.prototype.run = function (params, cb) {
                // Ensure the provided object is correct shape (may default some props)
                var _a = Joi.validate(params, activityDefObj.schema), error = _a.error, value = _a.value;
                if (error) {
                    this.logger.fatal("Error on activity worker: " + name + " params: ", {
                        error: error, params: params
                    });
                    cb(new Error("Error validating " + name + " params : " + error));
                }
                var attemptNumber = 1;
                function executeOnce(value) {
                    var _this = this;
                    if (attemptNumber > 1) {
                        this.logger.info("Retrying activity: " + name + ", attempt #" + attemptNumber, { activityName: name, attemptNumber: attemptNumber });
                    }
                    attemptNumber += 1;
                    return bluebird.try(function () { return (activityDefObj.execute.bind(_this)(value)); });
                }
                ;
                // Ensure retryable errors retry execute method until they succeed
                return retry(executeOnce, {
                    interval: 1000,
                    backoff: 2,
                    max_interval: 5 * (60 * 1000),
                    max_tries: 100,
                    predicate: function (err) { return err.retryable === true || err.statusCode >= 500; },
                    throw_original: true,
                    context: this,
                    args: [value]
                }).bind(this).then(function (results) {
                    var _this = this;
                    return bluebird.try(function () { return (activityDefObj.output.bind(_this)(results)); })
                        .then(function (res) {
                        cb(null, res.status, res.env);
                    });
                }).catch(function (e) {
                    return cb(e);
                });
            };
            ;
            FTLWrapper.prototype.status = function () { return activityDefObj.status ? activityDefObj.status() : ''; };
            ;
            FTLWrapper.prototype.stop = function () { return activityDefObj.stop ? activityDefObj.stop() : function () { }; };
            ;
            FTLWrapper.getHandlerName = function () { return activityDefObj.getHandlerName(); };
            ;
            FTLWrapper.validateTask = function (parameters) {
                return '';
            };
            return FTLWrapper;
        }());
        return new ActivityType_1.ActivityType(FTLWrapper, filename, this.config);
    };
    return ActivityRegistry;
}(Registry_1.Registry));
exports.ActivityRegistry = ActivityRegistry;
//# sourceMappingURL=ActivityRegistry.js.map