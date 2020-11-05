/// <reference types="bluebird" />
import * as Joi from 'joi';
import * as Bluebird from 'bluebird';
declare var _default: {
    version: string;
    execute(params: any): Bluebird<any>;
    schema: Joi.ObjectSchema;
    runS3Script(cb: (err: Error | null, res: any) => any): void;
    output(result: any): {
        status: string;
        env: any;
    };
    runScript(script: string, cb: (err: Error | null, res: any) => any): void;
    truncateOutput(output: {
        stdout: string;
        stderr: string;
    }): {
        stdout: string;
        stderr: string;
    };
    stop(cb: any): void;
    status(): string;
    validateTask(params: any): "require either scriptUrl and bucket params or script param" | null;
};
export default _default;
