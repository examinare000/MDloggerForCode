# MDloggerForCode API仕様書

## 1. 概要

本文書は、MDloggerForCode VS Code拡張機能の内部API仕様を定義します。

## 2. インターフェース定義

### 2.1 WikiLink関連インターフェース

#### 2.1.1 ParsedWikiLink
```typescript
interface ParsedWikiLink {
  /** ページ名（リンク先） */
  pageName: string;
  /** 表示名（別名指定時） */
  displayName?: string;
  /** 見出し名（見出しリンク時） */
  heading?: string;
  /** 別名リンクかどうか */
  isAlias: boolean;
}
```

#### 2.1.2 WikiLinkInfo
```typescript
interface WikiLinkInfo {
  /** パースされたリンク情報 */
  parsed: ParsedWikiLink;
  /** リンク先ファイルURI */
  targetUri: vscode.Uri;
  /** ファイル存在フラグ */
  exists: boolean;
  /** エディタ内の範囲 */
  range: vscode.Range;
}
```

### 2.2 設定関連インターフェース

#### 2.2.1 ObsdConfiguration
```typescript
interface ObsdConfiguration {
  /** Vaultルートパス */
  vaultRoot: string;
  /** ノートファイル拡張子 */
  noteExtension: string;
  /** ファイル名変換戦略 */
  slugStrategy: 'passthrough' | 'kebab-case' | 'snake_case';
  /** 日付フォーマット */
  dateFormat: string;
  /** 時刻フォーマット */
  timeFormat: string;
  /** 新規ノートテンプレート */
  template: string;
  /** DailyNote機能の有効/無効 */
  dailyNoteEnabled: boolean;
  /** DailyNote格納先ディレクトリ */
  dailyNotePath: string;
  /** DailyNoteファイル名フォーマット */
  dailyNoteFormat: string;
  /** DailyNoteテンプレートパス */
  dailyNoteTemplate: string;
  /** Quick Captureの追記先見出し */
  captureSectionName: string;
  /** リスト継続入力の有効/無効 */
  listContinuationEnabled: boolean;
  /** WikiLink解決時のサブディレクトリ探索可否 */
  searchSubdirectories: boolean;
}
```

### 2.3 プレビュー関連インターフェース

#### 2.3.1 MarkdownRenderOptions
```typescript
interface MarkdownRenderOptions {
  /** ベースURI（相対リンク解決用） */
  baseUri: vscode.Uri;
  /** WikiLinkの処理を有効にするか */
  enableWikiLinks: boolean;
  /** 追加CSSクラス */
  additionalClasses?: Record<string, string>;
}
```

#### 2.3.2 PreviewMessage
```typescript
interface PreviewMessage {
  /** メッセージタイプ */
  command: 'openWikiLink' | 'jumpToLine' | 'reload';
  /** WikiLinkテキスト */
  link?: string;
  /** ジャンプ先行番号 */
  line?: number;
}
```

## 3. クラス仕様

### 3.1 WikiLinkProcessor

#### 3.1.1 メソッド一覧
```typescript
class WikiLinkProcessor {
  /**
   * WikiLink文字列を解析してStructured Dataに変換
   * @param linkText WikiLink内のテキスト（[[]]を除く）
   * @returns パースされたWikiLink情報
   */
  parseWikiLink(linkText: string): ParsedWikiLink;
  
  /**
   * WikiLinkをファイルURIに解決
   * @param linkText WikiLinkテキスト
   * @param currentDocumentUri 現在のドキュメントURI
   * @returns 解決されたファイルURI
   */
  resolveWikiLink(linkText: string, currentDocumentUri: vscode.Uri): Promise<vscode.Uri>;
  
  /**
   * ファイル存在チェック
   * @param uri チェック対象URI
   * @returns ファイルが存在するかどうか
   */
  fileExists(uri: vscode.Uri): Promise<boolean>;
  
  /**
   * 新規ファイルを作成
   * @param uri 作成するファイルのURI
   * @param template ファイルテンプレート（省略時は設定値を使用）
   */
  createNewFile(uri: vscode.Uri, template?: string): Promise<void>;
  
  /**
   * ドキュメント内のすべてのWikiLinkを検出
   * @param document 対象ドキュメント
   * @returns WikiLink情報の配列
   */
  findWikiLinks(document: vscode.TextDocument): Promise<WikiLinkInfo[]>;
}
```

