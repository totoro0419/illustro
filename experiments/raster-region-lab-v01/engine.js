/* Illustro Region Lab 0.1. Independent raster input; no stroke-history access. */
function RegionEngine() {
  'use strict';
  const EPS=1e-7, cross=(a,b)=>a.x*b.y-a.y*b.x;
  const sub=(a,b)=>({x:a.x-b.x,y:a.y-b.y});
  const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const unit=a=>{let d=Math.hypot(a.x,a.y)||1;return {x:a.x/d,y:a.y/d};};
  const dot=(a,b)=>a.x*b.x+a.y*b.y;
  const mix=(a,b,t)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});
  const key=p=>`${Math.round(p.x*1e6)},${Math.round(p.y*1e6)}`;
  const linkKey=(a,b)=>[key(a),key(b)].sort().join('|');
  function project(p,a,b){const v=sub(b,a),q=sub(p,a);let t=Math.max(0,Math.min(1,dot(q,v)/(dot(v,v)||1)));return {...mix(a,b,t),t};}
  function intersection(a,b,c,d){let u=sub(b,a),v=sub(d,c),w=sub(c,a),den=cross(u,v);if(Math.abs(den)<EPS)return null;let t=cross(w,v)/den,s=cross(w,u)/den;return t>=-EPS&&t<=1+EPS&&s>=-EPS&&s<=1+EPS?{t:Math.max(0,Math.min(1,t)),s:Math.max(0,Math.min(1,s)),...mix(a,b,t)}:null;}
  function pointIn(p,poly){let yes=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a.y>p.y)!=(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)yes=!yes;}return yes;}
  function signedArea(poly){let a=0;for(let i=0;i<poly.length;i++)a+=cross(poly[i],poly[(i+1)%poly.length]);return a/2;}
  class Grid {
    constructor(size=16){this.size=size;this.map=new Map();}
    cells(a,b,pad=0){let out=[];for(let y=Math.floor((Math.min(a.y,b.y)-pad)/this.size);y<=Math.floor((Math.max(a.y,b.y)+pad)/this.size);y++)for(let x=Math.floor((Math.min(a.x,b.x)-pad)/this.size);x<=Math.floor((Math.max(a.x,b.x)+pad)/this.size);x++)out.push(`${x},${y}`);return out;}
    add(i,a,b){for(const k of this.cells(a,b)){if(!this.map.has(k))this.map.set(k,[]);this.map.get(k).push(i);}}
    query(a,b,pad=0){let s=new Set();for(const k of this.cells(a,b,pad))for(const i of this.map.get(k)||[])s.add(i);return [...s];}
  }
  function countHoles(mask,w,h){const seen=new Uint8Array(mask.length),queue=new Int32Array(mask.length);let holes=0;for(let i=0;i<mask.length;i++){if(mask[i]||seen[i])continue;let head=0,tail=1,outer=false;queue[0]=i;seen[i]=1;while(head<tail){const j=queue[head++],x=j%w,y=(j/w)|0;if(x===0||y===0||x===w-1||y===h-1)outer=true;for(const o of [-w,w,-1,1]){let n=j+o;if(n<0||n>=mask.length||o===-1&&x===0||o===1&&x===w-1)continue;if(!mask[n]&&!seen[n]){seen[n]=1;queue[tail++]=n;}}}if(!outer)holes++;}return holes;}
  function extract(rgba,w,h,options){
    const pw=w+2,ph=h+2,n=pw*ph,coverage=new Float32Array(n),mask=new Uint8Array(n),queue=new Int32Array(n);
    let lo=options.low??0.18,hi=options.high??0.42,tail=0,head=0;
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){const r=(y*w+x)*4,i=(y+1)*pw+x+1;coverage[i]=(1-(rgba[r]*.2126+rgba[r+1]*.7152+rgba[r+2]*.0722)/255)*rgba[r+3]/255;if(coverage[i]>=hi){mask[i]=1;queue[tail++]=i;}}
    const offsets=[-pw,-pw+1,1,pw+1,pw,pw-1,-1,-pw-1];
    while(head<tail){const i=queue[head++];for(const o of offsets){let j=i+o;if(!mask[j]&&coverage[j]>=lo){mask[j]=1;queue[tail++]=j;}}}
    // Chamfer distance, separate from the width-free partition.
    let radius=new Float32Array(n);for(let i=0;i<n;i++)radius[i]=mask[i]?1e6:0;
    for(let y=1;y<ph-1;y++)for(let x=1;x<pw-1;x++){let i=y*pw+x;if(mask[i])radius[i]=Math.min(radius[i],radius[i-1]+1,radius[i-pw]+1,radius[i-pw-1]+Math.SQRT2,radius[i-pw+1]+Math.SQRT2);}
    for(let y=ph-2;y>0;y--)for(let x=pw-2;x>0;x--){let i=y*pw+x;if(mask[i])radius[i]=Math.min(radius[i],radius[i+1]+1,radius[i+pw]+1,radius[i+pw-1]+Math.SQRT2,radius[i+pw+1]+Math.SQRT2);}
    const skeleton=mask.slice();let iteration=0,changed=true;const remove=[];
    while(changed){changed=false;iteration++;if(iteration>Math.max(w,h)+2)throw Error('中心線化が収束しませんでした');for(let pass=0;pass<2;pass++){
      remove.length=0;
      for(let y=1;y<ph-1;y++)for(let x=1;x<pw-1;x++){let i=y*pw+x;if(!skeleton[i])continue;const p=offsets.map(o=>skeleton[i+o]);let B=p.reduce((a,b)=>a+b,0),A=0;for(let k=0;k<8;k++)if(!p[k]&&p[(k+1)%8])A++;
        const m1=pass===0?p[0]*p[2]*p[4]:p[0]*p[2]*p[6],m2=pass===0?p[2]*p[4]*p[6]:p[0]*p[4]*p[6];
        if(A===1&&B>=2&&B<=6&&!m1&&!m2)remove.push(i);
      }if(remove.length)changed=true;for(const i of remove)skeleton[i]=0;
    }}
    const points=[],index=new Int32Array(n).fill(-1);
    for(let y=1;y<ph-1;y++)for(let x=1;x<pw-1;x++){let i=y*pw+x;if(skeleton[i]){index[i]=points.length;points.push({x:x-.5,y:y-.5,pixel:i});}}
    if(points.length>150000)throw Error('線が多すぎます（中心線15万点まで）。小さな画像で再試行してください。');
    let segments=[],adj=points.map(()=>[]);
    for(let a=0;a<points.length;a++){const i=points[a].pixel;for(const o of [1,pw,pw+1,pw-1]){const j=i+o,b=index[j];if(b<0)continue;// A fully occupied 2x2 ink cell has no white hole. Omit its bottom edge to avoid a false unit face.
      if(o===1&&skeleton[i-pw]&&skeleton[i-pw+1])continue;const diag=o===pw+1||o===pw-1;if(diag&&(skeleton[i+pw]||skeleton[i+(o===pw+1?1:-1)]))continue;let id=segments.length;segments.push({a:points[a],b:points[b],source:'raster',va:a,vb:b});adj[a].push({v:b,e:id});adj[b].push({v:a,e:id});}}
    const comp=new Int32Array(points.length).fill(-1);let components=0;
    for(let i=0;i<points.length;i++)if(comp[i]<0){let q=[i];comp[i]=components;for(let k=0;k<q.length;k++)for(const {v} of adj[q[k]])if(comp[v]<0){comp[v]=components;q.push(v);}components++;}
    const endpoints=[];
    for(let id=0;id<points.length;id++)if(adj[id].length===1){let path=[id],prev=-1,cur=id,length=0,reach=Math.max(7,Math.min(24,radius[points[id].pixel]*3));while(length<reach){let next=adj[cur].filter(a=>a.v!==prev);if(next.length!==1)break;let v=next[0].v;length+=dist(points[cur],points[v]);path.push(v);prev=cur;cur=v;}let p=points[id],back=points[cur];if(length>=2)endpoints.push({id,p,back,tangent:unit(sub(p,back)),radius:radius[p.pixel],length,comp:comp[id]});}
    const rasterHoles=countHoles(mask,pw,ph),skeletonHoles=countHoles(skeleton,pw,ph),graphHoles=segments.length-points.length+components;
    if(rasterHoles!==skeletonHoles||skeletonHoles!==graphHoles)throw Error('境界抽出で領域数が変わりました。線の濃さを変えて再試行してください。');
    return {mask,skeleton,radius,coverage,pw,ph,points,segments,adj,comp,components,endpoints,iteration,topology:{rasterHoles,skeletonHoles,graphHoles}};
  }
  function pathBetween(ex,a,b){const prev=new Int32Array(ex.points.length).fill(-1),q=[a];prev[a]=a;for(let k=0;k<q.length;k++){let v=q[k];if(v===b)break;for(const t of ex.adj[v])if(prev[t.v]<0){prev[t.v]=v;q.push(t.v);}}if(prev[b]<0)return null;let path=[b];while(path[path.length-1]!==a)path.push(prev[path[path.length-1]]);path.reverse();return path.map(i=>ex.points[i]);}
  function infer(ex,opt){
    const gap=opt.gap??12,mode=opt.mode??'balanced',blocked=new Set(opt.blocked||[]);let candidates=[];const grid=new Grid();ex.segments.forEach((s,i)=>grid.add(i,s.a,s.b));
    const endByID=new Map(ex.endpoints.map(e=>[e.id,e]));
    function make(e,target,other,kind,tier,path){
      let d=dist(e.p,target);if(d<.01||d>gap+Math.min(e.radius+(other?.radius||0),12))return;
      // White gap measured on source Raster; width cannot inflate unlimited search.
      let white=0;for(let k=0;k<=Math.ceil(d*2);k++){let p=mix(e.p,target,k/Math.ceil(d*2)),i=(Math.floor(p.y)+1)*ex.pw+Math.floor(p.x)+1;if(!ex.mask[i])white+=.5;}
      if(white>gap)return;
      const id=linkKey(e.p,target);if(candidates.some(c=>c.id===id))return;
      let crosses=false;for(const si of grid.query(e.p,target)){let s=ex.segments[si],hit=intersection(e.p,target,s.a,s.b);if(hit&&hit.t>0.02&&hit.t<.98){crosses=true;break;}}
      let area=path?Math.abs(signedArea([...path,target])):null;
      let c={id,a:e.p,b:target,ends:other?[e.id,other.id]:[e.id],kind,tier,distance:d,whiteGap:white,newArea:area,status:'eligible',reason:'',polyline:[e.p,target]};
      if(crosses){c.status='rejected';c.reason='途中の別の境界を横切る';}
      else if(area!==null&&area<.25){c.status='rejected';c.reason='閉鎖で面積を作れない';}
      else if(blocked.has(id)){c.status='blocked';c.reason='人間がこの補助接続を無効化';}
      candidates.push(c);
    }
    const endpointGrid=new Grid(32);ex.endpoints.forEach((e,i)=>endpointGrid.add(i,e.p,e.p));
    for(let i=0;i<ex.endpoints.length;i++){let a=ex.endpoints[i],range=gap+Math.min(a.radius+12,12);
      for(const j of endpointGrid.query(a.p,a.p,range)){if(j<=i)continue;let b=ex.endpoints[j],d=dist(a.p,b.p);if(d<.01||d>range)continue;let direction=unit(sub(b.p,a.p)),da=dot(a.tangent,direction),db=dot(b.tangent,{x:-direction.x,y:-direction.y});let same=a.comp===b.comp,path=same?pathBetween(ex,a.id,b.id):null,route=path?path.reduce((v,p,k)=>k?v+dist(p,path[k-1]):0,0):0;
        if(da>.65&&db>.65)make(a,b.p,b,'線の続き',0,path);
        else if(same&&route>Math.max(d*4,24)&&dot(a.tangent,b.tangent)>.25&&dist(a.back,b.back)>d*1.12&&da>-.55&&db>-.55)make(a,b.p,b,'先端を閉じる',1,path);
        else if((da>.72&&db>-.25)||(db>.72&&da>-.25))make(a,b.p,b,'曲がり角',2,path);
      }
      // A forward ray should hit the first available interior, not the closest parallel line.
      let rayEnd={x:a.p.x+a.tangent.x*range,y:a.p.y+a.tangent.y*range},hits=[];
      for(const si of grid.query(a.p,rayEnd,1)){let s=ex.segments[si];if(s.va===a.id||s.vb===a.id)continue;let hit=intersection(a.p,rayEnd,s.a,s.b);if(!hit||hit.t*range<Math.max(2,a.radius*.6))continue;if(dist(a.p,s.a)<2||dist(a.p,s.b)<2)continue;hits.push({hit,s,si,d:hit.t*range});}
      hits.sort((a,b)=>a.d-b.d||a.si-b.si);
      if(hits.length){let {hit,s}=hits[0];let other=endByID.get(s.va)||endByID.get(s.vb);if(!other){let path=a.comp===ex.comp[s.va]?pathBetween(ex,a.id,s.va):null;make(a,{x:hit.x,y:hit.y},null,'線の途中へ',0,path);}}
    }
    // Honor a one-sided continuation landing on the other endpoint's backward chain.
    for(const c of candidates)if(c.ends.length===2&&c.status==='eligible'&&c.kind!=='先端を閉じる'){
      const a=endByID.get(c.ends[0]),b=endByID.get(c.ends[1]);let possibilities=[];
      for(const [s,t] of [[a,b],[b,a]]){let end={x:s.p.x+s.tangent.x*(gap+12),y:s.p.y+s.tangent.y*(gap+12)},hit=intersection(s.p,end,t.p,t.back);if(hit&&hit.t*(gap+12)>0&&hit.t*(gap+12)<=gap+Math.min(s.radius+t.radius,12)&&hit.s>=0&&hit.s<=1)possibilities.push({p:{x:hit.x,y:hit.y},s,t});}
      if(possibilities.length===1){let h=possibilities[0];let rayEnd={x:h.s.p.x+h.s.tangent.x*(gap+12),y:h.s.p.y+h.s.tangent.y*(gap+12)},hits=[];for(const si of grid.query(h.t.p,h.t.back,2)){let edge=ex.segments[si];if(ex.comp[edge.va]!==h.t.comp)continue;let hit=intersection(h.s.p,rayEnd,edge.a,edge.b);if(hit&&hit.t>EPS&&dist(hit,h.t.p)<=h.t.length+2)hits.push(hit);}hits.sort((a,b)=>a.t-b.t);if(hits.length){c.polyline=[h.s.p,{x:hits[0].x,y:hits[0].y}];c.kind+='（片側延長）';}}
    }
    const eligible=candidates.filter(c=>c.status==='eligible');
    function compare(a,b){return a.tier-b.tier||a.whiteGap-b.whiteGap||a.distance-b.distance||a.id.localeCompare(b.id);}
    const choices=new Map();for(const c of eligible)for(const e of c.ends){if(!choices.has(e))choices.set(e,[]);choices.get(e).push(c);}for(const list of choices.values())list.sort(compare);
    const used=new Set(),accepted=[];
    for(const c of eligible.sort(compare)){
      if(mode==='none'){c.status='pending';c.reason='補助接続なし';continue;}
      if(mode==='conservative'&&c.tier>0){c.status='pending';c.reason='慎重モードでは先端・角を保留';continue;}
      let competing=false,loses=false;for(const e of c.ends){const list=choices.get(e);if(list[0]!==c)loses=true;let other=list.find(x=>x!==c&&x.tier===c.tier);if(other&&other.distance<=c.distance*1.35+1&&Math.abs(other.whiteGap-c.whiteGap)<Math.max(2,gap*.25))competing=true;}
      if(used.has(c.ends[0])||c.ends.some(e=>used.has(e))||loses){c.status='pending';c.reason='同じ端点の別候補を優先';continue;}
      if(competing){c.status='pending';c.reason='根拠が近い候補が複数ある';continue;}
      let collision=accepted.some(o=>c.polyline.slice(1).some((p,i)=>o.polyline.slice(1).some((q,j)=>{let h=intersection(c.polyline[i],p,o.polyline[j],q);return h&&h.t>EPS&&h.t<1-EPS&&h.s>EPS&&h.s<1-EPS;})));
      if(collision){c.status='pending';c.reason='別の補助接続と交差';continue;}
      c.status='accepted';c.reason='形の条件と候補競合を通過';c.ends.forEach(e=>used.add(e));accepted.push(c);
    }
    return candidates;
  }
  function planarize(segments,isolated=[]){
    const grid=new Grid(),cuts=segments.map(()=>[0,1]);segments.forEach((s,i)=>grid.add(i,s.a,s.b));
    for(let i=0;i<segments.length;i++){const s=segments[i];if(s.source==='raster')continue;for(const j of grid.query(s.a,s.b)){if(i===j||segments[j].source!=='raster'&&j<i)continue;let t=segments[j],hit=intersection(s.a,s.b,t.a,t.b);if(hit){cuts[i].push(hit.t);cuts[j].push(hit.s);}else if(Math.abs(cross(sub(s.b,s.a),sub(t.a,s.a)))<EPS&&Math.abs(cross(sub(s.b,s.a),sub(t.b,s.a)))<EPS){for(const p of [t.a,t.b]){let q=project(p,s.a,s.b);if(dist(p,q)<EPS)cuts[i].push(q.t);}for(const p of [s.a,s.b]){let q=project(p,t.a,t.b);if(dist(p,q)<EPS)cuts[j].push(q.t);}}}}
    const vertices=[],edges=[],vm=new Map(),em=new Map();
    function vertex(p){let k=key(p);if(!vm.has(k)){vm.set(k,vertices.length);vertices.push({id:vertices.length,x:Math.round(p.x*1e6)/1e6,y:Math.round(p.y*1e6)/1e6,out:[]});}return vm.get(k);}
    for(let i=0;i<segments.length;i++){let s=segments[i],ts=[...new Set(cuts[i].map(t=>Math.round(t*1e10)/1e10))].sort((a,b)=>a-b);for(let k=1;k<ts.length;k++){let a=vertex(mix(s.a,s.b,ts[k-1])),b=vertex(mix(s.a,s.b,ts[k]));if(a===b)continue;let ek=[a,b].sort((a,b)=>a-b).join(',');if(em.has(ek))continue;em.set(ek,edges.length);edges.push({id:edges.length,a,b,source:s.source,connection:s.connection??null});}}
    isolated.forEach(vertex);return {vertices,edges};
  }
  function faces(graph,w,h){
    const {vertices,edges}=graph,halfedges=[];
    for(const e of edges){const id=halfedges.length;halfedges.push({id,from:e.a,to:e.b,twin:id+1,edge:e.id,next:-1,cycle:-1,region:-1},{id:id+1,from:e.b,to:e.a,twin:id,edge:e.id,next:-1,cycle:-1,region:-1});vertices[e.a].out.push(id);vertices[e.b].out.push(id+1);}
    for(const v of vertices)v.out.sort((a,b)=>{let p=vertices[halfedges[a].to],q=vertices[halfedges[b].to];return Math.atan2(p.y-v.y,p.x-v.x)-Math.atan2(q.y-v.y,q.x-v.x)||a-b;});
    for(const he of halfedges){let out=vertices[he.to].out,k=out.indexOf(he.twin);he.next=out[(k-1+out.length)%out.length];}
    const cycles=[];
    for(const he of halfedges)if(he.cycle<0){let hs=[],poly=[],cur=he.id;do{let e=halfedges[cur];if(e.cycle>=0)throw Error('境界の周回が衝突しました');e.cycle=cycles.length;hs.push(cur);poly.push(vertices[e.from]);cur=e.next;if(hs.length>halfedges.length+1)throw Error('境界の周回が閉じません');}while(cur!==he.id);cycles.push({id:cycles.length,halfedges:hs,polygon:poly,signedArea:signedArea(poly),region:-1});}
    const regions=[{id:0,outer:null,holes:[],slits:[],neighbors:[],area:null,unbounded:true,pixels:0}];
    for(const c of cycles)if(c.signedArea>EPS){c.region=regions.length;regions.push({id:regions.length,outer:c.id,holes:[],slits:[],neighbors:[],area:c.signedArea,unbounded:false,pixels:0});}
    function owner(p){let result=0,size=Infinity;for(const r of regions.slice(1)){const c=cycles[r.outer];if(c.signedArea<size&&pointIn(p,c.polygon)){result=r.id;size=c.signedArea;}}return result;}
    for(const c of cycles)if(c.region<0){const he=halfedges[c.halfedges[0]],a=vertices[he.from],b=vertices[he.to],u=unit(sub(b,a)),sample={x:(a.x+b.x)/2-u.y*.05,y:(a.y+b.y)/2+u.x*.05};c.region=owner(sample);let r=regions[c.region];if(c.signedArea<-EPS){r.holes.push(c.id);if(r.area!==null)r.area+=c.signedArea;}else r.slits.push(c.id);}
    for(const c of cycles)for(const hi of c.halfedges)halfedges[hi].region=c.region;
    const adj=regions.map(()=>new Set());for(const e of edges){let a=halfedges[e.id*2].region,b=halfedges[e.id*2+1].region;e.regions=[a,b];if(a!==b){adj[a].add(b);adj[b].add(a);}}regions.forEach((r,i)=>r.neighbors=[...adj[i]].sort((a,b)=>a-b));
    const labels=new Int32Array(w*h);
    // Scanline fill, larger outer loops first; nested loops overwrite their interior.
    for(const r of regions.slice(1).sort((a,b)=>cycles[b.outer].signedArea-cycles[a.outer].signedArea)){
      const poly=cycles[r.outer].polygon,buckets=new Map();for(let i=0;i<poly.length;i++){let a=poly[i],b=poly[(i+1)%poly.length];if(a.y===b.y)continue;let start=Math.max(0,Math.ceil(Math.min(a.y,b.y)-.5)),end=Math.min(h-1,Math.ceil(Math.max(a.y,b.y)-.5)-1);for(let y=start;y<=end;y++){if(!buckets.has(y))buckets.set(y,[]);let x=a.x+(y+.5-a.y)*(b.x-a.x)/(b.y-a.y);buckets.get(y).push(x);}}
      for(const [y,xs] of buckets){xs.sort((a,b)=>a-b);if(xs.length%2)throw Error('領域の走査線交点が奇数です');for(let i=0;i<xs.length;i+=2){let left=Math.max(0,Math.ceil(xs[i]-.5)),right=Math.min(w-1,Math.ceil(xs[i+1]-.5)-1);for(let x=left;x<=right;x++)labels[y*w+x]=r.id;}}
    }
    for(const l of labels)regions[l].pixels++;
    let seen=new Uint8Array(vertices.length),components=0;for(let i=0;i<vertices.length;i++)if(!seen[i]){components++;const q=[i];seen[i]=1;for(let j=0;j<q.length;j++)for(const hi of vertices[q[j]].out){let v=halfedges[hi].to;if(!seen[v]){seen[v]=1;q.push(v);}}}
    const checks={euler:vertices.length-edges.length+regions.length===1+components,twins:halfedges.every(e=>halfedges[e.twin].twin===e.id&&halfedges[e.twin].from===e.to),cycles:halfedges.every(e=>e.cycle>=0&&e.region>=0&&halfedges[e.next].from===e.to),adjacency:regions.every(r=>r.neighbors.every(n=>regions[n].neighbors.includes(r.id))),pixelCoverage:regions.reduce((a,r)=>a+r.pixels,0)===w*h,nonnegativeArea:regions.slice(1).every(r=>r.area>=-EPS)};
    if(Object.values(checks).some(v=>!v))throw Error('領域データの整合性検査に失敗: '+JSON.stringify(checks));
    return {vertices,edges,halfedges,cycles,regions,labels,diagnostics:{checks,components,eulerValue:vertices.length-edges.length+regions.length}};
  }
  function analyze(rgba,w,h,options={},progress=()=>{}){
    if(!Number.isInteger(w)||!Number.isInteger(h)||w<1||h<1||w*h>2600000||rgba.length!==w*h*4)throw Error('入力画像サイズが範囲外です');
    const start=Date.now();progress('線の形を取り出しています');const ex=extract(rgba,w,h,options);progress('補助接続の候補を比較しています');const candidates=infer(ex,options);
    let segments=ex.segments.slice();for(const c of candidates.filter(c=>c.status==='accepted'))for(let i=1;i<c.polyline.length;i++)segments.push({a:c.polyline[i-1],b:c.polyline[i],source:'inferred',connection:c.id});
    for(const m of options.manual||[])if(dist(m.a,m.b)>EPS)segments.push({a:m.a,b:m.b,source:'manual',connection:m.id});
    progress('閉じた領域・穴・外側を求めています');const graph=planarize(segments,ex.points.filter((p,i)=>ex.adj[i].length===0)),partition=faces(graph,w,h);
    let hash=2166136261;for(const l of partition.labels){hash^=l;hash=Math.imul(hash,16777619);}
    return {...partition,width:w,height:h,schema:'illustro-region-partition/0.1',candidates,endpoints:ex.endpoints.map(e=>({x:e.p.x,y:e.p.y,tangent:e.tangent})),junctions:partition.vertices.filter(v=>v.out.length>=3).map(v=>({x:v.x,y:v.y,degree:v.out.length})),provenance:{input:'raster',options,thresholds:{low:options.low??.18,high:options.high??.42},extraction:'hysteresis + Zhang-Suen; chamfer radius for inference only'},edits:{blocked:options.blocked||[],manual:options.manual||[],futureRangePatches:[]},diagnostics:{...partition.diagnostics,hash:(hash>>>0).toString(16),milliseconds:Date.now()-start,extractionTopology:ex.topology,skeletonPoints:ex.points.length,iterations:ex.iteration,accepted:candidates.filter(c=>c.status==='accepted').length,pending:candidates.filter(c=>c.status==='pending').length,quality:'人間による実線画検査待ち'}};
  }
  return {analyze,extract,infer,planarize,faces,intersection,pointIn,linkKey};
}
if(typeof module!=='undefined')module.exports=RegionEngine();
