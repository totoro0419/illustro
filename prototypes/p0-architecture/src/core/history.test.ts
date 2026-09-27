import { describe, expect, it } from 'vitest';
import { RevisionHistory } from './history';

describe('RevisionHistory', () => {
  it('undoes and redoes by revision head', () => {
    const history = new RevisionHistory({ value: 0 });
    history.commit({ value: 1 });
    history.commit({ value: 2 });
    expect(history.head.state.value).toBe(2);
    expect(history.undo().state.value).toBe(1);
    expect(history.redo().state.value).toBe(2);
  });

  it('clears redo path after a new commit', () => {
    const history = new RevisionHistory({ value: 0 });
    history.commit({ value: 1 });
    history.commit({ value: 2 });
    history.undo();
    history.commit({ value: 3 });
    expect(history.redo().state.value).toBe(3);
  });
});
