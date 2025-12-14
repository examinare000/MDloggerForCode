# ADR-006: Configuration Management Strategy

## Status
Accepted

## Date
2025-09-09

## Context
VS Code extensionの設定管理において、型安全性の確保、デフォルト値の処理、設定値の検証、変更通知の仕組みが必要。また、テスト環境では実際のVS Code設定APIを使用できないため、モック可能な設計が必須。

## Decision
設定管理の中央集約とValidation Layer付きConfigurationManagerを実装する：

## 設計方針

### 1. 中央集約型設定管理
```typescript
export class ConfigurationManager {
    private config: WorkspaceConfiguration;
    
    getVaultRoot(): string;
    getNoteExtension(): string;
    getSlugStrategy(): SlugStrategy;
    getDateFormat(): string;
    getTimeFormat(): string;
    getTemplate(): string;
}
```

### 2. 型安全な設定アクセス
```typescript
export type SlugStrategy = 'passthrough' | 'kebab-case' | 'snake_case';
export interface MdlgConfiguration {
    readonly vaultRoot: string;
    readonly noteExtension: string;
    readonly slugStrategy: SlugStrategy;
    readonly dateFormat: string;
    readonly timeFormat: string;
    readonly template: string;
}
```

### 3. 設定値検証システム
```typescript
export interface ValidationResult {
    readonly isValid: boolean;
    readonly errors: ValidationError[];
    readonly warnings: ValidationWarning[];
}
```

### 4. 変更通知機能
```typescript
onConfigurationChanged(callback: (config: MdlgConfiguration) => void): Disposable
```

## 実装戦略

### 設定名前空間
- すべての設定は`mdlg.*`名前空間を使用
- 例: `mdlg.vaultRoot`, `mdlg.dateFormat`

### デフォルト値
- 各設定項目に適切なデフォルト値を設定
- 未設定時も正常に動作することを保証

### 検証ルール
- **SlugStrategy**: 定義済み値のみ許可
- **DateFormat**: 有効なトークンパターンのみ許可
- **VaultRoot**: 空の場合は警告（ワークスペースルートを使用）

## Consequences

### Positive
- **型安全性**: TypeScriptによる設定値の型チェック
- **一元管理**: 設定関連ロジックの集約により保守性向上
- **検証機能**: 不正な設定値の早期検出
- **テスタブル**: モック注入による完全なテスト可能性
- **拡張性**: 新しい設定項目の追加が容易

### Negative
- **初期複雑性**: シンプルな設定アクセスに比べ実装が複雑
- **パフォーマンス**: 検証処理による若干のオーバーヘッド

### Neutral
- **VS Code標準**: VS Code Configuration APIの標準的な使用方法
- **設定画面**: VS Code標準の設定UIが自動的に生成される

## Alternative Considered
1. **直接設定アクセス**: `vscode.workspace.getConfiguration()`の直接使用
   - 問題: 型安全性の欠如、テスト困難
2. **設定ファイル**: 独自設定ファイルの使用
   - 問題: VS Code標準から逸脱、ユーザビリティ低下

