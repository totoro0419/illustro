#!/usr/bin/env python3
"""Migrate archived Illustro design into the accepted M10 repository without editing production code."""
from __future__ import annotations

import hashlib
import json
import shutil
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / "docs"
SOURCE = ROOT / "archive-source" / "docs"
BACKUP = DEST / "migration" / "before-archive-2026-11-12"
ACCEPTED_M10 = "4722710c623d8ed31722bc9d50cd645110f5716e"
ACCEPTED_BASE = "d890e7cc9579305138bb4ea0513e7e4d6602db0f"
ARCHIVE_REPO = "totoro0419/illustro-illustro_next_archive"
ARCHIVE_BRANCH = "implementation/stage4-c03-layers-history-persistence"

CHUNKS = [
    ("C01", "基本作画アプリ", "基本描画・レイヤー・Undo・消しゴム・保存・UI・色・ブラシは受入済み。旧17機能全件の合否照合は未実施"),
    ("C02", "描画エンジン・高度ブラシ", "M01/M04/M08/M10の主要機能は受入済み。旧18機能全件および描画直後の指入力停止の解決は未確認"),
    ("C03", "レイヤー・履歴・保存基盤", "M02/M03/M05が受入済み。M11レイヤー完成系が次の対象。高度合成・高度履歴は残る"),
    ("C04", "UI・色選択・操作設定", "M07/M09の基礎が受入済み。Workspace・ショートカット・スマホUI等は未完成"),
    ("C05", "作品管理・素材・参考資料", "M05の保存・読込と既存作品管理の基礎はある。素材・参考資料等は未完成"),
    ("C06", "選択・コピー・基本編集", "M08のCrop・Canvas/Image Resize等は受入済み。選択・Clipboardは未完成"),
    ("C07", "変形・非破壊編集", "作品変形・Liquify等の主要完成機能は未着手。画面回転と作品変形は区別する"),
    ("C08", "塗りつぶし・線画認識", "塗りつぶし・線画認識・連動彩色の本番完成機能は未着手"),
    ("C09", "定規・図形・グラデーション", "主要完成機能は未着手"),
    ("C10", "ベクター・文字", "主要完成機能は未着手"),
    ("C11", "水彩・混色・画材表現", "通常ブラシはあるが、高度な混色・水彩の完成は未確認。保留機能を勝手に追加しない"),
    ("C12", "フィルター① 色調・階調", "主要完成機能は未着手"),
    ("C13", "フィルター② ぼかし・画像処理", "主要完成機能は未着手"),
    ("C14", "フィルター③ 特殊効果", "主要完成機能は未着手"),
    ("C15", "色管理・高度な入出力", "M06のPNG/JPEG/WebP基本書出しは受入済み。ICC等の高精度管理・高互換は未完成"),
    ("C16", "制作支援・自動化・AI", "履歴・保存基盤はあるが、Timelapse・Macro等の主要完成機能は未着手"),
    ("C17", "全体統合・最終品質改善", "実機・性能・復元破壊試験・横断QA・比較試験・Release Gateは最終工程"),
]

CANONICAL = {
    "product": "docs/product-planning/FINAL_PRODUCT_SPEC.md",
    "implementation": "docs/IMPLEMENTATION_BASELINE.md",
    "features": "docs/product-planning/FEATURE_MASTER_CATALOG.md",
    "families": "docs/product-planning/REQUIREMENT_TRACEABILITY.md",
    "architecture": "docs/detailed-design/SYSTEM_CONTRACTS.md",
    "leftUI": "docs/product-architecture/UI_NAVIGATION.md",
    "rightUI": "docs/product-architecture/PRODUCT_ARCHITECTURE.md",
    "layerPage": "docs/product-architecture/PRODUCT_ARCHITECTURE.md",
    "compactUI": "docs/detailed-design/IBISPAINT_PHONE_LANDSCAPE_REFERENCE.md",
    "numericInput": "docs/detailed-design/NUMERIC_CONTRACTS_V1.json",
    "workspaceCustomization": "docs/product-architecture/PRODUCT_ARCHITECTURE.md",
    "brushAdoption": "docs/product-planning/features/BRU.md",
    "regionAdoption": "docs/product-planning/features/LIN.md",
    "performance": "docs/performance-research/UNIFIED_SYSTEM_DESIGN.md",
    "roadmap": "docs/roadmap/C01_C17_ROADMAP.md",
}

