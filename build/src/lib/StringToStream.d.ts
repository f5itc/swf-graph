/// <reference types="node" />
import { Readable } from 'stream';
export declare class StringToStream extends Readable {
    private str;
    ended: boolean;
    constructor(str: any);
    _read(size: number): void;
}
