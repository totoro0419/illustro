import './accessibility.css';

const viewingModes=[
  ['original','元の色'],['gray','グレー'],['protan','1型（赤の感度が低い場合）'],
  ['deutan','2型（緑の感度が低い場合）'],['tritan','3型（青の感度が低い場合）']
] as const;
type ViewingMode=typeof viewingModes[number][0];
type Preferences={density:'standard'|'compact'|'roomy';text:'standard'|'large'|'extra';contrast:boolean;motion:boolean;view:ViewingMode;sound:boolean;vibration:boolean};
const defaults:Preferences={density:'standard',text:'standard',contrast:false,motion:false,view:'original',sound:false,vibration:false};
const key='illustro.accessibility.v1';

// Full-severity sample matrices from Machado, Oliveira and Fernandes (2009).
// The SVG filters work in linear RGB and apply to displayed canvas pixels only.
const simulation={
  protan:[.152286,1.052583,-.204868,.114503,.786281,.099216,-.003882,-.048116,1.051998],
  deutan:[.367322,.860646,-.227968,.280085,.672501,.047413,-.011820,.042940,.968881],
  tritan:[1.255528,-.076749,-.178779,-.078411,.930809,.147602,.004733,.691367,.303900]
};

function addVisionFilters(){
  const ns='http://www.w3.org/2000/svg';
  const svg=document.createElementNS(ns,'svg');
  svg.setAttribute('aria-hidden','true');svg.setAttribute('width','0');svg.setAttribute('height','0');
  svg.style.position='absolute';
  const defs=document.createElementNS(ns,'defs');
  for(const [name,values] of Object.entries(simulation)){
    const filter=document.createElementNS(ns,'filter');filter.id='illustro-vision-'+name;
    filter.setAttribute('color-interpolation-filters','linearRGB');
    const matrix=document.createElementNS(ns,'feColorMatrix');
    matrix.setAttribute('type','matrix');
    matrix.setAttribute('values',[...values.slice(0,3),0,0,...values.slice(3,6),0,0,...values.slice(6),0,0,0,0,0,1,0].join(' '));
    filter.append(matrix);defs.append(filter);
  }
  svg.append(defs);document.body.append(svg);
}

let notify=()=>{};
export function accessibilityFeedback(){notify();}

export function installAccessibility(host:HTMLElement){
  const root=document.documentElement;
  let settings={...defaults},audio:AudioContext|null=null;
  try{
    const saved=JSON.parse(localStorage.getItem(key)??'null');
    if(saved){
      const view=viewingModes.find(([value])=>value===saved.view)?.[0]??(saved.gray===true?'gray':'original');
      settings={density:saved.density==='compact'||saved.density==='roomy'?saved.density:'standard',text:saved.text==='extra'||saved.text==='large'?saved.text:'standard',view,
        contrast:saved.contrast===true,motion:saved.motion===true,sound:saved.sound===true,vibration:saved.vibration===true};
    }
  }catch{}
  addVisionFilters();
  const panel=document.createElement('details');panel.className='c06-clipboard-panel';
  const summary=document.createElement('summary');summary.textContent='画面の見やすさ・通知';
  const controls=document.createElement('div');controls.className='c06-clipboard-grid';
  const text=document.createElement('select');
  text.append(new Option('標準','standard'),new Option('大きい','large'),new Option('さらに大きい','extra'));
  const textLabel=document.createElement('label');textLabel.append('操作画面の文字',text);controls.append(textLabel);
  const check=(label:string)=>{
    const field=document.createElement('input');field.type='checkbox';
    const wrapper=document.createElement('label');wrapper.append(field,' '+label);controls.append(wrapper);return field;
  };
  const density=document.createElement('select');
  density.append(new Option('標準','standard'),new Option('詰める（PC）','compact'),new Option('ボタンを大きく','roomy'));
  const densityLabel=document.createElement('label');densityLabel.append('操作ボタンの間隔と大きさ',density);controls.append(densityLabel);
  const contrast=check('操作と文字のコントラストを上げる');
  const motion=check('画面の動きを減らす');
  const vision=document.createElement('select');
  vision.append(...viewingModes.map(([value,label])=>new Option(label,value)));
  const visionLabel=document.createElement('label');visionLabel.append('作品の色の見え方',vision);controls.append(visionLabel);
  const note=document.createElement('small');
  note.textContent='見え方の目安です。作品の色や書き出す画像には影響しません。';
  const sound=check('ファイル作成時に音を鳴らす');
  const vibration=check('ファイル作成時に振動する');
  sound.disabled=typeof AudioContext==='undefined';
  vibration.disabled=typeof navigator.vibrate!=='function';
  const sample=document.createElement('button');sample.type='button';sample.textContent='通知を試す';
  const saveStatus=document.createElement('output');saveStatus.setAttribute('role','status');
  const reset=document.createElement('button');reset.type='button';reset.textContent='標準に戻す';
  async function feedback(){
    let sounded=false,vibrated=false;
    if(settings.vibration&&!vibration.disabled){
      try{vibrated=navigator.vibrate(55);}catch{}
    }
    if(settings.sound&&!sound.disabled){
      try{
        audio??=new AudioContext();
        if(audio.state==='suspended')await audio.resume();
        if(audio.state==='running'&&settings.sound){
          const start=audio.currentTime,oscillator=audio.createOscillator(),volume=audio.createGain();
          oscillator.frequency.value=520;
          volume.gain.setValueAtTime(.075,start);
          volume.gain.exponentialRampToValueAtTime(.001,start+.13);
          oscillator.connect(volume).connect(audio.destination);
          oscillator.start(start);oscillator.stop(start+.14);sounded=true;
        }
      }catch{}
    }
    return {sounded,vibrated};
  }
  notify=()=>{void feedback();};
  sample.onclick=async()=>{
    if(!settings.sound&&!settings.vibration){saveStatus.textContent='音と振動はオフです。';return;}
    const {sounded,vibrated}=await feedback();
    saveStatus.textContent='通知の見本です。'+
      (settings.sound&&!sounded?' この端末では音を再生できませんでした。':'')+
      (settings.vibration&&!vibrated?' この端末では振動できませんでした。':'');
  };
  function apply(){
    root.dataset.illustroText=settings.text;
    root.dataset.illustroDensity=settings.density;density.value=settings.density;
    root.toggleAttribute('data-illustro-contrast',settings.contrast);
    root.toggleAttribute('data-illustro-reduced-motion',settings.motion);
    root.dataset.illustroVision=settings.view;
    text.value=settings.text;contrast.checked=settings.contrast;motion.checked=settings.motion;vision.value=settings.view;
    sound.checked=settings.sound&&!sound.disabled;vibration.checked=settings.vibration&&!vibration.disabled;
  }
  function save(){
    apply();
    try{localStorage.setItem(key,JSON.stringify(settings));saveStatus.textContent='';}
    catch{saveStatus.textContent='この端末に表示設定を保存できませんでした。';}
  }
  for(const field of [text,density,contrast,motion,vision,sound,vibration])field.onchange=()=>{
    settings={density:density.value as Preferences['density'],text:text.value as Preferences['text'],contrast:contrast.checked,motion:motion.checked,
      view:vision.value as ViewingMode,sound:sound.checked,vibration:vibration.checked};
    save();
  };
  reset.onclick=()=>{settings={...defaults};save();};
  panel.append(summary,controls,note,sample,reset,saveStatus);host.append(panel);
  apply();
  return ()=>{panel.open=true;panel.scrollIntoView({block:'nearest'});};
}
