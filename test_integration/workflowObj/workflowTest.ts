/*import { assert } from 'chai';

import { Task, WorkflowDef } from '../../src/taskbuilder/interfaces';

import { Processor } from '../../src/taskbuilder/Processor';
import { createDeploymentTask } from './testWorkflowdef';

describe('Processor', () => {
  describe('with inline taskBuilder', () => {
    const processor = new Processor(createDeploymentTask, 'new', {});
    const task = {} as Task;

    it('should include maxRetry if present', (done) => {
      const taskBuilder = {
        create({version, name, schema, maxRetry}) {
          return task;
        },
      } as WorkflowDef;

      let newTask = processor.wrapTask({}, 'UnitTest', taskBuilder);
      assert.equal(newTask.maxRetry, 525);
      done();
    });

    it('should NOT include maxRetry if not provided', (done) => {
      const taskBuilder = {
        create({}, {}) {
          return task;
        }
      } as WorkflowDef;

      let newTask = processor.wrapTask({}, 'UnitTest', task, taskBuilder);
      assert.equal(newTask.maxRetry, null);
      done();
    });
  });
});
*/
