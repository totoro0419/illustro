/** UI-008: optional user guidance, with direct links to installed commands. */
const KEY='illustro.c04.help.opened.v1';
type HelpEntry=Readonly<{title:string;description:string;command:string}>;
const entries:readonly HelpEntry[]=[
  {title:'作品を作る・開く',description:'新規キャンバスを作るか、作品ファイルを開きます。ホームからも操作できます。',command:'new'},
  {title:'ブラシと消しゴムを使う',description:'左側の道具を選び、画面下でブラシの種類と太さを変えます。',command:'brushPage'},
  {title:'色を選ぶ',description:'色相環・数値・色コードで色を選び、必要な色はパレットへ保存します。',command:'colorPage'},
  {title:'レイヤーを編集する',description:'レイヤーの選択、順番、表示、合成などを管理します。',command:'layer'},
  {title:'元に戻す・やり直す',description:'画面上部の矢印で元に戻したり、やり直したりします。',command:'undo'},
  {title:'作品を保存する',description:'レイヤー情報を残す保存と、PNGなど1枚画像への書き出しは別です。',command:'save'},
  {title:'作業場を調整する',description:'右側の幅、パネルの順番、保存済み配置やキー設定を変更します。',command:'workspaceToggle'},
  {title:'機能名から探す',description:'機能検索で名前を調べ、その場で起動できます。',command:'commandSearchOpen'},
  {title:'集中して描く',description:'集中表示は道具や選択範囲を変えずに余分な表示だけ隠します。',command:'c04FocusToggle'},
];
export function installEditorHelp(){
  const shortcuts=document.getElementById('featureShortcuts');
  if(!shortcuts)return;
  const button=document.createElement('button');button.type='button';button.id='c04HelpOpen';
  button.textContent='使い方';button.title='Illustroの使い方を開く';
  button.setAttribute('aria-label','使い方を見る');
  button.dataset.new=(()=>{try{return localStorage.getItem(KEY)?'false':'true';}catch{return 'false';}})();
  shortcuts.append(button);
  const dialog=document.createElement('dialog');dialog.className='c04-help-dialog';dialog.id='c04HelpDialog';
  const heading=document.createElement('h2');heading.textContent='Illustroの使い方';
  const intro=document.createElement('p');intro.textContent='必要な操作だけ探せます。説明はいつでも閉じられます。';
  const list=document.createElement('div');list.className='c04-help-list';
  const closing=document.createElement('button');closing.type='button';closing.textContent='閉じる';closing.onclick=()=>dialog.close();
  for(const entry of entries){
    const row=document.createElement('section');
    const label=document.createElement('strong');label.textContent=entry.title;
    const text=document.createElement('p');text.textContent=entry.description;
    const jump=document.createElement('button');jump.type='button';jump.textContent='この操作を開く';
    const target=()=>document.getElementById(entry.command) as HTMLButtonElement|null;
    jump.onclick=()=>{
      const current=target();
      if(!current||current.disabled){
        jump.textContent='この作品ではまだ使えません';return;
      }
      dialog.close();current.click();
    };
    row.append(label,text,jump);list.append(row);
  }
  dialog.append(heading,intro,list,closing);document.body.append(dialog);
  button.onclick=()=>{
    button.dataset.new='false';
    try{localStorage.setItem(KEY,'opened');}catch{/* no persist */}
    dialog.showModal();
  };
}
