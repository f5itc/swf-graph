import { Workflow, ActivityType } from 'simple-swf/build/src/entities';
import { ConfigOverride } from 'simple-swf/build/src/SWFConfig';
import { DecisionTask, EventData } from 'simple-swf/build/src/tasks';
import * as _ from 'lodash';
import * as Joi from 'joi';

import { BaseDecider } from '../entities';
import { Config } from '../Config';

import { TaskStatus, TaskInput } from 'simple-swf/build/src/interfaces';
import { WorkflowType } from '../entities/workflow/WorkflowType';

export interface TaskGraphNode {
  type: 'decision' | 'activity';
  handler: string;
  id: string;
  name: string;
  currentPath: string[];
  parameters: any;
  maxRetry?: number;
  workflowName?: string;
  parentWorkflow?: any;
}

export interface TaskGraphActivityNode extends TaskGraphNode {
  opts?: {
    taskList?: string,
    taskPriority?: number,
    scheduleToCloseTimeout?: number,
    scheduleToStartTimeout?: number
    startToCloseTimeout?: number
  };
}

export interface TaskGraphGraph {
  nodes: {
    [name: string]: TaskGraphNode
  };
  edges: {
    [name: string]: string[]
  };
  revEdges?: {
    [name: string]: string[]
  };
  sourceNode: string;
  sinkNode: string;
}

export interface TaskGraphParameters {
  graph: TaskGraphGraph;
}

export interface TaskGraphGraphNode extends TaskGraphNode {
  parameters: TaskGraphParameters;
}

export interface TaskGraphMarkerNode extends TaskGraphNode {
  parameters: {
    status: string
  };
}

type AllNodeTypes = TaskGraphNode | TaskGraphGraphNode | TaskGraphMarkerNode

function isTaskGraphGraphNode(node: AllNodeTypes): node is TaskGraphGraphNode {
  return node.type === 'decision' && node.handler === 'taskGraph';
}

function isTaskGraphMarkerNode(node: AllNodeTypes): node is TaskGraphMarkerNode {
  return node.type === 'decision' && node.handler === 'recordMarker';
}

export interface NodeDetails {
  id: string;
  node: TaskGraphNode;
  type: string;
  deps: string[];
  state: string;
}

export interface HasBuildFilteredTaskInput {
  filteredBuildInitialControlDoc?(maxRetry: number);
  filteredBuildTaskInput?(input: any, filterFunc?: {(env: any): any});
  filteredCompleteWorkflow(result: TaskStatus, opts: ConfigOverride, filterFunc?: {(env: any): any});
  filteredScheduleTask(activityId: string, input: any, activity: ActivityType, opts: ConfigOverride, filterFunc?: {(env: any): any});
  filteredStartChildWorkflow(workflowId: string, input: any, opts: ConfigOverride, filterFunc?: {(env: any): any});
}

// TODO: un-hackify this.
const SWF_MAX_RETRY = 5;
// Override methods that use buildTaskInput.

function filteredBuildInitialControlDoc(maxRetry: number = SWF_MAX_RETRY) {
  return {executionCount: 1, maxRetry};
};

function filteredBuildTaskInput(input: any, inputEnv: any) {
  return JSON.stringify({
    input: input,
    env: inputEnv,
    originWorkflow: this.getOriginWorkflow()
  } as TaskInput);
};

function filteredScheduleTask(activityId: string,
                              input: any,
                              activity: ActivityType,
                              opts: ConfigOverride,
                              inputEnv: any) {
  let maxRetry = opts['maxRetry'] as number || activity.maxRetry;
  let taskInput = filteredBuildTaskInput.bind(this)(input, inputEnv);

  this.decisions.push({
    entities: ['activity'],
    overrides: opts,
    decision: {
      decisionType: 'ScheduleActivityTask',
      scheduleActivityTaskDecisionAttributes: {
        input: taskInput,
        activityId: activityId,
        activityType: {
          name: activity.name,
          version: activity.version
        },
        control: JSON.stringify(filteredBuildInitialControlDoc.bind(this)(maxRetry))
      }
    }
  });
};

