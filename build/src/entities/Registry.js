"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var path = require("path");
var fs = require("fs");
var _ = require("lodash");
var Registry = (function () {
    function Registry(locations, config) {
        this.config = config;
        this.registry = {};
        this.loadModules(locations);
    }
    Registry.prototype.loadModules = function (locations) {
        var activities = _.flatten(locations.map(this.loadLocation.bind(this)));
        for (var _i = 0, activities_1 = activities; _i < activities_1.length; _i++) {
            var activity = activities_1[_i];
            this.registry[activity.getHandlerName()] = activity;
        }
    };
    Registry.prototype.loadLocation = function (location) {
        // handle absolute and relative locations
        if (location.charAt(0) === '.' || location.charAt(0) === '/') {
            return this.loadFile(true, location);
        }
        this.config.logger.info("loading module " + location);
        return [this.wrapModule(location, require(location))];
    };
    Registry.prototype.loadFile = function (loadDirs, location) {
        var stat = fs.statSync(location);
        var ext = path.extname(location);
        if (stat.isFile() && ext !== '.js') {
            return [];
        }
        if (stat.isFile() && location.slice(-3) === '.js') {
            this.config.logger.info("loading file " + location);
            return [this.wrapModule(location, require(location))];
        }
        if (stat.isDirectory() && loadDirs) {
            this.config.logger.info("loading directory " + location);
            var locations = fs.readdirSync(location).map(function (l) { return path.join(location, l); });
            // use this to stop recursion for now
            return _.flatten(locations.map(this.loadFile.bind(this, false)));
        }
        return [];
    };
    Registry.prototype.getModule = function (name) {
        return this.registry[name];
    };
    Registry.prototype.getModules = function () {
        return _.values(this.registry);
    };
    return Registry;
}());
exports.Registry = Registry;
//# sourceMappingURL=Registry.js.map