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
var chai_1 = require("chai");
var DeciderWorker_1 = require("../../src/workers/DeciderWorker");
var sinonHelper_1 = require("../sinonHelper");
var Config_1 = require("../../src/Config");
var lib_1 = require("../../src/lib");
var tasks_1 = require("simple-swf/build/src/tasks");
describe('DeciderWorker', function () {
    describe('onDecisionMade', function () {
        var sandbox = sinonHelper_1.default();
        var decider = { workflow: {} };
        var config = sandbox.stubClass(Config_1.Config);
        config.logger = sandbox.stubClass(lib_1.Logger);
        config.metricReporter = sandbox.stubClass(lib_1.StatsDMetricReporter);
        it('should be triggered when a "madeDecision" event happens', function (done) {
            var OnMadeOverride = (function (_super) {
                __extends(OnMadeOverride, _super);
                function OnMadeOverride() {
                    return _super !== null && _super.apply(this, arguments) || this;
                }
                OnMadeOverride.prototype.onDecisionMade = function (task) {
                    done();
                };
                return OnMadeOverride;
            }(DeciderWorker_1.DeciderWorker));
            var worker = new OnMadeOverride(decider, config, {});
            worker.emit('madeDecision');
        });
        it('should alert if their are any failed workflow decisions', function (done) {
            var worker = new DeciderWorker_1.DeciderWorker(decider, config, {});
            var task = sandbox.stubClass(tasks_1.DecisionTask);
            task.getWorkflowInfo = function () {
                return { workflowId: 'decTask', runId: 'fake' };
            };
            task.decisions = [
                {
                    entities: ['workflow'],
                    overrides: {},
                    decision: {
                        decisionType: 'FailWorkflowExecution',
                        failWorkflowExecutionDecisionAttributes: {
                            reason: 'fake',
                            details: 'stuff'
                        }
                    }
                }
            ];
            config.notifier = {
                sendError: function (msg, event) {
                    chai_1.assert.equal(msg, 'workflowFailed');
                    chai_1.assert.deepEqual(event.workflow, {
                        workflowId: 'decTask',
                        runId: 'fake'
                    });
                    done();
                }
            };
            worker.onDecisionMade(task);
        });
    });
});
//# sourceMappingURL=DeciderWorkerTest.js.map