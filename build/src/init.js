"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var haveRegistered = false;
var entities_1 = require("simple-swf/build/src/entities");
var workers_1 = require("./workers");
var registration = {
    registerDomain: function (config, cb) {
        config.domain.ensureDomain(config.getConfigFor('swf.domain'), function (err, created) {
            if (err) {
                return cb(err);
            }
            config.logger.info("domain  " + config.domain.name + " " + (created ? 'was created' : 'already exists'));
            cb(null, config.domain);
        });
    },
    registerWorkflowType: function (config, domain, cb) {
        var workflow = new entities_1.Workflow(domain, config.workflowName, config.defaultVersion, config.fieldSerializer);
        workflow.ensureWorkflow(config.getConfigFor('swf.workflow'), function (err, created) {
            if (err) {
                return cb(err);
            }
            config.logger.info("workflow " + workflow.name + " " + (created ? 'was created' : 'already exists'));
            cb(null, workflow);
        });
    },
    init: function (config, cb) {
        if (haveRegistered) {
            return cb(null);
        }
        registration.registerDomain(config, function (err, domain) {
            if (err) {
                return cb(err);
            }
            registration.registerWorkflowType(config, domain, function (err, workflow) {
                if (err) {
                    return cb(err);
                }
                haveRegistered = true;
                var activityWorker = registration.initActivityWorker(config, workflow);
                var deciderWorker = registration.initDeciderWorker(config, workflow);
                cb(null, { workflow: workflow, domain: domain, activityWorker: activityWorker, deciderWorker: deciderWorker, config: config });
            });
        });
    },
    initActivityWorker: function (config, workflow) {
        var worker = new workers_1.ActivityWorker(workflow, config, config.getConfigFor('swf.activityWorker'));
        config.activities.getModules().map(function (actType) { return worker.registerActivityType(actType); });
        return worker;
    },
    initDeciderWorker: function (config, workflow) {
        var TaskGraph = config.deciders.getModule('taskGraph');
        if (!TaskGraph) {
            throw new Error('missing taskGraph plugin!');
        }
        var taskGraphDecider = new TaskGraph(config, workflow);
        return new workers_1.DeciderWorker(taskGraphDecider, config, config.getConfigFor('swf.deciderWorker'));
    }
};
exports.registration = registration;
//# sourceMappingURL=init.js.map