#### 3.1.2 エラーハンドリング
```typescript
enum WikiLinkErrorCode {
  INVALID_LINK_FORMAT = 'INVALID_LINK_FORMAT',
  FILE_CREATION_FAILED = 'FILE_CREATION_FAILED',
  VAULT_ROOT_NOT_FOUND = 'VAULT_ROOT_NOT_FOUND',
  PERMISSION_DENIED = 'PERMISSION_DENIED'
}

class WikiLinkError extends Error {
  constructor(
    public code: WikiLinkErrorCode,
    message: string,
    public linkText?: string
  ) {
    super(message);
  }
}
```

### 3.2 ConfigurationManager

#### 3.2.1 メソッド一覧
```typescript
class ConfigurationManager {
  /**
   * Vaultルートディレクトリを取得
   * @param fallbackUri フォールバック用URI
   * @returns VaultルートのURI
   * @throws Error Vault rootが決定できない場合
   */
  getVaultRoot(fallbackUri?: vscode.Uri): vscode.Uri;
  
  /**
   * ノートファイル拡張子を取得
   * @returns ファイル拡張子（. を含む）
   */
  getNoteExtension(): string;
  
  /**
   * ファイル名変換戦略を取得
   * @returns slug変換戦略
   */
  getSlugStrategy(): 'passthrough' | 'kebab-case' | 'snake_case';
  
  /**
   * 日付フォーマットを取得
   * @returns 日付フォーマット文字列
   */
  getDateFormat(): string;
  
  /**
   * 時刻フォーマットを取得
   * @returns 時刻フォーマット文字列
   */
  getTimeFormat(): string;
  
  /**
   * 新規ノートテンプレートを取得
   * @returns テンプレート文字列
   */
  getTemplate(): string;
  
  /**
   * 全設定を取得
   * @returns 設定オブジェクト
   */
  getConfiguration(): ObsdConfiguration;
  
  /**
   * 設定変更監視リスナーを登録
   * @param callback 設定変更時のコールバック
   * @returns Disposable
   */
  onConfigurationChanged(callback: (config: ObsdConfiguration) => void): vscode.Disposable;
  
  /**
   * 設定値のバリデーション
   * @param config 検証対象設定
   * @returns 検証結果
   */
  validateConfiguration(config: Partial<ObsdConfiguration>): ValidationResult;
}
```

#### 3.2.2 バリデーション結果
```typescript
interface ValidationResult {
  /** バリデーション成功フラグ */
  isValid: boolean;
  /** エラーメッセージ配列 */
  errors: ValidationError[];
  /** 警告メッセージ配列 */
  warnings: ValidationWarning[];
}

interface ValidationError {
  /** エラーが発生した設定項目 */
  field: keyof ObsdConfiguration;
  /** エラーメッセージ */
  message: string;
  /** エラーコード */
  code: string;
}

interface ValidationWarning {
  /** 警告が発生した設定項目 */
  field: keyof ObsdConfiguration;
  /** 警告メッセージ */
  message: string;
  /** 推奨値（存在する場合） */
  recommendedValue?: string;
}
```

### 3.3 MarkdownRenderer

#### 3.3.1 メソッド一覧
```typescript
class MarkdownRenderer {
  /**
   * Markdownテキストを HTML に変換
   * @param markdown 変換対象のMarkdownテキスト
   * @param documentUri ベースとなるドキュメントURI
   * @param options レンダリングオプション
   * @returns 変換されたHTML
   */
  renderMarkdown(
    markdown: string,
    documentUri: vscode.Uri,
    options?: MarkdownRenderOptions
  ): Promise<string>;
  
  /**
   * WikiLinkのみを処理してHTML化
   * @param markdown Markdownテキスト
   * @param documentUri ベースURI
   * @returns WikiLinkがHTMLに変換されたテキスト
   */
  processWikiLinksOnly(markdown: string, documentUri: vscode.Uri): Promise<string>;
  
  /**
   * レンダリング設定を更新
   * @param config 新しい設定
   */
  updateConfiguration(config: MarkdownRenderOptions): void;
  
  /**
   * カスタムプラグインを追加
   * @param plugin markdown-itプラグイン
   * @param options プラグインオプション
   */
  addPlugin(plugin: any, options?: any): void;
}
```

