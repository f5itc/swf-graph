import * as path from 'path';
import * as fs from 'fs';

import * as async from 'async';

// TODO: make both these configurable someday
const validExts = ['.js'];
const noProcessRegex = /^_.*/;

export interface DirState {
  files: string[];
  dirs: string[];
  hasIndex: boolean;
}

let genUtil = {
  serializeArgs(args: Object | null) {
    const vals: string[] = [];
    if (!args) {
      return '';
    }
    for (let v in args) {
      vals.push(`${v}=${args[v].toString()}`);
    }
    return vals.join(',');
  },

  seperateDirFiles(fileExts: string[], state: any, file: string, cb) {
    fs.stat(file, (err, stat) => {
      if (err) {
        return cb(err);
      }
      file = path.basename(file);
      if (stat.isFile()) {
        if (file === 'index.js') {
          state.hasIndex = true;
        } else if (fileExts.indexOf(path.extname(file)) > -1) {
          state.files.push(file);
        }
      } else if (stat.isDirectory()) {
        state.dirs.push(file);
      } else {
        console.error(`unknown file ${file}`);
      }
      cb(null, state);
    });
  },

  readDirectory(dir: string, cb: {(err: Error | null, dirState: DirState | null)}) {
    fs.readdir(dir, (err, files) => {
      if (err) {
        return cb(err, null);
      }
      files = files.filter((f) => !noProcessRegex.test(f)).map((f) => path.join(dir, f));
      const dirFiles: DirState = {files: [], dirs: [], hasIndex: false};
      async.reduce(files, dirFiles, genUtil.seperateDirFiles.bind(genUtil, validExts), (err: Error | null, state) => {
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

export { genUtil }
