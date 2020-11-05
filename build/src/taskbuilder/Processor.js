"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var async = require("async");
var shortId = require("shortid");
var _ = require("lodash");
var TaskGraphBuilder_1 = require("./TaskGraphBuilder");
// allow for overriding of some behavior via json
var OPT_FILE_NAME = 'opts.json';
// default to retrying a full workflow only once!
var GRAPH_MAX_RETRY = 1;
var Processor = (function () {
    function Processor(config, workflowDef, parentWorkflow, path, opts) {
        this.workflowDef = workflowDef;
        this.parentWorkflow = parentWorkflow;
        this.config = config;
        this.opts = opts || {};
        var name = this.workflowDef.name;
        this.currentPath = path && path.length ? path.concat(name) : [name];
    }
    Processor.prototype.getWorkflowName = function () {
        return this.workflowDef.name;
    };
    Processor.prototype.process = function (args, graphKey, cb) {
        if (typeof args === 'function') {
            cb = args;
            args = {};
        }
        this.processWorkflowDef(args, graphKey, this.workflowDef, cb);
    };
    Processor.prototype.processWorkflowDef = function (args, graphKey, workflowDef, cb) {
        var _this = this;
        var taskGraphObj = workflowDef.decider(args);
        var taskGraphKeys = Object.keys(taskGraphObj);
        async.map(taskGraphKeys, this.processNode.bind(this, taskGraphObj, args), function (err, tasks) {
            if (err) {
                return cb(err, null);
            }
            tasks = _.compact(tasks);
            if (tasks.length === 0) {
                return cb(null, null);
            }
            cb(null, _this.createTaskGraph(graphKey || _this.workflowDef.getHandlerName(), args, tasks));
        });
    };
    Processor.prototype.processNode = function (deciderObj, args, nodeName, cb) {
        var node = deciderObj[nodeName];
        if (node.activity) {
            // If a simple activity, simply create a taskGraphNode with deps
            return cb(null, this.wrapTask(args, nodeName, node));
        }
        else if (node.workflow) {
            // Get workflow
            var TargetWorkflow = this.config.workflows.getModule(node.workflow);
            if (!TargetWorkflow) {
                return cb(new Error('No workflow found in registry for:' + node.workflow));
            }
            var parentWorkflow = {
                name: this.workflowDef.name,
                taskKey: nodeName
            };
            // If maxRetry set on this node, mutate opts passed to subProcessor accordingly
            var subOpts = _.clone(this.opts);
            if (node.maxRetry) {
                subOpts.maxRetry = node.maxRetry;
            }
            var subProcessor = new Processor(this.config, TargetWorkflow.getHandler(), parentWorkflow, this.getCurrentPath(), subOpts);
            subProcessor.process(args, nodeName, function (err, taskGraph) {
                var newNode;
                if (taskGraph) {
                    newNode = _.clone(taskGraph);
                    // TODO: Duplicate prop; probably can do this better.
                    newNode.deps = node.dependsOn;
                }
                cb(err, newNode);
            });
        }
        else {
            throw new TypeError('Missing prop - must have activity or workflow');
        }
    };
    Processor.prototype.createTaskGraph = function (name, args, tasks) {
        var graph = new TaskGraphBuilder_1.TaskGraphBuilder(name, args, tasks, this).getGraph();
        return graph;
    };
    Processor.prototype.getParentWorkflowDetails = function () {
        return this.parentWorkflow;
    };
    Processor.prototype.getCurrentPathStr = function () {
        var currPath = this.getCurrentPath();
        if (!currPath) {
            return '';
        }
        else {
            return currPath.join('->');
        }
    };
    Processor.prototype.getCurrentPath = function () {
        return this.currentPath;
    };
    Processor.prototype.buildGraphName = function (prefix) {
        prefix = prefix || this.getCurrentPathStr() + '->';
        return prefix + "_" + shortId.generate();
    };
    /*  processDir(args: any, dir: string, cb: {(err: Error | null, tgs: TaskGraphNode | null)}) {
     genUtil.readDirectory(path.join(this.currentDir, dir), (err, dirInfo) => {
     if (err) {
     return cb(err, null);
     }
     if (!dirInfo) {
     return cb(null, null);
     }
  
     let ProcClass = Processor;
     const newDir = path.join(this.currentDir, dir);
     if (dirInfo.hasIndex) {
     ProcClass = this.requireLocal(newDir)(Processor)
     }
     const processor = new ProcClass(newDir, dirInfo.files, dirInfo.dirs);
     // clone args before passing into new processor so we don't step on each other
     processor.process(_.clone(args), cb);
     });
     }*/
    Processor.prototype.buildId = function (name) {
        return name + "_" + shortId.generate();
    };
    /*
     processWorkflowFile(args: any, file: string, cb: {(err: Error | null, node: TaskGraphNode | null)}) {
     const taskBuilder = this.requireLocal(path.join(this.currentDir, file)) as ITaskBuilder;
  
     if (!taskBuilder.create) {
     return cb(null, null);
     }
     const syncLength = 2; // we always pass state
     const asyncLength = 3; // assume this means calling asnyc
     let funArgs = [args, this.store.getState()];
     if (taskBuilder.create.length === syncLength) {
     try {
     let taskDef = taskBuilder.create.apply(taskBuilder, funArgs) as Task;
     if (!taskDef) {
     return process.nextTick(() => cb(null, null));
     }
     const task = this.wrapTask(args, file, taskDef, taskBuilder);
     return process.nextTick(() => cb(null, task))
     } catch (e) {
     throw e;
     }
     } else {
     funArgs.push((err: Error | null, taskDef: Task | null) => {
     if (err) {
     return cb(err, null);
     }
     if (!taskDef) {
     return cb(null, null);
     }
     cb(null, this.wrapTask(args, file, taskDef, taskBuilder));
     });
     taskBuilder.create.apply(taskBuilder, funArgs);
     }
     }
     */
    Processor.prototype.wrapTask = function (args, name, taskDef) {
        var path = this.getCurrentPath();
        if (!path) {
            path = [name];
        }
        else {
            path = path.concat(name);
        }
        var newTaskGraphNodeDeps;
        var newNode = _.clone(taskDef);
        if (!newNode.activity || newNode.workflow) {
            throw new Error('Missing activity or workflow keys.');
        }
        newTaskGraphNodeDeps = {
            id: this.buildId(name),
            handler: newNode.activity || 'unknown activity!',
            type: 'activity',
            name: name,
            deps: newNode.dependsOn || [],
            maxRetry: newNode.maxRetry || this.config.getOpt('maxRetry'),
            currentPath: path,
            parameters: newNode.parameters || {},
            workflow: { name: this.getWorkflowName() }
        };
        return newTaskGraphNodeDeps;
    };
    Processor.prototype.getMaxRetry = function () {
        return this.opts.maxRetry || GRAPH_MAX_RETRY;
    };
    return Processor;
}());
exports.Processor = Processor;
//# sourceMappingURL=Processor.js.map