# Windows PC｜Illustro実機検査の開始条件（2026-11-23）

## 使う環境
**ユーザーのWindows PC上のChatGPTデスクトップアプリで「Work locally」を選ぶ。** Work on web/mobileやクラウドブラウザーを選ぶと、別のPCからの検査になり目的を満たさない。

OpenAI公式資料：
- https://help.openai.com/en/articles/20001275-chatgpt-work-and-codex
- https://help.openai.com/en/articles/20001277-using-the-built-in-browser-in-the-chatgpt-desktop-app
- https://developers.openai.com/training/walkthroughs/using-your-computer-and-browser

## 初回にだけ行う準備（PC側）

1. WindowsのChatGPTデスクトップアプリを起動し、**ChatGPT → Work → Work locally** を選ぶ（表示や利用可否はアカウント・ワークスペースの設定に依存）。
2. 必要な場合はプラグイン「Browser」（アプリ内ブラウザー）、または「Chrome」（普段のChrome）を接続する。Windowsデスクトップ上の他アプリ操作が必要な場合のみ「Computer Use」を許可する。利用できない権限を迂回しない。
3. Work画面のツールバーからアプリ内ブラウザーを開く。Windowsショートカットは **Ctrl+Shift+B**。R2 URL `https://totoro0419.github.io/illustro/r2-preview/` を表示し、ブラウザー操作許可を承認する。
4. **Work自身の操作で**画面上のボタンをクリック → 名前欄へ短い文字を入力 → キャンバスをマウスドラッグして短い線を描く。3つが実際に通ったら「PC操作接続成功」と記録する。読み取り専用でボタン操作できない場合は成功としない。
5. [検査用ファイル](QA-FIXTURES.md)のZIPをPC上で開ける場所に置き、必要なものだけ参照する（他の個人ファイルには触れない）。
6. 準備が済んだら[WORK-START-PROMPT.md](WORK-START-PROMPT.md)で本番開始。P00からP12までの102操作を実施する。

## 失敗した場合
- アプリ内ブラウザーが使えない場合は、許可されたChromeブラウザー連携を**一度だけ**試してよい。操作がPC内で行われることを確認する。
- PC内のブラウザーをWorkが操作できなければ「PC接続不可」と報告して検査を始めない。**クラウドブラウザーに切り替えて234件を実施したことにしない。**
- 画面に保護・権限・組織設定の制限がある場合、正規の設定／許可だけ使用。解除や迂回を試みない。
- 元作品、ユーザーの個人ファイル、ほかのサイトやアカウントを変更しない。検査作品だけで操作する。
- マウスだけで試した場合、ペン筆圧・指の多点操作・タッチ誤接触等は「未検査（機器なし）」として扱う。

## 5時間枠の進行
現行の13段階は253分の作業目標。残り47分の配分目安は接続8分、素材5分、遅延14分、終了処理20分。**実測による保証ではない**。遅延しても最後の20分はCSV・問題記録・進捗をGitHubへ保存し再取得して検査漏れを確認する。
