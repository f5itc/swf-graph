import * as shortId from 'shortid';
import * as _ from 'lodash';

import { BaseWorkflow } from './BaseWorkflow';
import { BaseHandler } from '../BaseHandler';
import { Config } from '../../Config';
import { Workflow as SWFWorkflow } from 'simple-swf/build/src/entities';
import { Processor } from '../../taskbuilder/Processor';

import { inspect } from 'util';

export class WorkflowType implements BaseHandler {
  WorkflowHandler: BaseWorkflow;
  config: Config;

  version: string;
  maxRetry: number;

  constructor(workflowObj: BaseWorkflow, config: Config) {
    this.WorkflowHandler = workflowObj;
    this.version = workflowObj.version || config.defaultVersion;
    this.maxRetry = workflowObj.maxRetry || config.getOpt('maxRetry');

    this.config = config;
  }

  submit(input: any, initialEnv: any, opts: any, SWFWorkflow: SWFWorkflow, cb: {(err: Error | null, result?: any)}) {
    let processor = new Processor(this.config, this.WorkflowHandler, null, {});

    processor.process(_.clone(input), '', (err, taskGraph) => {
      if (err) { return cb(err); }
      console.log('TASKGRAPH:', inspect(taskGraph, null, 10));

      // process.exit(0);
      SWFWorkflow.startWorkflow(this.getHandlerName() + '_' + shortId.generate(),
        taskGraph, initialEnv, opts,
        (err, info) => {
          if (err) { return cb(err); }

          this.config.logger.info(info);
          cb(null, info);
        });
    });
  }

  getHandler(): BaseWorkflow {
    return this.WorkflowHandler;
  }

  getHandlerName(): string {
    return this.WorkflowHandler.getHandlerName();
  }

  validateTask(parameters: any): string | null {
    return this.WorkflowHandler.validateTask(parameters);
  }

  getMaxConcurrent(): number | null {
    return this.WorkflowHandler.maxConcurrent || null;
  }

  getMaxRetry(): number | null {
    return this.WorkflowHandler.maxRetry || null;

  }
}
