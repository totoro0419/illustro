/** C03 reference RGB blend kernels, normalized straight-channel inputs.
 * Final source-over alpha composition is deliberately separate.
 */
const clamp=x=>Math.min(1,Math.max(0,x));
const dodge=(b,s)=>b===0?0:s>=1?1:Math.min(1,b/(1-s));
const burn=(b,s)=>b===1?1:s<=0?0:1-Math.min(1,(1-b)/s);
const soft=(b,s)=>s<=0.5?b-(1-2*s)*b*(1-b):b+(2*s-1)*((b<=0.25?((16*b-12)*b+4)*b:Math.sqrt(b))-b);
function channel(mode,b,s){
 switch(mode){
 case 'normal':return s;
 case 'darken':return Math.min(b,s);
 case 'multiply':return b*s;
 case 'color-burn':return burn(b,s);
 case 'linear-burn':return Math.max(0,b+s-1);
 case 'lighten':return Math.max(b,s);
 case 'screen':return b+s-b*s;
 case 'color-dodge':return dodge(b,s);
 case 'linear-dodge':return Math.min(1,b+s);
 case 'overlay':return b<=0.5?2*b*s:1-2*(1-b)*(1-s);
 case 'soft-light':return soft(b,s);
 case 'hard-light':return s<=0.5?2*b*s:1-2*(1-b)*(1-s);
 case 'vivid-light':return s<=0.5?burn(b,2*s):dodge(b,2*(s-0.5));
 case 'linear-light':return clamp(b+2*s-1);
 case 'pin-light':return s<=0.5?Math.min(b,2*s):Math.max(b,2*s-1);
 case 'hard-mix':return channel('vivid-light',b,s)<0.5?0:1;
 case 'difference':return Math.abs(b-s);
 case 'exclusion':return b+s-2*b*s;
 case 'subtract':return Math.max(0,b-s);
 case 'divide':return s===0?1:Math.min(1,b/s);
 default:throw new RangeError('Unsupported blend mode: '+mode);
 }
}
export const CHANNEL_MODES=Object.freeze(['normal','darken','multiply','color-burn','linear-burn','lighten','screen','color-dodge','linear-dodge','overlay','soft-light','hard-light','vivid-light','linear-light','pin-light','hard-mix','difference','exclusion','subtract','divide']);

/** Non-separable W3C reference operations. Stable R,G,B ordering for ties. */
export const NONSEPARABLE_MODES=Object.freeze(['hue','saturation','color','luminosity']);
export const BLEND_MODES=Object.freeze([...CHANNEL_MODES,...NONSEPARABLE_MODES]);
const lum=c=>.3*c[0]+.59*c[1]+.11*c[2];
const sat=c=>Math.max(...c)-Math.min(...c);
function clipColor(input){
 let c=[...input],l=lum(c),lo=Math.min(...c),hi=Math.max(...c);
 if(lo<0)c=c.map(v=>l+(v-l)*l/(l-lo));
 hi=Math.max(...c);
 if(hi>1)c=c.map(v=>l+(v-l)*(1-l)/(hi-l));
 return c.map(clamp);
}
function setLum(c,value){const diff=value-lum(c);return clipColor(c.map(v=>v+diff));}
function setSat(c,value){
 const order=[0,1,2].sort((i,j)=>c[i]-c[j]||i-j),[lo,mid,hi]=order;
 const result=[0,0,0];
 if(c[hi]>c[lo]){result[mid]=(c[mid]-c[lo])*value/(c[hi]-c[lo]);result[hi]=value;}
 return result;
}
function nonseparable(mode,b,s){
 switch(mode){
 case 'hue':return setLum(setSat(s,sat(b)),lum(b));
 case 'saturation':return setLum(setSat(b,sat(s)),lum(b));
 case 'color':return setLum(s,lum(b));
 case 'luminosity':return setLum(b,lum(s));
 default:throw new RangeError('Unsupported non-separable blend mode');
 }
}

export function blendRgb(mode,backdrop,source){
 if(!BLEND_MODES.includes(mode))throw new RangeError('Unsupported blend mode: '+mode);
 if([...backdrop,...source].some(v=>!Number.isFinite(v)||v<0||v>1)||backdrop.length!==3||source.length!==3)throw new RangeError('RGB must be normalized');
 return NONSEPARABLE_MODES.includes(mode)?nonseparable(mode,backdrop,source):backdrop.map((b,i)=>clamp(channel(mode,b,source[i])));
}
/** W3C compositing source-over with separable blend and straight RGB inputs. */
export function sourceOver(backdrop,source,mode='normal',opacity=1){
 if(!Number.isFinite(opacity)||opacity<0||opacity>1)throw new RangeError('Invalid opacity');
 const ab=backdrop[3],as=source[3]*opacity;
 if(![ab,source[3]].every(v=>Number.isFinite(v)&&v>=0&&v<=1))throw new RangeError('Invalid alpha');
 const alpha=as+ab*(1-as);
 if(alpha===0)return [0,0,0,0];
 const blended=blendRgb(mode,backdrop.slice(0,3),source.slice(0,3));
 return [0,1,2].map(i=>clamp((as*(1-ab)*source[i]+as*ab*blended[i]+(1-as)*ab*backdrop[i])/alpha)).concat(alpha);
}
