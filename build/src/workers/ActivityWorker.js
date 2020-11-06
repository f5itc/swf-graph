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
var _ = require("lodash");
var workers_1 = require("simple-swf/build/src/workers");
var Logger_1 = require("../lib/Logger");
var util_1 = require("../util");
var ActivityWorker = (function (_super) {
    __extends(ActivityWorker, _super);
    function ActivityWorker(workflow, config, opts) {
        var _this = _super.call(this, workflow, opts) || this;
        _this.FTLConfig = config;
        _this.workerName = 'activityWorker';
        _this.logger = config.logger;
        _this.on('startTask', _this.onStartTask.bind(_this));
        _this.on('finished', _this.onFinishedTask.bind(_this));
        _this.on('warn', _this.onWarn.bind(_this));
        _this.on('poll', _this.onPoll.bind(_this));
        _this.activityTimers = {};
        return _this;
    }
    ActivityWorker.prototype.start = function (cb) {
        var _this = this;
        _super.prototype.start.call(this, function (err, registeredActivities) {
            if (err) {
                return cb(err);
            }
            registeredActivities = registeredActivities || [];
            registeredActivities.forEach(function (actCreated) {
                _this.logInfo("activity " + actCreated.activity.name + " " + (actCreated.created ? 'was created' : 'already exists'));
            });
            _this.logInfo('started activity worker');
            cb();
        });
    };
    ActivityWorker.prototype.stop = function (cb) {
        var _this = this;
        var curActivityNames = Object.keys(this.activeActivities);
        var cbCalled = false;
        var waitTimeout = setTimeout(function () {
            if (cbCalled) {
                return;
            }
            cbCalled = true;
            cb(new Error('running activities did not stop in time, some activities may have left invalid state'));
        }, 1000 * 30);
        this.logInfo("requesting " + curActivityNames.length + " stop, will wait 30 seconds", { running: curActivityNames });
        _super.prototype.stop.call(this, function (err) {
            if (cbCalled) {
                return;
            }
            cbCalled = true;
            clearTimeout(waitTimeout);
            if (!err) {
                _this.logInfo('successfully stopped activity worker');
            }
            cb(err);
        });
    };
    ActivityWorker.prototype.onStartTask = function (task, execution) {
        this.activityTimers[task.id] = new Date();
        this.FTLConfig.metricReporter.increment('activity.running');
        this.FTLConfig.metricReporter.increment("activity.byHandler." + task.activityName() + ".running");
        var taskInfo = { task: { type: task.activityName(), id: execution.id } };
        this.logInfo('received activity task', taskInfo);
        execution.on('completed', this.onTaskCompleted.bind(this, task, execution));
        execution.on('failed', this.onTaskFailed.bind(this, task, execution));
        execution.on('canceled', this.onTaskCanceled.bind(this, task, execution));
        execution.on('error', this.onTaskError.bind(this, task, execution));
        execution.on('heartbeat', this.onTaskHeartbeat.bind(this, task, execution));
        execution.on('heartbeatComplete', this.onTaskHBComplete.bind(this, task, execution));
        this.FTLConfig.notifier.sendInfo('taskStarted', {
            task: taskInfo.task,
            workflow: task.getWorkflowInfo(),
            originWorkflow: task.getOriginWorkflow()
        });
    };
    ActivityWorker.prototype.onFinishedTask = function (task, execution, success, details) {
      this.logInfo('entered onFinishedTask');
        var startTime = this.activityTimers[task.id];
        var taskInfo = { type: task.activityName(), id: execution.id };

      this.logInfo('onFinishedTask taskInfo', { startTime, taskInfo });

        this.FTLConfig.metricReporter.timing('activity.timer', startTime);
        this.FTLConfig.metricReporter.timing("activity.byHandler." + task.activityName() + ".timer", startTime);
        this.FTLConfig.metricReporter.decrement('activity.running');
        this.FTLConfig.metricReporter.decrement("activity.byHandler." + task.activityName() + ".running");
        delete this.activityTimers[task.id];
        this.logInfo('responded to activity task', {
            task: taskInfo,
            success: success
        });
        this.logDebug('finished task details', {
            task: taskInfo,
            success: success,
            details: details
        });
        this.emit('activityCompleted', task, execution, details);
    };
    ActivityWorker.prototype.onWarn = function (err) {
        this.logWarn('received non-critical error, continuing', { err: err });
    };
    ActivityWorker.prototype.onPoll = function () {
        this.FTLConfig.metricReporter.increment('activity.pollCompleted');
        this.logInfo('polling for tasks...');
    };
    ActivityWorker.prototype.onTaskCompleted = function (task, execution, details) {
        var taskInfo = { type: task.activityName(), id: execution.id };
        this.FTLConfig.metricReporter.increment('activity.completed');
        this.FTLConfig.metricReporter.increment("activity.byHandler." + task.activityName() + ".completed");

        this.FTLConfig.notifier.sendInfo('taskFinished', {
            task: taskInfo,
            workflow: task.getWorkflowInfo(),
            originWorkflow: task.getOriginWorkflow(),
            details: details
        });

        this.logInfo('emitting taskFinished from onTaskCompleted', {
            task: taskInfo,
            workflow: task.getWorkflowInfo(),
            originWorkflow: task.getOriginWorkflow(),
            details: details
        });

        this.logInfo('task completed', this.buildTaskMeta(task, { details: details }));
    };
    ActivityWorker.prototype.onTaskFailed = function (task, execution, err, details) {
        var taskInfo = { type: task.activityName(), id: execution.id };
        this.FTLConfig.metricReporter.increment('activity.failed');
        this.FTLConfig.metricReporter.increment("activity.byHandler." + task.activityName() + ".failed");
        this.FTLConfig.notifier.sendWarn('taskFailed', {
            task: taskInfo,
            workflow: task.getWorkflowInfo(),
            originWorkflow: task.getOriginWorkflow(),
            details: details,
            err: err
        });
        this.logInfo('task failed', this.buildTaskMeta(task, {
            err: err,
            details: details
        }));
    };
    ActivityWorker.prototype.onTaskCanceled = function (task, execution, reason) {
        var taskInfo = { type: task.activityName(), id: execution.id };
        this.FTLConfig.metricReporter.increment('activity.canceled');
        this.FTLConfig.metricReporter.increment("activity.byHandler." + task.activityName() + ".canceled");
        delete this.activityTimers[task.id];
        this.FTLConfig.notifier.sendWarn('taskCanceled', {
            task: taskInfo,
            workflow: task.getWorkflowInfo(),
            originWorkflow: task.getOriginWorkflow(),
            reason: reason
        });
        this.logInfo('task canceled', this.buildTaskMeta(task, { reason: reason }));
    };
    ActivityWorker.prototype.onTaskError = function (task, execution, err) {
        var taskInfo = { type: task.activityName(), id: execution.id };
        this.logInfo('unexpected task error', this.buildTaskMeta(task, { err: err }));
        this.FTLConfig.notifier.sendError('taskError', {
            task: taskInfo,
            workflow: task.getWorkflowInfo(),
            originWorkflow: task.getOriginWorkflow(),
            err: err
        });
        this.emit('error', err, execution);
    };
    ActivityWorker.prototype.onTaskHeartbeat = function (task, execution, status) {
        var taskInfo = { type: task.activityName(), id: execution.id };
        this.FTLConfig.notifier.sendInfo('taskHeartbeat', {
            task: taskInfo,
            workflow: task.getWorkflowInfo(),
            originWorkflow: task.getOriginWorkflow(),
            status: status
        });
        this.logInfo('task heartbeat status', this.buildTaskMeta(task, { status: status }));
    };
    ActivityWorker.prototype.onTaskHBComplete = function (task, execution) {
        this.logDebug('task heartbeat finished', this.buildTaskMeta(task));
    };
    ActivityWorker.prototype.buildTaskMeta = function (task, meta) {
        var taskMeta = {
            task: { type: task.activityName(), id: task.id },
            workflow: task.getWorkflowInfo()
        };
        return _.defaults(taskMeta || {}, meta || {});
    };
    return ActivityWorker;
}(workers_1.ActivityWorker));
exports.ActivityWorker = ActivityWorker;
util_1.applyMixins(ActivityWorker, [Logger_1.LogWorkerMixin]);
//# sourceMappingURL=ActivityWorker.js.map
