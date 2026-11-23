export function artworkComparison(width:number,height:number,images:readonly {label:string;pixels:Uint8ClampedArray}[]){
  const grid=document.createElement('div');grid.className='geometry-inputs';
  for(const {label,pixels} of images){
    const figure=document.createElement('figure'),caption=document.createElement('figcaption'),canvas=document.createElement('canvas');
    figure.style.margin='0';caption.textContent=label;
    canvas.width=width;canvas.height=height;canvas.style.cssText='display:block;max-width:100%;height:auto';
    canvas.setAttribute('aria-label',label);
    canvas.getContext('2d')?.putImageData(new ImageData(new Uint8ClampedArray(pixels),width,height),0,0);
    figure.append(caption,canvas);grid.append(figure);
  }
  return grid;
}
