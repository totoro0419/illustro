import type {CoreDocument,RevisionId} from '@illustro/core';
import type {PortableSectionInput} from '../persistence/format';
import {button,numberField,selectField} from '../artwork/tools';
import {appConfirm} from '../ui/appDialogs';
import {historyRecordingPreview} from '../ui/artworkHistoryView';

const sectionId='round2.timelapse',sectionType='illustro.timeline.v1',maxFrames=240;
type Timeline={revisionIds:RevisionId[];enabled:boolean;updatedAt:number};
const key=(id:string)=>'illustro.timelapse.v1.'+id;
const blank=():Timeline=>({revisionIds:[],enabled:false,updatedAt:0});
function parse(input:string):Timeline{
  const stored=JSON.parse(input) as Partial<Timeline>;
  if(!stored||!Array.isArray(stored.revisionIds)||stored.revisionIds.length>maxFrames||
    !stored.revisionIds.every(id=>typeof id==='string'&&id.length>0&&id.length<=200)||
    !Number.isFinite(stored.updatedAt))throw Error('制作記録の形式が正しくありません。');
  return {revisionIds:[...stored.revisionIds],enabled:stored.enabled===true,updatedAt:stored.updatedAt!};
}
function wait(ms:number,signal:AbortSignal){
  signal.throwIfAborted();
  return new Promise<void>((resolve,reject)=>{
    const stop=()=>{clearTimeout(timer);reject(signal.reason);};
    const timer=window.setTimeout(()=>{signal.removeEventListener('abort',stop);resolve();},ms);
    signal.addEventListener('abort',stop,{once:true});
  });
}

