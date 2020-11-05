import { Config } from '../Config';
import { BaseHandler } from './BaseHandler';
export declare abstract class Registry<T extends BaseHandler> {
    config: Config;
    registry: {
        [moduleName: string]: T;
    };
    constructor(locations: string[], config: Config);
    loadModules(locations: string[]): void;
    loadLocation(location: string): T[];
    loadFile(loadDirs: boolean, location: string): T[];
    getModule(name: string): T | null;
    getModules(): T[];
    abstract wrapModule(filename: string, module: any): T;
}