### 3.4 DateTimeFormatter

#### 3.4.1 メソッド一覧
```typescript
class DateTimeFormatter {
  /**
   * 日付を指定フォーマットで文字列化
   * @param date 対象日付
   * @param format フォーマット文字列
   * @returns フォーマットされた日付文字列
   */
  formatDate(date: Date, format: string): string;
  
  /**
   * 時刻を指定フォーマットで文字列化
   * @param date 対象時刻
   * @param format フォーマット文字列
   * @returns フォーマットされた時刻文字列
   */
  formatTime(date: Date, format: string): string;
  
  /**
   * カスタムフォーマッタを追加
   * @param token フォーマットトークン
   * @param formatter フォーマット関数
   */
  addCustomFormatter(token: string, formatter: (date: Date) => string): void;
  
  /**
   * フォーマット文字列の妥当性を検証
   * @param format 検証対象フォーマット
   * @returns 妥当性とエラーメッセージ
   */
  validateFormat(format: string): { isValid: boolean; error?: string };
}
```

#### 3.4.2 対応フォーマットトークン
```typescript
/**
 * 日付フォーマットトークン
 */
enum DateFormatToken {
  /** 4桁年 */
  YYYY = 'YYYY',
  /** 2桁年 */
  YY = 'YY',
  /** 2桁月（ゼロパディング） */
  MM = 'MM',
  /** 1桁月 */
  M = 'M',
  /** 2桁日（ゼロパディング） */
  DD = 'DD',
  /** 1桁日 */
  D = 'D'
}

/**
 * 時刻フォーマットトークン
 */
enum TimeFormatToken {
  /** 24時間制時（ゼロパディング） */
  HH = 'HH',
  /** 24時間制時 */
  H = 'H',
  /** 12時間制時（ゼロパディング） */
  hh = 'hh',
  /** 12時間制時 */
  h = 'h',
  /** 分（ゼロパディング） */
  mm = 'mm',
  /** 分 */
  m = 'm',
  /** 秒（ゼロパディング） */
  ss = 'ss',
  /** 秒 */
  s = 's',
  /** AM/PM */
  A = 'A',
  /** am/pm */
  a = 'a'
}
```

### 3.5 NoteFinder

