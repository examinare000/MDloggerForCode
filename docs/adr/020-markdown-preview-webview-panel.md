# ADR-020: MarkdownプレビューをWebviewPanelで実装する

## Status
Accepted

## Date
2025-12-17

## Context
`mdlg.preview` は仕様上「Markdownプレビューを表示」するコマンドとして定義されていたが、実装は「coming soon」メッセージ表示のみで未実装だった。
また、プレビュー内で `[[WikiLink]]` をクリックしてノートを開く/作成する導線が必要だった。

設計書には `WebviewViewProvider` ベースの `PreviewProvider` 案が記載されていたが、現行実装のコマンド起点（`mdlg.preview`）と、簡易に「Beside」で表示する要件に対しては `WebviewPanel` がより適している。

## Decision
- `mdlg.preview` は `WebviewPanel` を用いたプレビューとして実装する。
- プレビューHTML生成は `MarkdownRenderer` に集約し、`markdown-it` を利用してMarkdown→HTMLを生成する。
- `[[WikiLink]]` は `MarkdownRenderer` のインラインルールで `<a class="mdlg-wikilink" data-mdlg-wikilink="...">` に変換し、Webview側でクリックを捕捉して拡張機能へ `openWikiLink` メッセージを送る。
- 受信した `openWikiLink` は既存のWikiLink解決/作成ロジックと同等のルール（`slugStrategy`/`vaultRoot`/`noteExtension`/`searchSubdirectories`）で処理する。

## Consequences
### Positive
- `mdlg.preview` が実際にMarkdownをプレビューでき、`[[WikiLink]]` からノートへ遷移できる。
- `WebviewPanel` のため「常に別カラムで表示」等の動作が実現しやすい。
- `MarkdownRenderer` を分離したことで、レンダリング仕様をユニットテストで担保しやすい。

### Negative
- 既存の設計書にあった `WebviewViewProvider` 案と実装が異なるため、設計書の更新が必要。
- `markdown-it` の型定義を導入していないため、実装側は `require()` を使用する。

### Neutral
- 将来 `WebviewViewProvider` へ移行する場合でも、`MarkdownRenderer` とメッセージ契約を維持すれば差し替え可能。

