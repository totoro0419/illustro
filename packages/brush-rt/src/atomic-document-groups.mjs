// Atomic document-space publication for the editor. Source pixels and history
// remain owned by the drawing and display workers, respectively. A packet may
// contain dozens of independent 512px display groups: prepare each one without
// touching the visible DOM, then replace every group in one browser task.
//
// This deliberately yields during the expensive BitmapRenderer uploads, not
// between visible updates. Ordinary 128px artwork tiles are never modified.
const yieldInput=()=>new Promise(resolve=>setTimeout(resolve,0));

function retireOldCanvases(items){
  if(!items.length)return;
  // Releasing replaced GPU bitmaps can also be expensive on mobile. Keep it
  // outside the one-task visual commit, and yield between bounded chunks.
  let next=0;
  const release=()=>{
    const stop=Math.min(items.length,next+8);
    for(;next<stop;next++){
      const element=items[next];
      element.width=element.height=1;
    }
    if(next<items.length)setTimeout(release,0);
  };
  setTimeout(release,0);
}

export async function publishDocumentGroupsAtomically(presentation,groups,isCurrent=()=>true){
  if(!Array.isArray(groups))throw Error('Invalid document display groups');
  const staged=[],seen=new Set;
  let consumed=0;
  try{
    for(let i=0;i<groups.length;i++){
      const data=groups[i];
      if(!data||typeof data.key!=='string'||seen.has(data.key)||
        !Number.isInteger(data.w)||!Number.isInteger(data.h)||data.w<1||data.h<1)
        throw Error('Invalid or duplicate display group');
      seen.add(data.key);
      const old=presentation.tiles.get(data.key);
      if(old&&(old.element.width!==data.w||old.element.height!==data.h))
        throw Error('Document group size changed');
      if(data.bitmap?.width!==data.w||data.bitmap?.height!==data.h)
        throw Error('Document group bitmap size changed');
      const element=document.createElement('canvas'),context=element.getContext('bitmaprenderer');
      if(!context)throw Error('Document group presentation unavailable');
      Object.assign(element.style,{
        position:'absolute',left:data.x+'px',top:data.y+'px',
        width:data.w+'px',height:data.h+'px',pointerEvents:'none',
        background:'transparent',imageRendering:'inherit'
      });
      element.width=data.w;element.height=data.h;
      context.transferFromImageBitmap(data.bitmap);
      consumed=i+1;
      staged.push({key:data.key,w:data.w,h:data.h,element,context});
      // This yield never exposes new pixels: every element above is detached.
      if(i+1<groups.length)await yieldInput();
    }
    // A history packet may become obsolete while the input thread yields.
    // Discard its prepared images rather than revealing an old revision.
    if(!isCurrent()){
      retireOldCanvases(staged.map(item=>item.element));
      return false;
    }
    // No await/rAF between replacements. The browser paints only after this
    // task returns, so all groups switch on the same visible frame.
    const oldCanvases=[];
    for(const item of staged){
      const old=presentation.tiles.get(item.key);
      if(old){old.element.replaceWith(item.element);oldCanvases.push(old.element);}
      else{presentation.element.append(item.element);presentation.bytes+=item.w*item.h*4;}
      presentation.tiles.set(item.key,{element:item.element,context:item.context});
    }
    presentation.peakBytes=Math.max(presentation.peakBytes,presentation.bytes);
    retireOldCanvases(oldCanvases);
    return true;
  }catch(error){
    // Staging must not mutate visible pixels even if an upload fails.
    retireOldCanvases(staged.map(item=>item.element));
    throw error;
  }finally{
    for(let i=consumed;i<groups.length;i++)groups[i]?.bitmap?.close?.();
  }
}