function filteredStartChildWorkflow(workflowId: string,
                                    input: any,
                                    opts: ConfigOverride = {},
                                    inputEnv: any) {
  let maxRetry = opts['maxRetry'] as number;
  this.decisions.push({
    entities: ['workflow', 'decision'],
    overrides: opts,
    decision: {
      decisionType: 'StartChildWorkflowExecution',
      startChildWorkflowExecutionDecisionAttributes: {
        workflowId: workflowId,
        workflowType: {
          name: this.workflow.name,
          version: this.workflow.version
        },
        input: filteredBuildTaskInput.bind(this)(input, inputEnv),
        control: JSON.stringify(filteredBuildInitialControlDoc.bind(this)(maxRetry))
      }
    }
  });
};

function filteredCompleteWorkflow(result: TaskStatus,
                                  opts: ConfigOverride = {},
                                  outputEnv: any) {

  result.env = outputEnv;
  this.decisions.push({
    entities: ['workflow'],
    overrides: opts,
    decision: {
      decisionType: 'CompleteWorkflowExecution',
      completeWorkflowExecutionDecisionAttributes: {
        result: JSON.stringify(result)
      }
    }
  });
};

export default class TaskGraph extends BaseDecider {
  maxRunningWorkflow: number;

  constructor(config: Config, workflow: Workflow) {
    super(config, workflow);

    this.maxRunningWorkflow = config.getOpt('maxRunningWorkflow') as number;

    if (!this.maxRunningWorkflow) {
      throw new Error('missing maxRunningWorkflow');
    }
  }

  makeDecisions(task: DecisionTask, cb: {(Error?)}): any {
    const input = task.getWorkflowInput();

    if (input.handler !== 'taskGraph') {
      return cb(new Error('invalid handler for taskGraph'));
    }

    let workflowName = input.workflowName;
    let isWorkflowTask = workflowName ? true : false;
    let workflowType;
    let workflowDetails, parentWorkflowDetails;

    if (isWorkflowTask) {
      // 1. Validate current workflow target exists
      // 2. If a parent workflow exists, find this key in parent workflow and run input from it on env
      workflowType = this.FTLConfig.workflows.getModule(workflowName);

      if (!workflowType) {
        return cb(new Error('missing workflow type ' + workflowName));
      }

      const env = task.getEnv();

      workflowDetails = {
        name: input.workflowName,
        workflowType: workflowType,
        tasks: workflowType.getHandler().decider(env)
      };

      let hasParentWorkflow = input.parentWorkflow ? true : false;

      if (hasParentWorkflow) {
        // Used for output methods
        let parentWorkflowName = input.parentWorkflow.workflowName;
        let parentWorkflowTaskKey = input.parentWorkflow.taskName;
        let parentWorkflowInitialEnv = input.parentWorkflow.env;
        const parentWorkflowType = this.FTLConfig.workflows.getModule(parentWorkflowName);

        if (!parentWorkflowType) {
          return cb(new Error('missing parent workflow type: ' + parentWorkflowName
                              + ' - while processing workflow: ' + workflowName));
        }

        // Validate that the parent workflow has a task at the expected key
        // We need this later to find the output() if defined.
        const parentWorkflowHandler = parentWorkflowType.getHandler();
        const parentWFtaskObjects = parentWorkflowHandler.decider(parentWorkflowInitialEnv);
        const taskDefObj = parentWFtaskObjects[parentWorkflowTaskKey];

        parentWorkflowDetails = {
          name: parentWorkflowName,
          workflowType: parentWorkflowType,
          taskKey: parentWorkflowTaskKey,
          taskDefObj: taskDefObj,
        };

        if (!taskDefObj) {
          console.log('INPUT:', input);
          console.log('ERROR:', 'could not find task ' + parentWorkflowTaskKey + ' in parent workflow ' + parentWorkflowName);
          return cb(new Error('could not find task ' + parentWorkflowTaskKey + ' in parent workflow ' + parentWorkflowName));
        }
      }
    }

    const parameters = input.parameters;
    this.decide(parameters, task, workflowDetails, parentWorkflowDetails, cb);
  }


