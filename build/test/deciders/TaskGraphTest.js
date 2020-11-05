"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var chai_1 = require("chai");
var shortId = require("shortid");
var _ = require("lodash");
var entities_1 = require("simple-swf/build/src/entities");
var tasks_1 = require("simple-swf/build/src/tasks");
var sinonHelper_1 = require("../sinonHelper");
var Config_1 = require("../../src/Config");
var lib_1 = require("../../src/lib");
var entities_2 = require("../../src/entities");
var TaskGraph_1 = require("../../src/deciders/TaskGraph");
function buildBaseMock(sandbox, getModuleFunc) {
    var wf = sandbox.stubClass(entities_1.Workflow);
    var config = sandbox.stubClass(Config_1.Config);
    config.logger = sandbox.stubClass(lib_1.Logger);
    config.getOpt = function (name) {
        return 50;
    };
    var mockRegistry = sandbox.stubClass(entities_2.ActivityRegistry);
    mockRegistry.getModule = getModuleFunc || function (moduleName) {
        return sandbox.stubClass(entities_2.ActivityType);
    };
    config.activities = mockRegistry;
    return { wf: wf, c: config };
}
// little method to help build up mock input and
function buildNextMock(input, sandbox, getModuleFunc) {
    var grouped = {
        activity: {},
        workflow: {},
        decision: {},
        signals: {},
        marker: {}
    };
    var graph = {
        nodes: {},
        edges: {},
        revEdges: {},
        sourceNode: '',
        sinkNode: ''
    };
    var nodes = input.nodes, events = input.events;
    // Extend grouped with passed in events if provided
    if (events) {
        _.merge(grouped, events);
    }
    var _loop_1 = function (node) {
        node.handler = node.handler || 'mock';
        node.id = node.id + '' || shortId.generate();
        node.type = node.type || 'activity';
        var groupName = null;
        if (node.handler === 'recordMarker') {
            groupName = 'marker';
        }
        else if (node.type === 'decision') {
            groupName = 'workflow';
        }
        node.deps = node.deps || [];
        graph.nodes[node.id] = node;
        if (node.source) {
            graph.sourceNode = node.id;
        }
        if (node.sink) {
            graph.sinkNode = node.id;
        }
        if (node.done) {
            node.state = 'completed';
        }
        // if it has a state, assume it would be somewhere in the history already
        if (node.state) {
            grouped[groupName || node.type][node.id] = (_a = {
                    current: node.state
                },
                // mock it out for now, eventually we probably want to popualte it with semi real info
                _a[node.state] = {
                    mock: true
                },
                _a);
        }
        graph.edges[node.id] = node.deps.map(function (d) { return d + ''; });
        // Generate reverse edges for revert paths
        graph.revEdges[node.id] = graph.revEdges[node.id] || [];
        node.deps.forEach(function (idDep) {
            graph.revEdges[idDep] = graph.revEdges[idDep] || [];
            graph.revEdges[idDep].push(node.id);
        });
        var _a;
    };
    for (var _i = 0, nodes_1 = nodes; _i < nodes_1.length; _i++) {
        var node = nodes_1[_i];
        _loop_1(node);
    }
    if (!graph.sinkNode || !graph.sourceNode) {
        throw new Error('must assign one node each to be source and sink');
    }
    var dt = sandbox.stubClass(tasks_1.DecisionTask);
    dt.getGroupedEvents = function () { return grouped; };
    var baseMock = buildBaseMock(sandbox, getModuleFunc);
    var tg = new TaskGraph_1.default(baseMock.c, baseMock.wf);
    return { tg: tg, dt: dt, input: { graph: graph } };
}
function buildDecideMock(sandbox, nextNodesRet) {
    var baseMock = buildBaseMock(sandbox);
    var dt = sandbox.mockClass(tasks_1.DecisionTask);
    // do a bit of hackery to access the 'private' properties
    var setDefaultRollup = dt.object;
    setDefaultRollup.rollup = sandbox.stubClass(tasks_1.EventRollup);
    setDefaultRollup.rollup.getFailedEvents = function () { return ({
        activity: [],
        workflow: []
    }); };
    setDefaultRollup.rollup.getTimedOutEvents = function () { return ({
        activity: [],
        workflow: []
    }); };
    dt.object.getGroupedEvents = function () { return ({
        activity: {},
        workflow: {},
        completed: []
    }); };
    var tg = new TaskGraph_1.default(baseMock.c, baseMock.wf);
    tg.getNextNodes = function () {
        return nextNodesRet;
    };
    return { tg: tg, dt: dt, mg: { graph: { edges: {}, nodes: {} } } };
}
describe('taskGraph', function () {
    describe('#decide()', function () {
        it('should call scheduleTask with any activity tasks', function () {
            var getNext = { finished: false, nodes: [{ id: 1, handler: 'mock' }] };
            var _a = buildDecideMock(sinonHelper_1.default(), getNext), tg = _a.tg, dt = _a.dt, mg = _a.mg;
            dt.expects('scheduleTask').once();
            dt.expects('completeWorkflow').never();
            tg.decide(mg, dt.object);
            dt.verify();
        });
        it('should call completeWorkflow when finished', function () {
            var getNext = { finished: true, nodes: [] };
            var _a = buildDecideMock(sinonHelper_1.default(), getNext), tg = _a.tg, dt = _a.dt, mg = _a.mg;
            dt.expects('completeWorkflow').once();
            dt.expects('scheduleTask').never();
            tg.decide(mg, dt.object);
            dt.verify();
        });
        it('should call recordMarker when receiving a marker task', function () {
            var getNext = {
                finished: false,
                nodes: [{
                        id: 1,
                        type: 'decision',
                        handler: 'recordMarker',
                        parameters: { status: '' }
                    }]
            };
            var _a = buildDecideMock(sinonHelper_1.default(), getNext), tg = _a.tg, dt = _a.dt, mg = _a.mg;
            dt.expects('addMarker').once();
            dt.expects('completeWorkflow').never();
            dt.expects('scheduleTask').never();
            tg.decide(mg, dt.object);
            dt.verify();
        });
        it('should call startChildWorkflow when receiving a task graph task', function () {
            var getNext = {
                finished: false,
                nodes: [{ id: 1, type: 'decision', handler: 'taskGraph' }]
            };
            var _a = buildDecideMock(sinonHelper_1.default(), getNext), tg = _a.tg, dt = _a.dt, mg = _a.mg;
            dt.expects('startChildWorkflow').once();
            dt.expects('addMarker').never();
            dt.expects('completeWorkflow').never();
            dt.expects('scheduleTask').never();
            tg.decide(mg, dt.object);
            dt.verify();
        });
        it('should call multiple times for diffent decisions and finish', function () {
            var getNext = {
                finished: true, nodes: [
                    { id: 1, type: 'decision', handler: 'taskGraph' },
                    {
                        id: 2,
                        type: 'decision',
                        handler: 'recordMarker',
                        parameters: { status: '' }
                    },
                    { id: 3, handler: 'mock' },
                    { id: 4, handler: 'mock' }
                ]
            };
            var _a = buildDecideMock(sinonHelper_1.default(), getNext), tg = _a.tg, dt = _a.dt, mg = _a.mg;
            dt.expects('startChildWorkflow').once();
            dt.expects('addMarker').once();
            dt.expects('completeWorkflow').once();
            dt.expects('scheduleTask').twice();
            tg.decide(mg, dt.object);
            dt.verify();
        });
        it('should fail the workflow if we fail to reschedule failed tasks', function () {
            var getNext = { finished: true, nodes: [] };
            var _a = buildDecideMock(sinonHelper_1.default(), getNext), tg = _a.tg, dt = _a.dt, mg = _a.mg;
            dt.expects('rescheduleFailedEvents').once().returns([{ failed: true }]);
            dt.expects('failWorkflow').once();
            dt.expects('completeWorkflow').never();
            dt.expects('addMarker').once();
            tg.decide(mg, dt.object);
            dt.verify();
        });
        it('should fail the workflow if we fail to reschedule timedOut tasks', function () {
            var getNext = { finished: true, nodes: [] };
            var _a = buildDecideMock(sinonHelper_1.default(), getNext), tg = _a.tg, dt = _a.dt, mg = _a.mg;
            dt.expects('rescheduleTimedOutEvents').once().returns([{ failed: true }]);
            dt.expects('failWorkflow').once();
            dt.expects('completeWorkflow').never();
            dt.expects('addMarker').once();
            tg.decide(mg, dt.object);
            dt.verify();
        });
        it('it should only schedule up to 50 workflows at once', function () {
            var retNodes = [];
            for (var i = 0; i < 110; i++) {
                retNodes.push({
                    id: i,
                    type: 'decision',
                    handler: 'taskGraph'
                });
            }
            var getNext = { finished: false, nodes: retNodes };
            var _a = buildDecideMock(sinonHelper_1.default(), getNext), tg = _a.tg, dt = _a.dt, mg = _a.mg;
            dt.expects('startChildWorkflow').exactly(50);
            dt.expects('completeWorkflow').never();
            tg.decide(mg, dt.object);
            dt.verify();
        });
    });
    describe('#getNextNodes()', function () {
        describe('simple linear dependency', function () {
            var nodes = [
                {
                    id: 1,
                    source: true,
                    done: true
                },
                {
                    id: 2,
                    deps: [1]
                },
                {
                    id: 3,
                    deps: [2],
                    sink: true
                }
            ];
            var _a = buildNextMock({ nodes: nodes }, sinonHelper_1.default()), dt = _a.dt, input = _a.input, tg = _a.tg;
            var nextNodes = tg.getNextNodes(input.graph, dt.getGroupedEvents());
            it('should schedule only the node that is ready', function () {
                chai_1.assert.equal(nextNodes.nodes.length, 1);
                chai_1.assert.equal(nextNodes.nodes[0].handler, 'mock');
                chai_1.assert.equal(nextNodes.nodes[0].id, 2);
            });
        });
        describe('many children', function () {
            var nodes = [
                {
                    id: 1,
                    source: true,
                    done: true
                },
                {
                    id: 2,
                    deps: [1]
                },
                {
                    id: 3,
                    deps: [1]
                },
                {
                    id: 4,
                    deps: [1]
                },
                {
                    id: 5,
                    deps: [2, 3, 4],
                    sink: true
                }
            ];
            var _a = buildNextMock({ nodes: nodes }, sinonHelper_1.default()), dt = _a.dt, input = _a.input, tg = _a.tg;
            var nextNodes = tg.getNextNodes(input.graph, dt.getGroupedEvents());
            it('should schedule multiple children that are ready', function () {
                chai_1.assert.equal(nextNodes.nodes.length, 3);
                chai_1.assert.equal(nextNodes.nodes[0].handler, 'mock');
                chai_1.assert.equal(nextNodes.nodes[1].handler, 'mock');
                chai_1.assert.equal(nextNodes.nodes[2].handler, 'mock');
                chai_1.assert.equal(nextNodes.nodes[0].id, 2);
                chai_1.assert.equal(nextNodes.nodes[1].id, 3);
                chai_1.assert.equal(nextNodes.nodes[2].id, 4);
            });
        });
        describe('depend on multiple parents', function () {
            it('should only schedule if both parents are ready', function () {
                var nodes = [
                    {
                        id: 1,
                        source: true,
                        done: true
                    },
                    {
                        id: 2,
                        deps: [1],
                        done: true
                    },
                    {
                        id: 3,
                        deps: [1],
                        done: true
                    },
                    {
                        id: 4,
                        deps: [2, 3]
                    },
                    {
                        id: 5,
                        deps: [4],
                        sink: true
                    }
                ];
                var _a = buildNextMock({ nodes: nodes }, sinonHelper_1.default()), dt = _a.dt, input = _a.input, tg = _a.tg;
                var nextNodes = tg.getNextNodes(input.graph, dt.getGroupedEvents());
                chai_1.assert.equal(nextNodes.nodes.length, 1);
                chai_1.assert.equal(nextNodes.nodes[0].handler, 'mock');
                chai_1.assert.equal(nextNodes.nodes[0].id, 4);
            });
            it('should not schedule if both parents are not ready', function () {
                var nodes = [
                    {
                        id: 1,
                        source: true,
                        done: true
                    },
                    {
                        id: 2,
                        deps: [1],
                        done: true
                    },
                    {
                        id: 3,
                        deps: [1]
                    },
                    {
                        id: 4,
                        deps: [2, 3]
                    },
                    {
                        id: 5,
                        deps: [4],
                        sink: true
                    }
                ];
                var _a = buildNextMock({ nodes: nodes }, sinonHelper_1.default()), dt = _a.dt, input = _a.input, tg = _a.tg;
                var nextNodes = tg.getNextNodes(input.graph, dt.getGroupedEvents());
                chai_1.assert.equal(nextNodes.nodes.length, 1);
                chai_1.assert.equal(nextNodes.nodes[0].handler, 'mock');
                chai_1.assert.equal(nextNodes.nodes[0].id, 3);
            });
        });
        describe('first decision', function () {
            it('should add recordMarker and first activities', function () {
                var nodes = [
                    {
                        id: 1,
                        source: true,
                        type: 'decision',
                        handler: 'recordMarker',
                        parameters: {
                            status: 'stuff'
                        }
                    },
                    {
                        id: 2,
                        deps: [1]
                    },
                    {
                        id: 3,
                        deps: [1]
                    },
                    {
                        id: 4,
                        deps: [2, 3]
                    },
                    {
                        id: 5,
                        deps: [4],
                        sink: true
                    }
                ];
                var _a = buildNextMock({ nodes: nodes }, sinonHelper_1.default()), dt = _a.dt, input = _a.input, tg = _a.tg;
                var nextNodes = tg.getNextNodes(input.graph, dt.getGroupedEvents());
                chai_1.assert.equal(nextNodes.nodes.length, 3);
                chai_1.assert.equal(nextNodes.nodes[0].handler, 'recordMarker');
                chai_1.assert.equal(nextNodes.nodes[0].id, 1);
                chai_1.assert.equal(nextNodes.nodes[1].handler, 'mock');
                chai_1.assert.equal(nextNodes.nodes[1].id, 2);
                chai_1.assert.equal(nextNodes.nodes[2].handler, 'mock');
                chai_1.assert.equal(nextNodes.nodes[2].id, 3);
            });
        });
        describe('record marker', function () {
            it('should not add last recordMarker if all parents are not done', function () {
                var nodes = [
                    {
                        id: 1,
                        source: true,
                        done: true
                    },
                    {
                        id: 2,
                        deps: [1]
                    },
                    {
                        id: 3,
                        deps: [1]
                    },
                    {
                        id: 4,
                        deps: [2, 3],
                        sink: true,
                        type: 'decision',
                        handler: 'recordMarker',
                        parameters: {
                            status: 'stuff'
                        }
                    }
                ];
                var _a = buildNextMock({ nodes: nodes }, sinonHelper_1.default()), dt = _a.dt, input = _a.input, tg = _a.tg;
                var nextNodes = tg.getNextNodes(input.graph, dt.getGroupedEvents());
                chai_1.assert.equal(nextNodes.nodes.length, 2);
                chai_1.assert.equal(nextNodes.nodes[0].handler, 'mock');
                chai_1.assert.equal(nextNodes.nodes[0].id, 2);
                chai_1.assert.equal(nextNodes.nodes[1].handler, 'mock');
                chai_1.assert.equal(nextNodes.nodes[1].id, 3);
            });
            it('should add recordMarker if all parents are done or markers', function () {
                var nodes = [
                    {
                        id: 1,
                        source: true,
                        done: true
                    },
                    {
                        id: 2,
                        deps: [1],
                        done: true
                    },
                    {
                        id: 3,
                        deps: [1],
                        type: 'decision',
                        handler: 'recordMarker',
                        parameters: {
                            status: 'stuff'
                        }
                    },
                    {
                        id: 4,
                        deps: [2, 3],
                        sink: true,
                        type: 'decision',
                        handler: 'recordMarker',
                        parameters: {
                            status: 'stuff'
                        }
                    }
                ];
                var _a = buildNextMock({ nodes: nodes }, sinonHelper_1.default()), dt = _a.dt, input = _a.input, tg = _a.tg;
                var nextNodes = tg.getNextNodes(input.graph, dt.getGroupedEvents());
                chai_1.assert.equal(nextNodes.finished, true);
                chai_1.assert.equal(nextNodes.nodes.length, 2);
                chai_1.assert.equal(nextNodes.nodes[0].handler, 'recordMarker');
                chai_1.assert.equal(nextNodes.nodes[0].id, '3');
                chai_1.assert.equal(nextNodes.nodes[1].handler, 'recordMarker');
            });
        });
        describe('finished', function () {
            it('should mark the workflow complete', function () {
                var nodes = [
                    {
                        id: 1,
                        source: true,
                        done: true
                    },
                    {
                        id: 2,
                        deps: [1],
                        done: true
                    },
                    {
                        id: 3,
                        deps: [1],
                        done: true
                    },
                    {
                        id: 4,
                        deps: [2, 3],
                        done: true
                    },
                    {
                        id: 5,
                        deps: [4],
                        sink: true,
                        done: true
                    }
                ];
                var _a = buildNextMock({ nodes: nodes }, sinonHelper_1.default()), dt = _a.dt, input = _a.input, tg = _a.tg;
                var nextNodes = tg.getNextNodes(input.graph, dt.getGroupedEvents());
                chai_1.assert.equal(nextNodes.finished, true);
                chai_1.assert.equal(nextNodes.nodes.length, 0);
            });
        });
        describe('nothing to schedule', function () {
            it('should not be able to schedule if tasks are running or scheduled', function () {
                var nodes = [
                    {
                        id: 1,
                        source: true,
                        done: true
                    },
                    {
                        id: 2,
                        deps: [1],
                        state: 'scheduled'
                    },
                    {
                        id: 3,
                        deps: [1],
                        state: 'started'
                    },
                    {
                        id: 4,
                        deps: [2, 3]
                    },
                    {
                        id: 5,
                        deps: [4],
                        sink: true
                    }
                ];
                var _a = buildNextMock({ nodes: nodes }, sinonHelper_1.default()), dt = _a.dt, input = _a.input, tg = _a.tg;
                var nextNodes = tg.getNextNodes(input.graph, dt.getGroupedEvents());
                chai_1.assert.equal(nextNodes.nodes.length, 0);
            });
        });
        describe('child workflows', function () {
            it('should be able to schedule child workflows', function () {
                var nodes = [
                    {
                        id: 1,
                        source: true,
                        done: true
                    },
                    {
                        id: 2,
                        deps: [1],
                        type: 'decision',
                        handler: 'taskGraph'
                    },
                    {
                        id: 3,
                        deps: [1],
                        done: true
                    },
                    {
                        id: 4,
                        deps: [2, 3]
                    },
                    {
                        id: 5,
                        deps: [4],
                        sink: true
                    }
                ];
                var _a = buildNextMock({ nodes: nodes }, sinonHelper_1.default()), dt = _a.dt, input = _a.input, tg = _a.tg;
                var nextNodes = tg.getNextNodes(input.graph, dt.getGroupedEvents());
                chai_1.assert.equal(nextNodes.nodes.length, 1);
                chai_1.assert.equal(nextNodes.nodes[0].handler, 'taskGraph');
            });
        });
    });
    describe('#getNodeDetails()', function () {
        var nodes = [
            {
                id: 1,
                source: true,
                done: true
            },
            {
                id: 2,
                deps: [1],
                state: 'started'
            },
            {
                id: 3,
                deps: [2]
            },
            {
                id: 4,
                deps: [3],
                type: 'decision',
                done: true,
                handler: 'taskGraph'
            },
            {
                id: 5,
                deps: [4],
                type: 'decision',
                handler: 'taskGraph'
            },
            {
                id: 6,
                deps: [5],
                type: 'decision',
                handler: 'recordMarker',
                done: true,
                parameters: {
                    status: 'stuff'
                }
            },
            {
                id: 7,
                deps: [6],
                sink: true,
                type: 'decision',
                handler: 'recordMarker',
                parameters: {
                    status: 'stuff'
                }
            }
        ];
        var _a = buildNextMock({ nodes: nodes }, sinonHelper_1.default()), dt = _a.dt, input = _a.input, tg = _a.tg;
        var nextNodes = tg.getNextNodes(input.graph, dt.getGroupedEvents());
        var graph = input.graph;
        var grouped = dt.getGroupedEvents();
        it('should handle a normal node that is finished', function () {
            var res = tg.getNodeDetails(graph, grouped, false, '1');
            chai_1.assert.equal(res.state, 'completed');
            chai_1.assert.equal(res.type, 'activity');
            chai_1.assert.equal(res.id, '1');
            chai_1.assert.deepEqual(res.deps, []);
        });
        it('should handle a normal node that has a specific state', function () {
            var res = tg.getNodeDetails(graph, grouped, false, '2');
            chai_1.assert.equal(res.state, 'started');
            chai_1.assert.equal(res.type, 'activity');
            chai_1.assert.equal(res.id, '2');
            chai_1.assert.deepEqual(res.deps, ['1']);
        });
        it('should handle a normal node that has not started', function () {
            var res = tg.getNodeDetails(graph, grouped, false, '3');
            chai_1.assert.equal(res.state, 'waiting');
            chai_1.assert.equal(res.type, 'activity');
            chai_1.assert.equal(res.id, '3');
            chai_1.assert.deepEqual(res.deps, ['2']);
        });
        it('should handle a decision node that has finished', function () {
            var res = tg.getNodeDetails(graph, grouped, false, '4');
            chai_1.assert.equal(res.state, 'completed');
            chai_1.assert.equal(res.type, 'workflow');
            chai_1.assert.equal(res.id, '4');
            chai_1.assert.deepEqual(res.deps, ['3']);
        });
        it('should handle a decision node that has not finished', function () {
            var res = tg.getNodeDetails(graph, grouped, false, '5');
            chai_1.assert.equal(res.state, 'waiting');
            chai_1.assert.equal(res.type, 'workflow');
            chai_1.assert.equal(res.id, '5');
            chai_1.assert.deepEqual(res.deps, ['4']);
        });
        it('should handle a add marker node that has finished', function () {
            var res = tg.getNodeDetails(graph, grouped, false, '6');
            chai_1.assert.equal(res.state, 'completed');
            chai_1.assert.equal(res.type, 'marker');
            chai_1.assert.equal(res.id, '6');
            chai_1.assert.deepEqual(res.deps, ['5']);
        });
        it('should handle a add marker node that has not finished', function () {
            var res = tg.getNodeDetails(graph, grouped, false, '7');
            chai_1.assert.equal(res.state, 'collapse');
            chai_1.assert.equal(res.type, 'marker');
            chai_1.assert.equal(res.id, '7');
            chai_1.assert.deepEqual(res.deps, ['6']);
        });
    });
    describe('#throttle', function () {
        var nodes = [
            {
                id: 1,
                source: true,
                done: true
            },
            {
                id: 2,
                deps: [1],
                handler: 'oneLimit',
                state: 'started'
            },
            {
                id: 3,
                deps: [1],
                handler: 'oneLimit'
            },
            {
                id: 4,
                deps: [1],
                handler: 'twoLimit',
                state: 'started'
            },
            {
                id: 5,
                deps: [1],
                handler: 'twoLimit'
            },
            {
                id: 6,
                deps: [1],
                handler: 'twoLimit'
            },
            {
                id: 7,
                deps: [1],
                handler: 'noLimit',
                state: 'started'
            },
            {
                id: 8,
                deps: [1],
                handler: 'noLimit'
            },
            {
                id: 9,
                deps: [1],
                handler: 'noLimit'
            },
            {
                id: 10,
                deps: [2, 3, 4, 5, 6, 7, 8, 9],
                sink: true
            }
        ];
        var sandbox = sinonHelper_1.default();
        function multiModule(name) {
            var actOne = sandbox.stubClass(entities_2.ActivityType);
            actOne.getMaxConcurrent = function () { return 1; };
            var actTwo = sandbox.stubClass(entities_2.ActivityType);
            actTwo.getMaxConcurrent = function () { return 2; };
            if (name === 'oneLimit') {
                return actOne;
            }
            if (name === 'twoLimit') {
                return actTwo;
            }
            var noLimit = sandbox.stubClass(entities_2.ActivityType);
            actTwo.getMaxConcurrent = function () { return null; };
            return noLimit;
        }
        var _a = buildNextMock({ nodes: nodes }, sandbox, multiModule), dt = _a.dt, input = _a.input, tg = _a.tg;
        var graph = input.graph;
        var grouped = dt.getGroupedEvents();
        it('should throttle if we have more activities running concurrently', function () {
            var nextNodes = tg.getNextNodes(graph, grouped);
            chai_1.assert.equal(nextNodes.nodes.length, 5);
            var startOfType = { oneLimit: 0, twoLimit: 0, noLimit: 0 };
            for (var _i = 0, _a = nextNodes.nodes; _i < _a.length; _i++) {
                var next = _a[_i];
                var t = tg.throttle(next, graph, grouped, startOfType);
                if (!t) {
                    startOfType[next.handler]++;
                }
            }
            chai_1.assert.equal(startOfType.oneLimit, 0);
            chai_1.assert.equal(startOfType.twoLimit, 1);
            chai_1.assert.equal(startOfType.noLimit, 2);
        });
    });
    describe('#throttleWorkflows', function () {
        var nodes = [
            {
                id: 1,
                source: true,
                done: true
            },
            {
                id: 2,
                deps: [1],
                type: 'decision',
                handler: 'taskGraph',
                state: 'started'
            },
            {
                id: 3,
                deps: [1],
                type: 'decision',
                handler: 'taskGraph'
            },
            {
                id: 4,
                deps: [1],
                type: 'decision',
                handler: 'taskGraph'
            },
            {
                id: 5,
                deps: [1],
                type: 'decision',
                handler: 'taskGraph'
            },
            {
                id: 6,
                deps: [2, 3, 4, 5],
                sink: true
            }
        ];
        var _a = buildNextMock({ nodes: nodes }, sinonHelper_1.default()), dt = _a.dt, input = _a.input, tg = _a.tg;
        var graph = input.graph;
        var grouped = dt.getGroupedEvents();
        it('should throttle if we have more activities running concurrently', function () {
            var nextNodes = tg.getNextNodes(graph, grouped);
            chai_1.assert.equal(nextNodes.nodes.length, 3);
            var startCount = 0;
            for (var _i = 0, _a = nextNodes.nodes; _i < _a.length; _i++) {
                var next = _a[_i];
                var t = tg.throttleWorkflows(next, graph, grouped, startCount, 3);
                if (!t) {
                    startCount++;
                }
            }
            chai_1.assert.equal(startCount, 2);
        });
    });
    describe('#getLastNodes()', function () {
        describe('simple linear reversion', function () {
            var nodes = [
                {
                    id: 1,
                    source: true,
                    done: true
                },
                {
                    id: 2,
                    deps: [1]
                },
                {
                    id: 3,
                    deps: [2],
                    sink: true
                }
            ];
            var _a = buildNextMock({ nodes: nodes }, sinonHelper_1.default()), dt = _a.dt, input = _a.input, tg = _a.tg;
            var lastNodes = tg.getLastNodes(input.graph, dt.getGroupedEvents());
            it('should schedule a revert for only the node that was completed', function () {
                chai_1.assert.equal(lastNodes.nodes.length, 1);
                chai_1.assert.equal(lastNodes.nodes[0].handler, 'mock');
                chai_1.assert.equal(lastNodes.nodes[0].id, 1);
            });
        });
        describe('multiple dependent parents', function () {
            var nodes = [
                {
                    id: 1,
                    source: true,
                    done: true
                },
                {
                    id: 2,
                    deps: [1],
                    done: true
                },
                {
                    id: 3,
                    deps: [1],
                    done: true
                },
                {
                    id: 4,
                    deps: [1],
                    done: true
                },
                {
                    id: 5,
                    deps: [2, 3, 4],
                    sink: true
                }
            ];
            var _a = buildNextMock({ nodes: nodes }, sinonHelper_1.default()), dt = _a.dt, input = _a.input, tg = _a.tg;
            var lastNodes = tg.getLastNodes(input.graph, dt.getGroupedEvents());
            it('should revert all parents of the un-completed node that were completed', function () {
                chai_1.assert.equal(lastNodes.nodes.length, 3);
                chai_1.assert.equal(lastNodes.nodes[0].handler, 'mock');
                chai_1.assert.equal(lastNodes.nodes[1].handler, 'mock');
                chai_1.assert.equal(lastNodes.nodes[2].handler, 'mock');
                chai_1.assert.equal(lastNodes.nodes[0].id, 2);
                chai_1.assert.equal(lastNodes.nodes[1].id, 3);
                chai_1.assert.equal(lastNodes.nodes[2].id, 4);
            });
        });
        describe('depend on multiple children', function () {
            it('should revert if both children are ready', function () {
                var nodes = [
                    {
                        id: 1,
                        source: true,
                        done: true
                    },
                    {
                        id: 2,
                        deps: [1],
                        done: true
                    },
                    {
                        id: 3,
                        deps: [1],
                        done: true
                    },
                    {
                        id: 4,
                        deps: [2, 3]
                    },
                    {
                        id: 5,
                        deps: [4],
                        sink: true
                    }
                ];
                var _a = buildNextMock({ nodes: nodes }, sinonHelper_1.default()), dt = _a.dt, input = _a.input, tg = _a.tg;
                var lastNodes = tg.getLastNodes(input.graph, dt.getGroupedEvents());
                chai_1.assert.equal(lastNodes.nodes.length, 2);
                chai_1.assert.equal(lastNodes.nodes[0].handler, 'mock');
                chai_1.assert.equal(lastNodes.nodes[0].id, 2);
                chai_1.assert.equal(lastNodes.nodes[1].handler, 'mock');
                chai_1.assert.equal(lastNodes.nodes[1].id, 3);
            });
            it('should only revert one child if only one is ready ', function () {
                var nodes = [
                    {
                        id: 1,
                        source: true,
                        done: true
                    },
                    {
                        id: 2,
                        deps: [1],
                        done: true
                    },
                    {
                        id: 3,
                        deps: [1]
                    },
                    {
                        id: 4,
                        deps: [2, 3]
                    },
                    {
                        id: 5,
                        deps: [4],
                        sink: true
                    }
                ];
                var _a = buildNextMock({ nodes: nodes }, sinonHelper_1.default()), dt = _a.dt, input = _a.input, tg = _a.tg;
                var lastNodes = tg.getLastNodes(input.graph, dt.getGroupedEvents());
                chai_1.assert.equal(lastNodes.nodes.length, 1);
                chai_1.assert.equal(lastNodes.nodes[0].handler, 'mock');
                chai_1.assert.equal(lastNodes.nodes[0].id, 2);
            });
            describe('revert tasks are tracked', function () {
                it('should not return a node that is already being reverted', function () {
                    var nodes = [
                        {
                            id: 1,
                            source: true,
                            done: true
                        },
                        {
                            id: 2,
                            deps: [1],
                            done: true
                        },
                        {
                            id: 3,
                            deps: [1],
                            done: true
                        },
                        {
                            id: 4,
                            deps: [2, 3]
                        },
                        {
                            id: 5,
                            deps: [4],
                            sink: true
                        }
                    ];
                    var events = {
                        activity: {
                            '3_revert': {
                                id: '3_revert',
                                current: 'scheduled',
                                'scheduled': {
                                    mock: {}
                                }
                            }
                        }
                    };
                    var _a = buildNextMock({ nodes: nodes, events: events }, sinonHelper_1.default()), dt = _a.dt, input = _a.input, tg = _a.tg;
                    var lastNodes = tg.getLastNodes(input.graph, dt.getGroupedEvents());
                    chai_1.assert.equal(lastNodes.nodes.length, 1);
                    chai_1.assert.equal(lastNodes.nodes[0].handler, 'mock');
                    chai_1.assert.equal(lastNodes.nodes[0].id, 2);
                });
            });
            /*describe('first decision', () => {
             it('should add recordMarker and first activities', () => {
             let nodes = [
             {
             id: 1,
             source: true,
             type: 'decision',
             handler: 'recordMarker',
             parameters: {
             status: 'stuff'
             }
             },
             {
             id: 2,
             deps: [1]
             },
             {
             id: 3,
             deps: [1]
             },
             {
             id: 4,
             deps: [2, 3]
             },
             {
             id: 5,
             deps: [4],
             sink: true
             }
             ];
      
             let {dt, input, tg} = buildNextMock({nodes}, newContext());
             let nextNodes = tg.getNextNodes(input.graph, dt.getGroupedEvents());
      
             assert.equal(nextNodes.nodes.length, 3);
             assert.equal(nextNodes.nodes[0].handler, 'recordMarker');
             assert.equal(nextNodes.nodes[0].id, 1);
             assert.equal(nextNodes.nodes[1].handler, 'mock');
             assert.equal(nextNodes.nodes[1].id, 2);
             assert.equal(nextNodes.nodes[2].handler, 'mock');
             assert.equal(nextNodes.nodes[2].id, 3);
             });*/
        });
        describe('nothing to schedule', function () {
            it('should not be able to schedule if tasks are running or scheduled', function () {
                var nodes = [
                    {
                        id: 1,
                        source: true,
                        done: true
                    },
                    {
                        id: 2,
                        deps: [1],
                        state: 'scheduled'
                    },
                    {
                        id: 3,
                        deps: [1],
                        state: 'started'
                    },
                    {
                        id: 4,
                        deps: [2, 3]
                    },
                    {
                        id: 5,
                        deps: [4],
                        sink: true
                    }
                ];
                var _a = buildNextMock({ nodes: nodes }, sinonHelper_1.default()), dt = _a.dt, input = _a.input, tg = _a.tg;
                var nextNodes = tg.getNextNodes(input.graph, dt.getGroupedEvents());
                chai_1.assert.equal(nextNodes.nodes.length, 0);
            });
        });
        describe('child workflows', function () {
            it('should be able to schedule child workflows', function () {
                var nodes = [
                    {
                        id: 1,
                        source: true,
                        done: true
                    },
                    {
                        id: 2,
                        deps: [1],
                        type: 'decision',
                        handler: 'taskGraph'
                    },
                    {
                        id: 3,
                        deps: [1],
                        done: true
                    },
                    {
                        id: 4,
                        deps: [2, 3]
                    },
                    {
                        id: 5,
                        deps: [4],
                        sink: true
                    }
                ];
                var _a = buildNextMock({ nodes: nodes }, sinonHelper_1.default()), dt = _a.dt, input = _a.input, tg = _a.tg;
                var nextNodes = tg.getNextNodes(input.graph, dt.getGroupedEvents());
                chai_1.assert.equal(nextNodes.nodes.length, 1);
                chai_1.assert.equal(nextNodes.nodes[0].handler, 'taskGraph');
            });
        });
    });
});
//# sourceMappingURL=TaskGraphTest.js.map