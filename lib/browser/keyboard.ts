/** Geometry/focus only. Never reads field values or saves anything. */
export function keyboardGeometry({height,top,scale,baseline,editable,coarse}:{height:number;top:number;scale:number;baseline:number;editable:boolean;coarse:boolean}){
 const open=coarse&&editable&&Math.abs(scale-1)<0.01&&baseline-height>150;
 return {open,height:Math.max(0,height),top:Math.max(0,top)};
}
export function isTypingField(element:Element|null){
 if(!element)return false;
 if(element.matches('textarea:not([disabled]):not([readonly]), [contenteditable="true"]'))return true;
 if(!element.matches('input:not([disabled]):not([readonly])'))return false;
 return ['text','search','email','url','tel','password','number'].includes((element as HTMLInputElement).type);
}
export function watchKeyboard(win:Window,root:HTMLElement){
 const viewport=win.visualViewport,doc=win.document;
 let frame=0,baseline=win.innerHeight;
 function sync(){
  const active=doc.activeElement,typing=isTypingField(active),controls=Boolean(active?.closest('[data-keyboard-controls]'));
  if(!typing&&!controls)baseline=win.innerHeight;
  else baseline=Math.max(baseline,win.innerHeight);
  const geometry=keyboardGeometry({height:viewport?.height??win.innerHeight,top:viewport?.offsetTop??0,scale:viewport?.scale??1,baseline,editable:typing||controls,coarse:win.matchMedia('(pointer: coarse)').matches});
  root.style.setProperty('--app-visual-height',`${geometry.height}px`);
  root.style.setProperty('--app-visual-top',`${geometry.top}px`);
  root.dataset.keyboardOpen=String(geometry.open);
  // Let Safari keep the caret visible. Never scrollIntoView on viewport resize/scroll:
  // a long textarea needs native cursor scrolling, not whole-element repositioning.
 }
 function schedule(){win.cancelAnimationFrame(frame);frame=win.requestAnimationFrame(sync);}
 function rotate(){baseline=win.innerHeight;schedule();}
 sync();viewport?.addEventListener('resize',schedule);viewport?.addEventListener('scroll',schedule);
 doc.addEventListener('focusin',schedule);doc.addEventListener('focusout',schedule);win.addEventListener('resize',schedule);win.addEventListener('orientationchange',rotate);
 return ()=>{win.cancelAnimationFrame(frame);viewport?.removeEventListener('resize',schedule);viewport?.removeEventListener('scroll',schedule);doc.removeEventListener('focusin',schedule);doc.removeEventListener('focusout',schedule);win.removeEventListener('resize',schedule);win.removeEventListener('orientationchange',rotate);root.style.removeProperty('--app-visual-height');root.style.removeProperty('--app-visual-top');delete root.dataset.keyboardOpen;};
}
