import {validateEditableArtwork,type ArtPoint,type EditablePath,type LayerId} from '@illustro/core';
import type {BrushSurface} from '../brushSurface';
import {runArtwork} from './run';
import {vectorPointDrag,type VectorDragHandle} from './vectorPointDrag';
import {appendPathStroke,combineShapes,eraseBetweenIntersections,eraseSegment,eraseWholeStroke,joinPaths,simplifyPath,smoothPath,splitPath} from './pathOperations';
import {button,labelledField,locate,numberField,paintPreview,selectField,type ArtworkActions} from './tools';

export function installVectorPanel(host:HTMLElement,api:ArtworkActions){
  const panel=document.createElement('details');panel.className='c06-clipboard-panel';
  const title=document.createElement('summary');title.textContent='ベクター線・点の編集';
  const appearance=document.createElement('div'),coordinates=document.createElement('div'),tools=document.createElement('div');
  for(const area of [appearance,coordinates,tools])area.className='c06-clipboard-grid';
  const status=document.createElement('output');status.setAttribute('role','status');
  const preview=document.createElement('canvas');preview.hidden=true;preview.style.maxWidth='100%';
  const color=document.createElement('input');color.type='color';labelledField(appearance,'線の色',color);
  const fill=document.createElement('input');fill.type='color';fill.value='#ffb742';labelledField(appearance,'内側の色',fill);
  const filled=document.createElement('input');filled.type='checkbox';labelledField(appearance,'内側を塗る',filled);
  const closed=document.createElement('input');closed.type='checkbox';labelledField(appearance,'線を閉じる',closed);
  const thickness=numberField(appearance,'線幅（px）',5,0,4096,.1);
  const lineStyle=selectField(appearance,'線の見た目',[
    ['solid','実線'],['dashed','破線'],['dotted','点線'],['pressure','筆圧で太さを変える']
  ] as const);
  const pointIndex=numberField(coordinates,'編集する点の番号',1,1,4096);
  const pointX=numberField(coordinates,'点の X',0,-8192,16384,.1),pointY=numberField(coordinates,'点の Y',0,-8192,16384,.1);
  const inX=numberField(coordinates,'前の曲線ハンドル X',0,-8192,16384,.1),inY=numberField(coordinates,'前の曲線ハンドル Y',0,-8192,16384,.1);
  const outX=numberField(coordinates,'次の曲線ハンドル X',0,-8192,16384,.1),outY=numberField(coordinates,'次の曲線ハンドル Y',0,-8192,16384,.1);
  const tolerance=numberField(coordinates,'点を減らす許容幅（px）',2,.1,80,.1);
  const secondary=selectField(coordinates,'組み合わせるレイヤー',[]);
  const sourceSide=selectField(coordinates,'直す元の形',[
    ['a','1つ目の形'],['b','2つ目の形']
  ] as const);
  const hideOperands=document.createElement('input');hideOperands.type='checkbox';hideOperands.checked=true;
  labelledField(coordinates,'演算結果を作ったら元の2レイヤーを隠す（Undoで戻せます）',hideOperands);
  hideOperands.parentElement!.hidden=true;
  const combination=selectField(coordinates,'形の組み合わせ方',[
    ['union','重ね合わせる'],['intersection','重なる部分だけ'],['difference','重なる部分を引く'],['xor','重ならない部分だけ']
  ] as const);
  let path:EditablePath|null=null,editing:LayerId|undefined,previewId=0,pointDrawing:BrushSurface|null=null;
  let sourceEdit:{operands:NonNullable<EditablePath['booleanOperands']>;side:'a'|'b'}|null=null;
  let combinedSourceIds:readonly LayerId[]|null=null;
  function draft(){
    if(!path)throw Error('線を描くか、ベクターレイヤーを選んでください。');
    const picked=pointNumber();
    const fillRuns=path.fillRuns?.map(run=>picked>=run.start&&picked<run.end?{...run,color:fill.value}:run);
    return validateEditableArtwork({...path,...(fillRuns?{fillRuns}:{}),stroke:color.value,fill:filled.checked?(path.fillRuns?(path.fill??fill.value):fill.value):null,
      closed:closed.checked,width:thickness.valueAsNumber,lineStyle:lineStyle.value}) as EditablePath;
  }
  const pointNumber=()=>Math.round(pointIndex.valueAsNumber)-1;
  function syncPoint(){
    const index=Math.max(0,Math.min((path?.points.length??1)-1,pointNumber()||0));
    pointIndex.max=String(path?.points.length??1);pointIndex.value=String(index+1);
    const p=path?.points[index];
    if(!p)return;
    const paint=path?.fillRuns?.find(run=>index>=run.start&&index<run.end);
    if(paint)fill.value=paint.color;
    for(const [input,value] of [[pointX,p.x],[pointY,p.y],[inX,p.inX??p.x],[inY,p.inY??p.y],[outX,p.outX??p.x],[outY,p.outY??p.y]] as const)
      input.value=String(Math.round(value*100)/100);
    status.textContent=`${path?.points.length} 点・編集中の点 ${index+1}`;
  }
  function readPath(next:EditablePath,id?:LayerId){
    path=next;editing=id;combinedSourceIds=null;hideOperands.parentElement!.hidden=true;
    color.value=next.stroke;filled.checked=!!next.fill;if(next.fill)fill.value=next.fill;
    closed.checked=next.closed;thickness.value=String(next.width);lineStyle.value=next.lineStyle??'solid';
    const options=api.context()?.paths.filter(p=>p.id!==editing)??[];
    secondary.replaceChildren(...options.map(p=>new Option(p.name,p.id)));
    syncPoint();void refresh();
  }
  function changePoint(index:number,point:ArtPoint){
    const current=draft(),points=[...current.points];points[index]=point;
    const {booleanOperands:_oldOperands,...editable}=current;
    path={...editable,points};
    pointIndex.value=String(index+1);syncPoint();void refresh();
  }
  async function refresh(){
    const context=api.context(),request=++previewId;
    if(!context||!path)return;
    try{
      const scale=Math.min(1,260/Math.max(context.width,context.height));
      const w=Math.max(1,Math.round(context.width*scale)),h=Math.max(1,Math.round(context.height*scale));
      const pixels=await runArtwork({content:draft(),width:context.width,height:context.height,outputWidth:w,outputHeight:h});
      if(request===previewId)paintPreview(preview,pixels,w,h);
    }catch(error){if(request===previewId)status.textContent=error instanceof Error?error.message:String(error);}
  }
  // Render only the latest drag position. At most one preview render is in flight,
  // so rapid pointer movement cannot build an unbounded worker queue.
  type PointPreviewRequest={content:EditablePath;drawing:BrushSurface;version:number;
    replacement:LayerId|null;width:number;height:number};
  let pointPreviewRequest:PointPreviewRequest|null=null,pointPreviewRunning=false;
  let pointPreviewAbort:AbortController|null=null,pointPreviewShown=false,pointPreviewVersion=0;
  async function pumpPointPreview(){
    if(pointPreviewRunning)return;
    pointPreviewRunning=true;
    try{
      while(pointPreviewRequest){
        const request=pointPreviewRequest;
        pointPreviewRequest=null;
        const abort=new AbortController();pointPreviewAbort=abort;
        const scale=Math.min(1,1024/Math.max(request.width,request.height));
        const width=Math.max(1,Math.round(request.width*scale));
        const height=Math.max(1,Math.round(request.height*scale));
        try{
          const pixels=await runArtwork({content:request.content,width:request.width,height:request.height,
            outputWidth:width,outputHeight:height},{signal:abort.signal,priority:'interactive'});
          if(!abort.signal.aborted&&request.version===pointPreviewVersion&&pointDrawing===request.drawing){
            request.drawing.showArtworkPreview(new ImageData(pixels,width,height),false,request.replacement);
            pointPreviewShown=true;
          }
        }catch(error){
          if(!abort.signal.aborted&&request.version===pointPreviewVersion&&pointDrawing===request.drawing)
            status.textContent=error instanceof Error?error.message:String(error);
        }finally{
          if(pointPreviewAbort===abort)pointPreviewAbort=null;
        }
      }
    }finally{pointPreviewRunning=false;}
  }
  function previewPointDrag(current:EditablePath,picked:number,anchorCount:number,
    handles:readonly VectorDragHandle[],position:ArtPoint,drawing:BrushSurface,width:number,height:number){
    try{
      const content=vectorPointDrag(current,picked,anchorCount,handles,position);
      pointPreviewRequest={content,drawing,width,height,replacement:editing??null,version:++pointPreviewVersion};
      void pumpPointPreview();
    }catch(error){status.textContent=error instanceof Error?error.message:String(error);}
  }
  const stopPoints=()=>{
    pointPreviewVersion++;pointPreviewRequest=null;
    pointPreviewAbort?.abort();pointPreviewAbort=null;
    if(pointPreviewShown)pointDrawing?.showArtworkPreview(null);
    pointPreviewShown=false;
    pointDrawing?.setCanvasEditGesture(null);pointDrawing=null;
  };
  const closePath=(current:EditablePath)=>current.points.some(p=>p.move||p.close);
  const otherPath=()=>{
    const other=api.context()?.paths.find(layer=>layer.id===secondary.value)?.content;
    if(other?.kind!=='path')throw Error('組み合わせるベクターレイヤーを選んでください。');
    return other;
  };
  tools.append(
    button('全体の塗りをこの色にそろえる',()=>{
      const current=draft(),{fillRuns:_colors,...uniform}=current;
      readPath({...uniform,fill:filled.checked?fill.value:null},editing);
      status.textContent='すべての輪郭の塗り色をそろえました。「作品に反映」で保存できます。';
    },status),
    button('新しいベクター線を描く',()=>{
      const context=api.context();
      if(!context)throw Error('作品を開いてください。');
      stopPoints();status.textContent='キャンバスに線を描いてください。';
      locate(context.drawing,points=>{
        if(points.length<2)return;
        sourceEdit=null;pointIndex.value='1';
        readPath({kind:'path',shape:'freehand',points:simplifyPath(points,.65),closed:false,
          stroke:context.color,fill:null,width:5,lineStyle:'pressure'});
      });
    },status),
    button('選んだレイヤーに線を追加',()=>{
      const context=api.context(),layer=context?.selected;
      if(layer?.content?.kind!=='path'||!context)throw Error('線を追加するベクターレイヤーを選んでください。');
      const base=validateEditableArtwork(layer.content) as EditablePath;
      stopPoints();sourceEdit=null;
      status.textContent='キャンバスに追加する線を描いてください。元の線は残ります。';
      locate(context.drawing,points=>{
        if(points.length<2){status.textContent='2点以上の線を描いてください。';return;}
        try{
          const stroke:EditablePath={...base,points:simplifyPath(points,.65),closed:false};
          readPath(appendPathStroke(base,stroke),layer.id);
          status.textContent='線を追加しました。「作品に反映」でまとめて保存できます。';
        }catch(error){status.textContent=error instanceof Error?error.message:String(error);}
      });
    },status),
    button('選んだベクターを編集',()=>{
      const context=api.context(),layer=context?.selected;
      if(layer?.content?.kind!=='path')throw Error('ベクター線や図形のレイヤーを選んでください。');
      stopPoints();sourceEdit=null;pointIndex.value='1';readPath(layer.content,layer.id);
    },status),
    button('絵の上で点・曲線ハンドルを動かす',()=>{
      const context=api.context(),current=draft();
      if(!context)throw Error('作品を開いてください。');
      if(current.points.length>180)throw Error('点が多いので、「点を減らす」か番号指定で編集してください。');
      const anchors=current.points.map(point=>({x:point.x,y:point.y}));
      const handles:VectorDragHandle[]=[];
      const points=[...anchors],edges:Array<readonly [number,number]>=[];
      for(let i=1;i<anchors.length;i++)if(!current.points[i]?.move&&!current.points[i-1]?.close)edges.push([i-1,i]);
      if(current.closed)edges.push([anchors.length-1,0]);
      current.points.forEach((point,index)=>{
        if(point.inX!==undefined&&point.inY!==undefined){
          edges.push([index,points.length]);points.push({x:point.inX,y:point.inY});
          handles.push({index,kind:'in'});
        }
        if(point.outX!==undefined&&point.outY!==undefined){
          edges.push([index,points.length]);points.push({x:point.outX,y:point.outY});
          handles.push({index,kind:'out'});
        }
      });
      stopPoints();pointDrawing=context.drawing;
      status.textContent='点やハンドルをドラッグしてください。曲線の変更をキャンバスに仮表示します（大きな作品では縮小表示）。';
      pointDrawing.setCanvasEditGesture({path:false,width:2,color:'#ffb742',complete:()=>{},
        pointEdit:{points,edges,closed:false,
          preview:(picked,position)=>previewPointDrag(current,picked,anchors.length,handles,position,
            context.drawing,context.width,context.height),
          commit:(picked,position)=>{
            stopPoints();
            const updated=vectorPointDrag(current,picked,anchors.length,handles,position);
            const index=picked<anchors.length?picked:handles[picked-anchors.length]!.index;
            changePoint(index,updated.points[index]!);
          }}});
    },status),
    button('選んだ点に曲線ハンドルを付ける',()=>{
      const current=draft(),index=pointNumber(),point=current.points[index];
      if(!point||current.shape==='rectangle'||current.shape==='ellipse')throw Error('線の点を選んでください。');
      const before=current.points[index-1]??point,after=current.points[index+1]??point;
      const dx=(after.x-before.x)/6,dy=(after.y-before.y)/6;
      changePoint(index,{...point,inX:point.inX??point.x-dx,inY:point.inY??point.y-dy,
        outX:point.outX??point.x+dx,outY:point.outY??point.y+dy});
      status.textContent='曲線ハンドルを追加しました。絵の上で直接動かせます。';
    },status),
    button('点と曲線ハンドルを更新',()=>{
      const current=draft(),index=pointNumber(),previous=current.points[index];
      if(!previous)throw Error('編集する点の番号を確認してください。');
      const next={...previous,x:pointX.valueAsNumber,y:pointY.valueAsNumber,
        inX:inX.valueAsNumber,inY:inY.valueAsNumber,outX:outX.valueAsNumber,outY:outY.valueAsNumber};
      validateEditableArtwork({...current,points:[next,next]});
      changePoint(index,next);
    },status),
    button('選んだ点を角にする',()=>{
      const current=draft(),index=pointNumber(),p=current.points[index];
      if(!p)throw Error('編集する点を選んでください。');
      changePoint(index,{x:p.x,y:p.y,...(p.move?{move:true}:{}),...(p.close?{close:true}:{})});
    },status),
    button('次の点との間に点を足す',()=>{
      const current=draft(),index=pointNumber(),a=current.points[index],b=current.points[index+1];
      if(!a||!b||closePath(current))throw Error('最後の点の手前を選んでください。');
      const points=[...current.points];points.splice(index+1,0,{x:(a.x+b.x)/2,y:(a.y+b.y)/2});
      readPath({...current,points},editing);
    },status),
    button('選んだ点を外す',()=>{
      const current=draft();
      if(current.points.length<=2||closePath(current))throw Error('この線の点はこれ以上外せません。');
      readPath({...current,points:current.points.filter((_,i)=>i!==pointNumber())},editing);
    },status),
    button('線の区間を消す',()=>{
      const current=draft(),context=api.context();
      if(!context)throw Error('作品を開いてください。');
      status.textContent='消したい区間を絵の上でタップしてください。';
      locate(context.drawing,points=>{
        try{readPath(eraseSegment(current,points[0]!),editing);}
        catch(error){status.textContent=error instanceof Error?error.message:String(error);}
      });
    },status),
    button('線をまるごと消す',()=>{
      const current=draft(),context=api.context();
      if(!context)throw Error('作品を開いてください。');
      stopPoints();status.textContent='消す線をキャンバスでタップしてください。';
      locate(context.drawing,async points=>{
        try{
          const remaining=eraseWholeStroke(current,points[0]!);
          if(remaining){
            readPath(remaining,editing);
            status.textContent='指定した線を取り除きました。「作品に反映」で保存できます。';
            return;
          }
          // Unsaved strokes have no layer to delete. Never erase the currently selected
          // document layer on behalf of a new, uncommitted draft.
          if(!editing){
            path=null;previewId++;preview.hidden=true;
            status.textContent='最後の未保存の線を取り消しました。';
            return;
          }
          if(!api.remove)throw Error('レイヤーの削除処理を利用できません。');
          if(!window.confirm('このレイヤーの最後の線を消します。レイヤーも削除しますか？（Undoで戻せます）')){
            status.textContent='線の削除を取り消しました。';
            return;
          }
          await api.remove(editing);
          path=null;editing=undefined;sourceEdit=null;combinedSourceIds=null;
          previewId++;preview.hidden=true;hideOperands.parentElement!.hidden=true;
          status.textContent='最後の線とレイヤーを削除しました。Undoで戻せます。';
        }catch(error){status.textContent=error instanceof Error?error.message:String(error);}
      });
    },status),
    button('点を減らす',()=>{
      const current=draft();
      if(closePath(current)||current.shape==='bezier')throw Error('複雑な輪郭や曲線は点番号で編集してください。');
      const points=simplifyPath(current.points,Math.max(.1,tolerance.valueAsNumber));
      if(current.closed&&points.length<3)throw Error('閉じた形を保つには許容幅を下げてください。');
      readPath({...current,points},editing);
    },status),
    button('曲線をなめらかにする',()=>{
      const current=draft();
      if(closePath(current)||current.shape==='rectangle'||current.shape==='ellipse')throw Error('通常の線または折れ線を選んでください。');
      readPath({...current,shape:'bezier',points:smoothPath(current.points,current.closed,1)},editing);
    },status),
    button('選んだ点で線を分ける',()=>readPath(splitPath(draft(),pointNumber()),editing),status),
    button('別の線と端をつなぐ',()=>{
      readPath(joinPaths(draft(),otherPath()));
      status.textContent='つないだ線を新しいベクターレイヤーに作ります。';
    },status),
    button('交点まで消す',()=>{
      const current=draft(),other=otherPath(),context=api.context();
      if(!context)throw Error('作品を開いてください。');
      status.textContent='消したい区間をタップしてください。曲線は折れ線に変換して計算します。';
      locate(context.drawing,points=>{
        try{readPath(eraseBetweenIntersections(current,other,points[0]!),editing);}
        catch(error){status.textContent=error instanceof Error?error.message:String(error);}
      });
    },status),
    button('演算前の形を直す',()=>{
      const current=draft(),operands=current.booleanOperands;
      if(!operands)throw Error('図形を組み合わせて作ったレイヤーを編集してください。');
      const side=sourceSide.value as 'a'|'b';
      sourceEdit={operands,side};
      readPath(operands[side],editing);
      status.textContent='元の形の点を編集したら「元の形から演算を更新」を押してください。';
    },status),
    button('元の形から演算を更新',async()=>{
      if(!sourceEdit)throw Error('先に「演算前の形を直す」を選んでください。');
      const {operands,side}=sourceEdit;
      const a=side==='a'?draft():operands.a,b=side==='b'?draft():operands.b;
      const result=await combineShapes(a,b,operands.mode);
      sourceEdit=null;readPath(result,editing);
      status.textContent='元の図形を再計算しました。「作品に反映」で結果を保存できます。';
    },status),
    button('2つの形を組み合わせる',async()=>{
      const originalId=editing,otherId=secondary.value as LayerId;
      const result=await combineShapes(draft(),otherPath(),combination.value as 'union'|'intersection'|'difference'|'xor');
      sourceEdit=null;readPath(result);
      if(originalId&&otherId&&originalId!==otherId){
        combinedSourceIds=[originalId,otherId];hideOperands.parentElement!.hidden=false;
        status.textContent='新しい図形を保存するとき、元の2レイヤーを同時に隠せます。Undoは1回です。';
      }else status.textContent='演算結果を新しいレイヤーに作ります。元の形はそのまま残ります。';
    },status),
    button('作品に反映',async()=>{
      if(sourceEdit)throw Error('元の形を編集中です。先に「元の形から演算を更新」を押してください。');
      stopPoints();await api.save(draft(),'ベクター線',editing,undefined,
        hideOperands.checked?combinedSourceIds??undefined:undefined);
      combinedSourceIds=null;hideOperands.parentElement!.hidden=true;
      status.textContent='ベクター線を保存しました。';
    },status),
    button('候補を取り消す',()=>{
      stopPoints();sourceEdit=null;path=null;editing=undefined;combinedSourceIds=null;
      hideOperands.parentElement!.hidden=true;previewId++;preview.hidden=true;status.textContent='候補を取り消しました。';
    },status)
  );
  pointIndex.onchange=syncPoint;
  appearance.onchange=()=>{if(path)path=draft();void refresh();};
  panel.ontoggle=()=>{if(!panel.open)stopPoints();};
  panel.append(title,appearance,coordinates,tools,preview,status);host.append(panel);
}
