import type {FoundationPreset} from '@illustro/brush-rt';

export function sizeRange(preset:FoundationPreset){
 const [minimum,maximum]=preset.limits.size;
 const [preferredMin,preferredMax]=preset.uiSizeRange??[.1,1024];
 const min=Math.min(maximum,Math.max(minimum,preferredMin));
 return {min,max:Math.max(min,Math.min(maximum,preferredMax)),minimum,maximum};
}

export function sliderSize(preset:FoundationPreset,position:number){
 const {min,max}=sizeRange(preset);
 if(preset.blend!=='erase')return position;
 if(position<=0)return min;
 if(position>=1000)return max;
 const value=min*(max/min)**(position/1000);
 return Math.min(max,Math.max(min,Math.round(value*(value<10?100:10))/(value<10?100:10)));
}

export function syncBrushSize(slider:HTMLInputElement,number:HTMLInputElement,preset:FoundationPreset){
 const {min,max,minimum,maximum}=sizeRange(preset),erase=preset.blend==='erase';
 slider.min=String(erase?0:min);
 slider.max=String(erase?1000:max);
 slider.step=erase?'1':'0.01';
 slider.value=String(erase?(max===min?0:Math.round(1000*Math.log(preset.size/min)/Math.log(max/min))):preset.size);
 slider.setAttribute('aria-valuetext',preset.size+' ピクセル');
 number.min=String(minimum);
 number.max=String(maximum);
 if(document.activeElement!==number)number.value=String(preset.size);
}
