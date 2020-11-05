"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var chai_1 = require("chai");
var Config_1 = require("../src/Config");
describe('ConfigTest', function () {
    describe('constructor', function () {
        it('should fail when given an empty object', function () {
            var userFunc = function () {
                return {};
            };
            chai_1.assert.throws(function () { return new Config_1.Config(userFunc); });
        });
    });
});
//# sourceMappingURL=ConfigTest.js.map