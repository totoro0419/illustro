import {describe,expect,it} from 'vitest';
import {analyzeImage} from './analyze';

describe('local artwork assistance',()=>{
  it('selects a connected area without crossing a dark border or ignoring selection coverage',()=>{
    const source=Uint8Array.from([200,200,200,255,200,200,200,255,50,50,50,255,200,200,200,255]);
    const result=analyzeImage({kind:'area',width:4,height:1,source,x:0,y:0,tolerance:15,coverage:Uint8Array.of(255,100,255,255)});
    expect(result).toEqual({kind:'area',count:2,alpha:Uint8Array.of(255,100,0,0)});
  });
  it('creates a palette color overlay only where selected paint exists',()=>{
    const source=Uint8Array.from([255,255,255,255,0,0,0,0,0,0,0,255]);
    const result=analyzeImage({kind:'color',width:3,height:1,source,style:'tone',strength:.5,
      coverage:Uint8Array.of(255,255,0),palette:[[0,0,0],[220,180,160]]});
    expect(result).toEqual({kind:'color',count:1,pixels:Uint8ClampedArray.of(220,180,160,128,0,0,0,0,0,0,0,0)});
    expect(source[0]).toBe(255);
  });
  it('identifies a speck without selecting a stroke attached by a diagonal or crossing the selected area',()=>{
    const width=8,height=7,source=new Uint8Array(width*height*4),coverage=new Uint8Array(width*height).fill(255);
    for(const [x,y] of [[1,1],[2,2],[3,3],[6,2],[6,5],[0,6]] as const)source[(y*width+x)*4+3]=255;
    coverage[5*width+6]=200;
    const result=analyzeImage({kind:'specks',width,height,source,coverage,maxArea:2});
    expect(result).toEqual({kind:'specks',spots:[{x:6,y:2,pixels:Uint32Array.of(22)}],capped:false});
  });
});

it('learns which colors to keep and exclude from examples, preserving exact sample corrections',()=>{
  const width=7,height=2,colors=[[230,40,30,255],[20,40,190,255],[190,65,50,255],[30,50,170,255],
    [232,20,10,255],[24,35,220,255],[180,52,42,255]];
  const source=Uint8Array.from([...colors.flat(),...colors.flat()]);
  const result=analyzeImage({kind:'area',width,height,source,x:0,y:0,tolerance:32,examples:[
    {x:0,y:0,include:true},{x:1,y:0,include:false},{x:2,y:1,include:true},
  ]});
  expect(result).toEqual({kind:'area',count:8,alpha:Uint8Array.of(255,0,255,0,255,0,255,255,0,255,0,255,0,255)});
});

it('learns reference swatches from painted colors and ignores transparent pixels',async()=>{
  const {learnReferencePalette}=await import('./referencePalette');
  const colors=learnReferencePalette(Uint8ClampedArray.of(220,20,30,255,220,20,30,255,0,160,230,255,255,255,0,0));
  expect(colors).toEqual([[220,20,30],[0,160,230]]);
});
