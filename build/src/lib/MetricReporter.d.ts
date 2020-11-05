/// <reference types="node" />
/// <reference types="statsd-client" />
import { EventEmitter } from 'events';
import SDC = require('statsd-client');
export interface MetricReporter extends EventEmitter {
    increment(name: string, count?: number, meta?: Object): any;
    decrement(name: string, count?: number, meta?: Object): any;
    counter(name: string, count: number, meta?: Object): any;
    gauge(name: string, value: number, meta?: Object): any;
    gaugeDelta(name: string, delta: number, meta?: Object): any;
    set(name: string, value: number, meta?: Object): any;
    timing(name: string, value: Date, meta?: Object): any;
    timing(name: string, duration: number, meta?: Object): any;
}
export interface StatsDMetricReporterConfig {
    mode?: 'udp' | 'tcp';
    host: string;
    port: number;
    prefix?: string;
    statsdClient?: SDC;
}
export declare class StatsDMetricReporter extends EventEmitter implements MetricReporter {
    client: SDC;
    config: StatsDMetricReporterConfig;
    constructor(config: StatsDMetricReporterConfig);
    increment(name: string, count?: number, meta?: Object): void;
    decrement(name: string, count?: number, meta?: Object): void;
    counter(name: string, count: number, meta?: Object): void;
    gauge(name: string, value: number, meta?: Object): void;
    gaugeDelta(name: string, delta: number, meta?: Object): void;
    set(name: string, value: number, meta?: Object): void;
    timing(name: string, value: Date | number, meta?: Object): void;
}
