/** Wait for a pending stroke before selecting the authoritative frame. A changed target is never retried. */
export async function awaitAssistTarget(settle:()=>Promise<void>,sameTarget:()=>boolean,busy:()=>boolean){
  for(let attempt=0;attempt<2;attempt++){
    if(!sameTarget())throw Error('解析対象が変わりました。');
    await settle();
    if(!sameTarget())throw Error('解析対象が変わりました。');
    if(!busy())return;
  }
  throw Error('描画の確定が終わってから実行してください。');
}
