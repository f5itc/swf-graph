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
var entities_1 = require("simple-swf/build/src/entities");
var _ = require("lodash");
var Joi = require("joi");
var entities_2 = require("../entities");
var processEvents_1 = require("simple-swf/build/src/tasks/processEvents");
exports.pendingStates = [
    processEvents_1.states.SCH,
    processEvents_1.states.ST,
    processEvents_1.states.TC,
    processEvents_1.states.CAL
];
exports.revertableStates = [
    processEvents_1.states.FA,
    processEvents_1.states.CO,
    processEvents_1.states.TO,
    processEvents_1.states.TE,
    processEvents_1.states.CF
];
function isTaskGraphGraphNode(node) {
    return node.type === 'decision' && node.handler === 'taskGraph';
}
function isTaskGraphMarkerNode(node) {
    return node.type === 'decision' && node.handler === 'recordMarker';
}
var TaskGraph = (function (_super) {
    __extends(TaskGraph, _super);
    function TaskGraph(config, workflow) {
        var _this = _super.call(this, config, workflow) || this;
        _this.maxRunningWorkflow = config.getOpt('maxRunningWorkflow');
        if (!_this.maxRunningWorkflow) {
            throw new Error('missing maxRunningWorkflow');
        }
        return _this;
    }
    TaskGraph.prototype.getInitialWorkflowEnv = function (workflowInfo, cb) {
        var thisWorkflow = new entities_1.WorkflowExecution(this.workflow, workflowInfo);
        if (workflowInfo === null) {
            return cb(null, null);
        }
        thisWorkflow.getWorkflowExecutionHistory({}, function (err, res) {
            if (err) {
                return cb(err);
            }
            if (res && res.wfInput && res.wfInput.env) {
                return cb(null, res.wfInput.env || {});
            }
        });
    };
    TaskGraph.prototype.makeDecisions = function (task, cb) {
        var graphInput = task.getWorkflowInput();
        var taskInput = task.getWorkflowTaskInput();
        var initialParentEnv = taskInput.initialEnv;
        if (graphInput.handler !== 'taskGraph') {
            return cb(new Error('invalid handler for taskGraph'));
        }
        var workflow = graphInput.workflow;
        var isWorkflowTask = workflow ? true : false;
        var workflowType;
        var workflowDetails, parentWorkflowDetails;
        if (isWorkflowTask) {
            var workflowName = workflow.name;
            // 1. Validate current workflow target exists
            // 2. If a parent wo`rkflow exists, find this key in parent workflow and run input from it on env
            workflowType = this.FTLConfig.workflows.getModule(workflowName);
            if (!workflowType) {
                return cb(new Error('missing workflow type ' + workflowName));
            }
            if (graphInput.parentWorkflow) {
                // Used for output methods
                var parentWorkflowName = graphInput.parentWorkflow.name;
                var parentWorkflowTaskKey = graphInput.parentWorkflow.taskKey;
                var parentWorkflowType = this.FTLConfig.workflows.getModule(parentWorkflowName);
                if (!parentWorkflowType) {
                    return cb(new Error('missing parent workflow type: ' + parentWorkflowName
                        + ' - while processing workflow: ' + workflowName));
                }
                // Validate that the parent workflow has a task at the expected key
                // We need this later to find the output() if defined.
                var parentWorkflowHandler = parentWorkflowType.getHandler();
                var parentWFtaskObjects = parentWorkflowHandler.decider(initialParentEnv);
                var taskDefObj = parentWFtaskObjects[parentWorkflowTaskKey];
                parentWorkflowDetails = {
                    name: parentWorkflowName,
                    workflowType: parentWorkflowType,
                    taskKey: parentWorkflowTaskKey,
                    taskDefObj: taskDefObj,
                };
                if (!taskDefObj) {
                    this.logger.fatal('ERROR:', 'could not find task ' + parentWorkflowTaskKey + ' in parent workflow ' + parentWorkflowName);
                    return cb(new Error('could not find task ' + parentWorkflowTaskKey + ' in parent workflow ' + parentWorkflowName));
                }
            }
            var initialEnv = task.getWorkflowTaskInput().env || {};
            var deciderEnv = initialParentEnv ? initialParentEnv : initialEnv;
            workflowDetails = {
                name: workflowName,
                workflowType: workflowType,
                tasks: workflowType.getHandler().decider(deciderEnv),
                initialEnv: initialEnv
            };
        }
        var parameters = graphInput.parameters;
        this.decide(parameters, task, workflowDetails, parentWorkflowDetails, cb);
    };
    TaskGraph.prototype.decide = function (parameters, decisionTask, workflowDetails, parentWorkflowDetails, cb) {
        var _this = this;
        var graph = parameters.graph;
        var groupedEvents = decisionTask.getGroupedEvents();
        var decisionTaskEnv = decisionTask.getEnv();
        var delayDecisions = false;
        var next = this.getNextNodes(graph, groupedEvents);
        var startCountByHandler = {};
        var startCountSubWorkflows = 0;
        // Pre validate all next node inputs against their schema if present
        if (workflowDetails) {
            for (var _i = 0, _a = next.nodes; _i < _a.length; _i++) {
                var node = _a[_i];
                var currentNodeTaskDefObj = workflowDetails.tasks[node.name];
                var currPath = node.currentPath.join('->');
                if (currentNodeTaskDefObj) {
                    var error = this.validateNodeInput(currentNodeTaskDefObj, decisionTaskEnv, node, currPath);
                    if (error) {
                        if (cb) {
                            return cb(new Error("Error in " + currPath + " validating params: " + error.message));
                        }
                        else {
                            throw new Error("Error in " + currPath + " validating params: " + error.message);
                        }
                    }
                }
            }
        }
        for (var _b = 0, _c = next.nodes; _b < _c.length; _b++) {
            var node = _c[_b];
            var inputEnv = node._inputEnv || decisionTaskEnv;
            if (node._inputEnv && workflowDetails) {
                this.logger.info(node.currentPath.join('->'), {
                    workflowEnv: decisionTaskEnv,
                    postInputEnv: node._inputEnv
                });
            }
            if (node.type === 'decision') {
                // TODO: somehow hand off to a child? need to make this more generic but just hard code for now...
                if (node.handler === 'taskGraph') {
                    var tgNode = node;
                    var shouldThrottle = this.throttleWorkflows(tgNode, graph, groupedEvents, startCountSubWorkflows);
                    if (!shouldThrottle) {
                        startCountSubWorkflows++;
                        var maxRetry = tgNode.maxRetry || this.FTLConfig.getOpt('maxRetry');
                        decisionTask.startChildWorkflow(tgNode.id, tgNode, { maxRetry: maxRetry }, inputEnv, (workflowDetails && workflowDetails.initialEnv) || null);
                    }
                }
                else if (node.handler === 'recordMarker') {
                    decisionTask.addMarker(node.id, node.parameters.status);
                }
                else {
                    this.logger.warn('couldn\'t find hander for child node: ' + JSON.stringify(node));
                }
            }
            else {
                var shouldThrottle = this.throttle(node, graph, groupedEvents, startCountByHandler);
                if (!shouldThrottle) {
                    startCountByHandler[node.handler] = startCountByHandler[node.handler] || 0;
                    startCountByHandler[node.handler]++;
                    this.scheduleActivityTask(node, decisionTask, inputEnv, (workflowDetails || {})['initialEnv'] || null);
                }
            }
        }
        var failedToReFail = decisionTask.rescheduleFailedEvents();
        var failedToReTimeOut = decisionTask.rescheduleTimedOutEvents();
        var failedToReschedule = failedToReFail.concat(failedToReTimeOut);
        var retryableFailedSchedules = decisionTask.getRetryableFailedToScheduleEvents();
        if (failedToReschedule.length > 0) {
            this.logger.warn('failed to reschedule previously failed event(s)');
            // TODO: 1. If events have failed to be rescheduled, add a revert marker
            // TODO: 2. If there are no longer any pending events, build a list of those
            // TODO:    and schedule revert activities
            // TODO: 3. If all revert activities have completed, fail workflow execution
            // TODO: 4. If revert activities also fail, fail workflow execution
            if (groupedEvents && groupedEvents.marker && groupedEvents.marker['TaskFailed']) {
                // TODO: Handle taskFailed logic
                // this.logger.info('DETECTED TASKFAILED ON: ' + failedToReschedule[0] + ' Processing revert, then failing workflow.');
                // decisionTask.failWorkflow('failed to reschedule previously failed events', JSON.stringify(failedToReschedule).slice(0, 250));
            }
            else {
                // TODO: If no pending tasks, schedule revert for those that failed.
                // TODO: Otherwise only add marker.
                // decisionTask.addMarker('TaskFailed', {});
                // this.logger.info('Final event list is:', groupedEvents);
                decisionTask.failWorkflow('failed to reschedule previously failed events', JSON.stringify(failedToReschedule).slice(0, 250));
            }
        }
        else if (retryableFailedSchedules && workflowDetails) {
            var activity = retryableFailedSchedules.activity, workflow = retryableFailedSchedules.workflow;
            delayDecisions = true;
            // Attempt to schedule activities for any that failed to be scheduled
            activity.map(function (event) {
                var activityId = event.failedToSchedule.scheduleActivityTaskFailedEventAttributes.activityId;
                var graphNode = graph.nodes[activityId];
                var currentNodeTaskDefObj = workflowDetails.tasks[graphNode.name];
                var currPath = graphNode.currentPath.join('->');
                var error = _this.validateNodeInput(currentNodeTaskDefObj, decisionTaskEnv, graphNode, currPath);
                if (error) {
                    if (cb) {
                        return cb(new Error("Error in " + currPath + " validating params: " + error.message));
                    }
                    else {
                        throw new Error("Error in " + currPath + " validating params: " + error.message);
                    }
                }
                var inputEnv = graphNode._inputEnv || decisionTaskEnv;
                _this.scheduleActivityTask(graphNode, decisionTask, inputEnv, (workflowDetails || {})['initialEnv'] || null);
            });
            // Attempt to schedule workflows for any that failed to be scheduled
            workflow.map(function (event) {
                var workflowId = event.failedToSchedule.startChildWorkflowExecutionFailedEventAttributes.workflowId;
                var graphNode = graph.nodes[workflowId];
                var currentNodeTaskDefObj = workflowDetails.tasks[graphNode.name];
                var currPath = graphNode.currentPath.join('->');
                var error = _this.validateNodeInput(currentNodeTaskDefObj, decisionTaskEnv, graphNode, currPath);
                if (error) {
                    if (cb) {
                        return cb(new Error("Error in " + currPath + " validating params: " + error.message));
                    }
                    else {
                        throw new Error("Error in " + currPath + " validating params: " + error.message);
                    }
                }
                var inputEnv = graphNode._inputEnv || decisionTaskEnv;
                var maxRetry = graphNode.maxRetry || _this.FTLConfig.getOpt('maxRetry');
                decisionTask.startChildWorkflow(graphNode.id, graphNode, { maxRetry: maxRetry }, inputEnv, workflowDetails.initialEnv);
            });
        }
        else if (next.finished) {
            // TODO: better results
            var outputEnv = _.clone(decisionTaskEnv);
            // If there is an output func defined on the parent workflow use it to filter env
            if (workflowDetails && workflowDetails.workflowType) {
                var workflowHandler = workflowDetails.workflowType.getHandler();
                // First transform using this workflow's output handler
                // clone just in case user-provided output() mutates input
                if (workflowHandler && workflowHandler.output) {
                    var postOutputEnv = workflowHandler.output(outputEnv).env;
                    this.logger.info(workflowDetails.name + ' Running output filter from local workflow', {
                        preOutput: outputEnv,
                        output: postOutputEnv
                    });
                    outputEnv = postOutputEnv;
                }
                // Then, if this was a sub-workflow, transform using the parent workflow
                // task entry for this child workflow execution
                if (parentWorkflowDetails && parentWorkflowDetails.taskDefObj.output) {
                    var postOutputEnv = parentWorkflowDetails.taskDefObj.output(outputEnv).env;
                    this.logger.info(workflowDetails.name + ' Running output filter from parent workflow', {
                        preOutput: outputEnv,
                        output: postOutputEnv
                    });
                    outputEnv = postOutputEnv;
                }
            }
            // this.logger.info('Final event list is:', groupedEvents);
            decisionTask.completeWorkflow({ status: 'success' }, {}, outputEnv);
        }
        if (cb) {
            if (delayDecisions) {
                var options = { min: 1000, max: 10000 };
                var jitteredDelay = Math.min(options.max, Math.round(Math.random() * (Math.pow(2, 2) * 1000 - options.min) + options.min));
                this.logger.info("Waiting " + jitteredDelay + "ms to return decisions due to throttling");
                setTimeout(cb, jitteredDelay);
            }
            else {
                return cb();
            }
        }
    };
    TaskGraph.prototype.scheduleActivityTask = function (node, decisionTask, inputEnv, initialEnv) {
        var handlerActType = this.activities.getModule(node.handler);
        if (!handlerActType) {
            throw new Error('missing activity type ' + node.handler);
        }
        var opts = this.buildOpts(node);
        opts['maxRetry'] = node.maxRetry || handlerActType.getMaxRetry() || this.FTLConfig.getOpt('maxRetry');
        decisionTask.scheduleTask(node.id, node, handlerActType, opts, inputEnv, initialEnv);
    };
    TaskGraph.prototype.validateNodeInput = function (currentNodeTaskDefObj, decisionTaskEnv, node, currPath) {
        var inputEnv;
        if (currentNodeTaskDefObj.input) {
            // Clone in case user-provided input method mutates passed env
            inputEnv = currentNodeTaskDefObj.input(_.clone(decisionTaskEnv));
        }
        var _a = this.validateSchema(inputEnv || decisionTaskEnv, node), error = _a.error, value = _a.value;
        node._inputEnv = value;
        if (error) {
            this.logger.fatal("Error in " + currPath + " validating params: ", {
                inputEnv: inputEnv,
                error: error
            });
        }
        return error;
    };
    TaskGraph.prototype.validateSchema = function (inputEnv, node) {
        var targetSchema;
        if (node.type === 'decision' && node.workflow) {
            var workflowType = this.FTLConfig.workflows.getModule(node.workflow.name);
            if (!workflowType) {
                throw new Error('missing workflow type ' + node.handler);
            }
            targetSchema = workflowType.getHandler().schema;
        }
        else {
            var handlerActType = this.activities.getModule(node.handler);
            if (!handlerActType) {
                throw new Error('missing activity type ' + node.handler);
            }
            targetSchema = handlerActType.ActivityHandler.getSchema();
        }
        var _a = Joi.validate(inputEnv, targetSchema), error = _a.error, value = _a.value;
        return { error: error, value: value };
    };
    TaskGraph.prototype.buildOpts = function (node) {
        if (node.opts) {
            var opts = node.opts;
            if (opts.taskList) {
                opts.taskList = {
                    name: opts.taskList
                };
            }
            return opts;
        }
        else {
            return {};
        }
    };
    TaskGraph.prototype.throttle = function (node, graph, groupedEvents, startCountByHandler) {
        var handlerActType = this.activities.getModule(node.handler);
        if (!handlerActType) {
            return false;
        }
        var maxConcurrent = handlerActType.getMaxConcurrent();
        if (maxConcurrent == null) {
            return false;
        }
        if (!groupedEvents.activity) {
            return false;
        }
        var startingCount = startCountByHandler[node.handler] || 0;
        var curRunningOfType = 0;
        for (var nodeId in groupedEvents.activity) {
            var curNode = this.getNodeDetails(graph, groupedEvents, false, nodeId);
            if (curNode.state === 'started' && curNode.node.handler === node.handler) {
                curRunningOfType++;
            }
        }
        if ((curRunningOfType + startingCount) >= maxConcurrent) {
            return true;
        }
        return false;
    };
    TaskGraph.prototype.throttleWorkflows = function (node, graph, groupedEvents, startCountSubWorkflows, maxRunningWorkflow) {
        maxRunningWorkflow = maxRunningWorkflow || this.maxRunningWorkflow;
        var curRunningWorkflows = 0;
        if (!groupedEvents.workflow) {
            return false;
        }
        for (var nodeId in groupedEvents.workflow) {
            var curNode = this.getNodeDetails(graph, groupedEvents, false, nodeId);
            if (curNode.state === 'started') {
                curRunningWorkflows++;
            }
        }
        if ((curRunningWorkflows + startCountSubWorkflows) >= maxRunningWorkflow) {
            return true;
        }
        return false;
    };
    TaskGraph.prototype.getNodeDetails = function (graph, grouped, reverse, name) {
        if (reverse === void 0) { reverse = false; }
        var node = graph.nodes[name];
        var type;
        var state;
        if (isTaskGraphGraphNode(node)) {
            type = 'workflow';
            if (grouped[type] && grouped[type][name + '_revert']) {
                if (_.indexOf(exports.pendingStates, node.id) > -1) {
                    state = 'reverting';
                }
                else {
                    state = grouped[type][name + '_revert'].state;
                }
            }
            else {
                state = (grouped[type] && grouped[type][name]) ? grouped[type][name].current : 'waiting';
            }
        }
        else if (isTaskGraphMarkerNode(node)) {
            type = 'marker';
            state = (grouped[type] && grouped[type][name]) ? grouped[type][name].current : 'collapse';
        }
        else {
            type = node.type || 'activity';
            if (grouped[type] && grouped[type][name + '_revert']) {
                if (_.indexOf(exports.pendingStates, node.id) > -1) {
                    state = 'reverting';
                }
                else {
                    state = grouped[type][name + '_revert'].state;
                }
            }
            else {
                state = (grouped[type] && grouped[type][name]) ? grouped[type][name].current : 'waiting';
            }
        }
        var deps = (reverse === false ? graph.edges[name] : graph.revEdges[name]) || [];
        return { id: node.id, node: node, type: type, deps: deps, state: state };
    };
    TaskGraph.prototype.getNextNodes = function (graph, grouped) {
        var nodeDetails = this.getNodeDetails.bind(this, graph, grouped, false);
        var node = nodeDetails(graph.sinkNode);
        if (node.state === 'completed') {
            return { nodes: [], finished: true };
        }
        var haveLastNode = false;
        var sources = [graph.sinkNode];
        var nodes = {};
        while (sources.length) {
            var next = sources.shift();
            node = nodeDetails(next);
            // if given the collapse state, automatically add
            if (node.state === 'waiting' || node.state === 'collapse') {
                var depNodes = node.deps.map(nodeDetails);
                var notDone = depNodes.filter(function (n) { return n.state !== 'completed' && n.state !== 'collapse'; });
                if (notDone.length === 0) {
                    if (node.id === graph.sinkNode) {
                        haveLastNode = true;
                    }
                    nodes[node.id] = node.node;
                }
            }
            sources.push.apply(sources, node.deps);
        }
        return { nodes: _.values(nodes), finished: haveLastNode };
    };
    TaskGraph.prototype.getLastNodes = function (graph, grouped) {
        var nodeDetails = this.getNodeDetails.bind(this, graph, grouped, true);
        var node = nodeDetails(graph.sourceNode);
        // Nothing's been done!
        if (node.state === 'collapse') {
            return { nodes: [], finished: true };
        }
        var haveLastNode = false;
        var sources = [graph.sourceNode];
        var nodes = {};
        while (sources.length) {
            var next = sources.shift();
            node = nodeDetails(next);
            if (node.state === 'completed') {
                // Deps here are nodes that are dependent on THIS node's completion
                var depNodes = node.deps.map(nodeDetails);
                var revertableDeps = depNodes.filter(function (n) {
                    return _.indexOf(exports.revertableStates, n.state) > -1 && n.state !== 'collapse';
                });
                if (revertableDeps.length === 0) {
                    if (node.id === graph.sourceNode) {
                        haveLastNode = true;
                    }
                    nodes[node.id] = node.node;
                }
            }
            sources.push.apply(sources, node.deps);
        }
        return { nodes: _.values(nodes), finished: haveLastNode };
    };
    TaskGraph.getChildren = function (parameters) {
        return _.values(parameters.graph.nodes);
    };
    TaskGraph.validateTask = function (parameters) {
        if (!parameters.graph) {
            return 'missing "graph" field in parameters';
        }
        var graph = parameters.graph;
        var required = ['nodes', 'edges', 'sourceNode', 'sinkNode'];
        for (var _i = 0, required_1 = required; _i < required_1.length; _i++) {
            var key = required_1[_i];
            if (!graph[key]) {
                return 'missing ' + key + ' field in graph';
            }
        }
        return null;
    };
    TaskGraph.getHandlerName = function () {
        return 'taskGraph';
    };
    return TaskGraph;
}(entities_2.BaseDecider));
exports.default = TaskGraph;
//# sourceMappingURL=TaskGraph.js.map