# Architecture Decision Records (ADR)

このディレクトリには、MDloggerForCode VS Code extensionの開発において下された重要な技術的決定を記録したADR（Architecture Decision Record）が含まれています。

## ADR一覧

| ID | タイトル | ステータス | 日付 | 概要 |
|----|----------|------------|------|------|
| [001](./001-test-driven-development-approach.md) | Test-Driven Development Approach | Accepted | 2025-09-09 | t-wadaのTDD手法の採用とRed-Green-Refactorサイクルの実践 |
| [002](./002-vs-code-api-abstraction-layer.md) | VS Code API Abstraction Layer | Accepted | 2025-09-09 | VS Code APIの抽象化による単体テスト可能性の確保 |
| [003](./003-wikilink-parsing-strategy.md) | WikiLink Parsing Strategy | Accepted | 2025-09-09 | ObsidianのWikiLink形式の段階的解析アプローチ |
| [004](./004-datetime-token-replacement-algorithm.md) | DateTime Token Replacement Algorithm | Accepted | 2025-09-09 | トークン衝突を回避する文字配列ベース置換アルゴリズム |
| [005](./005-component-architecture-design.md) | Component Architecture Design | Accepted | 2025-09-09 | レイヤードアーキテクチャによる責務分離設計 |
| [006](./006-configuration-management-strategy.md) | Configuration Management Strategy | Accepted | 2025-09-09 | 型安全な設定管理とValidation Layerの実装 |
| [007](./007-wikilink-command-debugging-resolution.md) | WikiLink Command Debugging Resolution | Accepted | 2025-09-18 | Cmd+Enterキーバインドとルートディレクトリエラーの解決 |
| [008](./008-dailynote-feature-design.md) | DailyNote Feature Design | Accepted | 2025-09-18 | 日次ノート自動作成機能の設計とTDD実装 |
| [009](./009-configurable-dailynote-features.md) | Configurable DailyNote Features | Accepted | 2025-09-18 | DailyNote機能の設定可能化と条件付き機能登録 |
| [010](./010-settings-ui-improvement.md) | Settings UI Improvement | Accepted | 2025-09-18 | キーバインド設定UIの表示専用化による混乱解消 |
| [011](./011-windows-file-path-handling.md) | Windows File Path Handling | Accepted | 2025-09-22 | Windowsファイルシステム対応とパスサニタイズ |
| [012](./012-extension-activation-fix.md) | Extension Activation Fix | Accepted | 2025-09-22 | activationEvents設定の整合性確保 |
| [013](./013-nodejs-path-isabsolute-adoption.md) | Node.js path.isAbsolute Adoption | Accepted | 2025-09-22 | クロスプラットフォーム対応の絶対パス判定 |
| [014](./014-enhanced-note-features-quality-improvements.md) | Enhanced Note Features Quality Improvements | Accepted | 2025-09-22 | WikiLink補完・リスト継続機能の品質向上 |
| [015](./ADR-015-test-quality-improvements.md) | Test Quality Improvements | Accepted | 2025-10-01 | テスト成功率95.6%達成とグローバルモック統合 |
| [016](./016-wikilink-interaction-refinement.md) | WikiLink Interaction Refinement | Accepted | 2025-10-04 | WikiLink境界判定・リンク解決・補完の操作性改善 |
| [017](./017-wikilink-completion-directory-filtering.md) | WikiLink Completion Directory Filtering | Accepted | 2025-10-08 | WikiLink補完でディレクトリパス絞り込み機能を実装 |
| [018](./018-quick-capture-sidebar.md) | Quick Capture Sidebar | Accepted | 2025-10-30 | DailyNote 連携のクイックキャプチャ Webview とタスク完了機能 |
| [019](./019-dailynote-io-abstraction-and-scope.md) | DailyNote I/O 抽象化とスコープ制御 | Accepted | 2025-12-15 | IFileWriter DI と Vault ルート解決、DailyNote 配下限定タスク走査 |

## ADR作成ガイドライン

新しいADRを作成する際は、以下のテンプレートを使用してください：

```markdown
# ADR-XXX: [Decision Title]

## Status
[Proposed | Accepted | Deprecated | Superseded]

## Date
YYYY-MM-DD

## Context
[決定が必要になった背景と問題]

## Decision
[採用した解決策]

## Consequences
### Positive
- [正の影響]

### Negative
- [負の影響]

### Neutral
- [中立的な影響]
```

## 参考リンク
- [Architecture Decision Records の書き方](https://github.com/joelparkerhenderson/architecture-decision-record)
- [TDD については t-wada のガイドライン](https://github.com/testdouble/contributing-tests/wiki/Test-Driven-Development)
