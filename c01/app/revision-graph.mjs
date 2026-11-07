/** C03 immutable-revision history kernel. Browser-independent and side-effect free.
 * State values must be immutable (or deeply cloned by the caller) before admission.
 * Named snapshots and branches pin roots independently of the active undo cursor.
 */
export class RevisionGraph {
  constructor(initialRoot) {
    this.nodes = new Map([[0, Object.freeze({id:0,parent:null,root:initialRoot,label:'Initial'})]]);
    this.cursor = 0;
    this.nextId = 1;
    this.redoPath = [];
    this.snapshots = new Map();
    this.branches = new Map([['main',0]]);
    this.activeBranch = 'main';
  }
  get current() { return this.nodes.get(this.cursor); }
  accept(root,label='Edit') {
    const id=this.nextId++;
    this.nodes.set(id,Object.freeze({id,parent:this.cursor,root,label}));
    this.cursor=id;
    this.redoPath=[];
    this.branches.set(this.activeBranch,id);
    return id;
  }
  undo() {
    const node=this.current;
    if(node.parent===null)return false;
    this.redoPath.push(this.cursor);
    this.cursor=node.parent;
    return true;
  }
  redo() {
    if(!this.redoPath.length)return false;
    const id=this.redoPath[this.redoPath.length-1];
    if(this.nodes.get(id)?.parent!==this.cursor)return false;
    this.cursor=this.redoPath.pop();
    return true;
  }
  snapshot(name,meta={}) {
    if(!name || this.snapshots.has(name))throw new Error('Snapshot name is missing or already used');
    const item=Object.freeze({name,revision:this.cursor,meta:{...meta}});
    this.snapshots.set(name,item);
    return item;
  }
  branch(name,from=this.cursor) {
    if(!name || this.branches.has(name))throw new Error('Branch name is missing or already used');
    if(!this.nodes.has(from))throw new Error('Revision not found');
    this.branches.set(name,from);
    return from;
  }
  checkout(name) {
    if(!this.branches.has(name))throw new Error('Branch not found');
    this.activeBranch=name;
    this.cursor=this.branches.get(name);
    this.redoPath=[];
    return this.current;
  }
  /** Browsing history never changes the current root. */
  inspect(revision) {
    const node=this.nodes.get(revision);
    if(!node)throw new Error('Revision not found');
    return node;
  }
  /** Restoring is an accepted new edit, not a cursor jump. */
  restore(revision,label='Restore') {
    return this.accept(this.inspect(revision).root,label);
  }
  /** Freeze the requested revision before asynchronous saving begins. */
  saveFence() {
    const node=this.current;
    return Object.freeze({revision:node.id,root:node.root});
  }
}
