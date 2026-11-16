/**
 * C04 reference color sampling entry point. A later reference-board feature
 * may provide the source image; this independent picker supports files now.
 * The file stays in this dialog and is not injected into the artwork bitmap.
 */
import {type RGB,type ForegroundColor,rgb,hex} from './model';

type Transparency='skip'|'keep'|'white';
type Diameter=1|3|5;
export function installReferenceColorPicker(
  foreground:ForegroundColor,open:HTMLButtonElement,
  getDiameter:()=>Diameter,getTransparency:()=>Transparency
){
  const file=document.createElement('input');file.type='file';file.hidden=true;
  file.accept='image/png,image/jpeg,image/webp,image/avif,image/gif,.png,.jpg,.jpeg,.webp,.avif,.gif';
  document.body.append(file);
  const dialog=document.createElement('dialog');dialog.id='referenceSampleDialog';dialog.className='c04-reference-sample-dialog';
  const title=document.createElement('h2');title.textContent='参考画像から色を取る';
  const description=document.createElement('p');
  description.textContent='参考画像に触れると色が一時表示されます。指やペンを離すと現在の色に確定します。';
  const canvas=document.createElement('canvas');canvas.className='c04-reference-sample-canvas';
  canvas.width=1;canvas.height=1;canvas.style.touchAction='none';
  canvas.setAttribute('aria-label','参考画像をなぞって色を選ぶ');
  const context=canvas.getContext('2d',{willReadFrequently:true});
  const feedback=document.createElement('output');feedback.setAttribute('role','status');
  const info=document.createElement('small');
  info.textContent='選んだ色は描画色に反映されますが、作品そのものと参考画像の内容は変更しません。';
  const pair=document.createElement('div');pair.className='c04-reference-sample-pair';
  const previous=document.createElement('span'),current=document.createElement('span');
  pair.append(previous,current);
  const controls=document.createElement('div');controls.className='c04-workspace-actions';
  const replace=document.createElement('button'),close=document.createElement('button');
  replace.type=close.type='button';
  replace.textContent='別の画像を開く';close.textContent='閉じる';
  replace.onclick=()=>file.click();close.onclick=()=>dialog.close();
  controls.append(replace,close);
  dialog.append(title,description,canvas,pair,feedback,info,controls);
  document.body.append(dialog);
  const originalColor=()=>foreground.current;
  let pointer:number|null=null,ready=false,sourceSize={width:0,height:0};
  // Display a reduced preview but sample the original pixels, not the preview.
  const sampleCanvas=document.createElement('canvas');sampleCanvas.width=5;sampleCanvas.height=5;
  const sampleContext=sampleCanvas.getContext('2d',{willReadFrequently:true});
  let sourceBitmap:ImageBitmap|null=null;
  let baseColor:RGB=originalColor();
  const swatch=(node:HTMLElement,name:string,color:RGB)=>{
    node.replaceChildren();
    const colorChip=document.createElement('i');colorChip.style.background=hex(color);
    const caption=document.createElement('span');caption.textContent=name+' '+hex(color);
    node.append(colorChip,caption);
  };
  function average(event:PointerEvent):RGB|null{
    if(!ready||!sampleContext||!sourceBitmap)return null;
    const rect=canvas.getBoundingClientRect();
    if(rect.width<=0||rect.height<=0)return null;
    const tx=(event.clientX-rect.left)/rect.width;
    const ty=(event.clientY-rect.top)/rect.height;
    if(tx<0||ty<0||tx>1||ty>1)return null;
    const cx=Math.min(sourceBitmap.width-1,Math.floor(tx*sourceBitmap.width));
    const cy=Math.min(sourceBitmap.height-1,Math.floor(ty*sourceBitmap.height));
    const radius=(getDiameter()-1)/2,transparency=getTransparency();
    const minX=Math.max(0,cx-radius),maxX=Math.min(sourceBitmap.width-1,cx+radius);
    const minY=Math.max(0,cy-radius),maxY=Math.min(sourceBitmap.height-1,cy+radius);
    const width=maxX-minX+1,height=maxY-minY+1;
    sampleContext.clearRect(0,0,5,5);
    sampleContext.drawImage(sourceBitmap,minX,minY,width,height,0,0,width,height);
    const values=sampleContext.getImageData(0,0,width,height).data;
    let red=0,green=0,blue=0,weight=0;
    for(let i=0;i<values.length;i+=4){
      const alpha=(values[i+3]??0)/255;
      if(transparency==='skip'&&alpha===0)continue;
      if(transparency==='white'){
        red+=(values[i]??0)*alpha+255*(1-alpha);
        green+=(values[i+1]??0)*alpha+255*(1-alpha);
        blue+=(values[i+2]??0)*alpha+255*(1-alpha);
      }else{
        red+=values[i]??0;green+=values[i+1]??0;blue+=values[i+2]??0;
      }
      weight++;
    }
    return weight?rgb(red/(weight*255),green/(weight*255),blue/(weight*255)):null;
  }
  function preview(event:PointerEvent,commit=false){
    const sampled=average(event);
    if(!sampled){
      if(commit){foreground.cancel();swatch(current,'現在の色',foreground.current);}
      feedback.textContent='この場所から色を取得できません。';
      return;
    }
    if(!commit){
      foreground.preview(sampled);
      swatch(current,'取得する色',sampled);
      feedback.textContent=hex(sampled)+' を確認しています。';
    }else{
      foreground.commit(sampled);
      swatch(current,'現在の色',sampled);
      feedback.textContent='参考画像から '+hex(sampled)+' を取得しました。';
    }
  }
  canvas.addEventListener('pointerdown',event=>{
    if(event.button!==0||pointer!==null||!ready)return;
    event.preventDefault();pointer=event.pointerId;baseColor=foreground.current;
    swatch(previous,'変更前',baseColor);
    foreground.begin();canvas.setPointerCapture(event.pointerId);
    preview(event);
  });
  canvas.addEventListener('pointermove',event=>{
    if(pointer===event.pointerId){event.preventDefault();preview(event);}
  });
  canvas.addEventListener('pointerup',event=>{
    if(pointer!==event.pointerId)return;
    event.preventDefault();pointer=null;preview(event,true);
  });
  canvas.addEventListener('pointercancel',event=>{
    if(pointer!==event.pointerId)return;
    pointer=null;foreground.cancel();swatch(current,'現在の色',foreground.current);
    feedback.textContent='色の変更を取り消しました。';
  });
  dialog.addEventListener('close',()=>{
    if(pointer!==null){pointer=null;foreground.cancel();}
    sourceBitmap?.close();sourceBitmap=null;ready=false;
  });
  async function openBlob(image:Blob){
    if(image.size>32*1024*1024){feedback.textContent='32MB以下の画像を選んでください。';return;}
    try{
      const bitmap=await createImageBitmap(image);
      let retained=false;
      try{
        if(bitmap.width<1||bitmap.height<1)throw Error('画像サイズを確認できませんでした。');
        const scale=Math.min(1,2048/Math.max(bitmap.width,bitmap.height));
        canvas.width=Math.max(1,Math.round(bitmap.width*scale));
        canvas.height=Math.max(1,Math.round(bitmap.height*scale));
        context?.clearRect(0,0,canvas.width,canvas.height);
        context?.drawImage(bitmap,0,0,canvas.width,canvas.height);
        sourceBitmap?.close();sourceBitmap=bitmap;retained=true;
        sourceSize={width:bitmap.width,height:bitmap.height};
        ready=true;
        baseColor=foreground.current;
        swatch(previous,'変更前',baseColor);swatch(current,'現在の色',baseColor);
        feedback.textContent='画像 '+sourceSize.width+'×'+sourceSize.height+' を読み込みました。'+
          (scale<1?'表示は縮小していますが、色は元画像から取得します。':'');
        if(!dialog.open)dialog.showModal();
      }finally{if(!retained)bitmap.close();}
    }catch(error){feedback.textContent='画像を開けませんでした。'+(error instanceof Error?error.message:String(error));}
  }
  file.onchange=async()=>{
    const image=file.files?.[0];file.value='';if(!image)return;
    await openBlob(image);
  };
  open.onclick=()=>file.click();
  return {open:()=>file.click(),openBlob,isOpen:()=>dialog.open};
}