  decide(parameters: TaskGraphParameters,
         decisionTask: DecisionTask,
         workflowDetails?: {name: string, workflowType: WorkflowType, tasks: any},
         parentWorkflowDetails?: {
           name: string,
           workflowType: WorkflowType,
           taskKey: string,
           taskDefObj: any,
         },
         cb?: {(Error?)}) {

    const graph = parameters.graph;
    const groupedEvents = decisionTask.getGroupedEvents();
    const env = decisionTask.getEnv();

    let next = this.getNextNodes(graph, groupedEvents);
    let startCountByHandler = {};
    let startCountSubWorkflows = 0;

    // Pre validate all next node inputs against their schema if present
    if (workflowDetails) {
      for (let node of next.nodes) {
        let inputEnv = _.clone(env);

        const currentNodeTaskDefObj = workflowDetails.tasks[node.name];

        if (currentNodeTaskDefObj) {
          if (currentNodeTaskDefObj.input) {
            inputEnv = currentNodeTaskDefObj.input(env);
          }

          let {error} = this.validateSchema(inputEnv, node);

          if (error) {
            console.log('Error validating params: ', inputEnv, error);
            if (cb) {
              return cb(new Error(`Error validating ${node.name} params : ` + error));
            } else {
              throw new Error(`Error validating ${node.name} params : ` + error);
            }
          }
        }
      }
    }

    for (let node of next.nodes) {
      let inputEnv = _.clone(env);

      if (workflowDetails) {
        const currentNodeTaskDefObj = workflowDetails.tasks[node.name];

        if (currentNodeTaskDefObj && currentNodeTaskDefObj.input) {
          if (currentNodeTaskDefObj.input) {
            inputEnv = currentNodeTaskDefObj.input(env);
          }

          let {value} = this.validateSchema(inputEnv, node);

          console.log('--> WORKFLOW ' + workflowDetails.name + ' env is:\n', env,
            '\n--> ' + node.name + '->' +
            ' receives:\n', value);

          inputEnv = value;
        }
      }

      if (node.type === 'decision') {
        // TODO: somehow hand off to a child? need to make this more generic but just hard code for now...
        if (node.handler === 'taskGraph') {
          let tgNode = node as TaskGraphGraphNode;
          const shouldThrottle = this.throttleWorkflows(tgNode, graph, groupedEvents, startCountSubWorkflows);
          if (!shouldThrottle) {
            startCountSubWorkflows++;
            const maxRetry = tgNode.maxRetry || this.FTLConfig.getOpt('maxRetry');

            if (workflowDetails) {
              let parentEnv = decisionTask.getWorkflowTaskInput().env || {};
              tgNode.parentWorkflow.env = parentEnv;
              filteredStartChildWorkflow.bind(decisionTask)(tgNode.id, tgNode, {maxRetry: maxRetry}, inputEnv);
            } else {
              decisionTask.startChildWorkflow(tgNode.id, tgNode, {maxRetry: maxRetry});
            }
          }
        }
        else if (node.handler === 'recordMarker') {

          decisionTask.addMarker(node.id, node.parameters.status);
        }
        else {
          this.logger.warn('couldn\'t find hander for child node', node);
        }
      }
      else {
        const shouldThrottle = this.throttle(node, graph, groupedEvents, startCountByHandler);
        if (!shouldThrottle) {
          startCountByHandler[node.handler] = startCountByHandler[node.handler] || 0;
          startCountByHandler[node.handler]++;

          const handlerActType = this.activities.getModule(node.handler);
          if (!handlerActType) {
            throw new Error('missing activity type ' + node.handler);
          }

          let opts = this.buildOpts(node);
          opts['maxRetry'] = node.maxRetry || handlerActType.getMaxRetry() || this.FTLConfig.getOpt('maxRetry');

          if (workflowDetails) {
            filteredScheduleTask.bind(decisionTask)(node.id, node, handlerActType, opts, inputEnv);
          } else {
            decisionTask.scheduleTask(node.id, node, handlerActType, opts);
          }
        }
      }
    }

    const failedToReFail = decisionTask.rescheduleFailedEvents();
    const failedToReTimeOut = decisionTask.rescheduleTimedOutEvents();
    const failedToReschedule = failedToReFail.concat(failedToReTimeOut);

    if (failedToReschedule.length > 0) {
      this.logger.warn('failed to reschedule previously failed event(s)');

      // TODO: 1. If events have failed to be rescheduled, add a revert marker
      // TODO: 2. If there are no longer any pending events, build a list of those
      // TODO:    and schedule revert activities
      // TODO: 3. If all revert activities have completed, fail workflow execution
      // TODO: 4. If revert activities also fail, fail workflow execution
      if (groupedEvents && groupedEvents.marker && groupedEvents.marker['TaskFailed']) {
        // TODO: Handle taskFailed logic
        console.log('DETECTED TASKFAILED ON:', failedToReschedule[0], 'Processing revert, then failing workflow.');
        decisionTask.failWorkflow('failed to reschedule previously failed events', JSON.stringify(failedToReschedule).slice(0, 250));
      } else {
        // TODO: If no pending tasks, schedule revert for those that failed.
        // TODO: Otherwise only add marker.

        decisionTask.addMarker('TaskFailed', {});
        decisionTask.failWorkflow('failed to reschedule previously failed events', JSON.stringify(failedToReschedule).slice(0, 250));
      }

    } else if (next.finished) {
      // TODO: better results
      let outputFunc;

      // If there is an output func defined on the parent workflow use it to filter env
      if (workflowDetails) {
        let workflowHandler = workflowDetails.workflowType.getHandler();

        if (parentWorkflowDetails && parentWorkflowDetails.taskDefObj.output) {
          outputFunc = parentWorkflowDetails.taskDefObj.output;
        } else if (workflowHandler && workflowHandler.output) {
          outputFunc = workflowHandler.output;
        }
      }

      let outputEnv = outputFunc ? outputFunc(env) : env;
      if (workflowDetails) {
        filteredCompleteWorkflow.bind(decisionTask)({status: 'success'}, outputEnv);
      } else {
        decisionTask.completeWorkflow({status: 'success'});
      }
    }

    if (cb) { return cb(); }
  }

