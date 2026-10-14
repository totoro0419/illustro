/** One geometry defines the painted hue wheel and its transparent input paths. */
export const ORBIT_WHEEL=Object.freeze({width:320,height:160,cx:160,cy:73,outerX:146,outerY:51,innerX:97,innerY:31,depth:13});

export function orbitHuePaths(){
 const r=ORBIT_WHEEL,left=r.cx-r.outerX,right=r.cx+r.outerX,innerLeft=r.cx-r.innerX,innerRight=r.cx+r.innerX;
 // Filled annular sectors match the actual outer/inner ellipses. A constant
 // stroke around their average ellipse cannot match a varying-width band.
 const top=`M ${left} ${r.cy} A ${r.outerX} ${r.outerY} 0 0 1 ${right} ${r.cy} L ${innerRight} ${r.cy} A ${r.innerX} ${r.innerY} 0 0 0 ${innerLeft} ${r.cy} Z`;
 // The visible front face includes the same depth strip painted by Orbit.
 const front=`M ${right} ${r.cy} L ${right} ${r.cy+r.depth} A ${r.outerX} ${r.outerY} 0 0 1 ${left} ${r.cy+r.depth} L ${left} ${r.cy} L ${innerLeft} ${r.cy} A ${r.innerX} ${r.innerY} 0 0 0 ${innerRight} ${r.cy} Z`;
 return {top,front};
}

/**
 * Pointer hit testing uses the same ellipse as the painted wheel, rather than
 * relying solely on the browser's SVG pointer-events handling. The lower
 * colored band and its 13px visible front face both use the slide gesture.
 * Shadows and the unpainted hole do not accept hue input.
 */
export function orbitHueRegion(x:number,y:number):'rotate'|'slide'|null {
 const r=ORBIT_WHEEL,dx=(x-r.cx)/r.outerX,dy=(y-r.cy)/r.outerY;
 const outer=dx*dx+dy*dy;
 const ix=(x-r.cx)/r.innerX,iy=(y-r.cy)/r.innerY;
 if(outer<=1 && ix*ix+iy*iy>=1)return y<r.cy?'rotate':'slide';
 if(y>=r.cy && Math.abs(dx)<=1){
  const outerBottom=r.cy+r.outerY*Math.sqrt(Math.max(0,1-dx*dx));
  if(y>=outerBottom&&y<=outerBottom+r.depth)return 'slide';
 }
 return null;
}

/**
 * Hue under a tapped, currently painted Orbit pixel. Unlike a drag, tapping
 * selects the existing color at that location rather than turning the wheel.
 * The painter interpolates the inner/outer ellipse radii at the SAME angle,
 * so solve that interpolation to avoid hue drift near the band's inner edge.
 * The lower outer side face is painted with the outer ellipse's angle.
 *
 * Only call this after an SVG painted-arc hit is confirmed; the SV diamond
 * may cover the rear arc, and that visible SV must always retain priority.
 */
export function orbitHueAtPoint(currentHue:number,x:number,y:number):number {
 const r=ORBIT_WHEEL,xx=x-r.cx,yy=y-r.cy;
 const outer=(xx/r.outerX)**2+(yy/r.outerY)**2;
 let angle:number;
 if(y>=r.cy&&outer>1){
  // The 13px near-side wall extends BELOW the outer ellipse. Its colored
  // strips are indexed by the outer ellipse's X coordinate.
  const cos=Math.max(-1,Math.min(1,xx/r.outerX));
  angle=Math.acos(cos);
 }else{
  // Find the radius interpolation actually used by the colored top band:
  // x=(innerX+t*(outerX-innerX))*cos(angle), similarly for y.
  let lo=0,hi=1;
  for(let i=0;i<18;i++){
   const mid=(lo+hi)/2;
   const rx=r.innerX+(r.outerX-r.innerX)*mid;
   const ry=r.innerY+(r.outerY-r.innerY)*mid;
   if((xx/rx)**2+(yy/ry)**2>1)lo=mid;else hi=mid;
  }
  const t=(lo+hi)/2;
  angle=Math.atan2(yy/(r.innerY+(r.outerY-r.innerY)*t),
                   xx/(r.innerX+(r.outerX-r.innerX)*t));
 }
 return ((currentHue+(angle-Math.PI/2)*180/Math.PI)%360+360)%360;
}
