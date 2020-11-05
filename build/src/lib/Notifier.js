"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var events_1 = require("events");
var aws_sdk_1 = require("aws-sdk");
var SNSNotifier = (function (_super) {
    __extends(SNSNotifier, _super);
    function SNSNotifier(config, mainConfig) {
        var _this = _super.call(this) || this;
        _this.config = config;
        _this.mainConfig = mainConfig;
        _this.snsClient = config.snsClient || new aws_sdk_1.SNS({ region: _this.config.region });
        return _this;
    }
    SNSNotifier.prototype.sendInfo = function (summary, event, cb) {
        this.sendLevel('info', summary, event, cb);
    };
    SNSNotifier.prototype.sendWarn = function (summary, event, cb) {
        this.sendLevel('warn', summary, event, cb);
    };
    SNSNotifier.prototype.sendError = function (summary, event, cb) {
        this.sendLevel('error', summary, event, cb);
    };
    SNSNotifier.prototype.getArn = function () {
        return "arn:aws:sns:" + this.config.region + ":" + this.config.awsAccountId + ":" + this.config.snsTopicName;
    };
    SNSNotifier.prototype.sendLevel = function (level, summary, event, cb) {
        var _this = this;
        var params = {
            TopicArn: this.getArn(),
            Message: this.buildMessage(level, summary, event),
            Subject: level + ' - ' + summary
        };
        if (this.config.silenceNotifier) {
            return;
        }
        cb = cb || (function (err, resp) {
            if (err) {
                return _this.emit('error', err);
            }
            _this.emit('response', resp);
        });
        this.snsClient.publish(params, cb);
    };
    SNSNotifier.prototype.buildMessage = function (level, summary, event) {
        var msg = JSON.stringify({
            domain: this.mainConfig.domainName,
            level: level,
            summary: summary,
            event: event
        });
        return msg;
    };
    return SNSNotifier;
}(events_1.EventEmitter));
exports.SNSNotifier = SNSNotifier;
//# sourceMappingURL=Notifier.js.map