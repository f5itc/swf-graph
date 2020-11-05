"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// runs any generic bash script
var child_process_1 = require("child_process");
var aws_sdk_1 = require("aws-sdk");
var Joi = require("joi");
var MAX_LENGTH = 32768;
var Bluebird = require("bluebird");
exports.default = {
    version: '1.0',
    execute: function (params) {
        this.script = params.script;
        this.scriptUrl = params.scriptUrl;
        this.bucket = params.bucket;
        this.command = params.command || 'bash';
        this.args = params.args || ['-c'];
        this.s3 = new aws_sdk_1.S3();
        return Bluebird.fromCallback(function (cb) {
            if (this.scriptUrl && this.bucket) {
                this.runS3Script(cb);
            }
            else {
                this.runScript(this.script, cb);
            }
        });
    },
    schema: Joi.object({
        id: Joi.string().guid().required(),
    }).required(),
    runS3Script: function (cb) {
        var _this = this;
        this.s3.getObject({
            Bucket: this.bucket,
            Key: this.scriptUrl
        }, function (err, resp) {
            if (err) {
                return cb(err, null);
            }
            var script = resp.Body.toString('utf8');
            _this.runScript(script, cb);
        });
    },
    output: function (result) {
        return { status: 'complete', env: result };
    },
    runScript: function (script, cb) {
        var _this = this;
        var args = this.args.concat([script.trim()]);
        var scr = this.scr = child_process_1.spawn(this.command, args);
        var output = {
            stdout: '',
            stderr: ''
        };
        scr.stdout.setEncoding('utf8');
        scr.stderr.setEncoding('utf8');
        scr.stdout.on('data', function (d) {
            output.stdout += d;
        });
        scr.stderr.on('data', function (d) {
            output.stderr += d;
        });
        scr.on('error', function (err) {
            if (_this.stopped) {
                return;
            }
            if (_this.cbCalled) {
                return;
            }
            _this.cbCalled = true;
            return cb(err, null);
        });
        scr.on('exit', function (exitCode, signal) {
            if (_this.stopped) {
                return;
            }
            if (_this.cbCalled) {
                return;
            }
            _this.cbCalled = true;
            if (exitCode !== 0) {
                return cb(new Error("script exited with non-zero exit code: " + exitCode + " signal: " + signal), _this.truncateOutput(output));
            }
            cb(null, _this.truncateOutput(output));
        });
    },
    truncateOutput: function (output) {
        if ((output.stdout.length + output.stderr.length) < MAX_LENGTH) {
            return output;
        }
        // give some fuzz to account for serializing the JSON
        output.stdout = output.stdout.substring(0, Math.floor(MAX_LENGTH / 2) - 10);
        output.stderr = output.stderr.substring(0, Math.floor(MAX_LENGTH / 2) - 10);
        return output;
    },
    stop: function (cb) {
        var _this = this;
        if (this.cbCalled) {
            return;
        }
        this.stopped = true;
        this.scr.on('exit', function (exitCode, signal) {
            if (_this.alreadyKilled) {
                return;
            }
            _this.alreadyKilled = true;
            clearTimeout(_this.forceKillTimeout);
            cb(null, 'script killed in response to signal : ' + signal);
        });
        this.forceKillTimeout = setTimeout(function () { return _this.scr.kill('SIGKILL'); }, 1000);
        this.scr.kill();
    },
    status: function () {
        return 'running';
    },
    validateTask: function (params) {
        var haveS3Script = (params.scriptUrl && params.bucket);
        var haveTextScript = !!params.script;
        if (!haveS3Script && !haveTextScript) {
            return 'require either scriptUrl and bucket params or script param';
        }
        return null;
    }
};
//# sourceMappingURL=script.js.map