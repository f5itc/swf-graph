"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var util_1 = require("./util");
var _ = require("lodash");
var TaskGraphBuilder = (function () {
    function TaskGraphBuilder(name, args, tasks, processor) {
        this.name = name;
        this.id = processor.buildId(name);
        this.processor = processor;
        this.graph = {
            nodes: {},
            edges: {},
            revEdges: {},
            sourceNode: '',
            sinkNode: ''
        };
        this.sourceTask = this.createCheckTask(args, tasks, 'sourceTask', 'Starting');
        this.sinkTask = this.createCheckTask(args, tasks, 'sinkTask', 'Finished');
        this.byName = _.keyBy(tasks, 'name');
        this.graph = tasks.reduce(this.reduceToGraph.bind(this), this.graph);
        this.addSinkNodeEdges();
        this.addSourceSinkNodes();
    }
    TaskGraphBuilder.prototype.createCheckTask = function (args, tasks, name, label) {
        return {
            name: name,
            id: this.processor.buildId(name),
            currentPath: this.processor.getCurrentPath().concat(name),
            type: 'decision',
            handler: 'recordMarker',
            parameters: {
                status: label + " tasks in " + this.processor.getCurrentPathStr() + ", " + tasks.length + " total tasks, args: " + util_1.genUtil.serializeArgs(args)
            }
        };
    };
    TaskGraphBuilder.prototype.getGraph = function () {
        // get rid of rev edges
        // delete this.graph.revEdges;
        return {
            type: 'decision',
            handler: 'taskGraph',
            workflow: { name: this.processor.getWorkflowName() },
            parentWorkflow: this.processor.getParentWorkflowDetails(),
            currentPath: this.processor.getCurrentPath(),
            id: this.id,
            name: this.name,
            maxRetry: this.processor.getMaxRetry(),
            parameters: {
                graph: this.graph
            }
        };
    };
    TaskGraphBuilder.prototype.addSinkNodeEdges = function () {
        // find nodes with no deps and attach to sink node
        var sinkEdges = [];
        if (!this.graph.revEdges) {
            throw new Error('unexpected, revEdges not computed');
        }
        for (var taskId in this.graph.revEdges) {
            if (this.graph.revEdges[taskId].length === 0) {
                this.graph.revEdges[taskId] = [this.sinkTask.id];
                sinkEdges.push(taskId);
            }
        }
        this.graph.edges[this.sinkTask.id] = sinkEdges;
    };
    TaskGraphBuilder.prototype.addSourceSinkNodes = function () {
        this.graph.nodes[this.sourceTask.id] = this.sourceTask;
        this.graph.nodes[this.sinkTask.id] = this.sinkTask;
        this.graph.sourceNode = this.sourceTask.id;
        this.graph.sinkNode = this.sinkTask.id;
    };
    TaskGraphBuilder.prototype.reduceToGraph = function (graph, task) {
        var _this = this;
        if (Object.keys(task).length === 0) {
            throw new Error('empty task passed. not cool');
        }
        // build up the graph with edges both direction for convience for now...
        // TODO: figure out which way it makes more sense to have edges...
        // convert named deps to ids to get uniqueness
        task.deps = task.deps || [];
        var idDeps = task.deps.map(function (dep) {
            if (!_this.byName[dep]) {
                throw new Error("cannot find task with name " + dep + " in " + task.name);
            }
            return _this.byName[dep].id;
        });
        // connect all nodes with no deps to source node
        if (idDeps.length === 0) {
            idDeps.push(this.sourceTask.id);
        }
        // compute reverse edges
        if (!graph.revEdges) {
            throw new Error('unexpected case, graph.revEdges null');
        }
        graph.revEdges[task.id] = graph.revEdges[task.id] || [];
        idDeps.forEach(function (idDep) {
            graph.revEdges[idDep] = graph.revEdges[idDep] || [];
            graph.revEdges[idDep].push(task.id);
        });
        delete task.deps;
        // atttach to graph
        graph.edges[task.id] = idDeps;
        graph.nodes[task.id] = task;
        return graph;
    };
    return TaskGraphBuilder;
}());
exports.TaskGraphBuilder = TaskGraphBuilder;
//# sourceMappingURL=TaskGraphBuilder.js.map