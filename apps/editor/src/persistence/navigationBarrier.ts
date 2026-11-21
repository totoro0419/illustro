/** Tracks in-flight undo/redo head writes independently of stroke protection.
 * The browser's navigation/close barrier must wait for BOTH kinds of writes.
 */
export class NavigationBarrier{
  private readonly pending=new Set<Promise<unknown>>();
  track(work:Promise<unknown>){
    this.pending.add(work);
    // The operation handles its own error and updates the storage error state.
    // Always release the barrier, including when a write rejects.
    void work.then(()=>{this.pending.delete(work);},()=>{this.pending.delete(work);});
  }
  async waitUntilIdle(){
    while(this.pending.size)await Promise.allSettled([...this.pending]);
  }
}
