> Classification: OBSOLETE / historical evidence; valid technical principles may be reused. Current authority: `docs/IMPLEMENTATION_BASELINE.md` and `docs/CANONICAL_INDEX.json`. Old stop/PASS/candidate declarations below apply to their recorded version only.

# Keyboard Shortcut Specification

> Status: **Accepted product interaction specification**  
> Date: 2026-09-27  
> Scope: Keyboard shortcut assignment, capture, conflict handling, persistence, and discoverability  
> Parent requirements: `FEATURE_SPEC.md` FR-SHORTCUT-001〜010

## 1. Primary interaction

Shortcut assignment uses **press-to-bind**.

The user does not type shortcut names manually as the primary workflow.

Flow:

1. Open a command/tool/action entry.
2. Choose **Add Shortcut**.
3. Enter Capture Mode.
4. Press the desired key combination on the physical keyboard.
5. Illustro displays the detected combination immediately.
6. Conflicts and reserved-key risks are shown before commit.
7. User confirms or enters another combination.

Example:

`Add Shortcut` → press `Ctrl + Shift + K` → preview `Ctrl + Shift + K` → confirm.

## 2. Capture Mode behavior

While Capture Mode is active:

- ordinary command execution from captured keys is suspended where safe
- pressed modifiers are shown live
- the main key is shown live
- invalid/unavailable combinations are explained
- `Esc` cancels capture unless the user is explicitly binding Escape through an advanced flow
- Capture Mode has a visible active state and must not remain invisibly active

Capture ends after a valid chord is accepted or the user cancels.

## 3. Binding representation

A saved binding must not be only a UI string such as `"Ctrl+K"`.

Store enough information to distinguish:

- normalized modifier set
- logical key
- physical key code
- display label
- binding interpretation/version

This allows keyboard-layout behavior to be changed or migrated without parsing old display strings.

Exact storage schema will be fixed with the settings/native-format specification.

## 4. Logical vs physical key

Capture records both the logical key and physical code.

Default user-facing behavior should follow the key the user experiences on the current layout.

An advanced physical-position binding mode may be considered later if it is useful for users switching keyboard layouts.

The initial implementation must not silently assume that `KeyboardEvent.key` and `KeyboardEvent.code` are interchangeable.

## 5. Modifier normalization

The binding model must represent at least:

- Ctrl
- Shift
- Alt / Option
- Meta / Command

Platform display may map the same semantic binding to platform-appropriate labels/icons.

A user-visible label is presentation data, not the canonical binding identity.

## 6. Conflict handling

Before committing a new shortcut, check:

- exact existing binding
- context-overlapping binding
- global vs contextual command conflicts
- browser/runtime reserved combination risk
- OS-reserved combination risk where detectable/known

For an exact conflict, show the currently bound command.

Available actions:

- Replace existing binding
- Cancel
- Capture another shortcut

Silent replacement is prohibited.

## 7. Multiple shortcuts

A command may have multiple bindings.

Examples:

- platform default + user custom shortcut
- keyboard-layout alternate
- one-handed alternative

Bindings should have independent remove/reset actions.

## 8. Default vs user binding

Persist the distinction between:

- application default binding
- user-added binding
- user-disabled default binding

Resetting a command restores its application defaults without destroying unrelated user settings.

A global **Reset all shortcuts** action may be provided, but it must require explicit confirmation.

## 9. Reserved / unavailable combinations

Some shortcuts cannot be reliably received because the browser or OS handles them first.

Illustro must not promise reliable use of such bindings.

When a risky or known-reserved chord is entered:

- show a warning
- state that the OS/browser may intercept it
- prevent binding if it is known to be unusable in the current runtime
- allow only when meaningful and safely detectable

Exact reserved lists must be platform/runtime aware and are not frozen in this specification.

## 10. Modifier-only shortcuts

Modifier-only shortcuts are excluded from the default assignment flow.

Reasons:

- accidental activation
- conflict with drawing modifiers
- OS/browser interaction
- ambiguity with held-state behavior

If later required for advanced workflows, they should use a separate explicit setting.

## 11. Contextual shortcuts

Illustro may support contextual bindings.

Examples:

- Brush mode
- Transform mode
- Selection mode
- Text editing
- Layer panel focus

A contextual binding must have a clearly defined activation scope.

Conflict detection must distinguish:

- impossible simultaneous conflicts
- acceptable non-overlapping contextual reuse
- ambiguous focus-dependent conflicts

Global command shortcuts take precedence only according to an explicitly documented priority model.

## 12. Hold shortcuts

Some painting workflows benefit from press-and-hold behavior rather than one-shot commands.

Examples:

- temporary eyedropper
- temporary eraser
- temporary canvas navigation modifier

These must be modeled separately from ordinary one-shot shortcuts.

Binding metadata should distinguish:

- Trigger / one-shot
- Hold
- Toggle

The shortcut editor should communicate the behavior.

## 13. Shortcut discovery

Current shortcuts should be visible from relevant surfaces when practical:

- Command Search
- menu entries
- tooltips
- Quick Menu configuration
- shortcut settings
- command details

Users should not have to remember whether a command already has a shortcut.

## 14. Search-driven assignment

Command Search should support a flow such as:

Command Search → select command → Add Shortcut → Capture Mode.

This reduces deep settings navigation.

## 15. Touch-device requirement

Keyboard shortcut assignment is an acceleration layer, not a functional dependency.

Every command required for Core Normal Operation must remain accessible without a physical keyboard.

Tablet/Smartphone with an attached keyboard may use the same press-to-bind system.

## 16. Accessibility

Shortcut Capture must not rely only on color to show active/error state.

It should expose:

- textual captured-key representation
- conflict text
- cancel/confirm controls
- focus indication
- screen-reader-accessible command/binding descriptions where supported

## 17. Performance

Shortcut handling must remain lightweight.

Requirements:

- no expensive global search on every keydown in normal editing
- pre-index active bindings by normalized chord/context
- conflict analysis may run when editing bindings, not during every ordinary command dispatch
- inactive shortcut editor has near-zero recurring cost

## 18. Persistence

User bindings are local-first settings.

They should be exportable/importable with settings or workspace configuration if that feature is enabled.

Bindings should be versioned so future command renames or schema changes can migrate safely.

Command identity must use stable command IDs, not localized display names.

## 18.1 Undo applicability

Shortcut設定変更はArtwork Undo/Redoへ入れない。

Capture確定前はCancelで変更なし。
確定後の誤変更はShortcut editor内のremove/reset/rebindで修正する。

将来Settings-level undoを追加する場合もArtwork Historyとは分離する。

## 19. Acceptance criteria

The shortcut system is not complete until all of the following pass:

- pressing a real chord captures it correctly
- live modifier display is correct
- conflict is shown before commit
- replacing a conflict updates both commands correctly
- cancellation leaves bindings unchanged
- multiple bindings work
- removal works
- reset restores defaults
- keyboard-layout changes do not corrupt saved data
- known unavailable browser/OS combinations are not falsely reported as reliable
- attached keyboards on tablet can bind shortcuts
- commands remain accessible without keyboard
- normal key dispatch remains low-overhead
