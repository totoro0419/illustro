# M08 Canvas navigation, display and resize research (official-source audit)
Date: 2026-10-11. Scope: M08. This records **verified public behavior only**; no inference of private rendering internals. Work not yet accepted.

| App | Verified official feature | Illustro decision | Explicitly not adopted and reason |
|---|---|---|---|
| ibisPaint | Two-finger move/rotate/scale; canvas size change separate from Resize; resize tool lists nearest, average, bilinear, bicubic, Lanczos 2, Lanczos 3; rotate via Z/R stylus shortcuts. | Adopt two-finger navigation, separate dimensions, and compare resampling options. | Do not copy its layer-specific transform repeat features as if they are the global view-only Seamless Tile. |
| CLIP STUDIO PAINT | Navigator Fit, Reset Rotation, view-only horizontal/vertical mirror; Canvas Size separated from Image resolution; resize interpolation choices including nearest/bilinear/bicubic/average/smart smoothing. | Keep flips view-only; Fit and rotation reset distinct; separate resampling choices. | Do not turn a view flip into a destructive image operation. |
| Procreate | Crop area manipulated by handles and exact numeric values; Resample switch scales content using bicubic; hardware-dependent canvas bounds. | On-canvas crop handles plus precise numeric inputs, distinct resampling mode. | Do not silently resample during canvas-size changes. |
| Krita | Middle mouse or Space-drag pan, zoom keys, 'M' mirror view, non-destructive view rotation with shortcut and reset. | Space/middle-mouse pan with current paint tool intact; view rotation independent of pixels. | No automatic permanent rotation of artwork from view controls. |
| Photoshop | Zoom changes view only, actual pixels / 100% notion documented, broad magnification options. | Record 100% pixel mapping and provide explicit device-pixel alternative; numeric precise zoom. | Do not assume desktop monitor pixel equals web CSS pixel on all devices. |
| Affinity | Document Setup > Resize > Canvas changes canvas bounds without stretching unchanged pixels; anchor sets alignment; Crop Tool can change canvas bounds. | Introduce separate bounds-resize and image-resampling actions with explicit anchor. | Do not fake a resize by scaling the view. |

## Primary official sources
- ibisPaint new features (gesture and canvas resize): https://ibispaint.com/newFeature.jsp?lang=en
- ibisPaint transform & interpolation: https://ibispaint.com/lecture/index.jsp?lang=en&no=154
- ibisPaint canvas size: https://ibispaint.com/lecture/index.jsp?lang=en&no=39
- CSP navigation / flipping / fit: https://help.clip-studio.com/en-us/manual_en/270_canvas/Navigating_the_canvas.htm
- CSP canvas/image sizing: https://help.clip-studio.com/en-us/manual_en/210_file/Change_canvas_size.htm
- Procreate Canvas: https://help.procreate.com/procreate/handbook/actions/actions-canvas
- Krita Navigation: https://docs.krita.org/en/user_manual/getting_started/navigation.html
- Photoshop Zoom: https://helpx.adobe.com/photoshop/desktop/get-started/learn-the-basics/zoom-images.html
- Affinity canvas sizing: https://www.affinity.studio/help/size-transform-canvas-size/

## Browser/Web/GPU official source audit
- WHATWG canvas bitmap dimensions and CSS layout distinction: https://html.spec.whatwg.org/multipage/canvas.html
- W3C ResizeObserver device-pixel-content-box measures exact integer content pixel dimensions; CSS × DPR is **approximate**: https://www.w3.org/TR/resize-observer-1/
- MDN devicePixelRatio documentation: browser zoom changes DPR; pinch zoom does not. DPR changes may need matchMedia listener: https://developer.mozilla.org/en-US/docs/Web/API/Window/devicePixelRatio
- WebGPU canvas configure and current texture invalidation upon resize: https://gpuweb.github.io/gpuweb/explainer/
- GPUCanvasContext API: https://gpuweb.github.io/types/interfaces/GPUCanvasContext

## Contract and unresolved decisions
1. Illustro 100% is **1 document pixel = 1 CSS pixel**, measurable across DPR changes. Separate "Actual device pixels" uses 1 document pixel = 1 physical device pixel. This is a browser-specific explicit convention, **not** a claim that all competing apps define 100% identically.
2. Document coordinates must remain independent of CSS/layout and presentation backing. Zoom, rotate, flip and navigation must not write history.
3. Nearest for deliberate integer-size pixel examination; bilinear is provisional for other zoom/rotate combinations. Better downscale filters / mipmaps require measured proof and may replace these choices.
4. Device-pixel backing is measured using ResizeObserver where available. No arbitrary DPR cap.
5. Unimplemented/uncertain: exact pixel parity of WebGPU/WebGL2, 2048–3000 canvas visual QA, orientation, crop/resize and seamless painting remain pending until real tests pass.