  private validateSchema(inputEnv, node) {
    let targetSchema;

    if (node.type === 'decision' && node.workflowName) {
      const workflowType = this.FTLConfig.workflows.getModule(node.workflowName);

      if (!workflowType) {
        throw new Error('missing workflow type ' + node.handler);
      }

      targetSchema = workflowType.getHandler().schema;
    } else {
      const handlerActType = this.activities.getModule(node.handler);
      if (!handlerActType) {
        throw new Error('missing activity type ' + node.handler);
      }

      targetSchema = handlerActType.ActivityHandler.getSchema();
    }

    const {error, value} = Joi.validate(inputEnv, targetSchema);

    return {error, value};
  }


  buildOpts(node: TaskGraphActivityNode): ConfigOverride {
    if (node.opts) {
      let opts = node.opts as any;
      if (opts.taskList) {
        opts.taskList = {
          name: opts.taskList
        };
      }
      return opts as ConfigOverride;
    } else {
      return {};
    }
  }

  throttle(node: TaskGraphNode,
           graph: TaskGraphGraph,
           groupedEvents: EventData,
           startCountByHandler: {[handler: string]: number}): boolean {

    const handlerActType = this.activities.getModule(node.handler);
    if (!handlerActType) { return false; }

    const maxConcurrent = handlerActType.getMaxConcurrent();
    if (maxConcurrent == null) { return false; }

    if (!groupedEvents.activity) { return false; }

    const startingCount = startCountByHandler[node.handler] || 0;
    let curRunningOfType = 0;
    for (var nodeId in groupedEvents.activity) {
      const curNode = this.getNodeDetails(graph, groupedEvents, nodeId);
      if (curNode.state === 'started' && curNode.node.handler === node.handler) {
        curRunningOfType++;
      }
    }

    if ((curRunningOfType + startingCount) >= maxConcurrent) { return true; }

    return false;
  }

