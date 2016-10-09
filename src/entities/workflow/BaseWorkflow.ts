import { DecisionTask } from 'simple-swf/build/src/tasks';

import * as Joi from 'joi';

import { Config } from '../../Config';
import { ActivityRegistry } from '../activity';
import { Logger } from '../../lib';

export class BaseWorkflow {
  FTLConfig: Config;
  activities: ActivityRegistry;
  logger: Logger;
  graphKey?: string;

  version: string;
  schema: Joi.Schema;

  maxRetry?: number;

  constructor(config: Config, options: any) {
    this.FTLConfig = config;
    this.activities = config.activities;
    this.logger = config.logger;

    this.version = options.version;
    this.schema = options.schema;
    this.maxRetry = options.maxRetry;
  }

  getTaskGraph(): any {
    throw new Error('must implement getTaskGraph()');
  }

  output(results: any): any {
    throw new Error('must implement output()');
  }

  static validateTask(parameters: any): string | null {
    throw new Error('validateTask must be overriden');
  }

  // we return an empty string here as we need the method, but we want to try our default implentation
  getHandlerName(): string {
    return '';
  }

  // we return an empty string here as we need the method, but we want to try our default implentation
  static getHandlerName(): string {
    return '';
  }

}
