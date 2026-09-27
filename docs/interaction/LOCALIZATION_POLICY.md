# Localization / Internationalization Policy

> Status: **Canonical UI engineering policy**

## 1. Principle

Visual UIやCommand identityを特定言語の文字列へ依存させない。

初期出荷Locale数が少なくても、後から全UI構造を作り直さずlocalize可能な設計をRequiredとする。

## 2. String resources

User-visible text:

- menu
- command
- tooltip
- error
- status
- settings
- accessibility label

はlocalizable resourceとして管理する。

内部IDへ日本語/英語表示名を直接使用しない。

## 3. Japanese / CJK

少なくとも日本語UIで以下が破綻しない。

- CJK font fallback
- mixed Latin/Japanese labels
- IME composition
- vertical space expansion
- longer translated labels
- full-width punctuation
- numeric/unit mixed text

Text Toolの縦書き仕様は別Feature Spec。

## 4. Layout

Fixed text widthを前提にしない。

- label expansion
- wrapping where suitable
- ellipsis only when full text accessible
- icon + label adaptive
- Compact phone UIでもlocalized textへ到達可能

## 5. Command identity

Command Search、Shortcut、Macro、Quick Menuはstable command IDを使う。

Locale変更で:

- Shortcutが壊れない
- Macroが壊れない
- Quick Menu itemが壊れない

こと。

## 6. Numeric / unit formatting

Display:

- decimal separator
- date/time
- units

はLocale formatting可能。

Canonical stored numeric valueはLocale-independent。

User numeric inputはLocale-aware parsingを行い、曖昧/invalid inputを明示する。

## 7. Search

Command Searchはlocalized command namesを検索できる。

将来、英語alias/technical termでの検索を併用可能にする。

## 8. File/schema

.illustro schema、Blend Mode ID、Filter ID、Macro command ID等をlocalized stringにしない。

## 9. Accessibility

Screen reader labelsもlocalizable。

Iconのみで意味を持たせる場合にもaccessible localized nameを提供する。

## 10. Shipping locales

初期出荷Locale一覧はProduct/UI phaseで決定する。

Localization infrastructureの有無はその決定に依存させない。
