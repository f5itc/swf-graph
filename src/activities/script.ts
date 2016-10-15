// runs any generic bash script
import { spawn, ChildProcess } from 'child_process';
import { S3 } from 'aws-sdk';
import { FTLActivity } from '../../src';
import { Config } from '../Config';
import * as Joi from 'joi';
const MAX_LENGTH = 32768;

import * as Bluebird from 'bluebird';

export default {
  version: '1.0',

  execute(params) {
    this.script = params.script;
    this.scriptUrl = params.scriptUrl;
    this.bucket = params.bucket;
    this.command = params.command || 'bash';
    this.args = params.args || ['-c'];
    this.s3 = new S3();


    return Bluebird.fromCallback(function (cb) {
      if (this.scriptUrl && this.bucket) {
        this.runS3Script(cb);

      } else {
        this.runScript(this.script, cb);
      }
    });

  },

  schema: Joi.object({
    id: Joi.string().guid().required(),
  }).required(),

  runS3Script(cb: {(err: Error | null, res: any)}) {
    this.s3.getObject({
      Bucket: this.bucket!,
      Key: this.scriptUrl!
    }, (err, resp) => {
      if (err) { return cb(err, null); }

      const script = resp.Body.toString('utf8');
      this.runScript(script, cb);
    });
  },

  output(result) {
    return {status: 'complete', env: result};
  },

  runScript(script: string, cb: {(err: Error | null, res: any)}) {
    const args = this.args.concat([script.trim()]);
    const scr = this.scr = spawn(this.command, args);

    let output = {
      stdout: '',
      stderr: ''
    };

    scr.stdout.setEncoding('utf8');
    scr.stderr.setEncoding('utf8');
    scr.stdout.on('data', (d) => {
      output.stdout += d;
    });
    scr.stderr.on('data', (d) => {
      output.stderr += d;
    });

    scr.on('error', (err) => {
      if (this.stopped) { return; }
      if (this.cbCalled) { return; }
      this.cbCalled = true;

      return cb(err, null);
    });
    scr.on('exit', (exitCode, signal) => {
      if (this.stopped) { return; }
      if (this.cbCalled) { return; }
      this.cbCalled = true;

      if (exitCode !== 0) {
        return cb(new Error(`script exited with non-zero exit code: ${exitCode} signal: ${signal}`), this.truncateOutput(output));
      }

      cb(null, this.truncateOutput(output));
    });
  },

  truncateOutput(output: {stdout: string, stderr: string}): {stdout: string, stderr: string} {
    if ((output.stdout.length + output.stderr.length) < MAX_LENGTH) {
      return output;
    }

    // give some fuzz to account for serializing the JSON
    output.stdout = output.stdout.substring(0, Math.floor(MAX_LENGTH / 2) - 10);
    output.stderr = output.stderr.substring(0, Math.floor(MAX_LENGTH / 2) - 10);
    return output;
  },

  stop(cb) {
    if (this.cbCalled) { return; }
    this.stopped = true;
    this.scr.on('exit', (exitCode, signal) => {
      if (this.alreadyKilled) { return; }
      this.alreadyKilled = true;

      clearTimeout(this.forceKillTimeout);
      cb(null, 'script killed in response to signal : ' + signal);
    });

    this.forceKillTimeout = setTimeout(() => this.scr.kill('SIGKILL'), 1000);
    this.scr.kill();
  },

  status() {
    return 'running';
  },

  validateTask(params) {
    var haveS3Script = (params.scriptUrl && params.bucket);
    var haveTextScript = !!params.script;

    if (!haveS3Script && !haveTextScript) {
      return 'require either scriptUrl and bucket params or script param';
    }

    return null;
  }
};
