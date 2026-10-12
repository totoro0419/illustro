import type {WorkEntry} from '../persistence/workLibrary';
import {icon} from './icons';

/** Illustro first-party Home skeleton. Artwork and storage stay owned by the editor. */
export type RecoverySummary = Readonly<{
  documentId: string; writerEpochId: string; title: string; protectedThrough: string; updatedAt: number;
}>;
export type HomeActions = Readonly<{
  createDocument: (width:number,height:number,name:string,background:'transparent'|'white')=>Promise<boolean>;
  listWorks:()=>Promise<{works:WorkEntry[];lastWorkId:string|null}>;
  openWork:(id:string)=>Promise<boolean>;
  renameWork:(id:string,name:string)=>Promise<void>;
  duplicateWork:(id:string)=>Promise<void>;
  deleteWork:(id:string)=>Promise<void>;
  openFile: ()=>void;
  resume: (documentId:string,writerEpochId:string)=>Promise<boolean|'cancelled'>;
  prepareHome: ()=>Promise<boolean>;
  hasDocument: ()=>boolean;
}>;
export type HomeShell = Readonly<{
  showHome: ()=>Promise<void>;
  showEditor: ()=>void;
  showNew: (mode?:'blank'|'file')=>void;
  showRecovery: ()=>void;
  setRecoveryCandidates: (candidates:readonly RecoverySummary[])=>void;
  setWorks:(works:readonly WorkEntry[],lastWorkId:string|null)=>void;
  notify: (message:string)=>void;
}>;

export const HOME_TRIVIA = [
  {id:'canvas',kicker:'CANVAS / VIEW',title:'キャンバスは、好きな角度で。',summary:'拡大・回転しても、作品そのものの大きさや向きは変わりません。',details:'キャンバスの表示は作品のデータとは別に管理されています。描きやすい位置へ動かしたり、回転したり、100%表示で線を確認できます。',steps:['2本指の操作で表示を動かす・拡大する','角度の数値入力や回転のリセットを使う','100%表示で作品の細部を確認する'],milestone:'M08',art:'canvas'},
  {id:'taper',kicker:'BRUSH FOUNDATION',title:'一本の線、その先端まで美しく。',summary:'強制入り抜きは、線を描き終えてから始まりと終わりの形を整えます。',details:'強制入り抜きを有効にしたブラシでは、描いた軌跡とブラシサイズを使って、線の始点と終点の形を調整します。',steps:['描画画面のブラシ設定を開く','強制入り抜きの切替を確認する','短い線と長い線を試してみる'],milestone:'Brush Foundation',art:'brush'},
  {id:'layers',kicker:'LAYER WORKFLOW',title:'線画と色を、別々に扱う。',summary:'レイヤーを分けると、ほかの部分に触れずに描き進められます。',details:'レイヤーを追加してから選択すると、次のストロークは選択中のレイヤーへ入ります。',steps:['右側のLayersまたはレイヤーページを開く','ラスターレイヤーを追加する','描くレイヤーを選び直す'],milestone:'M02',art:'layers'},
  {id:'eraser',kicker:'EVERY STROKE',title:'消しゴムは、透明に消します。',summary:'白い色を塗り重ねるのではなく、選んだレイヤーの線を消せます。',details:'Illustroの消しゴムはレイヤーの透明度を減らす方式です。ほかのレイヤーの絵を残しながら修正できます。',steps:['左のEraserを選ぶ','消したいレイヤーを選ぶ','消しすぎたらUndoで戻す'],milestone:'M04',art:'eraser'},
  {id:'save',kicker:'SAVE / RECOVERY',title:'作業を守る、二つの保存。',summary:'自動保存による復元と、持ち運べる.illustroファイルへの保存は別の役割です。',details:'描画中の状態は復元用に保護されます。上部のSaveは.illustro形式で作品を保存する操作です。',steps:['描画を続けながら自動保存状態を確認する','上部のSaveで作品ファイルを保存する','必要に応じてホームから復元する'],milestone:'M05',art:'save'},
] as const;
export type HomeTriviaId = (typeof HOME_TRIVIA)[number]['id'];

