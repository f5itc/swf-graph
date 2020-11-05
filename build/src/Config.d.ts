import { SWF } from 'aws-sdk';
import { SWFConfig, ConfigOverrides, ConfigOverride } from 'simple-swf/build/src/SWFConfig';
import { Domain } from 'simple-swf/build/src/entities';
import { FieldSerializer, S3ClaimCheck, ClaimCheck } from 'simple-swf/build/src/util';
import { Logger } from './lib/Logger';
import { Notifier } from './lib/Notifier';
import { MetricReporter } from './lib/MetricReporter';
import { ActivityRegistry, DeciderRegistry, WorkflowRegistry } from './entities';
export declare class Config {
    swfConfig: SWFConfig;
    swfClient: SWF;
    logger: Logger;
    notifier: Notifier;
    metricReporter: MetricReporter;
    domainName: string;
    workflowName: string;
    defaultVersion: string;
    activities: ActivityRegistry;
    deciders: DeciderRegistry;
    workflows: WorkflowRegistry;
    domain: Domain;
    fieldSerializer: FieldSerializer;
    private customOpts;
    private userConfig;
    constructor(configFunc: {
        (): any;
    });
    buildNotifierInstance(notifierConfig: any): Notifier;
    buildLoggerInstance(loggerConfig: any): Logger;
    buildMetricInstance(metricConfig: any): MetricReporter;
    private handleErrorOfComponent<T>(component, componentName);
    buildClaimCheck(claimCheckConfig: any): S3ClaimCheck;
    buildFieldSerializer(claimChecker: ClaimCheck, fieldSerializerConfig: any): FieldSerializer;
    buildActivityRegistry(activityLocations: string[]): ActivityRegistry;
    buildDeciderRegistry(): DeciderRegistry;
    buildWorkflowRegistry(workflowLocations: string[]): WorkflowRegistry;
    populateUserConfig(userConfig: any): any;
    defaultSwfConf(swfConf: any): ConfigOverrides;
    defaultFTLConf(ftlConfig: {
        [keyName: string]: any;
    }): {
        [keyName: string]: any;
    };
    getOpt(keyName: any): any;
    getConfigFor(component: string): ConfigOverride;
    checkRequired(configName: string, required: {
        [key: string]: string;
    }, parameters: any): void;
    swfDefaults: {
        activity: {
            heartbeatTimeout: number;
            taskList: string;
        };
        workflow: {
            taskList: string;
        };
        decision: {
            taskList: string;
        };
    };
    ftlDefaults: {
        maxRunningWorkflow: number;
        maxRetry: number;
    };
}
