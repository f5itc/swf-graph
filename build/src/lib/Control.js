"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Joi = require("joi");
var async = require("async");
var Config_1 = require("../Config");
var init_1 = require("../init");
var Control = (function () {
    function Control() {
    }
    Control.prototype.start = function (args, cb) {
        var _this = this;
        this.init(args.config, function (err, entities) {
            if (err) {
                return cb(err);
            }
            _this.startWorkers(args, cb);
        });
    };
    Control.prototype.init = function (configObj, cb) {
        var _this = this;
        var configFunc = (function () { return (configObj); });
        var config = new Config_1.Config(configFunc);
        this.config = config;
        init_1.registration.init(config, function (err, entities) {
            if (err) {
                return cb(err);
            }
            _this.activityWorker = entities.activityWorker;
            _this.deciderWorker = entities.deciderWorker;
            _this.workflow = entities.workflow;
            cb(null, entities);
        });
    };
    Control.prototype.startWorkers = function (args, cb) {
        var _this = this;
        function toStop(worker, name, cb) {
            var _this = this;
            worker.on('error', function (err, execution) {
                var withExecution = execution ? " with execution " + execution.id : '';
                _this.config.logger.fatal("error from " + name + " worker" + withExecution, {
                    err: err,
                    execution: execution
                });
                _this.config.notifier.sendError('workerError', {
                    workerName: name,
                    err: err
                }, function (err) {
                    if (err) {
                        _this.config.logger.fatal('unable to send notifier alert!', { err: err });
                    }
                    return cb(err);
                });
            });
        }
        var workers = {};
        if (args.activity) {
            toStop.call(this, this.activityWorker, 'activity', cb);
            workers['activityWorker'] = this.activityWorker;
        }
        if (args.decider) {
            toStop.call(this, this.deciderWorker, 'decider', cb);
            workers['deciderWorker'] = this.deciderWorker;
        }
        this.startActivityWorker(args.activity, function (err) {
            if (err) {
                return cb(err);
            }
            _this.startDeciderWorker(args.decider, function (err) {
                if (err) {
                    return cb(err);
                }
                _this.config.logger.info('started workers');
            });
        });
        var gotSigint = false;
        process.on('SIGINT', function () {
            if (gotSigint) {
                _this.config.logger.warn('forcefully exiting, some tasks may have left an invalid state');
                return process.exit(1);
            }
            _this.config.logger.info('signalling workers to exit cleanly, ctrl+c again to immediately exit');
            gotSigint = true;
            async.each(Object.keys(workers), function (name, cb) {
                var worker = workers[name];
                worker.stop(function (err) {
                    if (err) {
                        return cb(err);
                    }
                    _this.config.logger.info("stopped " + name + " worker");
                    cb();
                });
            }, cb);
        });
    };
    Control.prototype.registerActivityTypes = function (cb) {
        var _this = this;
        var activities = this.config.activities.getModules();
        async.map(activities, function (act, cb) { return act.ensureActivityType(_this.workflow.domain, cb); }, function (err, results) {
            if (err) {
                return cb(err);
            }
            var withCreated = activities.map(function (act, index) { return ({
                activity: act,
                created: results[index]
            }); });
            cb(null, withCreated);
        });
    };
    Control.prototype.startActivityWorker = function (shouldStart, cb) {
        if (!shouldStart) {
            return cb(null, false);
        }
        if (!this.activityWorker) {
            return cb(new Error('init not called'), false);
        }
        // NOTE: using _start instead of start; avoids re-registering all activities on startup
        this.activityWorker._start();
        this.config.logger.info('started activity worker');
        cb(null, true);
    };
    Control.prototype.startDeciderWorker = function (shouldStart, cb) {
        var _this = this;
        if (!shouldStart) {
            return cb(null, false);
        }
        if (!this.deciderWorker) {
            return cb(new Error('init not called'), false);
        }
        this.deciderWorker.start(function (err) {
            if (err) {
                return cb(err, false);
            }
            _this.config.logger.info('started decider worker');
            cb(null, true);
        });
    };
    Control.prototype.submitWorkflowExecution = function (workflowName, input, SWFOpts, cb) {
        var config = this.config;
        var workflowRegistry = config.workflows;
        var TargetWorkflow = workflowRegistry.getModule(workflowName);
        if (!TargetWorkflow) {
            return cb(new Error('No workflow found in registry for:' + workflowName));
        }
        var workflowSchema = TargetWorkflow.getHandler().schema;
        // Ensure the provided object has the correct shape
        var error = Joi.validate(input, workflowSchema).error;
        if (error) {
            return cb(new Error("Error validating " + workflowName + " workflow params: " + error));
        }
        TargetWorkflow.submit(input, SWFOpts, this.workflow, function (err, info) {
            if (err) {
                return cb(err);
            }
            config.logger.info('Submitted workflow ' + info);
            cb(null, info);
        });
    };
    return Control;
}());
exports.Control = Control;
//# sourceMappingURL=Control.js.map