const html = [
  '<header class="ih-header"><div class="ih-header-inner">',
    '<button type="button" class="ih-brand" id="ihBrand" aria-label="Illustro ホーム">',
      '<span class="ih-logo"><img src="./brand/illustro-logo.png" alt="" width="36" height="36"></span><span class="ih-brand-name">Illustro<span class="ih-brand-dot">.</span></span>',
    '</button>',
    '<nav class="ih-nav" aria-label="ホームの画面切替">',
      '<button class="ih-nav-item" type="button" id="ihNavHome">ホーム</button>',
      '<button class="ih-nav-item" type="button" id="ihNavWorks">マイ作品</button>',
      '<button class="ih-nav-icon" type="button" id="ihNavSettings" aria-label="設定" title="設定">',
        icon('settings'),
      '</button>',
    '</nav>',
  '</div></header>',
  '<main class="ih-main" id="ihMain">',
    '<section class="ih-screen ih-home" data-ih-screen="home" aria-labelledby="ihHomeTitle">',
      '<div class="ih-main-grid">',
        '<div class="ih-welcome">',
          '<p class="ih-eyebrow"><span class="ih-sparkle" aria-hidden="true">'+icon('effects')+'</span> YOUR CREATIVE SPACE</p>',
          '<h1 id="ihHomeTitle">Create <span>freely.</span></h1>',
          '<p class="ih-subtitle">ひらめきを、自由な一枚に。</p>',
          '<p class="ih-intro">新しいキャンバスから、あなたの次の作品を。</p>',
          '<div class="ih-home-actions">',
            '<button type="button" id="ihStart" class="ih-action ih-action-primary"><span class="ih-action-icon ih-primary-icon" aria-hidden="true">'+icon('plus')+'</span><span class="ih-action-text"><strong>新しい作品</strong><small>空白から作成・ファイルから開く</small></span><span class="ih-action-arrow" aria-hidden="true">↗</span></button>',
            '<button type="button" id="ihWorks" class="ih-action"><span class="ih-action-icon" aria-hidden="true">'+icon('layers')+'</span><span class="ih-action-text"><strong>マイ作品</strong><small>保存した作品を一覧・管理</small></span><span class="ih-action-arrow" aria-hidden="true">→</span></button>',
            '<button type="button" id="ihContinue" class="ih-action"><span class="ih-action-icon" aria-hidden="true">'+icon('recover')+'</span><span class="ih-action-text"><strong>前回の作業を続ける</strong><small id="ihContinueDescription">保存された作業を確認中</small></span><span class="ih-action-arrow" aria-hidden="true">→</span></button>',
          '</div>',
          '<button type="button" id="ihReturnEditor" class="ih-return-editor" hidden><span aria-hidden="true">↗</span> 開いているキャンバスに戻る</button>',
        '</div>',
        '<section class="ih-discover" aria-labelledby="ihDiscoverHeading">',
          '<div class="ih-discover-top"><div><span class="ih-overline">DISCOVER ILLUSTRO</span><h2 id="ihDiscoverHeading">知るほど、描くのが楽しくなる。</h2></div><span class="ih-discover-count" id="ihFeatureCounter">01 / 05</span></div>',
          '<button type="button" id="ihFeatureVisual" class="ih-feature-visual" aria-label="紹介中の機能について詳しく見る">',
            '<span class="ih-glow ih-glow-a" aria-hidden="true"></span><span class="ih-glow ih-glow-b" aria-hidden="true"></span>',
            '<span class="ih-visual-frame" aria-hidden="true"><span class="ih-frame-handle"></span><span class="ih-frame-canvas"><svg viewBox="0 0 450 270" fill="none"><path d="M34 209 C105 148 120 224 180 143 S285 93 347 114 S405 89 430 55" stroke="url(#ihStroke)" stroke-width="22" stroke-linecap="round"/><path d="M39 210 C107 151 122 230 180 143 S285 93 347 114 S405 89 430 55" stroke="white" stroke-opacity=".55" stroke-width="2.5" stroke-linecap="round"/><defs><linearGradient id="ihStroke" x1="20" y1="210" x2="430" y2="56"><stop stop-color="#77B7FF"/><stop offset=".47" stop-color="#8290F8"/><stop offset="1" stop-color="#C28CE9"/></linearGradient></defs></svg></span><span class="ih-frame-caption">ILLUSTRO · CANVAS</span></span>',
            '<span class="ih-visual-orbit ih-orbit-one" aria-hidden="true"></span><span class="ih-visual-orbit ih-orbit-two" aria-hidden="true"></span>',
          '</button>',
          '<div class="ih-discover-bottom"><div class="ih-feature-meta"><span class="ih-feature-category" id="ihFeatureCategory">CANVAS / VIEW</span><span class="ih-feature-milestone" id="ihFeatureMilestone">M08</span></div>',
            '<h3 id="ihFeatureTitle">キャンバスは、好きな角度で。</h3><p id="ihFeatureSummary">拡大・回転しても、作品そのものの大きさや向きは変わりません。</p>',
            '<div class="ih-feature-bottom"><button type="button" id="ihFeatureMore" class="ih-more">機能を詳しく見る <span aria-hidden="true">↗</span></button><div class="ih-feature-controls"><button type="button" id="ihFeaturePrev" aria-label="前の機能">←</button><button type="button" id="ihFeatureNext" aria-label="次の機能">→</button></div></div>',
          '</div>',
        '</section>',
      '</div>',
      '<footer class="ih-footer"><span>ILLUSTRO — CREATE FREELY.</span><span>MAKE ROOM FOR IMAGINATION.</span></footer>',
    '</section>',
    '<section class="ih-screen ih-inner-screen" data-ih-screen="works" hidden aria-labelledby="ihWorksTitle">',
      '<div class="ih-page-top"><span class="ih-overline">YOUR WORKSPACE</span><h1 id="ihWorksTitle">マイ作品<span class="ih-period">.</span></h1><p>作品を選び、続きを描くための場所。</p></div>',
      '<div class="ih-works-bar"><div class="ih-works-label"><span class="ih-works-pill">MY WORKS</span><strong>保存した作品</strong></div><span class="ih-works-count">作品を確認しています</span></div>',
      '<div class="ih-works-tools"><label>作品を検索<input id="ihWorkSearch" type="search" placeholder="作品名で検索"></label><label>並べ替え<select id="ihWorkSort"><option value="updated">更新が新しい順</option><option value="name">名前順</option><option value="created">作成が新しい順</option></select></label></div><div id="ihWorksLoading" role="status" hidden>作品を読み込んでいます。</div><div id="ihWorkGrid" class="ih-work-grid"></div><p id="ihWorkNoResults" hidden>この名前の作品は見つかりませんでした。</p>',
      '<div class="ih-empty-works"><div class="ih-empty-art" aria-hidden="true"><span class="ih-empty-sheet ih-sheet-one"></span><span class="ih-empty-sheet ih-sheet-two"></span><span class="ih-empty-spark">'+icon('effects')+'</span></div>',
        '<h2>最初の作品を、ここから。</h2><p>新しく作った作品は自動保存され、ここからいつでも続きを描けます。</p>',
        '<button id="ihWorksStart" type="button" class="ih-solid-button">新しい作品を作る <span aria-hidden="true">↗</span></button>',
        '<p class="ih-empty-note">保存した .illustro ファイルは「新しい作品 → ファイルから開く」から読み込めます。</p>',
      '</div>',
    '</section>',
    '<section class="ih-screen ih-inner-screen" data-ih-screen="recovery" hidden aria-labelledby="ihRecoveryTitle">',
      '<div class="ih-page-top"><span class="ih-overline">RESUME DRAWING</span><h1 id="ihRecoveryTitle">前回の作業<span class="ih-period">.</span></h1><p>保護された作業を確認して再開します。</p></div><div class="ih-recovery-list" id="ihRecoveryList"></div>',
    '</section>',
    '<section class="ih-screen ih-inner-screen" data-ih-screen="feature" hidden aria-labelledby="ihDetailTitle">',
      '<div class="ih-page-top"><span class="ih-overline" id="ihDetailCategory">DISCOVER ILLUSTRO</span><h1 id="ihDetailTitle">機能紹介</h1><p id="ihDetailSummary"></p></div>',
      '<div class="ih-detail-layout"><div class="ih-detail-picture"><div class="ih-detail-glyph">'+icon('effects')+'</div><span>ILLUSTRO / DISCOVER</span></div><div class="ih-detail-copy"><span class="ih-works-pill" id="ihDetailMilestone">M08</span><h2>こんな場面で便利です</h2><p id="ihDetailDescription"></p><h3>使い方</h3><ol id="ihDetailSteps"></ol><button type="button" class="ih-solid-button" id="ihDetailEditor">描画画面へ <span aria-hidden="true">↗</span></button></div></div>',
    '</section>',
    '<section class="ih-screen ih-inner-screen" data-ih-screen="settings" hidden aria-labelledby="ihSettingsTitle">',
      '<div class="ih-page-top"><span class="ih-overline">PREFERENCES</span><h1 id="ihSettingsTitle">設定<span class="ih-period">.</span></h1><p>Illustroの操作や表示を調整するためのページ。</p></div>',
      '<div class="ih-placeholder"><strong>設定の詳細は今後追加します。</strong><p>現時点で利用できる描画の設定は、エディターのWorkspaceから変更できます。</p><button type="button" class="ih-solid-button" id="ihSettingsEditor">描画画面へ <span aria-hidden="true">↗</span></button></div>',
    '</section>',
  '</main>',
  '<div class="ih-floating-notice" id="ihNotice" role="status" aria-live="polite" hidden></div>',
  '<dialog id="ihNewDialog" class="ih-new-dialog" aria-labelledby="ihNewTitle"><div class="ih-dialog-content">',
    '<div class="ih-dialog-head"><div><span class="ih-overline">START CREATING</span><h2 id="ihNewTitle">新しい作品</h2></div><button type="button" id="ihNewClose" class="ih-dialog-close" aria-label="閉じる">×</button></div>',
    '<div class="ih-start-choices"><button type="button" id="ihChoiceBlank" class="ih-choice" aria-pressed="true"><span class="ih-choice-icon">'+icon('document')+'</span><strong>空白から作成</strong><small>新しいキャンバスを準備</small></button><button type="button" id="ihChoiceFile" class="ih-choice" aria-pressed="false"><span class="ih-choice-icon">'+icon('open')+'</span><strong>ファイルから開く</strong><small>.illustro 形式の作品</small></button></div>',
    '<form id="ihBlankForm"><label class="ih-name-field">作品名<input id="ihNewName" name="name" type="text" value="新しい作品" maxlength="120" required></label><div class="ih-size-heading"><strong>キャンバスサイズ</strong><span>px</span></div><div class="ih-size-presets"><button type="button" data-ih-preset="512x384" aria-pressed="true">標準</button><button type="button" data-ih-preset="1920x1080" aria-pressed="false">フルHD</button><button type="button" data-ih-preset="2048x1536" aria-pressed="false">高解像度</button></div>',
      '<div class="ih-dimensions"><label>幅 <input name="width" id="ihNewWidth" type="number" min="1" max="8192" step="1" required value="512" inputmode="numeric"></label><span aria-hidden="true">×</span><label>高さ <input name="height" id="ihNewHeight" type="number" min="1" max="8192" step="1" required value="384" inputmode="numeric"></label></div>',
      '<label class="ih-name-field">背景<select id="ihNewBackground"><option value="transparent">透明</option><option value="white">白い背景レイヤー</option></select></label><p class="ih-dialog-hint">作品はIllustro内に自動保存されます。ファイル保存はバックアップ用です。</p><p id="ihNewError" class="ih-dialog-error" role="status" aria-live="polite"></p>',
      '<div class="ih-dialog-actions"><button type="button" id="ihNewCancel" class="ih-quiet-button">キャンセル</button><button type="submit" id="ihNewCreate" class="ih-solid-button">キャンバスを作成 <span aria-hidden="true">↗</span></button></div>',
    '</form>',
    '<div id="ihFileOptions" class="ih-file-options" hidden><p>Illustroの作品ファイル（.illustro）を選択して、編集画面で開きます。</p><button type="button" id="ihSelectFile" class="ih-solid-button">ファイルを選択 <span aria-hidden="true">↗</span></button></div>',
  '</div></dialog>'
].join('');

