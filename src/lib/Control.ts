import * as path from 'path';
import * as async from 'async';
import * as shortId from 'shortid';
import * as Joi from 'joi';

import * as _ from 'lodash';

import { Config } from '../Config';
import { ActivityWorker, DeciderWorker } from '../workers';
import { registration, InitedEntities } from '../init';
import { validator } from '../lib/validator';
import { Workflow } from 'simple-swf/build/src/entities';

import { Processor } from '../taskbuilder/';
import { StringToStream } from './StringToStream';

export class Control {
  config: Config;
  workflow: Workflow;
  activityWorker?: ActivityWorker;
  deciderWorker?: DeciderWorker;

  constructor() {
  }

  start(args: any, cb: {(Error?)}) {
    this.init(args.config, (err, entities) => {
      if (err) { return cb(err); }

      this.startWorkers(args, cb);
    });
  }

  init(configObj: any, cb: {(err: Error | null, entities?: InitedEntities)}) {
    let configFunc = (() => (configObj));
    const config = new Config(configFunc);

    this.config = config;

    registration.init(config, (err, entities) => {
      if (err) { return cb(err); }

      this.activityWorker = entities!.activityWorker;
      this.deciderWorker = entities!.deciderWorker;
      this.workflow = entities!.workflow;

      cb(null, entities);
    });
  }

  startWorkers(args: any, cb: {(Error?)}) {
    function toStop(worker: ActivityWorker | DeciderWorker, name: 'activity' | 'decider', cb: {(Error?)}) {
      worker.on('error', (err: Error, execution?: any) => {
        let withExecution = execution ? ` with execution ${execution.id}` : '';
        this.config.logger.fatal(`error from ${name} worker${withExecution}`, {
          err,
          execution
        });
        this.config.notifier.sendError('workerError', {
          workerName: name,
          err
        }, (err) => {
          if (err) {
            this.config.logger.fatal('unable to send notifier alert!', {err});
          }
          return cb(err);
        });
      });
    }

    const workers = {};
    if (args.activity) {
      toStop.call(this, this.activityWorker, 'activity', cb);
      workers['activityWorker'] = this.activityWorker;
    }
    if (args.decider) {
      toStop.call(this, this.deciderWorker, 'decider', cb);
      workers['deciderWorker'] = this.deciderWorker;
    }
    this.startActivityWorker(args.activity, (err) => {
      if (err) {
        return cb(err);
      }
      this.startDeciderWorker(args.decider, (err) => {
        if (err) {
          return cb(err);
        }
        this.config.logger.info('started workers');
      });
    });
    let gotSigint = false;
    process.on('SIGINT', () => {
      if (gotSigint) {
        this.config.logger.warn('forcefully exiting, some tasks may have left an invalid state');
        return process.exit(1);
      }
      this.config.logger.info('signalling workers to exit cleanly, ctrl+c again to immediately exit');
      gotSigint = true;
      async.each(Object.keys(workers), (name, cb) => {
        let worker = workers[name];
        worker.stop((err) => {
          if (err) {
            return cb(err);
          }
          this.config.logger.info(`stopped ${name} worker`);
          cb();
        });
      }, cb);
    });
  }

  startActivityWorker(shouldStart: boolean, cb: {(err: Error | null, s: boolean)}) {
    if (!shouldStart) {
      return cb(null, false);
    }
    if (!this.activityWorker) {
      return cb(new Error('init not called'), false);
    }
    this.activityWorker.start((err) => {
      if (err) {
        return cb(err, false);
      }
      this.config.logger.info('started activity worker');
      cb(null, true);
    });
  }

  startDeciderWorker(shouldStart: boolean, cb: {(err: Error | null, s: boolean)}) {
    if (!shouldStart) {
      return cb(null, false);
    }
    if (!this.deciderWorker) {
      return cb(new Error('init not called'), false);
    }
    this.deciderWorker.start((err) => {
      if (err) {
        return cb(err, false);
      }
      this.config.logger.info('started decider worker');
      cb(null, true);
    });
  }

  submitWorkflowExecution(workflowName: string, input: any, SWFOpts: any,
                          cb: {(err?: Error | null, result?: any)}) {

    let config = this.config;
    let workflowRegistry = config.workflows;
    let TargetWorkflow = workflowRegistry.getModule(workflowName);

    if (!TargetWorkflow) {
      return cb(null, new Error('No workflow found in registry for:' + workflowName));
    }

    let workflowSchema = TargetWorkflow.getHandler().schema;

    // Ensure the provided object has the correct shape
    const {error} = Joi.validate(input, workflowSchema);

    if (error) {
      return cb(new Error(`Error validating ${workflowName} workflow params: ` + error));
    }


    TargetWorkflow.submit(input, SWFOpts, this.workflow,
      (err, info) => {
        if (err) { return cb(err); }

        config.logger.info('Submitted workflow ' + info);
        cb(info);
      });
  }
}
