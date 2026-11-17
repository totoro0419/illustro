/** Browser-exit warnings are supplementary; they do not guarantee completion.
 * Explicit native file export and in-app recovery are separate concepts.
 */
export function needsUnloadWarning(state:Readonly<{
  saving:boolean;protectionPending:boolean;queueLength:number;storageError:string|null;
}>):boolean{
  return state.saving||state.protectionPending||state.queueLength>0||state.storageError!==null;
}
