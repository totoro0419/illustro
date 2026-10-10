/**
 * Illustro M07 Aurora pictograms.
 *
 * All shapes are ORIGINAL vector drawings with a 24×24 viewBox and a shared
 * optical family. No glyph/emoji font, CDN, cloned icon package or assets.
 * Icons have no text semantics: the parent button carries the accessible name.
 * Geometry: 1.8 visual stroke, rounded joins/caps, 2+ units of breathing room.
 */
const motifs={
  brush:'<path d="M14.6 3.8 20.2 9.4 11 18.6l-5.6-5.6z"/><path d="m13.4 5 5.6 5.6"/><path d="M5.4 13c-1.8.9-2.4 2.8-2.1 4.1.3 1.1-.1 2.5-1.3 3.1 3.6.6 7.3-.9 7.3-4.4"/>',
  eraser:'<path d="m4.8 14.4 8.7-9.2a2 2 0 0 1 2.9 0l3.4 3.4a2 2 0 0 1 0 2.8l-8 8.2H8.1z"/><path d="m9.3 9.6 6.6 6.6M11.8 19.6h8.1"/>',
  smudge:'<path d="M8.2 4.1c2.2 2.4-1 5.2-1.2 8.1-.2 2.9 1.6 4.2 4.2 3.8 3.5-.6 4.8-5 7.7-6"/><path d="M4 19.4c2.8-1.6 4.9.2 7.3-.2 3-.4 5.4-2.5 8.7-2.6"/><path d="m15.4 7.5 3.7 1.1 1-3.6"/>',
  eyedropper:'<path d="m8 15.7 7.8-7.8"/><path d="m13.5 7.3 3.2-3.1a2.1 2.1 0 0 1 3 3l-3.2 3.2"/><path d="m8.3 12.6 3.1 3.1-5.1 5.1H3.7v-2.6z"/><path d="M4.8 18.7h3.3"/>',
  smartFill:'<path d="m6.4 5.2 9.6 9.6-5.8 5.7a2 2 0 0 1-2.8 0L2.7 15.8a2 2 0 0 1 0-2.8l7.7-7.8"/><path d="M2.8 14.4H16"/><path d="M19.1 13.2c1.3 2.1 2.2 3.5 2.2 4.4a2.2 2.2 0 1 1-4.4 0c0-.9.9-2.3 2.2-4.4z"/><path d="M17.8 4.2v3.4m-1.7-1.7h3.4"/>',
  selection:'<rect x="4.5" y="4.5" width="15" height="15" rx="1.4" stroke-dasharray="2.5 3.1"/><path d="m15 14 2.2 6.2 1.5-2.4 2.4-1.5z" fill="currentColor" stroke="none"/>',
  transform:'<rect x="6" y="6" width="12" height="12" rx="1"/><rect x="3.5" y="3.5" width="4.5" height="4.5" rx=".6" fill="var(--a-surface,#fff)"/><rect x="16" y="3.5" width="4.5" height="4.5" rx=".6" fill="var(--a-surface,#fff)"/><rect x="3.5" y="16" width="4.5" height="4.5" rx=".6" fill="var(--a-surface,#fff)"/><rect x="16" y="16" width="4.5" height="4.5" rx=".6" fill="var(--a-surface,#fff)"/>',
  move:'<path d="M12 2.5v19M2.5 12h19"/><path d="m8.8 5.7 3.2-3.2 3.2 3.2M8.8 18.3l3.2 3.2 3.2-3.2M5.7 8.8 2.5 12l3.2 3.2m12.6-6.4 3.2 3.2-3.2 3.2"/>',
  all:'<rect x="3.5" y="3.5" width="7.2" height="7.2" rx="1.4"/><rect x="13.3" y="3.5" width="7.2" height="7.2" rx="1.4"/><rect x="3.5" y="13.3" width="7.2" height="7.2" rx="1.4"/><rect x="13.3" y="13.3" width="7.2" height="7.2" rx="1.4"/>',
  home:'<path d="M3.4 10.6 12 3.5l8.6 7.1"/><path d="M5.7 9.9v9.7a1 1 0 0 0 1 1h10.6a1 1 0 0 0 1-1V9.9"/><path d="M9.5 20.6v-7h5v7"/>',
  save:'<path d="M5 3.5h12l3.5 3.6v12.4a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1v-15a1 1 0 0 1 1-1z"/><path d="M7 3.5v6h9v-6M7.5 20.5v-7.2h9v7.2"/><path d="M13.5 4.5v3.5"/>',
  workspace:'<rect x="3" y="4.5" width="18" height="15" rx="2"/><path d="M9.5 4.5v15M3 9h6.5M13 8.5h4.6M13 12h4.6M13 15.5h3"/>',
  layers:'<path d="m12 2.8 9 5.4-9 5.4-9-5.4z"/><path d="m3.3 12.3 8.7 5.1 8.7-5.1M3.3 16.4 12 21.5l8.7-5.1"/>',
  undo:'<path d="M9.1 5.2 3.4 10.6l5.7 5.1"/><path d="M3.5 10.6H15a5.5 5.5 0 0 1 0 11h-2" transform="translate(0 -4.5)"/><path d="M9.1 5.2 3.4 10.6l5.7 5.1"/>',
  redo:'<path d="m14.9 5.2 5.7 5.4-5.7 5.1"/><path d="M20.5 10.6H9a5.5 5.5 0 0 0 0 11h2" transform="translate(0 -4.5)"/>',
  flipH:'<path d="M12 2.7v18.6" stroke-dasharray="2.4 2.4"/><path d="M9.4 5.2 3.2 12l6.2 6.8zM14.6 5.2l6.2 6.8-6.2 6.8z"/>',
  flipV:'<path d="M2.7 12h18.6" stroke-dasharray="2.4 2.4"/><path d="M5.2 9.4 12 3.2l6.8 6.2zM5.2 14.6l6.8 6.2 6.8-6.2z"/>',
  plus:'<path d="M12 4.5v15M4.5 12h15"/>',
  open:'<path d="M3.5 8V5.5a2 2 0 0 1 2-2H10l2 2h6.5a2 2 0 0 1 2 2V9"/><path d="M4.5 10h15.6a1.3 1.3 0 0 1 1.3 1.6l-2 8a1.4 1.4 0 0 1-1.4 1H4.6a1.4 1.4 0 0 1-1.4-1.1l-1-7.8A1.4 1.4 0 0 1 3.6 10z"/>',
  recover:'<path d="M4.2 10.1a8 8 0 1 1 .5 5.8"/><path d="M4.1 4.8v5.4h5.4M12 7.4v5l3.2 1.8"/>',
  export:'<path d="M12 3v12M8 11l4 4 4-4"/><path d="M4.5 16.7v2.2c0 .9.7 1.6 1.6 1.6h11.8c.9 0 1.6-.7 1.6-1.6v-2.2"/>',
  copy:'<rect x="8" y="7" width="12.5" height="13.5" rx="1.8"/><path d="M16.8 7V5.4a2 2 0 0 0-2-2H5.5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2H8"/>',
  close:'<path d="M5 5 19 19M19 5 5 19"/>',
  back:'<path d="m13.9 5-7 7 7 7M7 12h12"/>',
  down:'<path d="m5 9 7 7 7-7"/>',
  more:'<circle cx="5" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.3" fill="currentColor" stroke="none"/>',
  color:'<path d="M12 3a9 9 0 0 0 0 18h1.3a2 2 0 0 0 1.6-3.3 2 2 0 0 1 1.6-3.3h1.3a3.3 3.3 0 0 0 3.2-3.4A8.7 8.7 0 0 0 12 3z"/><circle cx="7.1" cy="11.4" r="1" fill="currentColor"/><circle cx="9" cy="6.8" r="1" fill="currentColor"/><circle cx="15.1" cy="7.1" r="1" fill="currentColor"/>',
  shape:'<path d="M3.5 19.7 10.4 5l6.6 14.7z"/><circle cx="18.2" cy="8.3" r="3"/>',
  guide:'<path d="M4 4h16v16H4zM9 4v16M14 4v16M4 9h16M4 14h16" stroke-width="1.4"/><path d="M4 4h16v16H4z" stroke-width="1.8"/>',
  effects:'<path d="m12 2.7 1.9 6.9 7.4 2.4-7.4 2.4-1.9 7-1.9-7L2.7 12l7.4-2.4z"/><path d="m18.9 2.5.6 2.2 2.1.6-2.1.7-.6 2.1-.7-2.1-2.1-.7 2.1-.6z"/>',
  reference:'<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><circle cx="8.8" cy="9" r="1.5"/><path d="m4 17 5.2-5.1 3.1 3.2 3.2-4.1 4.8 5.7"/>',
  history:'<path d="M4.5 9a8.2 8.2 0 1 1 .6 7"/><path d="M4.5 3.5V9h5.5M12.5 7.5v5.1l3 1.8"/>',
  document:'<path d="M6 2.8h8.1l4.2 4.3v13.2a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3.8a1 1 0 0 1 1-1z"/><path d="M14.1 2.8v4.5h4.2M8.6 12h6.9M8.6 16h6.9"/>',
  settings:'<circle cx="12" cy="12" r="3.1"/><path d="M10.2 2.9h3.6l.6 2.2 2.1.9 2-1.2 2.5 2.5-1.2 2 .9 2.1 2.2.6v3.6l-2.2.6-.9 2.1 1.2 2-2.5 2.5-2-1.2-2.1.9-.6 2.2h-3.6l-.6-2.2-2.1-.9-2 1.2L3 18.3l1.2-2-.9-2.1-2.2-.6v-3.6l2.2-.6.9-2.1-1.2-2L5.5 4.8l2 1.2 2.1-.9z" transform="translate(0 -.4) scale(.96)"/>',
  zoom:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5.1 5.1M7.9 10.5h5.2"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 10.5v6M12 7.4h.01" stroke-width="2.4"/>',
} as const;
export type IconName=keyof typeof motifs;
/** One semantic motif for each command. Never parse remote inputs as SVG. */
export function icon(name:IconName):string{
  return '<svg class="ui-icon" viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" focusable="false" aria-hidden="true">'+motifs[name]+'</svg>';
}
/** Fail deliberately when an identifier lacks iconography; no silent Unicode fallback. */
export const ICON_NAMES=Object.freeze(Object.keys(motifs)) as readonly IconName[];
