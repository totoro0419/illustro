/** Basic vertical Japanese glyph placement shared by both Canvas rendering
 * and font outlines. Positions are relative to the existing text cell.
 * A font may already have native vertical metrics; this remains a fallback. */
export function verticalGlyphAdjustment(character:string,size:number):
  Readonly<{dx:number;dy:number;rotate:boolean}>{
  const rotate=/[A-Za-z0-9ー―‐–—「」『』（）()［］\[\]｛｝{}【】]/u.test(character);
  if(rotate)return {dx:0,dy:0,rotate:true};
  // Horizontal Japanese fonts often draw these near the lower edge of an em.
  // Raise them towards the upper-right corner of a vertical writing cell.
  if(/[、。，．]/u.test(character))
    return {dx:size*.23,dy:-size*.27,rotate:false};
  // Small kana should visually sit at the upper-right of their writing cell.
  if(/[ぁぃぅぇぉっゃゅょゎゕゖァィゥェォッャュョヮヵヶㇰㇱㇲㇳㇴㇵㇶㇷㇸㇹㇺㇻㇼㇽㇾㇿ]/u.test(character))
    return {dx:size*.18,dy:-size*.14,rotate:false};
  return {dx:0,dy:0,rotate:false};
}