export function installTimeline(host:HTMLElement,getArtwork:()=>CoreDocument|null,download:(blob:Blob,name:string)=>void){
  const panel=document.createElement('details');panel.className='c06-clipboard-panel';
  const title=document.createElement('summary');title.textContent='制作記録';
  const info=document.createElement('p');
  info.textContent='開始後に確定した編集を記録します。資料ボードや操作画面を含めず、キャンバスに置いた画像は絵の一部として記録します。';
  const status=document.createElement('output');status.setAttribute('role','status');
  const controls=document.createElement('div');controls.className='c06-clipboard-grid';
  const first=numberField(controls,'最初のコマ',1,1,maxFrames);
  const last=numberField(controls,'最後のコマ',1,1,maxFrames);
  const fps=numberField(controls,'1秒あたりのコマ',4,1,12);
  const resolution=selectField(controls,'画像の長辺（px）',[['360','360'],['720','720'],['1080','1080']]);
  const hold=numberField(controls,'最後の絵を止める秒数',1,0,10,.5);
  const canvas=document.createElement('canvas');
  canvas.style.cssText='max-width:100%;height:auto';canvas.hidden=true;
  canvas.setAttribute('aria-label','制作記録の映像');
  let currentId:string|null=null,state=blank(),writingFailed=false,run:AbortController|null=null;
  let writeTimer:number|null=null;

  function store(){
    if(writeTimer!==null){clearTimeout(writeTimer);writeTimer=null;}
    if(currentId===null)return;
    try{localStorage.setItem(key(currentId),JSON.stringify(state));writingFailed=false;}
    catch{writingFailed=true;}
  }
  function current(artwork:CoreDocument|null){
    const id=artwork?.root.documentId??null;
    if(currentId===id)return;
    if(writeTimer!==null)store();
    currentId=id;state=blank();
    try{if(id)state=parse(localStorage.getItem(key(id))??JSON.stringify(blank()));}catch{}
    first.value='1';last.value=String(Math.max(1,state.revisionIds.length));
    canvas.hidden=true;
  }
  function sync(){
    const artwork=getArtwork();current(artwork);
    const count=state.revisionIds.length;
    for(const field of [first,last])field.max=String(Math.max(1,count));
    toggle.disabled=!artwork||!!run;toggle.textContent=state.enabled?'記録を停止':'記録を開始';
    play.disabled=erase.disabled=!count||!!run;video.disabled=play.disabled||typeof MediaRecorder==='undefined'||!canvas.captureStream;
    stop.disabled=!run;
    if(!run)status.textContent=(state.enabled?'記録中':'停止中')+' · '+count+'コマ'+
      (writingFailed?'。端末への保存に失敗しました。':count>=maxFrames?'。記録の上限に達しました。':'');
  }
  function scheduleWrite(){
    if(writeTimer===null)writeTimer=window.setTimeout(()=>{store();if(panel.open&&!run)sync();},800);
  }
  function record(artwork:CoreDocument,revision:RevisionId){
    current(artwork);
    if(!state.enabled||state.revisionIds.at(-1)===revision||state.revisionIds.length>=maxFrames)return;
    state.revisionIds.push(revision);state.updatedAt=Date.now();
    if(state.revisionIds.length>=maxFrames)state.enabled=false;
    last.value=String(state.revisionIds.length);scheduleWrite();
    if(panel.open&&!run)sync();
  }
  const toggle=button('記録を開始',()=>{
    const artwork=getArtwork();if(!artwork)return;
    current(artwork);
    if(!state.enabled&&state.revisionIds.length>=maxFrames)throw Error('記録が上限に達しています。先に動画を保存してください。');
    state.enabled=!state.enabled;state.updatedAt=Date.now();
    if(state.enabled&&!state.revisionIds.length)record(artwork,artwork.head);
    store();sync();
  },status);
  const erase=button('制作記録を消去',async()=>{
    const artwork=getArtwork();
    if(!artwork||!await appConfirm('制作記録を消去し、記録を停止します。作品の絵と編集履歴は残ります。'))return;
    if(artwork!==getArtwork())throw Error('作品が変わりました。');
    state={...blank(),updatedAt:Date.now()};store();sync();canvas.hidden=true;
  },status);
  async function renderMovie(output:boolean){
    const artwork=getArtwork();current(artwork);
    if(!artwork||run)return;
    const inputs=[first,last,fps,hold];
    if(inputs.some(field=>!field.value||!field.validity.valid)||first.valueAsNumber>last.valueAsNumber)
      throw Error('コマの範囲・速度を確認してください。');
    const ids=state.revisionIds.slice(first.valueAsNumber-1,last.valueAsNumber);
    if(!ids.length||ids.some(id=>!artwork.hasRevision(id)))throw Error('記録の元になった編集履歴がありません。別の範囲を選んでください。');
    const limit=Number(resolution.value),frameMs=1000/fps.valueAsNumber,lastMs=hold.valueAsNumber*1000;
    const abort=new AbortController();
    run=abort;sync();
    let stream:MediaStream|null=null,recorder:MediaRecorder|null=null;
    try{
      const size=artwork.revision(ids[0]!).root,ratio=Math.min(1,limit/Math.max(size.width,size.height));
      canvas.width=Math.max(2,Math.round(size.width*ratio/2)*2);canvas.height=Math.max(2,Math.round(size.height*ratio/2)*2);
      const context=canvas.getContext('2d');
      if(!context)throw Error('映像を表示できません。');
      canvas.hidden=false;
      // Render every selected state first. Replay speed is independent of the
      // GPU time required to render artwork with many layers.
      const frames:Blob[]=[];
      for(const [i,id] of ids.entries()){
        abort.signal.throwIfAborted();
        if(artwork!==getArtwork())throw Error('作品が切り替わりました。');
        status.textContent='準備中 · '+(i+1)+' / '+ids.length;
        frames.push((await historyRecordingPreview(artwork,id,limit)).blob);
      }
      abort.signal.throwIfAborted();
      let videoDone:Promise<Blob>|null=null;
      const chunks:Blob[]=[];
      if(output){
        const mime=['video/webm;codecs=vp8','video/webm;codecs=vp9','video/webm'].find(type=>MediaRecorder.isTypeSupported(type));
        if(!mime)throw Error('この端末ではWebM動画を作成できません。');
        stream=canvas.captureStream(Math.ceil(1000/frameMs));
        recorder=new MediaRecorder(stream,{mimeType:mime});
        videoDone=new Promise<Blob>((resolve,reject)=>{
          recorder!.addEventListener('dataavailable',event=>{if(event.data.size)chunks.push(event.data);});
          recorder!.addEventListener('stop',()=>resolve(new Blob(chunks,{type:'video/webm'})),{once:true});
          recorder!.addEventListener('error',()=>reject(Error('動画を作成できませんでした。')),{once:true});
        });
        void videoDone.catch(()=>{});
      }
      for(const [i,frame] of frames.entries()){
        abort.signal.throwIfAborted();
        if(artwork!==getArtwork())throw Error('作品が切り替わりました。');
        const bitmap=await createImageBitmap(frame);
        try{
          context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);
          const scale=Math.min(canvas.width/bitmap.width,canvas.height/bitmap.height);
          const w=bitmap.width*scale,h=bitmap.height*scale;
          context.drawImage(bitmap,(canvas.width-w)/2,(canvas.height-h)/2,w,h);
        }finally{bitmap.close();}
        if(i===0)recorder?.start();
        status.textContent=(output?'動画を書き出し中':'再生中')+' · '+(i+1)+' / '+frames.length;
        await wait(frameMs+(i===frames.length-1?lastMs:0),abort.signal);
      }
      if(recorder&&videoDone){
        if(recorder.state==='recording')recorder.stop();
        const blob=await videoDone;
        if(!blob.size)throw Error('書き出した動画にフレームがありません。');
        download(blob,artwork.root.name.replace(/[\\/:*?"<>|]/g,'_').slice(0,100)+'-制作記録.webm');
      }
      status.textContent=output?'動画を書き出しました。':'再生が終わりました。';
    }catch(error){
      if(abort.signal.aborted)status.textContent='中止しました。';
      else throw error;
    }finally{
      if(recorder?.state==='recording')recorder.stop();
      stream?.getTracks().forEach(track=>track.stop());
      const message=status.textContent;
      run=null;sync();status.textContent=message;
    }
  }
  const play=button('再生',()=>renderMovie(false),status);
  const video=button('WebMを書き出す',()=>renderMovie(true),status);
  const stop=button('中止',()=>run?.abort(),status);
  const actions=document.createElement('div');actions.className='box-actions';
  actions.append(toggle,play,video,stop,erase);
  panel.append(title,info,controls,actions,status,canvas);host.append(panel);
  panel.ontoggle=()=>{if(panel.open)sync();else run?.abort();};
  window.addEventListener('pagehide',()=>{if(writeTimer!==null)store();});
  return {record,open:()=>{panel.open=true;sync();},
    exportNative(artwork:CoreDocument):PortableSectionInput{
      current(artwork);
      const saved={...state,revisionIds:state.revisionIds.filter(id=>artwork.hasRevision(id)),enabled:false};
      return {id:sectionId,type:sectionType,required:false,bytes:new TextEncoder().encode(JSON.stringify(saved))};
    },
    restoreNative(artwork:CoreDocument,sections:readonly PortableSectionInput[]){
      current(artwork);
      const found=sections.find(section=>section.id===sectionId&&section.type===sectionType);
      if(!found||found.bytes.byteLength>65536)return;
      const saved=parse(new TextDecoder().decode(found.bytes));
      if(saved.updatedAt>=state.updatedAt){
        state={...saved,enabled:false,revisionIds:saved.revisionIds.filter(id=>artwork.hasRevision(id))};
        store();last.value=String(Math.max(1,state.revisionIds.length));if(panel.open)sync();
      }
    },
  };
}
