import {
  Activity as SWFActivity,
  ActivityType,
  Workflow, WorkflowExecution
} from 'simple-swf/build/src/entities';

import { TaskStatus } from 'simple-swf/build/src/interfaces';
import { ActivityTask } from 'simple-swf/build/src/tasks';
import { StopReasons } from 'simple-swf/build/src/interfaces';

import { Config } from '../../Config';
export interface FTLRunCallback {
  (err: Error | null, status?: any, env?: any): any;
}
// we make this nicer for non-TS implementors by throwing erros instead
// of using an abstract class
export class FTLActivity {
  constructor(config?: Config) {
  }

  run(params, cb: FTLRunCallback) {
    throw new Error('run must be extended by child class');
  }

  status(): any {
    throw new Error('status must be extended by child class');
  }

  stop(cb: {(Error?)}) {
    throw new Error('stop must be extended by child class');
  }

  getSchema() {}

  static getHandlerName(): string {
    return '';
  }

  static getSchema(): string {
    return '';
  }

  static validateTask(parameters: any): string | null {
    throw new Error('must provide validateTask function');
  }

  static maxConcurrent?: number;
  static maxRetry?: number;
  static version?: string;
}

export class BaseActivity extends SWFActivity {
  activityClass: typeof FTLActivity;
  config: Config;
  activity: FTLActivity;

  constructor(config: Config,
              activityClass: typeof FTLActivity,
              workflow: Workflow,
              activityType: ActivityType,
              task: ActivityTask) {
    super(workflow, activityType, task);
    this.activityClass = activityClass;
    this.config = config;
  }

  run(input: any, env: any, initialEnv: any | null, cb: {(err: Error | null, status: TaskStatus)}) {
    this.activity = new this.activityClass(this.config);
    // input is activity descriptor node

    let activityInput = input || {};
    let thisActivityDefObj;
    let workflowName;

    let isWorkflowTask = input.workflow;
    if (isWorkflowTask) {
      // Running as a workflow.
      workflowName = input.workflow.name;
      const workflowType = this.config.workflows.getModule(workflowName);

      if (!workflowType) {
        throw new Error('missing workflow type ' + workflowName);
      }

      const workflowHandler = workflowType.getHandler();
      const activities = workflowHandler.decider(initialEnv);
      thisActivityDefObj = activities[input.name];
      activityInput = env;
    }

    this.activity.run(activityInput, (err: Error, status, env) => {
      if (err) {
        this.config.logger.fatal('ERROR:', {err});
        this.config.logger.fatal(err.stack || '');
        return cb(err, {status: 'failure'});
      }
      let info: any = null;
      let textStatus: string;
      if (typeof status === 'string') {
        textStatus = status;

      } else {
        textStatus = 'success';
        info = status;
      }

      // If workflow task node defines its own output(), run env through it
      if (isWorkflowTask && thisActivityDefObj && thisActivityDefObj.output) {
        let outputValue = thisActivityDefObj.output(env).env;

        if (!outputValue) {
          this.config.logger.fatal('ERROR: Output returned no value in ' + input.workflow.name + ' for ' + input.name);
          return cb(new Error('ERROR: Output returned no value in ' + input.workflow.name + ' for ' + input.name), {status: 'failure'});
        }

        this.config.logger.info(input.currentPath.join('->'), {
          preOutput: env,
          output: outputValue
        });
        env = outputValue;
      }

      cb(null, {status: textStatus, info, env});
    });
  }

  status(): any {
    return this.activity.status();
  }

  stop(reason: StopReasons, cb: {(Error?)}) {
    this.config.logger.debug('calling stop on activity');
    this.activity.stop((err) => {
      if (err) {
        return cb(err);
      }
      this.config.logger.debug('activity stopped');
      cb();
    });
  }
}
