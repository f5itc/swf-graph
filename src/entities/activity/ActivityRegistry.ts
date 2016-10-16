import * as path from 'path';
import * as Joi from 'joi';
import * as bluebird from 'bluebird';

import { ActivityType } from './ActivityType';
import { FTLActivity, FTLRunCallback } from './BaseActivity';
import { Registry } from '../Registry';
import { Config } from '../../Config';

const activitySchema = Joi.object({
  execute: Joi.func().arity(1).required(),
  output: Joi.func().arity(1).required(),
  schema: Joi.object().required(),
  version: Joi.string().min(3).required(),
  getHandlerName: Joi.func()
}).unknown(true).required();

export class ActivityRegistry extends Registry<ActivityType> {
  wrapModule(filename: string, activityDefObj: any): ActivityType {
    if (activityDefObj.default) { activityDefObj = activityDefObj.default; }


    let name: string;
    activityDefObj.getHandlerName = function (): string {
      return path.basename(filename, path.extname(filename));
    };

    name = activityDefObj.getHandlerName();
    if (!name) {
      throw new Error('missing activity name');
    }

    // Ensure the provided object has the correct shape
    const {error} = Joi.validate(activityDefObj, activitySchema);

    if (error) {
      throw new Error(`Error validating ${name} activity: ` + error);
    }

    interface WrapperHasLogger {
      logger: any;
    }

    class FTLWrapper <T extends FTLActivity> implements WrapperHasLogger {
      logger: any;

      constructor(config) { this.logger = config.logger; };

      run(params, cb) {
        // Ensure the provided object has the correct shape
        const {error} = Joi.validate(params, activityDefObj.schema);

        if (error) {
          cb(new Error(`Error validating ${name} params : ` + error));
        }

        return bluebird.resolve(activityDefObj.execute.bind(this)(params))
          .then(function (results) {
            return bluebird.resolve(activityDefObj.output(results))
              .then(function (res) {
                cb(null, res.status, res.env);
              });
          }).catch(function (e) {
            return cb(e);
          });
      };


      status() { return activityDefObj.status ? activityDefObj.status() : ''; };

      stop() { return activityDefObj.stop ? activityDefObj.stop() : () => {}; };

      static getHandlerName() { return activityDefObj.getHandlerName(); };

      static validateTask(parameters: any): string | null {
        return '';
      }
    }

    return new ActivityType(FTLWrapper as typeof FTLActivity, filename, this.config);
  }
}
