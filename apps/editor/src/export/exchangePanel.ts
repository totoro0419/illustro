import {runIcc} from './iccRun';
import {ICC_LIMIT} from './iccMetadata';
import type {CoreDocument} from '@illustro/core';
import {resizeImagePixels} from '../canvasGeometry';
import {captureExport,renderFrozenArtworkTiledPreview,renderFrozenArtwork} from './basicExport';
import {button,labelledField,numberField,selectField} from '../artwork/tools';
import {exchangeFileName,exchangeWarnings,exportExchange} from './exchange';
import type {ExchangeFormat} from './exchangeTypes';

export function openExchangePanel(doc:CoreDocument,active:()=>boolean,download:(blob:Blob,name:string)=>void){
  const dialog=document.createElement('dialog');
  dialog.className='export-dialog';dialog.setAttribute('aria-label','他の形式で書き出す');
  const section=document.createElement('section');section.className='c06-clipboard-grid';
  const title=document.createElement('h2');title.textContent='交換用ファイルを書き出す';section.append(title);
  const format=selectField(section,'形式',[
    ['psd','PSD'],['psb','PSB'],['ora','OpenRaster (.ora)'],['tiff','TIFF'],['svg','SVG'],['avif','AVIF'],['exr','OpenEXR（線形RGB）']
  ]);
  const style=selectField(section,'出力内容',[['flat','見た目を1枚にまとめる'],['layered','レイヤーを保つ']]);
  const quality=numberField(section,'AVIFの画質',90,1,100);
  const lossless=document.createElement('input');lossless.type='checkbox';labelledField(section,'AVIFを可逆圧縮する',lossless);
  const base=document.createElement('input');base.value=doc.root.name;base.maxLength=120;labelledField(section,'ファイル名',base);
  const notes=document.createElement('ul'),status=document.createElement('output');status.setAttribute('role','status');
  const print=document.createElement('details'),printTitle=document.createElement('summary');printTitle.textContent='印刷時の大きさ';
  const dpi=numberField(print,'印刷の解像度（DPI）',doc.root.info.dpi??300,1,2400);
  const bleed=numberField(print,'片側の塗り足し（mm）',3,0,50,.1);
  const printResult=document.createElement('output');printResult.setAttribute('aria-live','polite');
  print.prepend(printTitle);print.append(printResult);
  const profileFile=document.createElement('input');profileFile.type='file';profileFile.accept='.icc,.icm';
  labelledField(print,'出力先のICCプロファイル（確認用）',profileFile);
  const intent=selectField(print,'色域に収める方法',[
    ['1','相対的な色を優先'],['0','色の見え方を優先'],['2','彩度を優先'],['3','紙の白色を含めて確認'],
  ]);
  const black=document.createElement('input');black.type='checkbox';black.checked=true;
  labelledField(print,'出力先に合わせて黒を補正する',black);
  const gamut=document.createElement('input');gamut.type='checkbox';
  labelledField(print,'出力先の範囲外の色をピンクで強調する',gamut);
  const display=selectField(print,'作品の表示',[['original','元の色'],['proof','出力先の色']]);
  display.disabled=true;
  const proofStatus=document.createElement('output');proofStatus.setAttribute('role','status');
  let proof:ImageData|null=null,proofTicket=0;
  const preview=document.createElement('canvas');preview.setAttribute('aria-label','透明部分と仕上がり線を表示する出力前の作品全体');
  preview.hidden=true;preview.className='exchange-print-preview';
  let comparison:ImageData|null=null;
  function refresh(){
    const selected=format.value as ExchangeFormat,avif=selected==='avif';
    const layered=selected==='psd'||selected==='psb'||selected==='ora'||selected==='svg';
    style.parentElement!.hidden=!layered;
    quality.parentElement!.hidden=lossless.parentElement!.hidden=!avif;
    quality.disabled=lossless.checked;
    notes.replaceChildren(...exchangeWarnings(doc,selected,layered&&style.value==='layered').slice(0,40).map(warning=>{
      const li=document.createElement('li');li.textContent=warning;return li;
    }));
    const {width,height}=doc.root;
    const resolution=dpi.valueAsNumber,border=bleed.valueAsNumber;
    if(!dpi.validity.valid||!bleed.validity.valid||!Number.isFinite(resolution)||!Number.isFinite(border)){
      printResult.textContent='DPIと塗り足しを範囲内で入力してください。';drawPreview();return;
    }
    const w=width*25.4/resolution,h=height*25.4/resolution,innerW=w-2*border,innerH=h-2*border;
    drawPreview(border/w,border/h);
    printResult.textContent=`画像全体 ${w.toFixed(1)} × ${h.toFixed(1)} mm。仕上がり ${Math.max(0,innerW).toFixed(1)} × ${Math.max(0,innerH).toFixed(1)} mm。`+
      (innerW<=0||innerH<=0?' 塗り足しを引くと仕上がり範囲がありません。':' 参考値です。出力画像の画素・色・DPIは変わりません。');
  }
  function drawPreview(insetX=0,insetY=0){
    if(!comparison)return;
    const context=preview.getContext('2d');if(!context)return;
    context.putImageData(display.value==='proof'&&print.open&&proof?proof:comparison,0,0);
    if(!print.open||insetX<=0||insetY<=0||insetX>=.5||insetY>=.5)return;
    const {width,height}=preview,x=insetX*width,y=insetY*height;
    context.fillStyle='#30303666';
    context.fillRect(0,0,width,y);context.fillRect(0,height-y,width,y);
    context.fillRect(0,y,x,height-2*y);context.fillRect(width-x,y,x,height-2*y);
    context.setLineDash([4,3]);context.strokeStyle='#fff';context.lineWidth=2;
    context.strokeRect(x,y,width-2*x,height-2*y);
    context.setLineDash([4,3]);context.lineDashOffset=3;context.strokeStyle='#444';
    context.strokeRect(x,y,width-2*x,height-2*y);context.lineDashOffset=0;
  }
  function clearProof(){
    proofTicket++;proof=null;display.value='original';display.disabled=true;proofStatus.textContent='';refresh();
  }
  for(const control of [profileFile,intent,black,gamut])control.onchange=clearProof;
  display.onchange=refresh;print.ontoggle=refresh;
  for(const field of [format,style,quality,lossless,dpi,bleed])field.onchange=refresh;
  const actions=document.createElement('div');actions.className='box-actions';
  async function captureComparison(){
    if(!active())throw Error('作品が切り替わりました。');
    const fixed=captureExport(doc),ratio=Math.min(1,480/Math.max(fixed.width,fixed.height));
    const width=Math.max(1,Math.round(fixed.width*ratio)),height=Math.max(1,Math.round(fixed.height*ratio));
    const pixels=await renderFrozenArtworkTiledPreview(fixed,width,height)??new Uint8ClampedArray(resizeImagePixels(
      await renderFrozenArtwork(fixed),fixed.width,fixed.height,width,height,'auto'));
    return new ImageData(new Uint8ClampedArray(pixels),width,height);
  }
  const see=button('作品全体の見た目を確認',async()=>{
    const image=await captureComparison();
    if(!dialog.open)return;
    clearProof();comparison=image;
    preview.width=image.width;preview.height=image.height;preview.hidden=false;refresh();
    if(print.open)status.textContent='破線が仕上がりの位置です。市松模様が見える範囲が透明です。';
  },status);
  const checkProof=button('出力先の色を確認',async()=>{
    const file=profileFile.files?.[0];
    if(!file||file.size>ICC_LIMIT)throw Error('4MB以内のICCプロファイルを選んでください。');
    const ticket=++proofTicket;
    const values={intent:Number(intent.value),blackPoint:black.checked,gamut:gamut.checked};
    proofStatus.textContent='プロファイルを使って出力時の色を計算しています。';
    const image=await captureComparison();
    const result=await runIcc({profile:new Uint8Array(await file.arrayBuffer()),layers:[image.data],proof:true,...values});
    if(!dialog.open||ticket!==proofTicket)return;
    const output=result.converted[0]!;
    let count=0;
    if(output.outOfGamut)for(let i=0;i<output.outOfGamut.length;i++){
      if(!output.outOfGamut[i])continue;
      count++;output.pixels.set([255,45,140],i*4);
    }
    comparison=image;proof=new ImageData(output.pixels,image.width,image.height);
    display.disabled=false;display.value='proof';
    preview.width=image.width;preview.height=image.height;preview.hidden=false;refresh();
    proofStatus.textContent='「'+result.name+'」の表示を比較しています。作品と出力ファイルの色は変更されません。'+
      (values.gamut?(count?' ピンクは範囲外と判定した部分です。':' 縮小表示で範囲外の色は検出されませんでした。'):'');
  },proofStatus);
  print.append(checkProof,proofStatus);
  const run=button('書き出す',async()=>{
    if(!active())throw Error('作品が切り替わりました。');
    const selected=format.value as ExchangeFormat,layered=style.value==='layered'&&!style.parentElement!.hidden;
    if(selected==='avif'&&!lossless.checked&&(!quality.validity.valid||!quality.value))throw Error('画質を1〜100で指定してください。');
    const outputName=exchangeFileName(base.value,selected);
    status.textContent='交換用ファイルを作成しています。';
    const blob=await exportExchange(doc,selected,layered,quality.valueAsNumber,lossless.checked);
    if(dialog.open){download(blob,outputName);status.textContent=outputName+' を作成しました。';}
  },status);
  const close=button('閉じる',()=>dialog.close(),status);
  dialog.onclose=()=>{proofTicket++;comparison=proof=null;dialog.remove();};
  actions.append(see,run,close);section.append(notes,preview,print,actions,status);dialog.append(section);
  document.body.append(dialog);refresh();dialog.showModal();
}
