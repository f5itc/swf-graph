/// <reference types="node" />
import { EventEmitter } from 'events';
import { SNS } from 'aws-sdk';
import { Config } from '../Config';
import { LogLevels } from './Logger';
export interface Notifier extends EventEmitter {
    sendInfo(summary: string, event: Object, cb?: {
        (err?: Error);
    }): any;
    sendWarn(summary: string, event: Object, cb?: {
        (err?: Error);
    }): any;
    sendError(summary: string, event: Object, cb?: {
        (err?: Error);
    }): any;
}
export interface SNSNotiferConfig {
    snsTopicName: string;
    region: string;
    awsAccountId: string;
    silenceNotifier: boolean;
    snsClient: SNS | null;
}
export declare class SNSNotifier extends EventEmitter implements Notifier {
    config: SNSNotiferConfig;
    snsClient: SNS;
    mainConfig: Config;
    constructor(config: SNSNotiferConfig, mainConfig: Config);
    sendInfo(summary: string, event: Object, cb?: {
        (err?: Error, resp?: SNS.PublishResponse);
    }): void;
    sendWarn(summary: string, event: Object, cb?: {
        (err?: Error, resp?: SNS.PublishResponse);
    }): void;
    sendError(summary: string, event: Object, cb?: {
        (err?: Error, resp?: SNS.PublishResponse);
    }): void;
    getArn(): string;
    sendLevel(level: LogLevels, summary: string, event: any, cb?: {
        (err?: Error, resp?: SNS.PublishResponse);
    }): void;
    buildMessage(level: LogLevels, summary: string, event: any): string;
}
