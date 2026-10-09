# M06 Basic Export — primary-source comparison (2026-10-09)

**Scope:** M06 only: native project save versus flattened PNG/JPEG/WebP export, transparency, format, quality, mobile workflow, and browser compatibility. Unpublished internals and unverified behaviors are not assumed.

| App | Verified public behavior | M06 decision |
| --- | --- | --- |
| **ibisPaint** | Official tutorial “Export an Artwork (Save)” describes PNG/JPEG/PSD image export, file-format choice, and a transparency switch for PNG. Also offers a gallery share route and device save destination. https://ibispaint.com/lecture/index.jsp?lang=en&no=206 ; transparent PNG tutorial https://ibispaint.com/lecture/index.jsp?no=33 | Clear image-specific export control, distinct from native editing content. Keep PNG transparency by default. |
| **CLIP STUDIO PAINT** | Official manual distinguishes layered Save from Export (Single Layer), supports JPEG, PNG and WebP, JPEG quality, and transparent PNG/WebP (turning transparency off exports white). Android uses file picker. https://help.clip-studio.com/en-us/manual_en/210_file/Exporting_files.htm ; https://help.clip-studio.com/en-us/manual_en/210_file/Save_file.htm | Most direct model: separate Save and Export; explicit white matte for non-alpha JPEG, quality only for lossy, one format chooser. |
| **Procreate** | “Share” exports native .procreate or flattened JPEG/PNG; JPEG is lossy, PNG lossless with alpha. Official manual does not advertise a WebP option in this flow. https://help.procreate.com/procreate/handbook/5.3/actions/actions-share | Separate document archive from flattened sharing, simple flow. Do not infer WebP support. |
| **Krita** | Official file format docs distinguish working KRA documents from PNG and JPEG, and document WebP lossy/lossless options; PNG supports full alpha. https://docs.krita.org/en/general_concepts/file_formats.html ; https://docs.krita.org/en/general_concepts/file_formats/file_png.html ; https://docs.krita.org/en/general_concepts/file_formats/file_jpeg.html ; https://docs.krita.org/de/general_concepts/file_formats/file_webp.html | PNG fidelity, JPEG lossy quality, WebP as web-sharing output. M06 omits advanced codec modes. |
| **Adobe Photoshop** | Save a Copy supports native WebP with lossy and lossless choices in 8-bit RGB, with quality when lossy. “Export As” supports image export separate from editing document. https://helpx.adobe.com/photoshop/desktop/save-and-export/save-files/save-and-open-webp-files-in-photoshop.html ; https://helpx.adobe.com/photoshop/desktop/save-and-export/export-files-to-different-formats/export-to-cloud.html | Keep project save and images distinct; only lossy WebP with quality initially. |
| **Affinity** | Official Affinity Help describes a dedicated Export dialog, output settings varying by file format, previews and presets; current Affinity Help explicitly lists JPEG/PNG/WebP in batch jobs. https://www.affinity.studio/help/sharing-export-dialog/ ; https://www.affinity.studio/help/macros-batch-batchjobs/ | Keep a small contextual dialog now; previews, presets and batch output belong to later milestones. |

## Decisions

1. **Save vs Export:** `.illustro` is editable portable project save. Image export never changes Dirty, Saved Revision, checkpoint, ProtectedThrough, History or CommitSequence.
2. **PNG:** export composite at document pixel size with straight-alpha RGBA8; default transparent. A direct PNG RGBA encoder is used instead of a 2D canvas capture to avoid losing hidden RGB at alpha=0.
3. **JPEG:** explicitly composite all alpha onto **white** in Illustro, label the policy in the dialog, adjust quality 1–100%. This is a fixed M06 policy, not the browser's unspecified matte.
4. **WebP:** browser-provided **lossy** encoding with adjustable quality; transparency preserved. No claim of strict losslessness. Failure to produce WebP MIME/header and decodable dimensions must produce an error, never rename PNG to .webp.
5. **Common path:** synchronously fix the document revision, replay committed strokes in a separate dedicated renderer, read formal per-layer pixels, alpha-composite in formal layer order, then encode. The opaque on-screen presentation canvas is never export authority.
6. **Lightness:** isolate renderer so current input and undo/redo continue; requestAnimationFrame yields during rendering. Peak memory and large mobile canvases need measured bounds (M40 remains separate).
7. **UI:** one “画像を書き出す” action, select format and quality only where appropriate, informative JPEG white-background notice, busy/success/failure state. M07 full UI excluded.
8. **Color:** only current formal sRGB RGBA8 documents are supported. Non-sRGB or non-8-bit documents are rejected explicitly. No wide-gamut conversion, embedded arbitrary ICC, CMYK, or M34 advanced color support is claimed.
9. **Destination:** Blob browser download for unsupported File System Access and mobile devices; does not require login or cloud service.

## Official Web platform basis

- WHATWG HTML Living Standard § canvas serialization: https://html.spec.whatwg.org/multipage/canvas.html — PNG mandatory; unsupported specified type may silently become PNG; non-alpha serializers must use **opaque black** by default; the application therefore flattens JPEG against white *before* encode; 96dpi metadata convention; image encoding quality request is advisory.
- WHATWG HTML OffscreenCanvas is exposed to Window/Worker, includes 2D and WebGL/WebGPU: https://html.spec.whatwg.org/multipage/canvas.html
- MDN `OffscreenCanvas.convertToBlob`: https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas/convertToBlob — Worker availability, optional MIME & quality, unsupported MIME fallback PNG, encoding exceptions.
- MDN `HTMLCanvasElement.toBlob`: https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toBlob — fallback when OffscreenCanvas absent; may produce null.
- Browser Blob, File, `URL.createObjectURL` browser download are local operations; no network backend needed.
- Browser API availability alone is *not* enough: output MIME, magic, browser decode, pixel dimensions are checked. Browser encoders cannot be assumed to preserve alpha-zero hidden RGB (hence dedicated PNG path).

## Not confirmed from official materials

Overwrite behavior, export-during-edit timing, exact click counts on every device, persistence of previous quality settings, and color ICC defaults **for all six** have not all been verified; none are used as facts. No undocumented renderer algorithms are attributed to competitors.

## Limitations tracked for M06 evidence

- GPU per-layer raster replay is a derived projection of frozen official StrokeRecords, because the current Core strict Raster materialization is not yet available for semantic stroke mutations. Independence from the live presentation renderer is necessary. Strict raster-delta documents are explicitly rejected instead of silently exported incorrectly.
- Browser JPEG/WebP encoders are implementation-defined for quantization. Exact pixel equivalence is not a reasonable lossy requirement.
- Actual WebGL2, WebGPU, offline, portable Save, Android and large-canvas performance must be assessed in the QA workflow before marking M06 user-review-ready.
