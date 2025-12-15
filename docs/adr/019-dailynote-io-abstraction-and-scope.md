# ADR-019: DailyNote I/O 抽象化とスコープ制御

## Status
Accepted

## Date
2025-12-15

## Context
- DailyNoteManager が直接 VS Code FS API を呼び出しており、appendToSection などのユニットテストが describe.skip のままになっていた。
- Vault root を絶対パス/リモート環境で指定するケースでパス組み立ての曖昧さがあり、Quick Capture からのタスク走査範囲も Vault 全体に広がっていた。
- TaskService/QuickCaptureSidebarProvider でも DailyNote 配下だけを対象にしたいが、DailyNoteManager にディレクトリ解決の API がなかった。

## Decision
- ファイル I/O を `IFileWriter` 経由に統一し、`exists`/`createDirectory` を追加。DailyNoteManager と TaskService は DI 可能にし、デフォルトは `VscodeFileWriter`。
- `resolveVaultUri` ヘルパーを導入し、絶対/相対の Vault root を問わず `getDailyNotePath` / `getDailyNoteDirectory` / テンプレート参照で同一ロジックを使用。Windows パスとリモートスキームも正規化。
- DailyNoteManager.appendToSection は `NoteParser.insertIntoSection` を利用し、ファイル I/O と純粋文字列操作を分離。CRLF/LF を保持したままタイムスタンプ付き行を挿入する。
- QuickCaptureSidebarProvider からタスク取得/完了時に `getDailyNoteDirectory` を介して DailyNote 配下 (`**/*.md` 最大 200 件) のみにスコープし、不要なファイル走査を避ける。

## Consequences
### Positive
- appendToSection を含む DailyNoteManager のユニットテストを全件有効化でき、モック差し替えで I/O 依存を排除。
- Vault root を絶対パスやリモート環境で指定しても一貫した URI 解決が行われ、テンプレート読み込みやタスク走査の信頼性が向上。
- Quick Capture のタスク一覧が DailyNote 配下に限定され、意図しないフォルダのチェックボックスを誤操作するリスクを低減。

### Negative
- IFileWriter 抽象化と resolveVaultUri によりコードパスが増え、初期学習コストが上がる。
- DailyNote 配下のみを走査するため、他ディレクトリのタスクは Quick Capture では扱えない。

### Neutral
- DI 可能な構造のため、必要に応じて別実装の IFileWriter へ差し替え可能。既定動作はこれまでと同一で、後方互換性を維持。
