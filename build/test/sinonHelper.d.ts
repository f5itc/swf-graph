/// <reference types="sinon" />
import * as Sinon from 'sinon';
export interface ClassStub<T> extends Sinon.SinonStub {
    stubMethod(name: string): Sinon.SinonStub;
}
export interface ClassMock<T> extends Sinon.SinonMock {
    object: T;
}
export interface ClassSpy<T> extends Sinon.SinonSpy {
    spyMethod(name: string): Sinon.SinonSpy;
}
export declare class SinonHelper implements Sinon.SinonSandbox {
    clock: Sinon.SinonFakeTimers;
    requests: Sinon.SinonFakeXMLHttpRequest;
    server: Sinon.SinonFakeServer;
    spy: Sinon.SinonSpyStatic;
    stub: Sinon.SinonStub;
    mock: Sinon.SinonMockStatic;
    useFakeTimers: Sinon.SinonFakeTimersStatic;
    useFakeXMLHttpRequest: Sinon.SinonFakeXMLHttpRequestStatic;
    useFakeServer: () => Sinon.SinonFakeServer;
    restore: () => void;
    stubClass<T>(instanceClass: Function): T & ClassStub<T>;
    mockClass<T>(instanceClass: Function): ClassMock<T>;
    spyClass<T>(instanceClass: Function): ClassSpy<T>;
}
declare function newContext(): SinonHelper;
export default newContext;
