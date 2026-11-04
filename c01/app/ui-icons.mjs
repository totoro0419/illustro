// Aurora Frost icons: local, static SVGs; no network, font, or UI event changes.
// Keep text labels (tool names, New/Open/Save, mobile commands) intact.
const NS = 'http://www.w3.org/2000/svg';
const shapes = {
  brand:'<path d="m12 2 2.2 7.8L22 12l-7.8 2.2L12 22l-2.2-7.8L2 12l7.8-2.2Z"/><path d="m12 7 1.2 3.8L17 12l-3.8 1.2L12 17l-1.2-3.8L7 12l3.8-1.2Z"/>',
  gpen:'<path d="m15 5 4 4M5 19l4-.9L19 8a2.1 2.1 0 0 0-3-3L5.9 15.1 5 19Z"/><path d="M4 21h16"/>',
  round:'<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="3"/>',
  pencil:'<path d="m4 20 4.5-1 11-11a2.1 2.1 0 0 0-3-3l-11 11L4 20Z"/><path d="m14 7 3 3"/>',
  marker:'<path d="M15 4 5 14l5 5L20 9l-5-5Z"/><path d="M5 14 3 21l7-2M12 7l5 5"/>',
  air:'<circle cx="9" cy="12" r="1.4"/><circle cx="15" cy="7" r="1.2"/><circle cx="16" cy="16" r="1.7"/><circle cx="6" cy="18" r=".9"/><path d="M4 8h6m-4-3h4m8 7h3"/>',
  hardEraser:'<path d="m8 4 12 12-4 4H8l-5-5a2 2 0 0 1 0-3l8-8a2 2 0 0 1 3 0Z"/><path d="m6 9 9 9M16 20h5"/>',
  softEraser:'<path d="M12 3C9 7 6 10 6 14a6 6 0 0 0 12 0c0-4-3-7-6-11Z"/><path d="M9 16c.5 1.2 1.4 2 3 2"/>',
  fit:'<path d="M8 3H5a2 2 0 0 0-2 2v3m13-5h3a2 2 0 0 1 2 2v3M3 16v3a2 2 0 0 0 2 2h3m13-5v3a2 2 0 0 1-2 2h-3"/>',
  undo:'<path d="M3 7v6h6"/><path d="M3 13c2.4-4.8 6.3-7 10.6-6C18 8 21 11.4 21 16"/>',
  redo:'<path d="M21 7v6h-6"/><path d="M21 13c-2.4-4.8-6.3-7-10.6-6C6 8 3 11.4 3 16"/>',
  new:'<path d="M13 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7"/><path d="M16 3v8m-4-4h8"/>',
  open:'<path d="M3 7h7l2 2h9v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/><path d="M3 10h18"/>',
  save:'<path d="M5 3h12l4 4v13a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a2 2 0 0 1 2-2Z"/><path d="M7 3v7h10V3M7 21v-8h10v8"/>',
  saveas:'<path d="M5 3h12l4 4v8M7 3v7h10V3M4 20h9"/><path d="m15 20 5-5 2 2-5 5h-2z"/>',
  panel:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M14 4v16M6 8h5m-5 4h5"/>',
  close:'<path d="M5 5 19 19M19 5 5 19"/>'
};
function svg(name){
  const el = document.createElementNS(NS,'svg');
  el.setAttribute('viewBox','0 0 24 24');
  el.setAttribute('fill','none');
  el.setAttribute('stroke','currentColor');
  el.setAttribute('stroke-width','1.85');
  el.setAttribute('aria-hidden','true');
  el.setAttribute('focusable','false');
  el.classList.add('ui-icon');
  el.innerHTML=shapes[name];
  return el;
}
function replaceGlyph(button,name){
  if(!button||!shapes[name]) return;
  if(!button.hasAttribute('aria-label')) button.setAttribute('aria-label',button.getAttribute('title')||button.textContent.trim());
  // Only remove the leading decorative glyph; keep tool labels in <span>.
  for(const child of Array.from(button.childNodes)){
    if(child.nodeType===3 && child.textContent.trim()) { child.remove(); break; }
  }
  button.prepend(svg(name));
}
function addIcon(button,name){
  if(button&&!button.querySelector('.ui-icon')) button.prepend(svg(name));
}
const brand=document.querySelector('.brandmark');
if(brand){brand.textContent='';brand.append(svg('brand'))}
for(const b of document.querySelectorAll('.rail button[data-tool]')) replaceGlyph(b,b.dataset.tool);
for(const b of document.querySelectorAll('.rail button[data-action="fit"]')) replaceGlyph(b,'fit');
for(const b of document.querySelectorAll('[data-action="undo"]')) replaceGlyph(b,'undo');
for(const b of document.querySelectorAll('[data-action="redo"]')) replaceGlyph(b,'redo');
replaceGlyph(document.getElementById('panel-toggle'),'panel');
replaceGlyph(document.getElementById('close-panel'),'close');
for(const action of ['new','open','save','saveas']){
  for(const b of document.querySelectorAll('.top-actions button[data-action="'+action+'"]')) addIcon(b,action);
}