#### 3.5.1 メソッド一覧
```typescript
class NoteFinder {
  /**
   * タイトルによる完全一致でノートを検索
   * すべてのサブディレクトリを対象に検索し、見つかった場合は最も浅い階層のファイルを優先
   *
   * @param title - 検索するノートのタイトル（拡張子なし）
   * @param workspaceFolder - 検索対象のワークスペースフォルダ
   * @param vaultRoot - オプションのVaultルートパス
   * @param extension - ファイル拡張子（デフォルト: '.md'）
   * @returns ノート情報またはnull
   */
  static async findNoteByTitle(
    title: string,
    workspaceFolder: vscode.WorkspaceFolder,
    vaultRoot?: string,
    extension?: string
  ): Promise<{ title: string; uri: vscode.Uri; relativePath: string } | null>;

  /**
   * プレフィックスによるノート検索（オートコンプリート用）
   * ディレクトリパスをサポートし、スラッシュ記法で特定ディレクトリ内を絞り込み可能
   *
   * **ディレクトリパス絞り込み機能（v0.4.8以降）:**
   * - `folder/file` - 特定ディレクトリ内のファイルを絞り込み
   * - `folder/` - ディレクトリ内の全ファイルをリスト
   * - `folder/subfolder/file` - ネストされたディレクトリをサポート
   * - `file` - 全ディレクトリを検索（従来の動作、後方互換性）
   *
   * **サブディレクトリ名前方一致検索（v0.4.8以降）:**
   * ディレクトリパスが指定されていない場合、ディレクトリ名がプレフィックスにマッチするファイルも含める
   * - `proj` で検索 → `Project.md`（ファイル名マッチ）+ `projects/Plan.md`（ディレクトリ名マッチ）
   * - マッチタイプ優先順位: 完全一致 > ファイル名プレフィックス > ディレクトリ名プレフィックス
   *
   * @param prefix - ファイル名のプレフィックス（オプションでディレクトリパスを含む）
   * @param workspaceFolder - 検索対象のワークスペースフォルダ
   * @param vaultRoot - オプションのVaultルートパス
   * @param extension - ファイル拡張子（デフォルト: '.md'）
   * @param maxResults - 最大結果数（デフォルト: 50）
   * @returns マッチしたノート情報の配列（関連性順にソート）
   */
  static async findNotesByPrefix(
    prefix: string,
    workspaceFolder: vscode.WorkspaceFolder,
    vaultRoot?: string,
    extension?: string,
    maxResults?: number
  ): Promise<{ title: string; uri: vscode.Uri; relativePath: string }[]>;

  /**
   * Vault内のすべてのノートを取得
   * インデックス作成や全体検索に使用
   *
   * @param workspaceFolder - 検索対象のワークスペースフォルダ
   * @param vaultRoot - オプションのVaultルートパス
   * @param extension - ファイル拡張子（デフォルト: '.md'）
   * @returns すべてのノート情報の配列
   */
  static async getAllNotes(
    workspaceFolder: vscode.WorkspaceFolder,
    vaultRoot?: string,
    extension?: string
  ): Promise<{ title: string; uri: vscode.Uri; relativePath: string }[]>;
}
```

#### 3.5.2 ディレクトリパス絞り込みの動作

**パス解析ロジック:**
```typescript
// プレフィックスを解析してディレクトリパスとファイル名に分離
const lastSlashIndex = prefix.lastIndexOf('/');
const directoryPath = lastSlashIndex >= 0 ? prefix.substring(0, lastSlashIndex) : '';
const filePrefix = lastSlashIndex >= 0 ? prefix.substring(lastSlashIndex + 1) : prefix;
```

**検索動作:**
- **ディレクトリパスあり:** 指定ディレクトリ内のみを検索
- **ディレクトリパスなし:** 全ディレクトリを検索 + ディレクトリ名マッチング

**サブディレクトリ名前方一致:**
ディレクトリパスが指定されていない場合、パス内のディレクトリ名もプレフィックスマッチングの対象となる：
- ファイル名がマッチ → そのファイルを候補に追加
- ディレクトリ名がマッチ → そのディレクトリ内のファイルを候補に追加
- 両方マッチする場合も重複なく追加

**ソート順:**
1. マッチタイプ（exact > filePrefix > dirPrefix）
2. パスの深さ（浅い階層を優先）
3. アルファベット順

**使用例:**
```typescript
// 例1: プロジェクトディレクトリ内の "Task" で始まるファイルを検索
const results = await NoteFinder.findNotesByPrefix(
  'projects/Task',
  workspaceFolder,
  'notes'
);
// → projects/Task1.md, projects/Task List.md

// 例2: archiveディレクトリ内のすべてのファイルをリスト
const allArchived = await NoteFinder.findNotesByPrefix(
  'archive/',
  workspaceFolder,
  'notes'
);

// 例3: 従来通りの全体検索
const allMatches = await NoteFinder.findNotesByPrefix(
  'Meeting',
  workspaceFolder,
  'notes'
);
// → Meeting.md, 2024/Meeting.md, projects/Meeting Notes.md

// 例4: サブディレクトリ名前方一致検索
const dirMatches = await NoteFinder.findNotesByPrefix(
  'proj',
  workspaceFolder,
  'notes'
);
// → Project.md (ファイル名マッチ)
//    projects/Plan.md (ディレクトリ名 "projects" がマッチ)
//    projects/Notes.md (ディレクトリ名 "projects" がマッチ)
```

