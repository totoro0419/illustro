# M08 Canvas view / display boundary (implementation in progress)
- Document/Revision/256px logical tiles are the source of truth. View transforms never enter artwork history.
- Composite/preview textures use document coordinates; presentation uses device-pixel backing dimensions.
- 100% means 1 document pixel = 1 CSS pixel. Physical 1:1 (Actual Pixels) uses zoom = 1/devicePixelRatio.
- View uses double-precision JavaScript pointer mapping and shared packed GPU transform.
- High DPR has no arbitrary cap. Actual limits and sizes must be diagnosed.
- ResizeObserver device-pixel content box when available, CSS size times DPR fallback otherwise.
- Flip is view-only and must never write Document or History.
- A full document-sized live compositing texture is still used; future visible-region optimization remains open.
- Status: not yet validated, not a M08 PASS statement.