type Screen='home'|'works'|'recovery'|'feature'|'settings'|'editor';
export function installHomeShell(app:HTMLElement,actions:HomeActions):HomeShell{
  const root=document.createElement('div');root.id='ihApp';root.className='ih-root';root.innerHTML=html;document.body.append(root);
  if(location.pathname.replace(/\/+$/,'').endsWith('/qa/home')){
    const checks=document.createElement('details');checks.className='ih-checks';checks.innerHTML='<summary>今回の確認</summary><ol><li>作品を作り、線を描いてホームへ戻る</li><li>マイ作品から開き、線とレイヤーが残っているか見る</li><li>別の作品も作り、二つの絵が混ざらないか見る</li><li>アプリを閉じて開き直し、前回の作品を続ける</li><li>作品の名前を変え、複製・削除を試す</li><li>用紙を動かす・拡大する・回す。白い枠だけが残らないか見る</li></ol>';root.querySelector('.ih-footer')!.after(checks);
  }
  const el=<T extends HTMLElement=HTMLElement>(id:string)=>root.querySelector<T>('#'+id)!;
  const dialog=el<HTMLDialogElement>('ihNewDialog');
  let screen:Screen='home',featureIndex=0,recovery:readonly RecoverySummary[]=[],works:readonly WorkEntry[]=[],lastWorkId:string|null=null,workUrls:string[]=[];
  const setButton=(id:string,handler:()=>void)=>{el<HTMLButtonElement>(id).addEventListener('click',handler);};
  const notify=(message:string)=>{const notice=el('ihNotice');notice.textContent=message;notice.hidden=!message;};
  const updateEditorLink=()=>{el('ihReturnEditor').hidden=!actions.hasDocument();};
  const navigate=(next:Screen,writeHistory=true)=>{
    if(next==='editor'&&!actions.hasDocument()){showNew('blank');return;}
    screen=next;const inEditor=next==='editor';
    root.hidden=inEditor;app.inert=!inEditor;app.setAttribute('aria-hidden',String(!inEditor));
    for(const section of root.querySelectorAll<HTMLElement>('[data-ih-screen]'))section.hidden=section.dataset.ihScreen!==next;
    const homeNav=next==='home',worksNav=next==='works';
    el('ihNavHome').classList.toggle('is-active',homeNav);el('ihNavWorks').classList.toggle('is-active',worksNav);
    el('ihNavSettings').classList.toggle('is-active',next==='settings');
    el('ihNavHome').setAttribute('aria-current',homeNav?'page':'false');el('ihNavWorks').setAttribute('aria-current',worksNav?'page':'false');
    updateEditorLink();if(next==='works')void loadWorks();if(!inEditor){notify('');el('ihMain').scrollTop=0;root.scrollTop=0;}
    if(dialog.open)dialog.close();
    const heading=inEditor?app.querySelector<HTMLElement>('#canvas'):root.querySelector<HTMLElement>('[data-ih-screen="'+next+'"] h1');if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});}
    if(writeHistory){
      const hash=next==='feature'?'#feature/'+HOME_TRIVIA[featureIndex]!.id:'#'+next;
      if(location.hash!==hash)history.pushState({illustroScreen:next},'',hash);
    }
  };
  const showNew=(mode:'blank'|'file'='blank')=>{navigate('home');setCreationMode(mode);notify('');dialog.showModal();};
  const setCreationMode=(mode:'blank'|'file')=>{
    const blank=mode==='blank';el('ihBlankForm').hidden=!blank;el('ihFileOptions').hidden=blank;
    el('ihChoiceBlank').setAttribute('aria-pressed',String(blank));el('ihChoiceFile').setAttribute('aria-pressed',String(!blank));
    el('ihNewError').textContent='';
  };
  const chooseTrivia=(next:number)=>{
    featureIndex=(next+HOME_TRIVIA.length)%HOME_TRIVIA.length;const card=HOME_TRIVIA[featureIndex]!;
    el('ihFeatureCounter').textContent=String(featureIndex+1).padStart(2,'0')+' / '+String(HOME_TRIVIA.length).padStart(2,'0');
    el('ihFeatureTitle').textContent=card.title;el('ihFeatureSummary').textContent=card.summary;el('ihFeatureCategory').textContent=card.kicker;el('ihFeatureMilestone').textContent=card.milestone;
    el('ihFeatureVisual').setAttribute('data-art',card.art);
  };
  const showFeature=()=>{const card=HOME_TRIVIA[featureIndex]!;
    el('ihDetailTitle').textContent=card.title;el('ihDetailSummary').textContent=card.summary;el('ihDetailCategory').textContent=card.kicker;el('ihDetailMilestone').textContent=card.milestone;
    el('ihDetailDescription').textContent=card.details;const steps=el<HTMLOListElement>('ihDetailSteps');steps.replaceChildren(...card.steps.map(step=>{const li=document.createElement('li');li.textContent=step;return li;}));navigate('feature');
  };
  const run=async(action:()=>Promise<unknown>,button?:HTMLButtonElement)=>{if(button)button.disabled=true;try{await action();}catch(error){notify(error instanceof Error?error.message:String(error));}finally{if(button)button.disabled=false;}};
  const renderWorks=()=>{
    workUrls.forEach(URL.revokeObjectURL);workUrls=[];
    const query=el<HTMLInputElement>('ihWorkSearch').value.trim().toLocaleLowerCase('ja-JP'),sort=el<HTMLSelectElement>('ihWorkSort').value;
    const filtered=works.filter(work=>work.name.toLocaleLowerCase('ja-JP').includes(query)).sort((a,b)=>sort==='name'?a.name.localeCompare(b.name,'ja-JP'):sort==='created'?b.createdAt-a.createdAt:b.updatedAt-a.updatedAt);
    root.querySelector('.ih-works-count')!.textContent=works.length+'作品';(root.querySelector('.ih-empty-works') as HTMLElement).hidden=works.length>0;
    el('ihWorkNoResults').hidden=works.length===0||filtered.length>0;
    el('ihWorkGrid').replaceChildren(...filtered.map(work=>{
      const card=document.createElement('article');card.className='ih-work-card';card.dataset.workId=work.documentId;
      const open=document.createElement('button');open.type='button';open.className='ih-work-preview';open.setAttribute('aria-label',work.name+'を開く');
      if(work.thumbnail){const img=document.createElement('img');img.alt='';img.loading='lazy';img.src=URL.createObjectURL(work.thumbnail);workUrls.push(img.src);open.append(img);}else{open.textContent='プレビューを準備中';}
      open.onclick=()=>void run(async()=>{if(await actions.openWork(work.documentId))navigate('editor');},open);
      const info=document.createElement('div');info.className='ih-work-info';
      const title=document.createElement('button');title.type='button';title.className='ih-work-title';title.textContent=work.name;title.setAttribute('aria-label',work.name+'の名前を変更');
      title.onclick=()=>showRename(work);
      const meta=document.createElement('p');meta.textContent=work.width+' × '+work.height+' px · '+new Date(work.updatedAt).toLocaleString('ja-JP');
      const details=document.createElement('details');details.className='ih-work-actions';const summary=document.createElement('summary');summary.textContent='作品の操作';details.append(summary);
      for(const [label,action] of [['名前を変更',async()=>showRename(work)],['複製',async()=>{await actions.duplicateWork(work.documentId);await loadWorks();}],['削除',async()=>{if(confirm('「'+work.name+'」をマイ作品から削除しますか？\n削除後は作品一覧から開けなくなります。')){await actions.deleteWork(work.documentId);await loadWorks();}}]] as const){
        const button=document.createElement('button');button.type='button';button.textContent=label;button.dataset.workAction=label;button.onclick=()=>void run(action,button);details.append(button);
      }
      const id=document.createElement('small');id.textContent='識別番号 '+work.documentId;details.append(id);
      info.append(title,meta,details);card.append(open,info);return card;
    }));
  };
  const updateContinue=()=>{
    const last=works.find(x=>x.documentId===lastWorkId);
    el('ihContinueDescription').textContent=last?last.name+' · '+new Date(last.updatedAt).toLocaleString('ja-JP'):recovery.length?'保存された作業を選んで再開':'まだ作業した作品はありません';
    el<HTMLButtonElement>('ihContinue').disabled=!last&&!recovery.length;
  };
  const setWorks=(values:readonly WorkEntry[],last:string|null)=>{works=values;lastWorkId=last;renderWorks();updateContinue();};
  const loadWorks=async()=>{el('ihWorksLoading').hidden=false;try{const value=await actions.listWorks();setWorks(value.works,value.lastWorkId);}catch(error){notify('作品一覧を読み込めませんでした。'+String(error));}finally{el('ihWorksLoading').hidden=true;}};
  el('ihWorkSearch').addEventListener('input',renderWorks);el('ihWorkSort').addEventListener('change',renderWorks);
  const rename=document.createElement('dialog');rename.className='ih-new-dialog';rename.innerHTML='<form class="ih-dialog-content"><h2>作品名を変更</h2><label class="ih-name-field">作品名<input name="title" maxlength="120" required></label><p role="status"></p><div class="ih-dialog-actions"><button type="button" class="ih-quiet-button">キャンセル</button><button type="submit" class="ih-solid-button">変更する</button></div></form>';root.append(rename);
  let renamedWork:WorkEntry|null=null;
  const showRename=(work:WorkEntry)=>{renamedWork=work;rename.querySelector<HTMLInputElement>('input')!.value=work.name;rename.querySelector('p')!.textContent='';rename.showModal();rename.querySelector<HTMLInputElement>('input')!.focus();};
  rename.querySelector<HTMLButtonElement>('button[type=button]')!.onclick=()=>rename.close();
  rename.querySelector('form')!.onsubmit=event=>{event.preventDefault();if(!renamedWork)return;const work=renamedWork,button=rename.querySelector<HTMLButtonElement>('button[type=submit]')!;void run(async()=>{try{await actions.renameWork(work.documentId,rename.querySelector<HTMLInputElement>('input')!.value);rename.close();await loadWorks();}catch(error){rename.querySelector('p')!.textContent=error instanceof Error?error.message:String(error);}},button);};
  const showRecovery=()=>{void run(async()=>{
    const last=works.find(x=>x.documentId===lastWorkId),newer=last?recovery.filter(x=>x.documentId===last.documentId&&x.writerEpochId!==last.writerEpochId&&x.updatedAt>last.updatedAt):recovery;
    if(last&&!newer.length){if(await actions.openWork(last.documentId))navigate('editor');return;}
    const list=el('ihRecoveryList');list.replaceChildren();
    if(last){const button=document.createElement('button');button.type='button';button.className='ih-recovery-item';button.textContent=last.name+' — マイ作品の保存から続ける';button.onclick=()=>void run(async()=>{if(await actions.openWork(last.documentId))navigate('editor');},button);list.append(button);}
    const valid=newer.filter(x=>{try{return BigInt(x.protectedThrough)>0n;}catch{return false;}});
    if(!valid.length&&!last){const empty=document.createElement('p');empty.textContent='復元できる作業はありません。新しい作品から描き始められます。';list.append(empty);}
    for(const item of valid){const button=document.createElement('button');button.type='button';button.className='ih-recovery-item';
      button.textContent=(item.title||'名前のない作品')+' · '+new Date(item.updatedAt).toLocaleString('ja-JP')+' — 作業途中から復元';
      button.onclick=()=>void run(async()=>{if(await actions.resume(item.documentId,item.writerEpochId)===true)navigate('editor');},button);list.append(button);
    }
    navigate('recovery');
  });};
  const setRecoveryCandidates=(candidates:readonly RecoverySummary[])=>{
    recovery=candidates.filter(x=>{try{return BigInt(x.protectedThrough)>0n;}catch{return false;}});updateContinue();
    if(screen==='recovery')showRecovery();
  };
  const showHome=async()=>{if(screen==='editor'&&!(await actions.prepareHome()))return;navigate('home');};

  setButton('ihBrand',()=>void showHome());setButton('ihNavHome',()=>void showHome());setButton('ihNavWorks',()=>navigate('works'));
  setButton('ihNavSettings',()=>navigate('settings'));setButton('ihStart',()=>showNew());setButton('ihWorks',()=>navigate('works'));
  setButton('ihContinue',showRecovery);setButton('ihReturnEditor',()=>navigate('editor'));
  setButton('ihWorksStart',()=>showNew());setButton('ihSettingsEditor',()=>actions.hasDocument()?navigate('editor'):showNew());
  setButton('ihFeaturePrev',()=>chooseTrivia(featureIndex-1));setButton('ihFeatureNext',()=>chooseTrivia(featureIndex+1));
  setButton('ihFeatureVisual',showFeature);setButton('ihFeatureMore',showFeature);
  setButton('ihDetailEditor',()=>actions.hasDocument()?navigate('editor'):showNew());
  setButton('ihNewClose',()=>dialog.close());setButton('ihNewCancel',()=>dialog.close());
  setButton('ihChoiceBlank',()=>setCreationMode('blank'));setButton('ihChoiceFile',()=>setCreationMode('file'));
  setButton('ihSelectFile',()=>{dialog.close();actions.openFile();});
  for(const preset of root.querySelectorAll<HTMLButtonElement>('[data-ih-preset]'))preset.addEventListener('click',()=>{
    const [width,height]=preset.dataset.ihPreset!.split('x').map(Number);
    el<HTMLInputElement>('ihNewWidth').value=String(width);el<HTMLInputElement>('ihNewHeight').value=String(height);
    for(const item of root.querySelectorAll<HTMLButtonElement>('[data-ih-preset]'))item.setAttribute('aria-pressed',String(item===preset));
  });
  for(const input of [el<HTMLInputElement>('ihNewWidth'),el<HTMLInputElement>('ihNewHeight')])input.addEventListener('input',()=>{
    for(const preset of root.querySelectorAll<HTMLButtonElement>('[data-ih-preset]')){
      const sizes=preset.dataset.ihPreset!.split('x');preset.setAttribute('aria-pressed',String(sizes[0]===el<HTMLInputElement>('ihNewWidth').value&&sizes[1]===el<HTMLInputElement>('ihNewHeight').value));
    }
  });
  el<HTMLFormElement>('ihBlankForm').addEventListener('submit',event=>{event.preventDefault();void(async()=>{
    const width=Number(el<HTMLInputElement>('ihNewWidth').value),height=Number(el<HTMLInputElement>('ihNewHeight').value);
    if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<1||height<1||width>8192||height>8192){el('ihNewError').textContent='幅と高さを1〜8192pxで指定してください。';return;}
    const button=el<HTMLButtonElement>('ihNewCreate');button.disabled=true;el('ihNewError').textContent='キャンバスを準備しています。';
    try{if(await actions.createDocument(width,height,el<HTMLInputElement>('ihNewName').value,el<HTMLSelectElement>('ihNewBackground').value as 'transparent'|'white'))navigate('editor');else el('ihNewError').textContent='作成できませんでした。描画画面の状態を確認してください。';}
    catch(error){el('ihNewError').textContent=error instanceof Error?error.message:'作成できませんでした。';}finally{button.disabled=false;}
  })();});
  let swipeStart:number|null=null;
  el('ihFeatureVisual').addEventListener('touchstart',event=>{swipeStart=event.touches[0]?.clientX??null;},{passive:true});
  el('ihFeatureVisual').addEventListener('touchend',event=>{if(swipeStart===null)return;const delta=(event.changedTouches[0]?.clientX??swipeStart)-swipeStart;swipeStart=null;if(Math.abs(delta)>48){chooseTrivia(featureIndex+(delta<0?1:-1));event.preventDefault();}},{passive:false});
  addEventListener('popstate',()=>{void(async()=>{
    if(screen==='editor'&&!(await actions.prepareHome())){navigate('editor');return;}
    const value=location.hash.replace(/^#/,'');
    if(value.startsWith('feature/')){const index=HOME_TRIVIA.findIndex(x=>x.id===value.slice(8));if(index>=0){chooseTrivia(index);showFeature();return;}}
    if(value==='works'||value==='recovery'||value==='settings')navigate(value,false);
    else if(value==='editor'&&actions.hasDocument())navigate('editor',false);
    else navigate('home',false);
  })();});
  chooseTrivia(0);setRecoveryCandidates([]);
  // The old milestone QA pages do not install this shell; normal startup is Home.
  navigate('home',location.hash!=='#home');
  return {showHome,showEditor:()=>navigate('editor'),showNew,showRecovery,setRecoveryCandidates,setWorks,notify};
}