#### 3.5.3 補完トリガー設定

WikiLink補完機能でディレクトリパス絞り込みを活用するため、補完トリガー文字に `/` を含める：

```typescript
vscode.languages.registerCompletionItemProvider(
  { scheme: 'file', language: 'markdown' },
  completionProvider,
  '[',  // WikiLink開始時にトリガー
  '/'   // ディレクトリパス入力時にトリガー
);
```

## 4. コマンド仕様

### 4.1 登録コマンド一覧

#### 4.1.1 mdlg.openOrCreateWikiLink
```typescript
interface OpenOrCreateWikiLinkParams {
  /** 強制的に新規作成するか */
  forceCreate?: boolean;
  /** 開く位置（現在のタブ/新しいタブ/サイド） */
  openBeside?: boolean;
}
```

**実行条件**: 
- エディタがアクティブ
- `mdlg.inWikiLink` コンテキストが true

**動作**:
1. カーソル位置のWikiLinkを検出
2. リンク先ファイル存在確認
3. 存在する場合: ファイルを開く
4. 存在しない場合: 新規作成後に開く

#### 4.1.2 mdlg.insertDate
```typescript
interface InsertDateParams {
  /** 使用するフォーマット（省略時は設定値） */
  format?: string;
  /** 挿入位置（省略時は現在のカーソル位置） */
  position?: vscode.Position;
}
```

**実行条件**: エディタがアクティブ

**動作**: 指定位置に現在日付を挿入

#### 4.1.3 mdlg.insertTime
```typescript
interface InsertTimeParams {
  /** 使用するフォーマット（省略時は設定値） */
  format?: string;
  /** 挿入位置（省略時は現在のカーソル位置） */
  position?: vscode.Position;
}
```

**実行条件**: エディタがアクティブ

**動作**: 指定位置に現在時刻を挿入

#### 4.1.4 mdlg.preview
```typescript
interface PreviewParams {
  /** プレビューを表示するドキュメント（省略時は現在のドキュメント） */
  document?: vscode.TextDocument;
  /** プレビューの表示位置 */
  viewColumn?: vscode.ViewColumn;
}
```

**実行条件**: Markdownファイルがアクティブ

**動作**: Markdownプレビューを表示

#### 4.1.5 mdlg.openDailyNote
```typescript
interface OpenDailyNoteParams {
  /** 強制的に再生成するか（既存の場合でも上書きしないが再読込に使う） */
  force?: boolean;
}
```

**実行条件**: ワークスペースが開かれていること

**動作**: `mdlg.dailyNotePath` / `mdlg.dailyNoteFormat` / `mdlg.dailyNoteTemplate` に従って日次ノートを生成し開く。無効化設定時は登録されない。

#### 4.1.6 mdlg.openQuickCapture
```typescript
interface OpenQuickCaptureParams {
  /** ビューを強制的にフォーカスするか */
  focus?: boolean;
}
```

**実行条件**: `mdlg.dailyNoteEnabled` が true のときのみ登録

**動作**: Explorer の Quick Capture ビューを開き、Webview とメッセージングを開始する。

#### 4.1.7 mdlg.handleEnterKey
```typescript
interface HandleEnterKeyParams {
  /** 明示的にリスト継続を有効化するフラグ（設定より優先） */
  force?: boolean;
}
```

**実行条件**: Markdownエディタがアクティブ。`mdlg.listContinuationEnabled` が true のときに Enter キーで呼ばれる when 句を設定。

**動作**: 箇条書き/番号/チェックボックス行で Enter を継続する。空リスト行では行を削除し通常改行にフォールバックする。

## 5. イベント仕様

### 5.1 カスタムイベント

