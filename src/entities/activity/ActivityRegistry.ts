import * as path from 'path';
import * as Joi from 'joi';
import * as bluebird from 'bluebird';
import * as retry from 'bluebird-retry';
import { ActivityType } from './ActivityType';
import { FTLActivity, FTLRunCallback } from './BaseActivity';
import { Registry } from '../Registry';

const activitySchema = Joi.object({
  execute: Joi.func().maxArity(1).required(),
  output: Joi.func().maxArity(1).required(),
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

      getSchema() { return activityDefObj.schema; };

      static getSchema() { return activityDefObj.schema; };

      run(params, cb) {
        // Ensure the provided object is correct shape (may default some props)
        const {error, value} = Joi.validate<{error?: Error, value: object}>(params, activityDefObj.schema);

        if (error) {
          this.logger.fatal(`Error on activity worker: ${name} params: `, {
            error, params
          });
          cb(new Error(`Error validating ${name} params : ` + error));
        }

        let attemptNumber = 1;

        function executeOnce(value: any) {
          if (attemptNumber > 1) {
            this.logger.info(`Retrying activity: ${name}, attempt #${attemptNumber}`,
                {activityName: name, attemptNumber});
          }

          attemptNumber += 1;
          return bluebird.try(() => ( activityDefObj.execute.bind(this)(value)));
        };

        // Ensure retryable errors retry execute method until they succeed
        return retry(executeOnce, {
          interval: 1000,
          backoff: 2,
          max_interval: 5 * (60 * 1000), // 5 minutes
          max_tries: 100,
          predicate: (err) => err.retryable === true || err.statusCode >= 500,
          throw_original: true,
          context: this,
          args: [ value ]
        }).bind(this).then(function (results) {
          return bluebird.try(() => ( activityDefObj.output.bind(this)(results)))
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
