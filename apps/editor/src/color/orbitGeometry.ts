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
