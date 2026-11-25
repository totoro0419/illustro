import {englishToolLabels} from './englishToolLabels';
const key='illustro.ui-language.v1';
const english:Readonly<Record<string,string>>={
  ...englishToolLabels,
  'ホーム':'Home','マイ作品':'My artwork','マイ作品へ':'My artwork','設定':'Settings','新しい作品':'New artwork',
  'ファイルから開く':'Open file','描画画面へ':'Open editor','作品一覧':'Artworks','作品名':'Artwork name',
  '作品を作成':'Create artwork','白':'White','透明':'Transparent','白背景':'White background',
  'キャンバス':'Canvas','作品キャンバス':'Artwork canvas','キャンバスサイズ':'Canvas size','幅':'Width','高さ':'Height',
  '幅（px）':'Width (px)','高さ（px）':'Height (px)','横':'Width','縦':'Height','単位':'Unit',
  '背景':'Background','テンプレート':'Templates','解像度':'Resolution','ホームの画面切替':'Home navigation',
  '作品を開く':'Open artwork','新規作成':'Create','キャンバスを開く':'Open canvas','すべて':'All',
  '開く':'Open','閉じる':'Close','戻る':'Back','確定':'Confirm','取消':'Cancel','取り消す':'Cancel','キャンセル':'Cancel',
  '変更を取り消す':'Discard changes','確認':'Confirm','お知らせ':'Notice','入力':'Input','変更を適用':'Apply changes','適用':'Apply',
  '作品':'Artwork','作品情報':'Artwork information','作品一覧に戻る':'Back to artwork','復元する':'Restore',
  '保存':'Save','作品を保存':'Save artwork','別名で保存':'Save as','読み込む':'Import','書き出す':'Export',
  '画像を書き出す':'Export image','画像の種類':'Image format','書き出す範囲':'Export area',
  'ファイル名':'Filename','作者':'Author','権利':'Rights','表示中の作品':'Visible artwork','選択中のレイヤー':'Active layer',
  '色':'Color','カラー':'Color','パレット':'Palette','ブラシ':'Brush','ブラシと消しゴム':'Brush and eraser',
  '消しゴム':'Eraser','スポイト':'Eyedropper','塗りつぶし':'Fill','選択':'Selection','移動':'Move','変形':'Transform',
  '図形':'Shapes','図形・グラデーション':'Shapes and gradients','定規':'Rulers','ナビゲーター':'Navigator',
  'レイヤー':'Layers','レイヤー追加':'Add layer','レイヤーを追加':'Add layer','レイヤーを作成':'Create layer',
  '描画レイヤー':'Paint layer','削除':'Delete','複製':'Duplicate','名前を変更':'Rename','名前変更':'Rename',
  '一つ上へ':'Move up','一つ下へ':'Move down','不透明度':'Opacity','表示':'Visible','選択なし':'No selection',
  '全体表示':'Fit canvas','実画素表示':'Actual pixels','回転を戻す':'Reset rotation','拡大':'Zoom in','縮小':'Zoom out',
  '元に戻す':'Undo','やり直す':'Redo','検索':'Search','機能を検索':'Search commands','機能検索':'Command search',
  'クイック操作':'Quick actions','面積':'Area','この作品の情報':'Artwork information',
  '作品ファイル':'Artwork file','ファイル':'File','読み込み':'Import','描画':'Draw','効果':'Effects','フィルター':'Filters',
  '試し描き':'Brush test','ブラシの種類':'Brush type','ブラシを検索':'Search brushes','標準':'Default',
  '詳細':'Details','履歴':'History','履歴を表示':'Show history','マスク':'Mask','レイヤーマスク':'Layer mask',
  '作業環境':'Workspace','操作セット':'Macros','ごみ箱':'Trash','この作品を開く':'Open this artwork',
  '復元':'Restore','表示順':'Sort order','新しい順':'Newest first','古い順':'Oldest first','よみがな':'Reading',
  'マイ作品を検索':'Search artwork','名前で検索':'Search by name','作品サイズ':'Artwork size',
  'ピクセル':'Pixels','ミリメートル':'Millimeters','センチメートル':'Centimeters','インチ':'Inches',
  '操作の確定と取消':'Confirm or cancel changes','今の操作対象':'Current target',
  '同じレイヤーの背面に描く':'Paint behind on this layer','更新':'Refresh','現在の状態を確認':'Refresh device information',
  '色相環の表示形式':'Color wheel layout','クラシック':'Classic','オービット':'Orbit',
  '色選択の表示モード':'Color picker mode','オービット色選択':'Orbit color picker','日本語':'Japanese',
  '背景の色':'Background color','背景色を選ぶ':'Choose background color','描画色と交換':'Swap with foreground',
  'スポイトの設定':'Eyedropper settings','カラーウィンドウ':'Color window','彩度と明度':'Saturation and value',
  '彩度・明るさの調整':'Adjust saturation and brightness','カラーコード':'Color code','色の数値形式':'Color value format',
  '色の不透明度':'Color opacity','描画色の不透明度':'Foreground opacity','描画色の不透明度の数値':'Foreground opacity value',
  '色相。短くタップして表示中の色を選択。円周をなぞって回転、手前は左右スライド':'Hue. Tap to select, drag around the ring to rotate, or slide left and right at the front.',
  'タップで選色・円周をなぞって回転・手前は左右スライド':'Tap to select; drag the ring to rotate; slide the front left or right',
  '操作セットを記録・再生':'Record and replay macros','よく使う操作をまとめる':'Combine frequently used actions',
  '表示言語':'Interface language','現在の色':'Current color','塗りの強さ':'Flow','点の間隔':'Spacing',
  '紙の質感':'Paper texture','手ブレ補正':'Stabilization','この設定で作成':'Create with these settings',
  '変更前':'Before','変更後':'After','絵を比べる':'Compare artwork','動作設定':'Performance settings',
  '端末で使える操作と処理時間':'Device capabilities and timing','新しく作る':'Create new',
  '変更せず戻る':'Discard and go back','印刷時の大きさ':'Print dimensions','書き出し':'Export',
  'Illustroの操作や表示を調整するためのページ。':'Customize how Illustro looks and responds.',
};
export type UiLanguage='ja'|'en';
const readLanguage=():UiLanguage=>{
  try{return localStorage.getItem(key)==='en'?'en':'ja';}catch{return 'ja';}
};
let language=readLanguage();
const userContent='[data-user-content],.layer-name,.ih-work-title,[contenteditable],textarea';
export const uiLocale=()=>language==='en'?'en-US':'ja-JP';
export const translatedLabel=(text:string,locale:UiLanguage)=>locale==='en'?english[text]??text:text;
export const translateUi=(text:string)=>translatedLabel(text,language);

