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
var DeciderWorker = (function (_super) {
    __extends(DeciderWorker, _super);
    function DeciderWorker(decider, config, opts) {
        var _this = _super.call(this, decider, opts) || this;
        _this.FTLConfig = config;
        _this.workerName = 'deciderWorker';
        _this.logger = config.logger;
        _this.on('decision', _this.onDecision.bind(_this));
        _this.on('madeDecision', _this.onDecisionMade.bind(_this));
        _this.on('poll', _this.onPoll.bind(_this));
        _this.decisionTimers = {};
        return _this;
    }
    DeciderWorker.prototype.onDecision = function (task) {
        this.decisionTimers[task.id] = new Date();
        this.FTLConfig.metricReporter.increment('decider.running');
        this.logInfo('received decision task', this.buildTaskMeta(task));
        this.logDebug('decision task', this.buildTaskMeta(task, { rawTask: task.rawTask }));
    };
    DeciderWorker.prototype.onDecisionMade = function (task) {
        var finishTime = this.decisionTimers[task.id];
        delete this.decisionTimers[task.id];
        this.FTLConfig.metricReporter.decrement('decider.running');
        this.FTLConfig.metricReporter.increment('decider.completed');
        this.FTLConfig.metricReporter.timing('decider.timer', finishTime);
        this.logInfo('responded to decision task', this.buildTaskMeta(task, { results: task.getDecisionInfo() }));
        var failedWorkflows = task.decisions.filter(function (d) { return d.decision.decisionType === 'FailWorkflowExecution'; });
        // there should only really be one failedWorkflow
        if (failedWorkflows.length) {
            var wf = failedWorkflows[0];
            this.FTLConfig.notifier.sendError('workflowFailed', {
                workflow: task.getWorkflowInfo(),
                parentWf: task.getParentWorkflowInfo(),
                originWorkflow: task.getOriginWorkflow(),
                details: wf.decision.failWorkflowExecutionDecisionAttributes.details,
                reason: wf.decision.failWorkflowExecutionDecisionAttributes.reason
            });
        }
        this.emit('decisionCompleted', task.decisions.map(function (d) { return d.decision; }));
    };
    DeciderWorker.prototype.onPoll = function () {
        this.FTLConfig.metricReporter.increment('decider.pollCompleted');
        this.logInfo('polling for tasks...');
    };
    DeciderWorker.prototype.start = function (cb) {
        var _this = this;
        _super.prototype.start.call(this, function (err) {
            if (err) {
                return cb(err);
            }
            _this.logInfo('stated decider worker');
            cb();
        });
    };
    DeciderWorker.prototype.buildTaskMeta = function (task, meta) {
        var wfMeta = task.getWorkflowInfo();
        var parentWf = task.getParentWorkflowInfo();
        if (parentWf) {
            wfMeta.parentWorkflowId = parentWf.workflowId;
        }
        var taskMeta = {
            task: { type: 'taskGraph', id: task.id },
            workflow: wfMeta
        };
        return _.defaults(taskMeta || {}, meta || {});
    };
    return DeciderWorker;
}(workers_1.DeciderWorker));
exports.DeciderWorker = DeciderWorker;
util_1.applyMixins(DeciderWorker, [Logger_1.LogWorkerMixin]);
//# sourceMappingURL=DeciderWorker.js.map