/** At most one full artwork replay should run for history previews at a time.
 * Keeping one GPU readback/compositor active prevents overlapping 4000px renders.
 * User-triggered comparisons take precedence over already queued thumbnails.
 */
export class HistoryPreviewQueue{
  private running=false;
  private readonly foreground:Array<()=>void>=[];
  private readonly background:Array<()=>void>=[];
  run<T>(work:()=>Promise<T>,priority:'foreground'|'background'='background'):Promise<T>{
    return new Promise<T>((resolve,reject)=>{
      const start=()=>{
        this.running=true;
        void Promise.resolve().then(work).then(resolve,reject).finally(()=>{
          this.running=false;
          this.next();
        });
      };
      (priority==='foreground'?this.foreground:this.background).push(start);
      this.next();
    });
  }
  private next(){
    if(this.running)return;
    const start=this.foreground.shift()??this.background.shift();
    start?.();
  }
}
