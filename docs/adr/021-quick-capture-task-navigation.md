# ADR-021: Quick Captureの未完了タスクからソースファイルへジャンプする

## Status
Accepted

## Date
2025-12-17

## Context
Quick Capture の Open tasks は、未完了タスクを文言でグルーピングして表示し、一括完了できる。
しかし、タスクの出所（どのノートのどの行か）へ素早く戻る導線がなく、タスク修正/追記の作業が非効率だった。

タスクデータは既に `items: { uri, file, line }[]` を保持しているため、Webview UI から「該当ファイルを開き、行へジャンプ」する操作を追加できる。

## Decision
- Quick Capture Webview に `task:open` メッセージを追加し、対象タスクの `items`（複数可）を送信する。
- `items` が複数ある場合は `showQuickPick` でユーザーに開く場所を選択させる。
- 選択された `uri` を `showTextDocument` で開き、`Range(Position(line,0))` を `selection` として渡して行へジャンプする。
- UIとしては、タスク文言クリックと「Open」ボタンの両方を提供する。

## Consequences
### Positive
- 未完了タスクの一覧から、即座に元ノートへ戻って編集できる。
- 複数ファイルに同一文言がある場合でも、選択して正しい場所を開ける。

### Negative
- Webview メッセージ契約が増えるため、API仕様書/設計書の更新が必要。

### Neutral
- Multi-root workspace では現状どおり 1 つ目の workspace に寄せた挙動のまま（既存制約を踏襲）。

