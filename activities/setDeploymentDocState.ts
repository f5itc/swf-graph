import { Config, Logger, FTLActivity, FTLRunCallback } from '../src';

export default class SetDeploymentDocState extends FTLActivity {

  logger: Logger;
  mult: number;

  constructor(params: any, env: any, config: Config) {
    super(params, env, config);
    this.mult = params ? params.mult : 5;
    this.logger = config.logger;
  }

  run(cb: FTLRunCallback) {
    setTimeout(() => {
      this.logger.info(`setDeploymentDocState ran ${this.mult}`);
      cb(null, {hooray: 'yall'}, {setDeploymentDocState: Math.round(Math.random() * this.mult)});
    }, 1000);
  }

  status(): any {
    return 'setDeploymentDocState';
  }

  stop(cb) {
    cb();
  }

  static validateTask(parameters: any): string | null {
    if (!parameters.mult || !(typeof parameters.mult === 'number')) {
      return 'missing parameter mult or number';
    }
    return null;
  }
}
