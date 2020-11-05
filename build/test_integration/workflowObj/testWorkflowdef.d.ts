import { Config } from '../../src/Config';
import { BaseWorkflow } from '../../src/entities/workflow/BaseWorkflow';
export default class CreateDeploymentTaskCreator extends BaseWorkflow {
    version: string;
    name: string;
    schema: any;
    maxRetry: number;
    constructor(config: Config, options?: any);
    getTaskGraph(): {
        createDeploymentDoc: {
            activity: string;
        };
        startNewDeployment: {
            dependsOn: string[];
            input: (results: any) => {
                deployment: any;
            };
            workflow: string;
        };
        setDeploymentDocState: {
            dependsOn: string[];
            input: (results: any) => {
                deployment: any;
            };
            activity: string;
        };
    };
    output(results: any): {
        env: {
            deployment: any;
        };
    };
    validateTask(parameters: any): null;
}
