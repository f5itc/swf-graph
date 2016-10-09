import * as async from 'async';
import * as shortId from 'shortid';
import * as _ from 'lodash';


import { TaskGraphNode } from '../deciders/TaskGraph';

import { Task, WorkflowDef } from './interfaces';

import { TaskGraphBuilder, TaskGraphNodeDeps } from './TaskGraphBuilder';
import { genUtil } from './util';
import { Config } from '../Config';

// allow for overriding of some behavior via json
const OPT_FILE_NAME = 'opts.json';
// default to retrying a full workflow only once!
const GRAPH_MAX_RETRY = 1;

export interface ProcessorOpts {
  maxRetry?: number;
}

export interface IProcessor {
  process(args: any, cb: {(err: null | Error, tg: TaskGraphNode | null)});
}

export class Processor implements IProcessor {
  private currentPath: string[];
  private config: Config;
  private opts: ProcessorOpts;
  private workflowDef: WorkflowDef;

  constructor(config: Config, workflowDef: WorkflowDef, path: string[] | null, opts: ProcessorOpts) {
    this.workflowDef = workflowDef;
    this.config = config;
    this.opts = opts || {};

    var name = this.workflowDef.getHandlerName();
    this.currentPath = path && path.length ? path.concat(name) : [name];
  }

  process(args: any, cb: {(err: null | Error, tg: TaskGraphNode | null)}) {
    if (typeof args === 'function') {
      cb = args;
      args = {};
    }

    this.processWorkflowDef(args, this.workflowDef, cb);
  }

  processWorkflowDef(args: any, workflowDef: any, cb: {(err: Error | null, tg: TaskGraphNode | null)}) {

    const taskGraphObj = workflowDef.getTaskGraph();
    const taskGraphKeys = Object.keys(taskGraphObj);

    async.map<any, TaskGraphNode>(taskGraphKeys,
      this.processNode.bind(this, taskGraphObj, args), (err, tasks) => {
        if (err) { return cb(err, null); }

        tasks = _.compact(tasks);
        if (tasks.length === 0) { return cb(null, null); }

        cb(null, this.createTaskGraph(this.workflowDef.graphKey || this.workflowDef.getHandlerName(), args, tasks));
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

      let subWorkflowDef = new TargetWorkflow(this.config, this.opts);
      subWorkflowDef.graphKey = nodeName;
      let subProcessor = new Processor(this.config, subWorkflowDef, this.getCurrentPath(), this.opts);

      subProcessor.process(args, (err, taskGraph) => {
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
    return new TaskGraphBuilder(name, args, tasks, this).getGraph();
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
  wrapTask(args, name, taskDef): TaskGraphNode {
    let newNode = _.clone(taskDef) as TaskGraphNodeDeps;

    newNode.id = this.buildId(name);
    newNode.type = 'activity';
    newNode.name = name;
    newNode.deps = taskDef.dependsOn || [];
    newNode.maxRetry = taskDef.maxRetry || this.getMaxRetry();

    var path = this.getCurrentPath();

    if (!path) { path = [name]; }
    else { path = path.concat(name); }

    newNode.currentPath = path;
    return newNode;
  }

  getMaxRetry(): number {
    return this.opts.maxRetry || GRAPH_MAX_RETRY;
  }
}
