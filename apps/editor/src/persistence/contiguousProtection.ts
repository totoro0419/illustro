/** In-memory proof of writes already read back and verified in this worker. */
export class ContiguousProtection<T>{
  private ahead=new Map<bigint,T>();value:T|undefined;
  constructor(public through=0n){}
  verified(sequence:bigint,value:T){if(sequence<=this.through)return;this.ahead.set(sequence,value);while(this.ahead.has(this.through+1n)){this.through++;this.value=this.ahead.get(this.through);this.ahead.delete(this.through);}}
  get pending(){return this.ahead.size;}
}
