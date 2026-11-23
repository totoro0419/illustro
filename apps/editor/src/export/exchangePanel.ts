import {appPrompt} from '../ui/appDialogs';
import {readExchangePresets,updateExchangePresets,type ExchangePreset} from './exchangePresets';
import {deleteExportProfile,readSavedExportProfile,saveExportProfile} from './rasterPresets';
import {type RasterMetadata} from './rasterMetadata';
import {describePosition,type ImagePosition} from './imagePosition';
import {runIcc} from './iccRun';
import {srgbIccBytes,ICC_LIMIT,validIccBytes} from './iccMetadata';
import type {CoreDocument} from '@illustro/core';
import {resizeImagePixels} from '../canvasGeometry';
import {captureExport,renderFrozenArtworkTiledPreview,renderFrozenArtwork} from './basicExport';
import {button,labelledField,numberField,selectField} from '../artwork/tools';
import {exchangeFileName,exchangeWarnings,exportExchange,importExchange,convertExchangeColors} from './exchange';
import type {ExchangeFormat} from './exchangeTypes';

export function openExchangePanel(doc:CoreDocument,active:()=>boolean,download:(blob:Blob,name:string)=>void,position?:ImagePosition){
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
  const metadata=document.createElement('details'),metadataTitle=document.createElement('summary');
  metadataTitle.textContent='出力ファイルに含める色と情報';metadata.append(metadataTitle);
  const outputColor=selectField(metadata,'色のプロファイル',[
    ['default','形式の標準色空間'],['srgb','sRGB ICCを含める'],['custom','選んだRGB ICCへ変換して含める'],
  ]);
  const outputProfile=document.createElement('input');outputProfile.type='file';outputProfile.accept='.icc,.icm';
  labelledField(metadata,'RGB ICC',outputProfile);
  const outputDensity=numberField(metadata,'DPI',doc.root.info.dpi??96,1,2400);
  const author=document.createElement('input');author.maxLength=500;labelledField(metadata,'作者',author);
  const rights=document.createElement('input');rights.maxLength=500;labelledField(metadata,'権利',rights);
  const includePosition=document.createElement('input');includePosition.type='checkbox';
  if(position)labelledField(metadata,'読み込み元の位置情報を含める（'+describePosition(position)+'）',includePosition);
  const privacy=document.createElement('p');
  privacy.textContent='位置情報は初期状態で除外します。元のファイルに含まれていたその他の情報も除外されます。';
  metadata.append(privacy);
  const refreshMetadata=()=>{
    const colorAllowed=['psd','psb','ora','tiff','avif'].includes(format.value)||format.value==='svg'&&style.value==='flat';
    outputColor.disabled=!colorAllowed;
    outputProfile.parentElement!.hidden=!colorAllowed||outputColor.value!=='custom';
    outputDensity.disabled=!['psd','psb','ora','tiff','svg','avif'].includes(format.value);
  };
  for(const control of [format,style,outputColor])control.addEventListener('change',refreshMetadata);
  refreshMetadata();
  const notes=document.createElement('ul'),status=document.createElement('output');status.setAttribute('role','status');
  const preferences=document.createElement('details'),preferenceTitle=document.createElement('summary');
  preferenceTitle.textContent='書き出し設定を保存・読み込み';preferences.append(preferenceTitle);
  const presets=selectField(preferences,'保存済みの設定',[]),profileStatus=document.createElement('output');
  profileStatus.setAttribute('role','status');metadata.append(profileStatus);
  let loadedProfile:Uint8Array|undefined,profileChange=0;
  outputProfile.addEventListener('change',()=>{profileChange++;loadedProfile=undefined;profileStatus.textContent='';});
  function updatePresets(selected=''){
    presets.replaceChildren(new Option('設定を選ぶ',''),...readExchangePresets(localStorage).map(item=>new Option(item.name,item.name)));
    presets.value=selected;removePreset.disabled=!presets.value;
  }
  async function readMetadataOptions():Promise<RasterMetadata>{
    let profile:Uint8Array|undefined;
    if(!outputColor.disabled&&outputColor.value==='srgb')profile=srgbIccBytes();
    if(!outputColor.disabled&&outputColor.value==='custom'){
      const file=outputProfile.files?.[0];
      if(loadedProfile&&!file)profile=loadedProfile;
      else{
        if(!file||file.size>ICC_LIMIT)throw Error('4MB以内のICCプロファイルを選んでください。');
        profile=new Uint8Array(await file.arrayBuffer());
      }
      if(!validIccBytes(profile)||String.fromCharCode(...profile.subarray(16,20))!=='RGB ')
        throw Error('RGBのICCファイルを選んでください。');
    }
    if(!outputDensity.disabled&&(!outputDensity.value||!outputDensity.validity.valid))throw Error('DPIを1〜2400で指定してください。');
    return {...(profile?{profile}:{}),...(position&&includePosition.checked?{position}:{}),
      ...(!outputDensity.disabled?{dpi:outputDensity.valueAsNumber}:{}),author:author.value,copyright:rights.value};
  }
  const savePreset=button('名前を付けて保存',async()=>{
    const name=await appPrompt('書き出し設定の名前',presets.value,{required:true,maxLength:80});
    if(!name?.trim()||!dialog.open)return;
    if(!quality.value||!quality.validity.valid)throw Error('画質を1〜100で指定してください。');
    const selected=await readMetadataOptions(),mode=outputColor.disabled?'default':outputColor.value as ExchangePreset['color'];
    const profileKey=mode==='custom'?crypto.randomUUID():undefined;
    if(profileKey&&selected.profile)await saveExportProfile(profileKey,selected.profile);
    const preset={name:name.trim(),format:format.value as ExchangeFormat,style:style.value as ExchangePreset['style'],
      quality:quality.valueAsNumber,lossless:lossless.checked,dpi:selected.dpi??96,
      author:author.value,rights:rights.value,position:includePosition.checked,color:mode,...(profileKey?{profileKey}:{})};
    try{
      const discarded=updateExchangePresets(localStorage,preset.name,preset);
      for(const entry of discarded)if(entry.profileKey)void deleteExportProfile(entry.profileKey).catch(()=>{});
    }catch(error){
      if(profileKey)void deleteExportProfile(profileKey).catch(()=>{});
      throw error;
    }
    updatePresets(preset.name);status.textContent='書き出し設定を保存しました。';
  },status);
  const removePreset=button('設定を削除',()=>{
    for(const item of updateExchangePresets(localStorage,presets.value))
      if(item.profileKey)void deleteExportProfile(item.profileKey).catch(()=>{});
    updatePresets();status.textContent='書き出し設定を削除しました。';
  },status);
  presets.addEventListener('change',async()=>{
    const ticket=++profileChange,selected=readExchangePresets(localStorage).find(item=>item.name===presets.value);
    removePreset.disabled=!selected;
    if(!selected)return;
    loadedProfile=undefined;outputProfile.value='';profileStatus.textContent='';
    format.value=selected.format;style.value=selected.style;quality.value=String(selected.quality);lossless.checked=selected.lossless;
    outputDensity.value=String(selected.dpi);author.value=selected.author;rights.value=selected.rights;
    outputColor.value=selected.color;includePosition.checked=!!position&&selected.position;
    format.dispatchEvent(new Event('change'));style.dispatchEvent(new Event('change'));
    if(selected.profileKey){
      try{
        const profile=await readSavedExportProfile(selected.profileKey);
        if(ticket!==profileChange||!dialog.open)return;
        if(!profile||!validIccBytes(profile))throw Error('保存したICCを読み込めません。もう一度選んでください。');
        loadedProfile=profile;profileStatus.textContent='保存したRGB ICCを使用します。';
      }catch(error){if(ticket===profileChange)profileStatus.textContent=error instanceof Error?error.message:String(error);}
    }
  });
  preferences.append(savePreset,removePreset);updatePresets();
  const print=document.createElement('details'),printTitle=document.createElement('summary');printTitle.textContent='印刷時の大きさ';
  const dpi=numberField(print,'印刷の解像度（DPI）',doc.root.info.dpi??300,1,2400);
  const bleed=numberField(print,'片側の塗り足し（mm）',3,0,50,.1);
  const paper=document.createElement('input');paper.type='color';paper.value='#ffffff';
  labelledField(print,'確認する紙の色',paper);
  const transparency=document.createElement('input');transparency.type='checkbox';transparency.checked=true;
  labelledField(print,'透明部分を市松模様で表示する',transparency);
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
  const svgComparison=document.createElement('figure'),svgImage=document.createElement('canvas'),svgCaption=document.createElement('figcaption');
  svgImage.className=preview.className;svgImage.setAttribute('aria-label','出力したファイルの見た目');
  svgComparison.hidden=true;svgComparison.append(svgImage,svgCaption);
  let comparisonVersion=0;
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
    preview.style.background=print.open&&!transparency.checked?paper.value:'';
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
  for(const field of [format,style,quality,lossless,dpi,bleed,paper,transparency])field.onchange=()=>{
    comparisonVersion++;svgComparison.hidden=true;refresh();
  };
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
  const compareExchange=button('出力の見た目を元の絵と比較',async()=>{
    const selected=format.value;
    if(selected!=='svg'&&selected!=='ora'&&selected!=='tiff')return;
    const ticket=++comparisonVersion,layered=style.value==='layered',revision=doc.head;
    const original=await captureComparison();
    const blob=await exportExchange(doc,selected,layered,quality.valueAsNumber,lossless.checked,await readMetadataOptions());
    const url=selected==='svg'?URL.createObjectURL(blob):null;
    try{
      let image:HTMLImageElement|null=null;
      let decoded:ImageData|null=null;
      if(url){
        image=new Image();image.src=url;await image.decode();
      }else{
        const file=new File([blob],exchangeFileName('preview',selected),{type:blob.type});
        const artwork=await convertExchangeColors(await importExchange(file),true);
        const pixels=artwork.merged??(artwork.layers.length===1?artwork.layers[0]?.pixels:null);
        if(!pixels)throw Error('出力に比較できる統合画像がありません。');
        decoded=new ImageData(new Uint8ClampedArray(resizeImagePixels(pixels,artwork.width,artwork.height,original.width,original.height,'auto')),
          original.width,original.height);
      }
      if(!dialog.open||ticket!==comparisonVersion||!active()||doc.head!==revision)return;
      comparison=original;display.value='original';preview.width=original.width;preview.height=original.height;
      preview.hidden=false;drawPreview();
      svgImage.width=original.width;svgImage.height=original.height;
      const context=svgImage.getContext('2d');
      if(!context)throw Error('比較を表示できません。');
      if(image)context.drawImage(image,0,0,original.width,original.height);
      else if(decoded)context.putImageData(decoded,0,0);
      const rendered=context.getImageData(0,0,original.width,original.height).data;
      let count=0;
      for(let i=0;i<rendered.length;i+=4){
        const alpha=rendered[i+3]!,baseAlpha=original.data[i+3]!;
        if(Math.abs(alpha-baseAlpha)>8||[0,1,2].some(c=>Math.abs(rendered[i+c]!*alpha-original.data[i+c]!*baseAlpha)>8*255))count++;
      }
      const total=original.width*original.height;
      svgCaption.textContent=(selected==='ora'?'OpenRasterの統合プレビュー':selected.toUpperCase()+'の出力')+
        ' · 縮小比較で約 '+(count/total*100).toFixed(1)+'% の画素に差があります。';
      svgComparison.hidden=false;
    }finally{if(url)URL.revokeObjectURL(url);}
  },status);
  const toggleExchangeComparison=()=>{compareExchange.hidden=!['svg','ora','tiff'].includes(format.value);};
  toggleExchangeComparison();format.addEventListener('change',toggleExchangeComparison);
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
    const blob=await exportExchange(doc,selected,layered,quality.valueAsNumber,lossless.checked,await readMetadataOptions());
    if(dialog.open){download(blob,outputName);status.textContent=outputName+' を作成しました。';}
  },status);
  const close=button('閉じる',()=>dialog.close(),status);
  dialog.onclose=()=>{proofTicket++;comparison=proof=null;dialog.remove();};
  actions.append(see,compareExchange,run,close);section.append(notes,preview,svgComparison,metadata,preferences,print,actions,status);dialog.append(section);
  document.body.append(dialog);refresh();dialog.showModal();
}