#### 5.1.1 WikiLinkEvents
```typescript
interface WikiLinkCreatedEvent {
  /** 作成されたファイルのURI */
  fileUri: vscode.Uri;
  /** 元のWikiLinkテキスト */
  linkText: string;
  /** 作成日時 */
  timestamp: Date;
}

interface WikiLinkNavigatedEvent {
  /** 移動元のURI */
  fromUri: vscode.Uri;
  /** 移動先のURI */
  toUri: vscode.Uri;
  /** WikiLinkテキスト */
  linkText: string;
  /** ナビゲーション日時 */
  timestamp: Date;
}
```

### 5.2 イベントエミッター
```typescript
class WikiLinkEventEmitter {
  /** WikiLink作成時のイベント */
  onWikiLinkCreated: vscode.Event<WikiLinkCreatedEvent>;
  
  /** WikiLinkナビゲーション時のイベント */
  onWikiLinkNavigated: vscode.Event<WikiLinkNavigatedEvent>;
  
  /** プレビュー更新時のイベント */
  onPreviewUpdated: vscode.Event<{ document: vscode.TextDocument; html: string }>;
}
```

### 5.3 Quick Capture Webview メッセージ
```typescript
type QuickCaptureInMessage =
  | { command: 'capture:add'; content: string }
  | { command: 'request:tasks' }
  | { command: 'task:complete'; payload: { uri: string; line: number } };

type QuickCaptureOutMessage =
  | { command: 'capture:ok'; uri: string; line: number; timestamp: string }
  | { command: 'tasks:update'; tasks: { uri: string; file: string; line: number; text: string }[] }
  | { command: 'error'; message: string };
```

## 6. エラーコード定義

### 6.1 エラーコード一覧
```typescript
enum ObsdErrorCode {
  // WikiLink関連
  WIKILINK_INVALID_FORMAT = 'WIKILINK_INVALID_FORMAT',
  WIKILINK_FILE_NOT_FOUND = 'WIKILINK_FILE_NOT_FOUND',
  WIKILINK_CREATION_FAILED = 'WIKILINK_CREATION_FAILED',
  
  // 設定関連
  CONFIG_VAULT_ROOT_INVALID = 'CONFIG_VAULT_ROOT_INVALID',
  CONFIG_FORMAT_INVALID = 'CONFIG_FORMAT_INVALID',
  CONFIG_PERMISSION_DENIED = 'CONFIG_PERMISSION_DENIED',
  
  // プレビュー関連
  PREVIEW_RENDER_FAILED = 'PREVIEW_RENDER_FAILED',
  PREVIEW_WEBVIEW_ERROR = 'PREVIEW_WEBVIEW_ERROR',
  
  // ファイルシステム関連
  FS_READ_ERROR = 'FS_READ_ERROR',
  FS_WRITE_ERROR = 'FS_WRITE_ERROR',
  FS_PERMISSION_ERROR = 'FS_PERMISSION_ERROR'
}
```

### 6.2 エラーレスポンス形式
```typescript
interface ObsdError {
  /** エラーコード */
  code: ObsdErrorCode;
  /** エラーメッセージ */
  message: string;
  /** エラー詳細情報 */
  details?: Record<string, any>;
  /** エラー発生時刻 */
  timestamp: Date;
  /** エラー発生箇所 */
  source: string;
}
```

## 7. パフォーマンス指標

### 7.1 応答時間要件
- WikiLink検索: < 50ms
- ファイル作成: < 200ms
- プレビュー更新: < 100ms
- 設定読み込み: < 10ms

### 7.2 メモリ使用量
- 基本メモリ使用量: < 10MB
- 大きなファイル処理時: < 50MB
- プレビューHTML保持: < 5MB

### 7.3 監視対象メトリクス
```typescript
interface PerformanceMetrics {
  /** WikiLink処理時間 */
  wikiLinkProcessingTime: number;
  /** プレビューレンダリング時間 */
  previewRenderTime: number;
  /** ファイル操作時間 */
  fileOperationTime: number;
  /** メモリ使用量 */
  memoryUsage: number;
  /** アクティブセッション数 */
  activeSessions: number;
}
```

---

**文書バージョン**: 1.1  
**最終更新**: 2025-11-19  
**承認者**: [承認者名]
