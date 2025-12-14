# プロダクト構想

MDloggerForCode は VS Code 上で Obsidian 風のノート体験（WikiLink・DailyNote・クイックキャプチャ等）を実現する拡張機能。インストールバリアを避けつつ、Vault の読み書きとリンク体験を提供する。

## 概要
Visual Studio Code でインストール可能な Obsidian Vault 操作用拡張機能。

## 目的
Obsidian が使えない環境でも「Obsidian の基本体験の一部」を VS Code 上で再現する。

## MVP スコープ（現行 v0.4.11）
- Markdown 軽量プレビュー（太字、チェックリスト、リンク、WikiLink）
- WikiLink 認識・ナビゲーション・未存在ノート自動作成
- WikiLink 補完（ディレクトリ指定/プレフィックス検索、サブディレクトリ探索）
- 日付/時刻挿入（ショートカット対応）
- DailyNote の作成/オープン（テンプレート・パス/フォーマット設定対応）
- クイックキャプチャ（DailyNote 配下への1行追記、タスク収集/完了）
- リスト/チェックボックスの継続入力（Enter キー）

## 後回し（非MVP）
- グラフビュー、Obsidian プラグイン互換、モバイル同期、VS Code Web 版対応

## 対応プラットフォーム
VS Code Desktop（Win/Mac/Linux）。Remote/WSL/Dev Containers は workspace.fs ベースで対応。Web 版は非対応（将来検討）。

## 主要機能と拡張ポイント
- DocumentLinkProvider：`[[...]]` をリンク化（クリック/ショートカットで開く・作る）
- CompletionProvider：WikiLink 補完（`[[` と `/` トリガー）
- コマンド群：
  - `mdlg.openOrCreateWikiLink`（WikiLink へ移動/作成、サブディレクトリ優先）
  - `mdlg.insertDate` / `mdlg.insertTime`
  - `mdlg.preview`（軽量プレビュー）
  - `mdlg.openDailyNote`（日次ノート生成・オープン）
  - `mdlg.openQuickCapture` / Quick Capture サイドバー
  - `mdlg.handleEnterKey`（リスト継続）
- コンテキスト：Ctrl/Cmd+Enter は `mdlg.inWikiLink` が true のときのみ有効
- ファイル I/O：`workspace.fs` で Vault に依存しない読み書き
- Markdown パース：markdown-it + `@ig3/markdown-it-wikilinks`

## 主な設定
- `mdlg.vaultRoot`（Vault ルート。既定はワークスペース）
- `mdlg.noteExtension`（例: `.md`）
- `mdlg.slugStrategy`（`passthrough`/`kebab-case`/`snake_case`）
- `mdlg.dateFormat` / `mdlg.timeFormat`
- `mdlg.template`（新規ノートテンプレート）
- `mdlg.dailyNoteEnabled` / `mdlg.dailyNotePath` / `mdlg.dailyNoteFormat` / `mdlg.dailyNoteTemplate`
- `mdlg.captureSectionName`（Quick Capture の追記先見出し）
- `mdlg.listContinuationEnabled`
- `mdlg.searchSubdirectories`（WikiLink 開くときのサブディレクトリ探索可否）

## UX の要点
- `[[Page|表示名]]` や `[[Page#Heading]]` を解釈し、未存在なら無確認で即作成→開く
- プレビューは軽量表示＋WikiLink クリックでエディタ位置へジャンプ
- Quick Capture は DailyNote 有効時のみ登録し、1 行追記とタスク完了を即反映

## 受け入れ基準（DoD 概要）
- WikiLink 作成/移動/補完：`[[New Note]]` で Ctrl/Cmd+Enter → `<vaultRoot>/New Note.md` 作成・オープン。既存リンクはクリック/ショートカットでジャンプ。`|`/`#` 付きも解決。補完は `[[` と `/` で発火し、サブディレクトリを探索。
- 日付/時刻：Alt+D / Alt+T で設定フォーマット通り挿入。
- DailyNote：`mdlg.openDailyNote` でテンプレート・フォーマット通りのファイルを生成/オープン。
- Quick Capture：サイドバーから 1 行投稿が DailyNote の指定セクションに追記され、未完了タスク一覧/完了更新が反映される。
- リスト継続：Markdown 行で Enter → 箇条書き/番号/チェックボックスを継続。空項目では行を削除。
- Remote/WSL：workspace.fs 経由で同一コードが動作。
