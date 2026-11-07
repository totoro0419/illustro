/** C03 Blend If numeric reference: independent weights are applied once.
 * Evaluation yields coverage; this module never changes document pixels.
 */
const clamp=x=>Math.max(0,Math.min(1,x));
function number01(value){if(!Number.isFinite(value)||value<0||value>1)throw new RangeError('Value must be in [0,1]');return value;}
const smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
export function blendIfMembership(value,range={low0:0,low1:0,high0:1,high1:1}){
 number01(value);
 const {low0,low1,high0,high1}=range;
 [low0,low1,high0,high1].forEach(number01);
 if(low0>low1||low1>high0||high0>high1)throw new RangeError('Unordered Blend If handles');
 const low=low0===low1?(value>=low0?1:0):smooth((value-low0)/(low1-low0));
 const high=high0===high1?(high0===1?1:(value<high0?1:0)):1-smooth((value-high0)/(high1-high0));
 return low*high;
}
const encodedLuminance=rgb=>rgb[0]*.3+rgb[1]*.59+rgb[2]*.11;
const linear=x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4;
export function blendIfChannel(rgba,channel='luminance',space='encoded'){
 if(!Array.isArray(rgba)||rgba.length<3)throw new RangeError('RGB array is required');
 rgba.slice(0,3).forEach(number01);
 if(['r','g','b'].includes(channel))return rgba[{r:0,g:1,b:2}[channel]];
 if(channel!=='luminance')throw new RangeError('Unknown channel');
 if(space==='encoded')return encodedLuminance(rgba);
 if(space==='linear')return rgba.slice(0,3).map(linear).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
 throw new RangeError('Unknown color space');
}
export function blendIfWeights(backdrop,source,options={}){
 const {sourceRange,backdropRange,channel='luminance',space='encoded'}=options;
 return {
  source:blendIfMembership(blendIfChannel(source,channel,space),sourceRange),
  backdrop:blendIfMembership(blendIfChannel(backdrop,channel,space),backdropRange)
 };
}
/** A histogram of visible samples; samples are normalized straight RGBA. */
export function blendIfHistogram(samples,{channel='luminance',space='encoded',bins=64}={}){
 if(!Number.isInteger(bins)||bins<2||bins>4096)throw new RangeError('Invalid bins');
 const counts=Array(bins).fill(0);
 for(const rgba of samples){
  if(rgba.length>=4&&rgba[3]===0)continue;
  const value=blendIfChannel(rgba,channel,space);
  counts[Math.min(bins-1,Math.floor(clamp(value)*bins))]++;
 }
 return counts;
}
