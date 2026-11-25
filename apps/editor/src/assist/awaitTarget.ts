/** Wait for a pending stroke before selecting the authoritative frame. A changed target is never retried. */
export async function awaitAssistTarget(settle:()=>Promise<void>,sameTarget:()=>boolean,busy:()=>boolean){
  const deadline=Date.now()+5000;
  for(let attempt=0;attempt<125;attempt++){
    if(!sameTarget())throw Error('解析対象が変わりました。');
    await settle();
    if(!sameTarget())throw Error('解析対象が変わりました。');
    if(!busy())return;
    if(Date.now()>=deadline)break;
    await new Promise<void>(resolve=>setTimeout(resolve,40));
  }
  throw Error('描画の確定が終わってから実行してください。');
}
