"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var path = require("path");
var fs = require("fs");
var async = require("async");
// TODO: make both these configurable someday
var validExts = ['.js'];
var noProcessRegex = /^_.*/;
var genUtil = {
    serializeArgs: function (args) {
        var vals = [];
        if (!args) {
            return '';
        }
        for (var v in args) {
            vals.push(v + "=" + args[v].toString());
        }
        return vals.join(',');
    },
    seperateDirFiles: function (fileExts, state, file, cb) {
        fs.stat(file, function (err, stat) {
            if (err) {
                return cb(err);
            }
            file = path.basename(file);
            if (stat.isFile()) {
                if (file === 'index.js') {
                    state.hasIndex = true;
                }
                else if (fileExts.indexOf(path.extname(file)) > -1) {
                    state.files.push(file);
                }
            }
            else if (stat.isDirectory()) {
                state.dirs.push(file);
            }
            else {
                console.error("unknown file " + file);
            }
            cb(null, state);
        });
    },
    readDirectory: function (dir, cb) {
        fs.readdir(dir, function (err, files) {
            if (err) {
                return cb(err, null);
            }
            files = files.filter(function (f) { return !noProcessRegex.test(f); }).map(function (f) { return path.join(dir, f); });
            var dirFiles = { files: [], dirs: [], hasIndex: false };
            async.reduce(files, dirFiles, genUtil.seperateDirFiles.bind(genUtil, validExts), function (err, state) {
                if (err) {
                    return cb(err, null);
                }
                state.files = state.files.sort().reverse();
                state.dirs = state.dirs.sort();
                cb(null, state);
            });
        });
    }
};
exports.genUtil = genUtil;
//# sourceMappingURL=util.js.map