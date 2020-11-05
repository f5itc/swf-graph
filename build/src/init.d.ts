import { Workflow, Domain } from 'simple-swf/build/src/entities';
import { ActivityWorker, DeciderWorker } from './workers';
import { Config } from './Config';
export interface InitedEntities {
    domain: Domain;
    workflow: Workflow;
    activityWorker: ActivityWorker;
    deciderWorker: DeciderWorker;
    config: Config;
}
declare let registration: {
    registerDomain(config: Config, cb: (Error?: any, Domain?: any) => any): void;
    registerWorkflowType(config: Config, domain: Domain, cb: (Error?: any, Workflow?: any) => any): void;
    init(config: Config, cb: (err: Error | null, entities?: InitedEntities | undefined) => any): any;
    initActivityWorker(config: Config, workflow: Workflow): ActivityWorker;
    initDeciderWorker(config: Config, workflow: Workflow): DeciderWorker;
};
export { registration };
