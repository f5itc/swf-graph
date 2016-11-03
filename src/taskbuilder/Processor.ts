import * as async from 'async';
import * as shortId from 'shortid';
import * as _ from 'lodash';


import { TaskGraphNode, ParentWorkflowDetails } from '../deciders/TaskGraph';
import { TaskGraphBuilder, TaskGraphNodeDeps } from './TaskGraphBuilder';
import { genUtil } from './util';
import { Config } from '../Config';
import { BaseWorkflow } from '../entities/workflow/BaseWorkflow';
import { Task } from './interfaces';

// allow for overriding of some behavior via json
const OPT_FILE_NAME = 'opts.json';
// default to retrying a full workflow only once!
const GRAPH_MAX_RETRY = 1;

export interface ProcessorOpts {
  maxRetry?: number;
}

export interface IProcessor {
  process(args: any, graphKey: string, cb: {(err: null | Error, tg: TaskGraphNode | null)});
}

export class Processor implements IProcessor {
  private currentPath: string[];
  private config: Config;
  private opts: ProcessorOpts;
  workflowDef: BaseWorkflow;
  parentWorkflow?: ParentWorkflowDetails | null;

  constructor(config: Config,
              workflowDef: BaseWorkflow,
              parentWorkflow: ParentWorkflowDetails | null,
              path: string[] | null,
              opts: ProcessorOpts) {

    this.workflowDef = workflowDef;
    this.parentWorkflow = parentWorkflow;

    this.config = config;
    this.opts = opts || {};

    var name = this.workflowDef.name;
    this.currentPath = path && path.length ? path.concat(name) : [name];
  }

  getWorkflowName(): string {
    return this.workflowDef.name;
  }

  process(args: any, graphKey: string, cb: {(err: null | Error, tg: TaskGraphNode | null)}) {
    if (typeof args === 'function') {
      cb = args;
      args = {};
    }

    this.processWorkflowDef(args, graphKey, this.workflowDef, cb);
  }

  processWorkflowDef(args: any, graphKey: string, workflowDef: BaseWorkflow, cb: {(err: Error | null, tg: TaskGraphNode | null)}) {

    const taskGraphObj = workflowDef.decider(args);
    const taskGraphKeys = Object.keys(taskGraphObj);

    async.map<any, TaskGraphNode>(taskGraphKeys,
      this.processNode.bind(this, taskGraphObj, args), (err, tasks) => {
        if (err) { return cb(err, null); }

        tasks = _.compact(tasks);
        if (tasks.length === 0) { return cb(null, null); }

        cb(null, this.createTaskGraph(graphKey || this.workflowDef.getHandlerName(), args, tasks));
      });
  }


  processNode(deciderObj: {}, args: any, nodeName: string, cb: {(err: Error | null, result?: any)}) {
    const node = deciderObj[nodeName];

    if (node.activity) {
      // If a simple activity, simply create a taskGraphNode with deps
      return cb(null, this.wrapTask(args, nodeName, node));
    } else if (node.workflow) {

      // Get workflow
      let TargetWorkflow = this.config.workflows.getModule(node.workflow);

      if (!TargetWorkflow) {
        return cb(new Error('No workflow found in registry for:' + node.workflow));
      }

      let parentWorkflow = {
        name: this.workflowDef.name,
        taskKey: nodeName
      };

      // If maxRetry set on this node, mutate opts passed to subProcessor accordingly
      let subOpts = _.clone(this.opts);

      if (node.maxRetry) {
        subOpts.maxRetry = node.maxRetry;
      }

      let subProcessor = new Processor(this.config, TargetWorkflow.getHandler(),
        parentWorkflow, this.getCurrentPath(), subOpts);

      subProcessor.process(args, nodeName, (err, taskGraph) => {
        let newNode;

        if (taskGraph) {
          newNode = _.clone(taskGraph) as TaskGraphNodeDeps;
          // TODO: Duplicate prop; probably can do this better.
          newNode.deps = node.dependsOn;
        }
        cb(err, newNode);
      });
    } else {
      throw new TypeError('Missing prop - must have activity or workflow');
    }
  }

  createTaskGraph(name: string, args: any, tasks): TaskGraphNode {
    let graph = new TaskGraphBuilder(name, args, tasks, this).getGraph();

    return graph;
  }

  getParentWorkflowDetails() {
    return this.parentWorkflow;
  }

  getCurrentPathStr() {
    var currPath = this.getCurrentPath();
    if (!currPath) {
      return '';
    } else {
      return currPath.join('->');
    }
  }

  getCurrentPath(): string[] {
    return this.currentPath;
  }

  buildGraphName(prefix): string {
    prefix = prefix || this.getCurrentPathStr() + '->';

    return `${prefix}_${shortId.generate()}`;
  }

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

  buildId(name: string) {
    return `${name}_${shortId.generate()}`;
  }

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
  wrapTask(args: any, name: string, taskDef: Task): TaskGraphNode {
    var path = this.getCurrentPath();

    if (!path) { path = [name]; }
    else { path = path.concat(name); }

    let newTaskGraphNodeDeps: TaskGraphNodeDeps;
    let newNode = _.clone(taskDef);

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
      workflow: {name: this.getWorkflowName()}
    };

    return newTaskGraphNodeDeps;
  }


  getMaxRetry(): number {
    return this.opts.maxRetry || GRAPH_MAX_RETRY;
  }
}