  throttleWorkflows(node: TaskGraphGraphNode,
                    graph: TaskGraphGraph,
                    groupedEvents: EventData,
                    startCountSubWorkflows: number,
                    maxRunningWorkflow?: number): boolean {

    maxRunningWorkflow = maxRunningWorkflow || this.maxRunningWorkflow;

    let curRunningWorkflows = 0;

    if (!groupedEvents.workflow) {
      return false;
    }

    for (let nodeId in groupedEvents.workflow) {
      const curNode = this.getNodeDetails(graph, groupedEvents, nodeId);

      if (curNode.state === 'started') {
        curRunningWorkflows++;
      }
    }

    if ((curRunningWorkflows + startCountSubWorkflows) >= maxRunningWorkflow) {
      return true;
    }

    return false;
  }

  getNodeDetails(graph: TaskGraphGraph, grouped: EventData, name: string): NodeDetails {
    const node = graph.nodes[name];
    let type: string;
    let state: string;

    if (isTaskGraphGraphNode(node)) {
      type = 'workflow';
      state = (grouped[type] && grouped[type][name]) ? grouped[type][name].current : 'waiting';
    } else if (isTaskGraphMarkerNode(node)) {
      type = 'marker';
      state = (grouped[type] && grouped[type][name]) ? grouped[type][name].current : 'collapse';
    } else {
      type = node.type || 'activity';
      state = (grouped[type] && grouped[type][name]) ? grouped[type][name].current : 'waiting';
    }

    const deps = graph.edges[name] || [];
    return {id: node.id, node, type: type, deps: deps, state: state};
  }

  getNextNodes(graph, grouped): {nodes: TaskGraphNode[], finished: boolean} {
    const nodeDetails = this.getNodeDetails.bind(this, graph, grouped);
    let node = nodeDetails(graph.sinkNode);

    if (node.state === 'completed') {
      return {nodes: [], finished: true};
    }

    let haveLastNode = false;
    const sources = [graph.sinkNode];
    const nodes: {[nodeId: string]: TaskGraphNode} = {};

    while (sources.length) {
      const next = sources.shift();
      node = nodeDetails(next);
      // if given the collapse state, automatically add
      if (node.state === 'waiting' || node.state === 'collapse') {
        const depNodes = node.deps.map(nodeDetails);
        const notDone = depNodes.filter(function (n) { return n.state !== 'completed' && n.state !== 'collapse'; });
        if (notDone.length === 0) {
          if (node.id === graph.sinkNode) {
            haveLastNode = true;
          }
          nodes[node.id] = node.node;
        }
      }
      sources.push.apply(sources, node.deps);
    }
    return {nodes: _.values<TaskGraphNode>(nodes), finished: haveLastNode};
  }

  static getChildren(parameters: TaskGraphParameters): TaskGraphNode[] {
    return _.values(parameters.graph.nodes) as TaskGraphNode[];
  }

  static validateTask(parameters: any): string | null {
    if (!parameters.graph) {
      return 'missing "graph" field in parameters';
    }

    const graph = parameters.graph;
    const required = ['nodes', 'edges', 'sourceNode', 'sinkNode'];

    for (let key of required) {
      if (!graph[key]) {
        return 'missing ' + key + ' field in graph';
      }
    }
    return null;
  }

  static getHandlerName() {
    return 'taskGraph';
  }
}
