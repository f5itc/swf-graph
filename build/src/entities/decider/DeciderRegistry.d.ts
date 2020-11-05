import { Registry } from '../Registry';
import { BaseDecider } from './BaseDecider';
export declare class DeciderRegistry extends Registry<typeof BaseDecider> {
    wrapModule(filename: string, handler: any): typeof BaseDecider;
}
