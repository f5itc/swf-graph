"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Sinon = require("sinon");
var _ = require("lodash");
var SinonHelper = (function () {
    function SinonHelper() {
    }
    SinonHelper.prototype.stubClass = function (instanceClass) {
        var stubbed = this.stub(_.clone(instanceClass.prototype));
        if (typeof stubbed.stubMethod === 'function') {
            throw new Error('have function named stubMethod, conflicts!');
        }
        stubbed.stubMethod = function (name) {
            return stubbed[name];
        };
        return stubbed;
    };
    SinonHelper.prototype.mockClass = function (instanceClass) {
        var TmpCons = function () { };
        TmpCons.prototype = instanceClass.prototype;
        var inst = new TmpCons;
        var mocked = this.mock(inst);
        mocked.object = inst;
        return mocked;
    };
    SinonHelper.prototype.spyClass = function (instanceClass) {
        var spied = this.spy(_.clone(instanceClass.prototype));
        if (typeof spied.spyMethod === 'function') {
            throw new Error('have function named spyMethod, conflicts!');
        }
        spied.spyMethod = function (name) {
            return spied[name];
        };
        return spied;
    };
    return SinonHelper;
}());
exports.SinonHelper = SinonHelper;
function newContext() {
    var sandbox = Sinon.sandbox.create();
    var helper = new SinonHelper;
    helper = _.extend(helper, sandbox);
    after(function () {
        sandbox.restore();
    });
    return helper;
}
exports.default = newContext;
//# sourceMappingURL=sinonHelper.js.map