import type {CoreDocument,RevisionId} from '@illustro/core';
import type {PortableSectionInput} from '../persistence/format';
import {button,labelledField,numberField,selectField} from '../artwork/tools';
import {appConfirm} from '../ui/appDialogs';
import {frameDurations,type FramePacing} from './timing';
import {historyRecordingPreview} from '../ui/artworkHistoryView';

const sectionId='round2.timelapse',sectionType='illustro.timeline.v1',maxFrames=240;
type VideoPrefs={fps:number;resolution:string;hold:number;pacing:FramePacing;watermark:string;first:number;last:number};
type Timeline={revisionIds:RevisionId[];enabled:boolean;updatedAt:number;excluded?:RevisionId[];video?:VideoPrefs};
const key=(id:string)=>'illustro.timelapse.v1.'+id;
const blank=():Timeline=>({revisionIds:[],enabled:false,updatedAt:0});
function parse(input:string):Timeline{
  const stored=JSON.parse(input) as Partial<Timeline>;
  if(!stored||!Array.isArray(stored.revisionIds)||stored.revisionIds.length>maxFrames||
    !stored.revisionIds.every(id=>typeof id==='string'&&id.length>0&&id.length<=200)||
    !Number.isFinite(stored.updatedAt))throw Error('制作記録の形式が正しくありません。');
  const idSet=new Set(stored.revisionIds);
  const excluded=Array.isArray(stored.excluded)?[...new Set(stored.excluded.filter(id=>idSet.has(id)))]:[];
  const video=stored.video;
  const number=(value:number,min:number,max:number)=>Number.isFinite(value)&&value>=min&&value<=max;
  const valid=video&&number(video.fps,1,12)&&['360','720','1080'].includes(video.resolution)&&number(video.hold,0,10)&&
    ['even','recorded','compress'].includes(video.pacing)&&typeof video.watermark==='string'&&video.watermark.length<=80&&
    number(video.first,1,maxFrames)&&number(video.last,1,maxFrames);
  return {revisionIds:[...stored.revisionIds],enabled:stored.enabled===true,updatedAt:stored.updatedAt!,excluded,...(valid?{video}:{})};
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
  const pacing=selectField(controls,'フレームの間隔',[['even','一定の間隔'],['recorded','実際の間隔（最大6秒）'],['compress','長い休止を短縮']]);
  const watermark=document.createElement('input');watermark.type='text';watermark.maxLength=80;
  labelledField(controls,'動画に入れる透かし（任意）',watermark);
  const estimate=document.createElement('output');estimate.setAttribute('aria-live','polite');
  const review=document.createElement('details'),reviewTitle=document.createElement('summary'),reviewList=document.createElement('div');
  reviewTitle.textContent='記録したコマの採用・除外';review.append(reviewTitle,reviewList);
  const canvas=document.createElement('canvas');
  canvas.style.cssText='max-width:100%;height:auto';canvas.hidden=true;
  canvas.setAttribute('aria-label','制作記録の映像');
  let currentId:string|null=null,state=blank(),writingFailed=false,run:AbortController|null=null;
  let writeTimer:number|null=null;

  const bitrate=2_500_000;
  function idsInRange(includeExcluded=false){
    const excluded=new Set(state.excluded);
    return state.revisionIds.slice(first.valueAsNumber-1,last.valueAsNumber).filter(id=>includeExcluded||!excluded.has(id));
  }
  function timing(artwork:CoreDocument,ids:readonly RevisionId[]){
    return frameDurations(ids.map(id=>artwork.hasRevision(id)?artwork.revision(id).committedAt:NaN),
      fps.valueAsNumber,pacing.value as FramePacing,hold.valueAsNumber);
  }
  function showEstimate(){
    const artwork=getArtwork(),ids=idsInRange();
    if(!artwork||!ids.length||!fps.validity.valid||!hold.validity.valid){estimate.textContent='出力するコマがありません。';return;}
    const ms=timing(artwork,ids).reduce((sum,duration)=>sum+duration,0);
    estimate.textContent=ids.length+'コマ · 約'+(ms/1000).toFixed(1)+'秒 · 最大の目安 '+(ms*bitrate/8e9).toFixed(2)+' MB';
  }
  function settingsChanged(){
    if([first,last,fps,hold].every(field=>field.value&&field.validity.valid)){
      state.video={first:first.valueAsNumber,last:last.valueAsNumber,fps:fps.valueAsNumber,resolution:resolution.value,
        hold:hold.valueAsNumber,pacing:pacing.value as FramePacing,watermark:watermark.value};
      state.updatedAt=Date.now();store();
    }
    showEstimate();refreshReview();
  }
  function restoreVideoSettings(){
    const video=state.video;
    const max=Math.max(1,state.revisionIds.length);
    fps.value=String(video?.fps??4);resolution.value=video?.resolution??'360';hold.value=String(video?.hold??1);
    pacing.value=video?.pacing??'even';watermark.value=video?.watermark??'';
    first.value=String(Math.min(video?.first??1,max));last.value=String(Math.min(video?.last??max,max));
  }
  function refreshReview(){
    if(!review.open)return;
    const excluded=new Set(state.excluded),fragment=document.createElement('div');
    state.revisionIds.forEach((id,index)=>{
      const control=document.createElement('input');control.type='checkbox';control.checked=!excluded.has(id);
      control.onchange=()=>{
        const next=new Set(state.excluded);
        if(control.checked)next.delete(id);else next.add(id);
        state.excluded=[...next];state.updatedAt=Date.now();store();showEstimate();
      };
      labelledField(fragment,'コマ '+(index+1)+' を動画に含める',control);
    });
    reviewList.replaceChildren(fragment);
  }
  review.ontoggle=refreshReview;
  for(const field of [first,last,fps,hold,resolution,pacing,watermark])field.onchange=settingsChanged;
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
    restoreVideoSettings();canvas.hidden=true;
  }
  function sync(){
    const artwork=getArtwork();current(artwork);
    const count=state.revisionIds.length;
    for(const field of [first,last])field.max=String(Math.max(1,count));
    toggle.disabled=!artwork||!!run;toggle.textContent=state.enabled?'記録を停止':'記録を開始';
    play.disabled=erase.disabled=!count||!!run;video.disabled=play.disabled||typeof MediaRecorder==='undefined'||!canvas.captureStream;
    stop.disabled=!run;
    showEstimate();refreshReview();
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
    if(!state.video||state.video.last===state.revisionIds.length-1){
      last.value=String(state.revisionIds.length);
      if(state.video)state.video={...state.video,last:state.revisionIds.length};
    }
    scheduleWrite();
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
    state={...blank(),updatedAt:Date.now()};restoreVideoSettings();store();sync();canvas.hidden=true;
  },status);
  const prune=button('除外したコマを記録一覧から外す',async()=>{
    const artwork=getArtwork(),excluded=new Set(state.excluded);
    if(!artwork||!excluded.size)throw Error('先にコマを除外してください。');
    const original=state.revisionIds,originalLength=original.length,updatedAt=state.updatedAt;
    if(!await appConfirm(excluded.size+'コマを制作記録の一覧から外します。作品と編集履歴は保持されます。'))return;
    if(getArtwork()!==artwork||state.revisionIds!==original||original.length!==originalLength||state.updatedAt!==updatedAt||run)throw Error('制作記録が変わりました。');
    state.revisionIds=original.filter(id=>!excluded.has(id));state.excluded=[];state.updatedAt=Date.now();
    restoreVideoSettings();store();sync();
  },status);
  review.append(prune);
  async function renderMovie(output:boolean){
    const artwork=getArtwork();current(artwork);
    if(!artwork||run)return;
    const inputs=[first,last,fps,hold];
    if(inputs.some(field=>!field.value||!field.validity.valid)||first.valueAsNumber>last.valueAsNumber)
      throw Error('コマの範囲・速度を確認してください。');
    const ids=idsInRange();
    if(!ids.length||ids.some(id=>!artwork.hasRevision(id)))throw Error('記録の元になった編集履歴がありません。別の範囲を選んでください。');
    const limit=Number(resolution.value),frameRate=fps.valueAsNumber,durations=timing(artwork,ids),stamp=watermark.value.trim();
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
        stream=canvas.captureStream(frameRate);
        recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:bitrate});
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
          if(stamp){
            const font=Math.max(11,Math.round(canvas.width/44));
            context.font=font+'px sans-serif';context.textAlign='right';context.textBaseline='bottom';
            context.fillStyle='rgba(0,0,0,.68)';const width=Math.min(canvas.width-18,context.measureText(stamp).width);
            context.fillRect(canvas.width-width-14,canvas.height-font-13,width+8,font+9);
            context.fillStyle='#fff';context.fillText(stamp,canvas.width-10,canvas.height-8,canvas.width-20);
          }
        }finally{bitmap.close();}
        if(i===0)recorder?.start();
        status.textContent=(output?'動画を書き出し中':'再生中')+' · '+(i+1)+' / '+frames.length;
        await wait(durations[i]!,abort.signal);
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
  panel.append(title,info,controls,estimate,review,actions,status,canvas);host.append(panel);
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
        restoreVideoSettings();store();if(panel.open)sync();
      }
    },
  };
}
