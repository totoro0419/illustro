/** W3C Pointer Events: eraser button=5, eraser bit in buttons=32.
 * A barrel switch is not the same as the rear eraser and is not silently remapped.
 * Device/browser support is checked by real events, not assumed.
 */
export function isPenEraserContact(event:Pick<PointerEvent,'pointerType'|'button'|'buttons'>):boolean{
 return event.pointerType==='pen'&&(event.button===5||(event.buttons&32)!==0);
}

export function penEraserInput(event: Pick<PointerEvent,'pointerType'|'button'|'buttons'|'pressure'>, barrelErases: boolean) {
  if (event.pointerType !== 'pen') return false;
  const rearEraser = isPenEraserContact(event);
  const barrelInContact = (event.buttons & 2) !== 0 && ((event.buttons & 1) !== 0 || event.pressure > 0);
  return rearEraser || (barrelErases && barrelInContact);
}
