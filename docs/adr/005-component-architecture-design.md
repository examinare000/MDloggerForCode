# ADR-005: Component Architecture Design

## Status
Accepted

## Date
2025-09-09

## Context
MDloggerForCode Extensionの機能は多岐にわたり（WikiLink処理、設定管理、日時フォーマット、DailyNote/QuickCapture、VS Code統合）、適切な責務分離とモジュール設計が品質と保守性に直結する。また、TDDアプローチを効果的に適用するため、テスタブルな設計が必須。

## Decision
レイヤード・アーキテクチャを採用し、以下のコンポーネント構成で実装する：

## アーキテクチャ概要
```
┌────────────────────────────────────────────────────────────┐
│                VS Code Integration Layer                    │
│ DocLink │ Completion │ ListContinuation │ Context │ Webview │
│            Command Registration & Activation                │
├────────────────────────────────────────────────────────────┤
│                   Core Business Logic                       │
│ WikiLinkProcessor │ ConfigurationManager │ DateTimeFormatter│
│ DailyNoteManager │ NoteFinder │ TaskService                 │
├────────────────────────────────────────────────────────────┤
│           Utility / Infrastructure Layer                    │
│ PathUtil │ NoteParser │ TaskCollector │ IFileWriter(VS)     │
│             Pure Functions & Interfaces                     │
└────────────────────────────────────────────────────────────┘
```

## コンポーネント定義

### 1. Core Layer（VS Code非依存）
- **WikiLinkProcessor**: WikiLink解析・変換ロジック（ファイル名生成・スラッグ変換含む）
- **ConfigurationManager**: 設定値管理・検証（DailyNote/QuickCapture設定を含む）
- **DateTimeFormatter**: 日時フォーマット処理（カスタムトークン対応）
- **DailyNoteManager**: デイリーノートの作成・テンプレート適用・セクション追記を司る
- **NoteFinder**: ファイル検索・優先順位解決（サブディレクトリ考慮）
- **TaskService**: I/O抽象化されたタスク収集・完了処理（Quick Capture向け）

### 2. Integration Layer（VS Code依存）
- **WikiLinkDocumentLinkProvider**: Markdown中のWikiLinkをクリック可能リンクにする
- **WikiLinkCompletionProvider**: WikiLink入力補完（`[`/`/`トリガー）を提供
- **ListContinuationProvider**: Enter押下時のリスト/チェックボックス継続を提供
- **WikiLinkContextProvider**: キーバインド判定用コンテキストを管理
- **QuickCaptureSidebarProvider**: WebviewベースのクイックキャプチャUI（DailyNote/TaskServiceと協働）
- **CommandHandler**: WikiLink/日時/プレビュー/デイリーノート系コマンドを集約

### 3. Utility / Infrastructure Layer
- **PathUtil**: パス正規化・組み立て（Windows/Unix両対応）
- **NoteParser**: セクション挿入などノート編集の純粋関数群
- **TaskCollector**: Markdownタスク抽出・完了フラグ付与ロジック
- **IFileWriter / VscodeFileWriter**: 読み書き/ディレクトリ作成/存在確認を行うI/O抽象化

### 4. Design Principles
1. **Layered Dependency Rule**: Integration → Core → Utilityの一方向依存のみを許可
2. **Dependency Inversion**: IntegrationはIFileWriterなどの抽象を介してCoreを利用
3. **Single Responsibility**: コマンド登録/検索/日時/タスク/UIを役割ごとに分離
4. **Testability**: ファクトリ関数とDIでVS Codeモックを注入し、Core/Utilityを純粋関数として保持
5. **Interface Segregation**: Webview通信・I/O・設定アクセスを細分化し、必要最小限の契約に限定

## Consequences

### Positive
- **責務明確化**: 各コンポーネントの役割が明確
- **テスト容易性**: レイヤー別の独立テストが可能
- **再利用性**: Core Layerは他のエディタでも利用可能
- **保守性**: 機能追加・修正の影響範囲が限定的
- **並行開発**: コンポーネント間の独立性により並行開発可能

### Negative
- **複雑性**: 設計上のオーバーヘッドが発生
- **学習コスト**: アーキテクチャの理解が必要
- **初期コスト**: インターフェース設計に時間が必要

### Neutral
- **拡張性**: 新機能追加時の設計パターンが確立
- **品質保証**: アーキテクチャレベルでの品質担保

## Implementation Guidelines
1. Core Layerは`vscode`モジュールをimportせず、外部I/Oは`IFileWriter`などの抽象経由に限定する
2. Integration LayerはVS Code API呼び出しをファクトリ/コールバックとしてDIし、Core/Utilityへはインターフェース越しに依存する
3. QuickCaptureなどWebview連携はメッセージ契約を明示し、UIロジックをProviderに閉じ込める
4. パス解決・ノート挿入は`PathUtil`/`NoteParser`を再利用し、重複実装を避ける
5. 各レイヤーでユニットテストを用意し、VS Code依存部はモックと契約テストでカバーする