REPLACED_DESIGN = {
    "docs/PRODUCT_SPEC.md",
    "docs/FEATURE_SPEC.md",
    "docs/FEATURE_CATALOG.md",
    "docs/FEATURE_SYSTEM_INTEGRATION_2026-10-04.md",
    "docs/architecture/ARCHITECTURE_V2.md",
    "docs/architecture/FEATURE_PERFORMANCE_RESOLUTION_2026-10-04.md",
    "docs/ui/LEFT_UI_SPEC.md",
    "docs/ui/RIGHT_UI_SPEC.md",
    "docs/ui/RIGHT_LAYER_PAGE_SPEC.md",
    "docs/ui/COMPACT_IMPLEMENTATION_BASELINE.md",
    "docs/ui/UI_INPUT_CONTROL_STANDARD.md",
    "docs/ui/WORKSPACE_VISUAL_CUSTOMIZATION_SPEC.md",
}

def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()

def git_rev(repo: Path) -> str:
    return subprocess.check_output(["git", "-C", str(repo), "rev-parse", "HEAD"], text=True).strip()

def write(path: str, content: str) -> None:
    file = ROOT / path
    file.parent.mkdir(parents=True, exist_ok=True)
    file.write_text(content.rstrip() + "\n", encoding="utf-8")

def main() -> None:
    if not SOURCE.is_dir():
        raise SystemExit("Archived source checkout is missing")
    if not (DEST / "IMPLEMENTATION_CHECKLIST.md").is_file():
        raise SystemExit("Current accepted milestones are missing; refuse migration")
    recorded = (DEST / "IMPLEMENTATION_CHECKLIST.md").read_text(encoding="utf-8")
    if ACCEPTED_M10 not in recorded or "M10" not in recorded:
        raise SystemExit("Accepted M10 record not found; refuse migration")
    old_checklist = digest(DEST / "IMPLEMENTATION_CHECKLIST.md")
    baseline = ROOT / "docs" / "revival" / "M10_CLOSURE_2026-11-12.md"
    if not baseline.exists():
        raise SystemExit("M10 closure evidence missing; refuse migration")

    BACKUP.mkdir(parents=True, exist_ok=True)
    for name in ("IMPLEMENTATION_BASELINE.md", "CANONICAL_INDEX.md", "CANONICAL_INDEX.json"):
        previous = DEST / name
        if previous.is_file():
            shutil.copy2(previous, BACKUP / name)
    shutil.copy2(ROOT / "README.md", BACKUP / "README.md")

    original_tree = sorted(p for p in SOURCE.rglob("*") if p.is_file())
    manifest = []
    for src in original_tree:
        rel = src.relative_to(SOURCE)
        dst = DEST / rel
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dst)
        if digest(src) != digest(dst):
            raise SystemExit("Archive copy checksum mismatch: " + str(rel))
        manifest.append({"path": "docs/" + rel.as_posix(), "sha256": digest(src), "bytes": src.stat().st_size})

    revision = git_rev(ROOT / "archive-source")
    authority = f"""# Illustro — 正式設計の優先順位（アーカイブ版へ移行）

2026-11-12以降の新規設計・追加機能の基準は、アーカイブ版の最終設計文書群です。現行の旧設計を優先して新規仕様を作らないでください。

## 新しい正本

1. 製品理念: [PRODUCT_VISION.md](PRODUCT_VISION.md)
2. 機能の最終範囲（247件のうち236件が対象・限定対象）: [FINAL_PRODUCT_SCOPE.json](product-planning/FINAL_PRODUCT_SCOPE.json)
3. 製品の完成像: [FINAL_PRODUCT_SPEC.md](product-planning/FINAL_PRODUCT_SPEC.md)
4. 機能詳細: [features.json](product-planning/features.json)、[features/](product-planning/features/)、[REQUIREMENT_TRACEABILITY.md](product-planning/REQUIREMENT_TRACEABILITY.md)
5. 性能・軽さの設計: [UNIFIED_SYSTEM_DESIGN.md](performance-research/UNIFIED_SYSTEM_DESIGN.md)
6. 画面・操作の全体設計: [PRODUCT_ARCHITECTURE.md](product-architecture/PRODUCT_ARCHITECTURE.md)
7. システム詳細・機能間の連携: [SYSTEM_CONTRACTS.md](detailed-design/SYSTEM_CONTRACTS.md)、[NUMERIC_CONTRACTS_V1.json](detailed-design/NUMERIC_CONTRACTS_V1.json)
8. 設計の最終審査と未実施項目: [FINAL_DESIGN_AUDIT.md](detailed-design/FINAL_DESIGN_AUDIT.md)、[STAGE4_HANDOFF.md](detailed-design/STAGE4_HANDOFF.md)
9. 今後の区切り: [C01_C17_ROADMAP.md](roadmap/C01_C17_ROADMAP.md)

## 設計の出所

- 元リポジトリ: https://github.com/{ARCHIVE_REPO}
- 参照ブランチ: {ARCHIVE_BRANCH}
- 取り込み元HEAD: {revision}
- 対象: アーカイブ版 docs/ 配下の全ファイル（画像・検証記録を含む）
- 同一ファイル確認: [ARCHIVE_IMPORT_MANIFEST.json](migration/ARCHIVE_IMPORT_MANIFEST.json)

## 過去の実装成果との関係

- 正式開発は現行リポジトリ totoro0419/illustro を継続。アーカイブのアプリ実装は移植しない。
- M01〜M10は合格済み。最終製品HEADは {ACCEPTED_M10}、受入後の統合開始基準は {ACCEPTED_BASE}。
- 旧 docs/IMPLEMENTATION_CHECKLIST.md は受入履歴として保持し、旧M11の準備PR #67も勝手に破棄しない。
- 本設計の採用により実装済みコードが自動的に新仕様へ一致するわけではない。差分を確認し、機能単位で実装・検証する。
- 未解決の「描画直後の指入力停止」は、M10の合格対象外。修正済みと扱わない。
- 旧 docs/PRODUCT_SPEC.md や docs/FEATURE_SPEC.md、旧 architecture/UI正本は、履歴・既存コードの検証資料として保管するが、将来機能の設計上の優先権はない。
- すでに合格したコードや保存形式を新設計だけを理由に壊さない。変更時は旧作品の互換性と回帰を調べ、ユーザーの承認を得る。
- アーカイブ版の歴史的な「現在は第1段階」等の記述より、この移行記録とM10進捗を優先する。現在は第4段階の製品実装。
- 仕様の衝突時は、アーカイブ版の設計を目標にしつつ、現行の合格済み機能を保護する移行計画を作る。矛盾を隠して黙って旧実装へ戻さない。

## 開発方針

優先順位は「直感的操作 → 使いやすさ・軽さ・体感応答性 → 多機能」。他の主要ペイントアプリの公式仕様は必ず調査し、実機評価なしに動作合格としない。
"""
    write("docs/DESIGN_AUTHORITY.md", authority)

    roadmap_rows = "\n".join(
        "| " + c + " | " + title + " | " + status + " |"
        for c, title, status in CHUNKS
    )
    write("docs/roadmap/C01_C17_ROADMAP.md", f"""# Illustro — C01〜C17 機能チャンクと現在地

アーカイブ版の17区分を今後の管理枠とする。旧M01〜M10の受入実績を振り分けた進捗であり、旧Cチャンク全体の一括合格を宣言するものではない。

| チャンク | 開発範囲 | 2026-11-12時点の進捗 |
|---|---|---|
{roadmap_rows}

## 現在地

- M01〜M10はユーザー受入済みでコード・作品互換性・固定QAを保護。
- 次の重点は **C03の未実装レイヤー完成機能（旧M11）**。
- 旧M11 PR #67は準備段階として維持。高度合成（旧M26）や高度履歴（旧M31）をM11へ無断追加しない。
- C01/C02は基本機能を含むが、アーカイブ時代の17件/18件の個別機能IDの全受入検査を再実施していないため、チャンク全体のPASSではない。
- C03は保存・履歴基盤が合格済みでも、高度レイヤー・合成・履歴が残るので未完了。
- C01〜C16の元の機能計画236件（234通常+2限定）を、現在の完成率の分母として機械的に使用しない。保留10件と対象外1件を無断で復活させない。
- C17は全体の実機/性能/復元/横断QAの最終工程とする。

## 旧M01〜M10からの引き継ぎ

| 旧マイルストーン | 新しい主な所属チャンク |
|---|---|
| M01 一筆の正式描画 | C01, C02 |
| M02 レイヤー追加・選択 | C01, C03 |
| M03 Undo / Redo | C01, C03 |
| M04 消しゴム | C01, C02 |
| M05 保存・自動保存・復元・Offline | C01, C03, C05 |
| M06 PNG/JPEG/WebP書出し | C15 |
| M07 PC/Tablet基本UI | C01, C04 |
| M08 キャンバス操作・表示品質・Crop | C01, C02, C06 |
| M09 Color基本機能 | C01, C04 |
| M10 正式ブラシ・線品質・4000px・白背景軽量化 | C01, C02, C03 |

旧Mの同じ機能が複数チャンクに登場しても、重複開発や重複の完了計上を意味しない。旧番号の完全履歴は [IMPLEMENTATION_CHECKLIST.md](../IMPLEMENTATION_CHECKLIST.md) に残す。
""")
    write("docs/IMPLEMENTATION_BASELINE.md", """# Illustro — 実装の開始基準（アーカイブ設計採用後）

**必ず先に [DESIGN_AUTHORITY.md](DESIGN_AUTHORITY.md) を読む。** 以後の仕様正本はアーカイブ版から取り込んだ製品・性能・UI・詳細設計です。

- 本番コード: totoro0419/illustro。M01〜M10の受入済みコードと保存互換性を保持する。
- 現在地: C03の高度なレイヤー機能が次の実装対象。M11 PR #67は保護し、設計変更後の作業範囲を再点検する。
- 段階: 4「実装」。アーカイブ内の過去の「第1段階」という記述は当時の記録であり現在地ではない。
- 現行コードと新正本に差があれば、差の範囲・ユーザー影響・互換性・必要な修正を記録してから実装する。
- 描画直後の指入力停止は未解決として扱い、既に修正されたと断定しない。
- 旧M01〜M10のコード・QAページ・PR・Git履歴を削除しない。
- 本文の設計移行と、各Cチャンクの完成判定は別。自動テストと実機ユーザー確認を区別する。

旧版の実装基準は [移行前の保存版](migration/before-archive-2026-11-12/IMPLEMENTATION_BASELINE.md)。以後の設計の優先関係はこの旧版ではなくDESIGN_AUTHORITY.mdによる。
""")

    write("docs/CANONICAL_INDEX.md", """# Illustro — 設計の正式な参照先

**最上位入口: [DESIGN_AUTHORITY.md](DESIGN_AUTHORITY.md)**

| 分野 | 新しい正式設計書 |
|---|---|
| 理念 | [PRODUCT_VISION.md](PRODUCT_VISION.md) |
| 製品完成像 | [FINAL_PRODUCT_SPEC.md](product-planning/FINAL_PRODUCT_SPEC.md) |
| 全247機能の採否 | [FINAL_PRODUCT_SCOPE.json](product-planning/FINAL_PRODUCT_SCOPE.json) |
| 機能の詳細 | [FEATURE_MASTER_CATALOG.md](product-planning/FEATURE_MASTER_CATALOG.md)、[features/](product-planning/features/) |
| 操作・UI | [PRODUCT_ARCHITECTURE.md](product-architecture/PRODUCT_ARCHITECTURE.md)、[UI_NAVIGATION.md](product-architecture/UI_NAVIGATION.md) |
| 軽量化と設計上の仕組み | [UNIFIED_SYSTEM_DESIGN.md](performance-research/UNIFIED_SYSTEM_DESIGN.md) |
| 詳細システム | [SYSTEM_CONTRACTS.md](detailed-design/SYSTEM_CONTRACTS.md) |
| 数値と設定 | [NUMERIC_CONTRACTS_V1.json](detailed-design/NUMERIC_CONTRACTS_V1.json) |
| 受入条件と未確認 | [FINAL_DESIGN_AUDIT.md](detailed-design/FINAL_DESIGN_AUDIT.md) |
| 17区分の現在地 | [C01_C17_ROADMAP.md](roadmap/C01_C17_ROADMAP.md) |
| M01〜M10受入履歴 | [IMPLEMENTATION_CHECKLIST.md](IMPLEMENTATION_CHECKLIST.md) |

移行前の本書は [保存版](migration/before-archive-2026-11-12/CANONICAL_INDEX.md)。旧docs/architecture/、docs/ui/、FEATURE_SPEC.md等は、受入済みコードの動作と既往の決定を追うため保存するが、今後の製品仕様を決める設計正本ではない。
""")

    index = json.loads((BACKUP / "CANONICAL_INDEX.json").read_text(encoding="utf-8"))
    index["authority"] = "docs/DESIGN_AUTHORITY.md"
    index["owners"].update(CANONICAL)
    existing = {entry["path"]: entry for entry in index["entries"]}
    for p in REPLACED_DESIGN:
        if p in existing:
            existing[p]["status"] = "OBSOLETE"
    for p in (
        "docs/DESIGN_AUTHORITY.md",
        "docs/PRODUCT_VISION.md",
        "docs/product-planning/FINAL_PRODUCT_SPEC.md",
        "docs/product-planning/FINAL_PRODUCT_SCOPE.json",
        "docs/product-planning/FEATURE_MASTER_CATALOG.md",
        "docs/product-planning/REQUIREMENT_TRACEABILITY.md",
        "docs/product-architecture/PRODUCT_ARCHITECTURE.md",
        "docs/product-architecture/UI_NAVIGATION.md",
        "docs/detailed-design/SYSTEM_CONTRACTS.md",
        "docs/detailed-design/NUMERIC_CONTRACTS_V1.json",
        "docs/detailed-design/FINAL_DESIGN_AUDIT.md",
        "docs/performance-research/UNIFIED_SYSTEM_DESIGN.md",
        "docs/roadmap/C01_C17_ROADMAP.md",
    ):
        existing[p] = {"path": p, "status": "CANONICAL"}
    index["entries"] = sorted(existing.values(), key=lambda entry: entry["path"])
    write("docs/CANONICAL_INDEX.json", json.dumps(index, ensure_ascii=False, indent=2))

    manifest_json = {
        "source_repository": ARCHIVE_REPO,
        "source_branch": ARCHIVE_BRANCH,
        "source_commit": revision,
        "accepted_product_head": ACCEPTED_M10,
        "accepted_integration_baseline": ACCEPTED_BASE,
        "file_count": len(manifest),
        "files": manifest,
    }
    write("docs/migration/ARCHIVE_IMPORT_MANIFEST.json", json.dumps(manifest_json, ensure_ascii=False, indent=2))

    write("README.md", f"""# Illustro

一枚絵の制作体験を磨くペイントアプリです。最優先は直感的な操作、次に使いやすさ・体感応答性、次に多機能性。

## 現在地（2026-11-12）

M01〜M10の正式製品機能はユーザー合格済み。現在は17チャンク方式へ移行しており、直近の開発対象は **C03の残り（レイヤー完成系、旧M11）** です。

- [新しい設計書の優先関係](docs/DESIGN_AUTHORITY.md) — アーカイブ版の設計に切替
- [現在地と全17チャンク](docs/roadmap/C01_C17_ROADMAP.md)
- [製品仕様](docs/product-planning/FINAL_PRODUCT_SPEC.md)
- [機能の採否（247件）](docs/product-planning/FINAL_PRODUCT_SCOPE.json)
- [軽量化・処理方式の設計](docs/performance-research/UNIFIED_SYSTEM_DESIGN.md)
- [UI・操作の設計](docs/product-architecture/PRODUCT_ARCHITECTURE.md)
- [詳細システム設計](docs/detailed-design/SYSTEM_CONTRACTS.md)
- [従来のM01〜M10の合格履歴](docs/IMPLEMENTATION_CHECKLIST.md)

アーカイブ元: https://github.com/{ARCHIVE_REPO} / ブランチ: {ARCHIVE_BRANCH} / HEAD: {revision}

**重要:** 設計書の切替は実装済みコードの置換や完成を意味しません。旧版の合格済みコード、作品、QA公開、PR履歴は保持します。既存コードと新しい設計の食い違いは、機能ごとに調べて解消します。

## 開発

Node 24。依存導入後、BrushとEditorを実行します。

    npm ci
    npm run brush:build
    npm run editor:dev

M01〜M10の動作実績は旧実装基準を含む現行の試験・受入記録を参照します。
""")

    for src in original_tree:
        if digest(src) != digest(DEST / src.relative_to(SOURCE)):
            raise SystemExit("Archived original changed after import: " + str(src))
    if old_checklist != digest(DEST / "IMPLEMENTATION_CHECKLIST.md"):
        raise SystemExit("Accepted M01-M10 checklist was modified")
    for p in CANONICAL.values():
        if not (ROOT / p).is_file():
            raise SystemExit("Missing canonical target: " + p)
    if len(CHUNKS) != 17 or len({c[0] for c in CHUNKS}) != 17:
        raise SystemExit("Invalid 17-chunk mapping")
    scope = json.loads((DEST / "product-planning" / "FINAL_PRODUCT_SCOPE.json").read_text(encoding="utf-8"))
    if scope["counts"]["total"] != 247:
        raise SystemExit("Archive scope is not 247")
    if scope["counts"]["statuses"] != {"included":234, "included_limited":2, "deferred":10, "excluded_suite":1}:
        raise SystemExit("Unexpected archive inclusion/defer count")
    print(json.dumps({
        "migration": "source files copied and checksummed",
        "archived_files": len(manifest),
        "source_head": revision,
        "accepted_checklist_unchanged": True,
        "canonical_targets_verified": len(CANONICAL),
        "chunk_count": len(CHUNKS),
    }, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()
