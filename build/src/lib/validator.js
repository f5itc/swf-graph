"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var validator = {
    validate: function (config, workflow) {
        if (workflow.type !== 'decision') {
            return 'top level workflow item must be decision task';
        }
        var leftToCheck = [workflow];
        while (leftToCheck.length) {
            var toCheck = leftToCheck.shift();
            if (typeof toCheck !== 'object') {
                return 'task is malformed';
            }
            if (!toCheck.name) {
                return "task " + toCheck.id + " does not have a name";
            }
            if (!toCheck.id) {
                return "task " + toCheck.name + " does not have an id";
            }
            if (!toCheck.handler) {
                return "task id: " + toCheck.id + " name: " + toCheck.name + " does not define a handler";
            }
            if (!toCheck.parameters) {
                return "task id: " + toCheck.id + " name: " + toCheck.name + " does not define parameters";
            }
            if (toCheck.maxRetry && typeof toCheck.maxRetry !== 'number') {
                return "task id: " + toCheck.id + " name: " + toCheck.name + " gave a maxRetry but of an invalid type";
            }
            if (typeof toCheck.parameters !== 'object') {
                return "task id: " + toCheck.id + " name: " + toCheck.name + " does not object for parameters";
            }
            var handler = null;
            if (toCheck.type === 'decision') {
                handler = config.deciders.getModule(toCheck.handler);
            }
            else if (toCheck.type === 'activity') {
                var actType = config.activities.getModule(toCheck.handler);
                if (actType) {
                    handler = actType.ActivityHandler;
                }
            }
            else {
                return "task id: " + toCheck.id + ", name: " + toCheck.name + " gave an invalid type";
            }
            if (!handler) {
                return (toCheck.type || 'activity') + " node name: " + toCheck.name + ",\n       id: " + toCheck.id + " did not define a known handler, gave " + toCheck.handler;
            }
            var invalidReason = handler.validateTask(toCheck.parameters);
            if (invalidReason) {
                return "task " + toCheck.name + ", id: " + toCheck.id + ", handler: " + toCheck.handler + ", was invalid: " + invalidReason;
            }
            if (toCheck.type === 'decision') {
                var decisionHandler = handler;
                var children = decisionHandler.getChildren(toCheck.parameters);
                if (!Array.isArray(children)) {
                    children = [children];
                }
                leftToCheck.push.apply(leftToCheck, children);
            }
        }
        return null;
    }
};
exports.validator = validator;
//# sourceMappingURL=validator.js.map