import './accessibility.css';

type Preferences={text:'standard'|'large'|'extra';contrast:boolean;motion:boolean;gray:boolean};
const key='illustro.accessibility.v1';

export function installAccessibility(host:HTMLElement){
  const root=document.documentElement;
  let settings:Preferences={text:'standard',contrast:false,motion:false,gray:false};
  try{
    const saved=JSON.parse(localStorage.getItem(key)??'null');
    if(saved)settings={text:saved.text==='extra'||saved.text==='large'?saved.text:'standard',
      contrast:saved.contrast===true,motion:saved.motion===true,gray:saved.gray===true};
  }catch{}
  const panel=document.createElement('details');panel.className='c06-clipboard-panel';
  const summary=document.createElement('summary');summary.textContent='画面の見やすさ';
  const controls=document.createElement('div');controls.className='c06-clipboard-grid';
  const text=document.createElement('select');
  text.append(new Option('標準','standard'),new Option('大きい','large'),new Option('さらに大きい','extra'));
  const textLabel=document.createElement('label');textLabel.append('操作画面の文字',text);controls.append(textLabel);
  const check=(label:string)=>{
    const field=document.createElement('input');field.type='checkbox';
    const wrapper=document.createElement('label');wrapper.append(field,' '+label);controls.append(wrapper);return field;
  };
  const contrast=check('操作と文字のコントラストを上げる');
  const motion=check('画面の動きを減らす');
  const gray=check('作品をグレーで確認する');
  const note=document.createElement('small');
  note.textContent='グレー表示は確認用です。作品の色や書き出す画像には影響しません。';
  const saveStatus=document.createElement('output');saveStatus.setAttribute('role','status');
  const reset=document.createElement('button');reset.type='button';reset.textContent='標準に戻す';
  function apply(){
    root.dataset.illustroText=settings.text;
    root.toggleAttribute('data-illustro-contrast',settings.contrast);
    root.toggleAttribute('data-illustro-reduced-motion',settings.motion);
    root.toggleAttribute('data-illustro-gray',settings.gray);
    text.value=settings.text;contrast.checked=settings.contrast;motion.checked=settings.motion;gray.checked=settings.gray;
  }
  function save(){
    apply();
    try{localStorage.setItem(key,JSON.stringify(settings));saveStatus.textContent='';}
    catch{saveStatus.textContent='この端末に表示設定を保存できませんでした。';}
  }
  for(const field of [text,contrast,motion,gray])field.onchange=()=>{
    settings={text:text.value as Preferences['text'],contrast:contrast.checked,motion:motion.checked,gray:gray.checked};
    save();
  };
  reset.onclick=()=>{
    settings={text:'standard',contrast:false,motion:false,gray:false};save();
  };
  panel.append(summary,controls,note,reset,saveStatus);host.append(panel);
  apply();
  return ()=>{panel.open=true;panel.scrollIntoView({block:'nearest'});};
}
