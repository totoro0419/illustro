import {lowLoadDisplay,setLowLoadDisplay} from './displayPerformance';
type Measurements=Readonly<{
  renderer?:string|null;
  drawMs?:number|null;
  saveMs?:number|null;
  exportMs?:number|null;
  protectedLocally:boolean|null;
}>;

export function installDeviceCapabilities(host:HTMLElement,measurements:()=>Measurements){
  const panel=document.createElement('details');panel.className='c06-clipboard-panel';
  const summary=document.createElement('summary');summary.textContent='端末で使える操作と処理時間';
  const measured=document.createElement('dl');
  const mode=document.createElement('label'),lowLoad=document.createElement('input');
  lowLoad.type='checkbox';lowLoad.checked=lowLoadDisplay();
  mode.append(lowLoad,' 画面の描画を軽くする（作品の画素数は保持）');
  lowLoad.onchange=()=>{setLowLoadDisplay(lowLoad.checked);void update();};
  const refresh=document.createElement('button');refresh.type='button';refresh.textContent='現在の状態を確認';
  const note=document.createElement('p');
  note.textContent='機器が届かせる筆圧や傾きは「ペン入力の確認」で試せます。作品ファイルを保存すれば、別の端末でも続きから編集できます。';
  const bytes=(size:number)=>new Intl.NumberFormat('ja-JP',{maximumFractionDigits:1}).format(size/1048576)+' MB';
  const time=(ms:number|null|undefined)=>typeof ms==='number'&&Number.isFinite(ms)?Math.round(ms)+' ms':'未計測';
  let request=0;
  async function update(){
    const version=++request,results=measurements();
    const api=(supported:boolean)=>supported?'機能あり':'利用できない環境';
    const pointer=globalThis.PointerEvent?.prototype;
    const navigatorApis=navigator as Navigator&{gpu?:unknown};
    const filePicker=window as Window&{showSaveFilePicker?:unknown};
    const storage=await navigator.storage?.estimate().catch(()=>null);
    if(version!==request)return;
    const rows=[
      ['使用中の描画方式',results.renderer==='canvas2d'?'Canvas2D（基本描画。仮線の見え方は簡易版）':results.renderer??'作品を開くと表示'],
      ['WebGPUの提供',api(!!navigatorApis.gpu)],
      ['まとめて届くペン入力',api(typeof pointer?.getCoalescedEvents==='function')],
      ['傾き・軸回転の情報欄',api(!!pointer&&'tiltX' in pointer&&'twist' in pointer)],
      ['指で触れる点の最大数',String(navigator.maxTouchPoints)],
      ['画面の倍率',String(window.devicePixelRatio||1)+' 倍'],
      ['ファイルへ直接保存',typeof filePicker.showSaveFilePicker==='function'?'保存先を選べます':'ダウンロードで保存'],
      ['端末内の保存領域',storage?.quota!==undefined&&storage.usage!==undefined?
        bytes(Math.max(0,storage.quota-storage.usage))+' 利用可能（ブラウザーの推定値）':'未取得'],
      ['保存の保護',results.protectedLocally===null?'未取得':results.protectedLocally?'長期間の保存を許可済み':'ブラウザーの通常設定'],
      ['起動方法',matchMedia('(display-mode: standalone)').matches?'ホーム画面のアプリ':'ブラウザー'],
      ['直近の線の確定',time(results.drawMs)],
      ['直近の作品保存',time(results.saveMs)],
      ['直近の画像書き出し',time(results.exportMs)],
    ];
    measured.replaceChildren(...rows.flatMap(([label,value])=>{
      const key=document.createElement('dt'),output=document.createElement('dd');
      key.textContent=label!;output.textContent=value!;return [key,output];
    }));
  }
  refresh.onclick=()=>{void update();};
  panel.addEventListener('toggle',()=>{if(panel.open)void update();});
  panel.append(summary,note,mode,refresh,measured);host.append(panel);
  return ()=>{panel.open=true;panel.scrollIntoView({block:'nearest'});void update();};
}
