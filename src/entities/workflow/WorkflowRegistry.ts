import * as path from 'path';
import { Registry } from '../Registry';
import { BaseWorkflow } from './BaseWorkflow';

export class WorkflowRegistry extends Registry<typeof BaseWorkflow> {
  wrapModule(filename: string, handler: any): typeof BaseWorkflow {
    if (handler.default) { handler = handler.default; }

    if (typeof handler !== 'function') {
      throw new Error(`workflow module ${filename} doesn't export single class or default export`);
    }

    let name: string;
    if (handler.getHandlerName && handler.getHandlerName()) {
      name = handler.getHandlerName();
    } else {
      handler.getHandlerName = function (): string {
        return path.basename(filename, path.extname(filename));
      };
      name = handler.getHandlerName();
    }

    if (!name) {
      throw new Error('missing workflow name');
    }

    if (!handler.validateTask) {
      throw new Error(`workflow module ${name} does not have a static validateTask function`);
    }

    return handler as typeof BaseWorkflow;
  }
}