export function installLanguageSettings(host:HTMLElement,onChange:()=>void){
  const label=document.createElement('label'),name=document.createElement('span'),select=document.createElement('select');
  name.textContent='表示言語';select.setAttribute('aria-label','表示言語');select.append(new Option('日本語','ja'),new Option('English','en'));
  select.value=language;label.append(name,select);host.append(label);
  const originalText=new Map<Text,string>(),originalAttributes=new Map<Element,Map<string,string>>();
  const translatable='button,label,summary,option,h1,h2,h3,h4,p,dt,output,[role=status],[aria-label],[aria-description]';
  const attrs=['aria-label','aria-description','title','placeholder'] as const;
  function translateText(node:Text){
    const item=node.parentElement;
    if(!item?.closest(translatable)||item.closest(userContent))return;
    const current=node.data,last=originalText.get(node);
    const clean=current.trim();
    const source=last&&english[last.trim()]===clean?last:current;
    const value=english[source.trim()];
    if(value===undefined){originalText.delete(node);return;}
    originalText.set(node,source);
    node.data=language==='en'?source.replace(source.trim(),value):source;
  }
  function translateAttributes(element:Element){
    if(element.closest(userContent))return;
    const previous=originalAttributes.get(element),next=new Map<string,string>();
    for(const attribute of attrs){
      const value=element.getAttribute(attribute),last=previous?.get(attribute);
      const source=last&&english[last]===value?last:value;
      if(source===null||english[source]===undefined)continue;
      next.set(attribute,source);
      const translated=translateUi(source);
      if(value!==translated)element.setAttribute(attribute,translated);
    }
    if(next.size)originalAttributes.set(element,next);else originalAttributes.delete(element);
  }
  function refresh(node:Node){
    if(node instanceof Text){translateText(node);return;}
    if(!(node instanceof Element)||node.matches('script,style,textarea,[data-user-content]'))return;
    translateAttributes(node);
    const walk=document.createTreeWalker(node,NodeFilter.SHOW_TEXT|NodeFilter.SHOW_ELEMENT);
    while(walk.nextNode()){
      const child=walk.currentNode;
      if(child instanceof Text)translateText(child);
      else if(child instanceof Element)translateAttributes(child);
    }
  }
  const observer=new MutationObserver(records=>{
    observer.disconnect();
    let removed=false;
    for(const record of records){
      removed||=record.removedNodes.length>0;
      if(record.type==='attributes'&&record.target instanceof Element)translateAttributes(record.target);
      else if(record.type==='characterData')refresh(record.target);
      else for(const node of record.addedNodes)refresh(node);
    }
    if(removed){
      originalText.forEach((_,node)=>{if(!node.isConnected)originalText.delete(node);});
      originalAttributes.forEach((_,node)=>{if(!node.isConnected)originalAttributes.delete(node);});
    }
    observe();
  });
  const observe=()=>observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:[...attrs]});
  function apply(){
    observer.disconnect();document.documentElement.lang=language;
    if(language==='en')refresh(document.body);
    else{
      for(const [node,source] of originalText)if(node.isConnected)node.data=source;
      for(const [node,values] of originalAttributes)if(node.isConnected)
        for(const [name,source] of values)node.setAttribute(name,source);
      originalText.clear();originalAttributes.clear();
    }
    if(language==='en')observe();
  }
  select.onchange=()=>{
    language=select.value==='en'?'en':'ja';
    try{localStorage.setItem(key,language);}catch{}
    onChange();apply();window.dispatchEvent(new Event('illustro:language-change'));
  };
  apply();
}
