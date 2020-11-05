/// <reference types="node" />
import { EventEmitter } from 'events';
import { Logger as BunyanLogger } from 'bunyan';
export declare type LogLevels = 'debug' | 'info' | 'warn' | 'error' | 'fatal';
export interface LoggerOpts {
    name: string;
    devMode?: boolean;
    level?: LogLevels;
}
export declare class Logger extends EventEmitter {
    logger: BunyanLogger;
    constructor(loggerOpts: LoggerOpts);
    debug(msg: string, meta?: Object): void;
    info(msg: string, meta?: Object): void;
    warn(msg: string, meta?: Object): void;
    error(msg: string, meta?: Object): void;
    fatal(msg: string, meta?: Object): void;
    log(level: LogLevels, msg: string, meta?: Object): void;
}
export declare class LogWorkerMixin {
    workerName: string;
    identity: string;
    logger: Logger;
    logDebug(msg: string, meta?: Object): void;
    logInfo(msg: string, meta?: Object): void;
    logWarn(msg: string, meta?: Object): void;
    logError(msg: string, err: Error, meta?: Object): void;
    logMeta(level: LogLevels, msg: string, metaOverrides?: Object): void;
}
