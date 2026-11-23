import './appDialogs.css';

/** Nonblocking, accessible Illustro dialogs. No browser prompt/confirm/alert calls. */
type InputOptions=Readonly<{
  required?:boolean;
  maxLength?:number;
  validate?:(value:string)=>string|null;
}>;
type Kind='confirm'|'input'|'notice'|'choice';
type Choice<T extends string=string>=Readonly<{value:T;label:string}>;
let tail:Promise<void>=Promise.resolve();
function enqueue<T>(run:()=>Promise<T>):Promise<T>{
  const result=tail.then(run,run);
  tail=result.then(()=>undefined,()=>undefined);
  return result;
}
function openDialog(kind:Kind,message:string,initial='',options:InputOptions={},choices:readonly Choice[]=[],detail?:HTMLElement):Promise<boolean|string|null>{
  return new Promise(resolve=>{
    const previous=document.activeElement instanceof HTMLElement?document.activeElement:null;
    const dialog=document.createElement('dialog');dialog.className='illustro-app-dialog';
    // Keep editor-wide shortcuts from acting on the painting while a dialog is open.
    // Do not preventDefault: Esc must still close the native <dialog> element.
    dialog.addEventListener('keydown',event=>event.stopPropagation());
    const form=document.createElement('form');form.className='illustro-app-dialog-content';
    form.noValidate=true;
    const title=document.createElement('h2');title.id='illustro-app-dialog-'+Math.random().toString(36).slice(2);
    title.textContent=kind==='input'?'入力':kind==='notice'?'お知らせ':'確認';
    dialog.setAttribute('aria-labelledby',title.id);
    const description=document.createElement('p');description.className='illustro-app-dialog-message';
    description.textContent=message;
    const error=document.createElement('output');error.className='illustro-app-dialog-error';
    error.setAttribute('role','alert');error.hidden=true;
    const input=kind==='input'?document.createElement('input'):null;
    if(input){
      input.type='text';input.value=initial;input.autocomplete='off';
      if(options.maxLength!==undefined)input.maxLength=options.maxLength;
      input.setAttribute('aria-label',message);
      input.addEventListener('input',()=>{error.textContent='';error.hidden=true;});
    }
    const buttons=document.createElement('div');buttons.className='illustro-app-dialog-actions';
    const cancel=document.createElement('button');cancel.type='button';cancel.textContent='キャンセル';
    const accept=document.createElement('button');accept.type='submit';
    accept.textContent=kind==='notice'?'閉じる':'確定';accept.className='illustro-app-dialog-primary';
    let choice:string|null=null;
    if(kind!=='notice')buttons.append(cancel);
    if(kind==='choice'){
      for(const item of choices){
        const button=document.createElement('button');
        button.type='button';button.textContent=item.label;
        button.onclick=()=>{choice=item.value;dialog.close();};
        buttons.append(button);
      }
    }else buttons.append(accept);
    form.append(title,description);
    if(detail)form.append(detail);
    if(input)form.append(input);
    form.append(error,buttons);dialog.append(form);
    let accepted=false;
    cancel.onclick=()=>dialog.close();
    form.addEventListener('submit',event=>{
      event.preventDefault();
      if(kind==='choice')return;
      if(input){
        const value=input.value;
        const problem=options.required&&!value.trim()?'入力してください。':options.validate?.(value)??null;
        if(problem){error.textContent=problem;error.hidden=false;input.focus();return;}
      }
      accepted=true;dialog.close();
    });
    dialog.addEventListener('close',()=>{
      dialog.remove();
      if(previous?.isConnected)previous.focus({preventScroll:true});
      resolve(kind==='choice'?choice:kind==='input'?(accepted?input!.value:null):accepted);
    },{once:true});
    document.body.append(dialog);
    try{dialog.showModal();(input??(kind==='choice'?cancel:accept)).focus();}
    catch{dialog.remove();resolve(kind==='input'||kind==='choice'?null:false);}
  });
}
/** Esc and Cancel resolve to false. */
export const appConfirm=(message:string):Promise<boolean>=>
  enqueue(async()=>await openDialog('confirm',message)===true);
/** Esc and Cancel resolve to null. */
export const appPrompt=(message:string,initial='',options:InputOptions={}):Promise<string|null>=>
  enqueue(async()=>await openDialog('input',message,initial,options) as string|null);
/** Esc and Cancel resolve to null, with Cancel focused by default. */
export const appChoose=<T extends string>(message:string,choices:readonly Choice<T>[],detail?:HTMLElement):Promise<T|null>=>
  enqueue(async()=>await openDialog('choice',message,'',{},choices,detail) as T|null);
export const appAlert=(message:string):Promise<void>=>
  enqueue(async()=>{await openDialog('notice',message);});
