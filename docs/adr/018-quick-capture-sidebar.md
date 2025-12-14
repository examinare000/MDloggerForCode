# ADR 018: Quick Capture Sidebar の追加

作成日: 2025-10-30
更新日: 2025-12-14

ステータス: Accepted

## コンテキスト
VS Code 上で Obsidian ライクなワークフローを補完するため、Explorer にクイックキャプチャ UI を設けて DailyNote への即時追記とタスク一覧/完了を提供する。

## 決定
- QuickCaptureSidebarProvider を Explorer の Webview view として実装し、DailyNote 機能が有効なときだけ登録する。`mdlg.openQuickCapture` は `workbench.view.explorer` → `mdlg.quickCapture.focus` を呼び出してビューを前面に出す。
- 設定は `mdlg` セクションに集約し、以下を利用する: `mdlg.vaultRoot` / `mdlg.dailyNotePath` / `mdlg.dailyNoteFormat` / `mdlg.dailyNoteTemplate` / `mdlg.captureSectionName` / `mdlg.noteExtension` / `mdlg.timeFormat`。`mdlg.dailyNoteEnabled` が false の場合は Quick Capture を登録しない。
- キャプチャは `DailyNoteManager.appendToSection` で `- [ ] {time} — {content}` を指定セクションに追記する。該当セクションが無い場合は `## {captureSectionName}` を新設する。
- タスク抽出と完了は `TaskService`(IFileWriter 経由) + `TaskCollector`/`NoteParser` で実施し、完了時は `- [x] ... [completion: YYYY-MM-DD]` タグを付与する。

## 根拠
- Webview を選択し、テキスト入力とタスク一覧/完了ボタンを単一ビューにまとめることで最小 UI 変更で実装できる。
- DailyNote と設定管理を既存の `DailyNoteManager` / `ConfigurationManager` に集約し、WikiLink 系のロジックから分離することで影響範囲を限定する。

## 実装状況 (2025-12-14)
- 完了: QuickCaptureSidebarProvider 実装、package.json の view/command 追加、Quick Capture 用設定追加 (`mdlg.*`)、TaskService/TaskCollector/NoteParser によるタスク一覧・完了処理、DailyNoteManager.appendToSection API 実装。
- 調整済み: DailyNoteManager 依存を必須化、Webview メッセージのエラールートを整備（`error` コマンド）。
- **新機能 (2025-12-14)**:
  - タスク表示範囲を dailyNote 配下のみに限定（`getDailyNoteDirectory` API 利用）
  - Ctrl+Enter (Cmd+Enter on Mac) でのクイックキャプチャ送信機能
- 残課題: `DailyNoteManager.appendToSection` の単体テストは describe.skip のまま。CRLF→LF 正規化や multi-root 非対応の扱い、Webview のみへのエラー通知は今後の改善余地。

## テスト
- 実施: QuickCaptureSidebarProvider / TaskService / TaskCollector / NoteParser のユニットテスト追加。
- 未実施: appendToSection のユニットテスト、Quick Capture UI からの結合/E2E（タスク完了が DailyNote に反映されること）。

## 影響
- DailyNote を無効化すると Quick Capture は登録されない（コマンド/ビュー不在）。
- DailyNote 配下の `.md` を最大 200 件まで走査するため、大規模 Vault では未抽出タスクが残る可能性がある。

## フォローアップ
1. appendToSection のテスト容易化（IFileSystem 抽象化か NoteParser.insertIntoSection の再利用）。
2. Webview でのみ通知しているエラーの VS Code 通知化。
3. multi-root 環境や DailyNote 配下以外のタスクを扱うかの判断。

## 更新履歴
- **2025-12-14**: タスク表示範囲をdailyNote配下に限定、Ctrl+Enter送信機能追加
- **2025-11-19**: DailyNoteManager依存の必須化、テスト追加
- **2025-10-30**: ADR作成
