/** Completed artwork takes precedence over thumbnail previews.
 * Running previews are interrupted through AbortSignal by their panel.
 * Queued tasks are ordered without having to allocate another Worker. */
export type ArtworkPriority='interactive'|'preview';
export function artworkQueuePosition(priorities:readonly ArtworkPriority[],priority:ArtworkPriority):number{
  if(priority==='preview')return priorities.length;
  const firstPreview=priorities.indexOf('preview');
  return firstPreview<0?priorities.length:firstPreview;
}

/** Non-text artwork also needs a main-canvas fallback when Worker startup or
 * OffscreenCanvas rendering fails. Never restart a canceled task. */
export function artworkWorkerFallbackAllowed(kind:'path'|'gradient'|'text',workerText:boolean,aborted:boolean):boolean{
  return !aborted&&(kind!=='text'||workerText);
}
