/** Keep expensive in-flight history renders shared even when the completed
 * thumbnail LRU reaches its limit. Failed renders are never cached.
 */
export class HistoryThumbnailCache<Key,Value>{
  private readonly completed=new Map<Key,Promise<Value>>();
  private readonly pending=new Map<Key,Promise<Value>>();
  constructor(private readonly maxCompleted=24){
    if(!Number.isSafeInteger(maxCompleted)||maxCompleted<1)
      throw Error('履歴画像の保存件数が正しくありません。');
  }
  get(key:Key,render:()=>Promise<Value>):Promise<Value>{
    const completed=this.completed.get(key);
    if(completed){
      this.completed.delete(key);
      this.completed.set(key,completed);
      return completed;
    }
    const inFlight=this.pending.get(key);
    if(inFlight)return inFlight;
    const task=Promise.resolve().then(render);
    this.pending.set(key,task);
    void task.then(value=>{
      if(this.pending.get(key)!==task)return;
      this.pending.delete(key);
      this.completed.set(key,Promise.resolve(value));
      while(this.completed.size>this.maxCompleted)
        this.completed.delete(this.completed.keys().next().value!);
    },()=>{
      if(this.pending.get(key)===task)this.pending.delete(key);
    });
    return task;
  }
}
