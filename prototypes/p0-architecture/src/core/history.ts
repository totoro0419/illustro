export type Revision<T> = Readonly<{
  id: number;
  parentId: number | null;
  state: T;
}>;

export class RevisionHistory<T> {
  readonly #revisions = new Map<number, Revision<T>>();
  #nextId = 1;
  #headId: number;
  #redoStack: number[] = [];

  constructor(initial: T) {
    const root: Revision<T> = { id: 0, parentId: null, state: initial };
    this.#revisions.set(root.id, root);
    this.#headId = root.id;
  }

  get head(): Revision<T> {
    const revision = this.#revisions.get(this.#headId);
    if (!revision) throw new Error('History head is missing');
    return revision;
  }

  commit(state: T): Revision<T> {
    const revision: Revision<T> = { id: this.#nextId++, parentId: this.#headId, state };
    this.#revisions.set(revision.id, revision);
    this.#headId = revision.id;
    this.#redoStack = [];
    return revision;
  }

  undo(): Revision<T> {
    const current = this.head;
    if (current.parentId === null) return current;
    this.#redoStack.push(current.id);
    this.#headId = current.parentId;
    return this.head;
  }

  redo(): Revision<T> {
    const next = this.#redoStack.pop();
    if (next === undefined) return this.head;
    if (!this.#revisions.has(next)) return this.head;
    this.#headId = next;
    return this.head;
  }
}
