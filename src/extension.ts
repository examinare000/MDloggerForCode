/**
 * @fileoverview Main extension entry point for MDloggerForCode VS Code extension.
 * Provides WikiLink functionality, daily notes, and date/time insertion commands for Markdown files.
 * Manages extension lifecycle, command registration, and provider initialization.
 *
 * @author MDloggerForCode Team
 * @version 1.0.0
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { WikiLinkProcessor } from './processors/WikiLinkProcessor';
import { DateTimeFormatter } from './utils/DateTimeFormatter';
import { ConfigurationManager } from './managers/ConfigurationManager';
import { WikiLinkContextProvider } from './providers/WikiLinkContextProvider';
import { WikiLinkCompletionProvider } from './providers/WikiLinkCompletionProvider';
import { ListContinuationProvider } from './providers/ListContinuationProvider';
import { DailyNoteManager } from './managers/DailyNoteManager';
import { PathUtil } from './utils/PathUtil';
import { NoteFinder } from './utils/NoteFinder';
import { QuickCaptureSidebarProvider } from './providers/QuickCaptureSidebarProvider';

/**
 * Activates the MDloggerForCode extension.
 * Initializes all managers, providers, and registers commands and event listeners.
 *
 * @param context - The VS Code extension context for managing subscriptions and resources
 * @throws {Error} When critical components fail to initialize
 */
export function activate(context: vscode.ExtensionContext) {
    const errors: string[] = [];

    // Configuration Manager初期化
    let configManager: ConfigurationManager;
    try {
        configManager = new ConfigurationManager(vscode.workspace.getConfiguration('mdlg'));
    } catch (error) {
        vscode.window.showErrorMessage('Failed to initialize ConfigurationManager');
        return;
    }

    // DateTimeFormatter初期化
    let dateTimeFormatter: DateTimeFormatter;
    try {
        dateTimeFormatter = new DateTimeFormatter();
    } catch (error) {
        vscode.window.showErrorMessage('Failed to initialize DateTimeFormatter');
        return;
    }

    // WikiLink Context Provider初期化
    let contextProvider: WikiLinkContextProvider;
    try {
        contextProvider = new WikiLinkContextProvider(context);
    } catch (error) {
        vscode.window.showErrorMessage('Failed to initialize WikiLinkContextProvider');
        return;
    }

    // DailyNote Manager初期化（設定により条件付き）
    let dailyNoteManager: DailyNoteManager | undefined;
    if (configManager.getDailyNoteEnabled()) {
        try {
            dailyNoteManager = new DailyNoteManager(configManager, dateTimeFormatter);
        } catch (error) {
            vscode.window.showErrorMessage('Failed to initialize DailyNoteManager');
            return;
        }
    }

    // WikiLink DocumentLinkProvider登録
    let linkProviderDisposable: vscode.Disposable;
    try {
        const wikiLinkProvider = new WikiLinkDocumentLinkProvider(configManager);
        linkProviderDisposable = vscode.languages.registerDocumentLinkProvider(
            { scheme: 'file', language: 'markdown' },
            wikiLinkProvider
        );
    } catch (error) {
        vscode.window.showErrorMessage('Failed to register WikiLinkDocumentLinkProvider');
        return;
    }

    // WikiLink CompletionProvider登録
    let completionProviderDisposable: vscode.Disposable;
    let wikiLinkCompletionProvider: WikiLinkCompletionProvider;
    try {
        wikiLinkCompletionProvider = new WikiLinkCompletionProvider(configManager);
        completionProviderDisposable = vscode.languages.registerCompletionItemProvider(
            { scheme: 'file', language: 'markdown' },
            wikiLinkCompletionProvider,
            '[', // Trigger character for opening bracket
            '/'  // Trigger character for directory path separator
        );
    } catch (error) {
        vscode.window.showErrorMessage('Failed to register WikiLinkCompletionProvider');
        return;
    }

    // List ContinuationProvider登録
    let listContinuationDisposable: vscode.Disposable | undefined;
    try {
        const listContinuationProvider = new ListContinuationProvider(configManager);
        listContinuationDisposable = listContinuationProvider.register(context);
    } catch (error) {
        errors.push(`Failed to register ListContinuationProvider: ${error}`);
    }

    // Commands登録（個別エラーハンドリング）
    const commands: vscode.Disposable[] = [];

    // openOrCreateWikiLink コマンド
    try {
        const openCommand = vscode.commands.registerCommand('mdlg.openOrCreateWikiLink', () => {
            return openOrCreateWikiLink(configManager);
        });
        commands.push(openCommand);
    } catch (error) {
        errors.push(`Failed to register openOrCreateWikiLink: ${error}`);
    }

    // insertDate コマンド
    try {
        const dateCommand = vscode.commands.registerCommand('mdlg.insertDate', () => {
            return insertDate(configManager, dateTimeFormatter);
        });
        commands.push(dateCommand);
    } catch (error) {
        errors.push(`Failed to register insertDate: ${error}`);
    }

    // insertTime コマンド
    try {
        const timeCommand = vscode.commands.registerCommand('mdlg.insertTime', () => {
            return insertTime(configManager, dateTimeFormatter);
        });
        commands.push(timeCommand);
    } catch (error) {
        errors.push(`Failed to register insertTime: ${error}`);
    }

    // preview コマンド
    try {
        const previewCommand = vscode.commands.registerCommand('mdlg.preview', () => {
            return showPreview();
        });
        commands.push(previewCommand);
    } catch (error) {
        errors.push(`Failed to register preview: ${error}`);
    }

    // Quick Capture sidebar provider registration (requires DailyNoteManager)
    if (dailyNoteManager) {
        try {
            const quickCaptureProvider = new QuickCaptureSidebarProvider(context, configManager, dailyNoteManager);
            const providerDisposable = vscode.window.registerWebviewViewProvider(QuickCaptureSidebarProvider.viewId, quickCaptureProvider);
            context.subscriptions.push(providerDisposable);
        } catch (error) {
            errors.push(`Failed to register QuickCaptureSidebarProvider: ${error}`);
        }
    }

    // openQuickCapture コマンド (reveal and focus the Quick Capture view, requires DailyNoteManager)
    if (dailyNoteManager) {
        try {
            const openQuickCaptureCommand = vscode.commands.registerCommand('mdlg.openQuickCapture', async () => {
                try {
                    // First, ensure Explorer is visible (where Quick Capture is located)
                    await vscode.commands.executeCommand('workbench.view.explorer');
                    // Then focus the Quick Capture view using the auto-generated .focus command
                    await vscode.commands.executeCommand('mdlg.quickCapture.focus');
                } catch (error) {
                    vscode.window.showErrorMessage(`Failed to open Quick Capture view: ${error}`);
                }
            });
            commands.push(openQuickCaptureCommand);
        } catch (error) {
            errors.push(`Failed to register openQuickCapture: ${error}`);
        }
    }

    // DailyNoteコマンドは設定により条件付きで登録
    if (dailyNoteManager) {
        try {
            const dailyNoteCommand = vscode.commands.registerCommand('mdlg.openDailyNote', async () => {
                const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
                if (!workspaceFolder) {
                    vscode.window.showErrorMessage('No workspace folder found. Please open a folder first.');
                    return;
                }

                try {
                    await dailyNoteManager!.openOrCreateDailyNote(workspaceFolder);
                } catch (error) {
                    vscode.window.showErrorMessage('Failed to open daily note');
                }
            });
            commands.push(dailyNoteCommand);
        } catch (error) {
            errors.push(`Failed to register openDailyNote: ${error}`);
        }
    }

    // エラー報告（但し拡張機能は継続）
    if (errors.length > 0) {
        console.warn('[MDloggerForCode] Some commands failed to register:', errors);
        vscode.window.showWarningMessage(
            `MDloggerForCode: ${errors.length} command(s) failed to register. Check output panel for details.`
        );
    }

    // Context subscriptions
    try {
        const subscriptions = [
            linkProviderDisposable,
            completionProviderDisposable,
            wikiLinkCompletionProvider, // Add the provider instance for proper cleanup
            ...commands
        ];

        if (listContinuationDisposable) {
            subscriptions.push(listContinuationDisposable);
        }

        context.subscriptions.push(...subscriptions);
    } catch (error) {
        vscode.window.showErrorMessage('Failed to add subscriptions');
        return;
    }

    // 設定変更の監視
    try {
        const configChangeListener = vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('mdlg')) {
                configManager.triggerConfigurationChanged();
            }
        });

        context.subscriptions.push(configChangeListener);
    } catch (error) {
        vscode.window.showErrorMessage('Failed to set up configuration change listener');
        return;
    }
}

/**
 * VS Code integrated WikiLink Document Link Provider.
 * Provides clickable links for WikiLink references in Markdown files.
 * Converts WikiLink syntax [[Page Name]] into navigable VS Code document links.
 *
 * @class WikiLinkDocumentLinkProvider
 * @implements {vscode.DocumentLinkProvider}
 */
class WikiLinkDocumentLinkProvider implements vscode.DocumentLinkProvider {
    private wikiLinkProcessor: WikiLinkProcessor;
    private configManager: ConfigurationManager;
    
    /**
     * Creates a new WikiLinkDocumentLinkProvider instance.
     *
     * @param configManager - Configuration manager for accessing extension settings
     */
    constructor(configManager: ConfigurationManager) {
        this.configManager = configManager;
        const slugStrategy = this.configManager.getSlugStrategy();
        this.wikiLinkProcessor = new WikiLinkProcessor({ slugStrategy });
    }
    
    /**
     * Provides document links for WikiLink references in the given document.
     * Scans the document for [[Page Name]] patterns and converts them to clickable links.
     *
     * @param document - The VS Code text document to scan for WikiLinks
     * @returns Array of document links found in the document
     * @throws {Error} When link processing fails
     */
    async provideDocumentLinks(document: vscode.TextDocument): Promise<vscode.DocumentLink[]> {
        if (document.languageId !== 'markdown') {
            return [];
        }

        const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri) || vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            return [];
        }

        const links: vscode.DocumentLink[] = [];
        const text = document.getText();
        const wikiLinkRegex = /\[\[([^\]]+)\]\]/g;
        const extension = this.configManager.getNoteExtension();
        const vaultRoot = this.configManager.getVaultRoot();
        const searchSubdirectories = this.configManager.getSearchSubdirectories();
        
        let match;
        while ((match = wikiLinkRegex.exec(text)) !== null) {
            try {
                const linkText = match[1];
                const parsedLink = this.wikiLinkProcessor.parseWikiLink(linkText);
                
                const startPos = document.positionAt(match.index);
                const endPos = document.positionAt(match.index + match[0].length);
                const range = new vscode.Range(startPos, endPos);
                
                let fileName = this.wikiLinkProcessor.transformFileName(parsedLink.pageName);
                fileName = PathUtil.sanitizeFileName(fileName);
                
                let uri: vscode.Uri | undefined;

                if (searchSubdirectories) {
                    try {
                        const foundFile = await NoteFinder.findNoteByTitle(
                            fileName,
                            workspaceFolder,
                            vaultRoot,
                            extension
                        );

                        if (foundFile) {
                            uri = foundFile.uri;
                        }
                    } catch (error) {
                        console.warn('Failed to resolve WikiLink target:', error);
                    }
                }

                if (!uri) {
                    uri = PathUtil.createSafeUri(
                        vaultRoot,
                        fileName,
                        extension,
                        workspaceFolder
                    );
                }
                
                const documentLink = new vscode.DocumentLink(range, uri);
                links.push(documentLink);
            } catch (error) {
                continue;
            }
        }
        
        return links;
    }
}

/**
 * Opens or creates a WikiLink file based on the cursor position.
 * Extracts WikiLink text at the current cursor position and either opens the existing file
 * or creates a new file using the configured template.
 *
 * @param configManager - Configuration manager for accessing extension settings
 * @throws {Error} When file creation or opening fails
 */
async function openOrCreateWikiLink(configManager: ConfigurationManager): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        return;
    }

    const position = editor.selection.active;
    const linkText = getWikiLinkAtPosition(editor.document, position);

    if (!linkText) {
        vscode.window.showInformationMessage('No WikiLink found at cursor position');
        return;
    }

    try {
        const wikiLinkProcessor = new WikiLinkProcessor({
            slugStrategy: configManager.getSlugStrategy()
        });
        const parsedLink = wikiLinkProcessor.parseWikiLink(linkText);
        let fileName = wikiLinkProcessor.transformFileName(parsedLink.pageName);

        // ファイルシステム安全な名前に正規化
        fileName = PathUtil.sanitizeFileName(fileName);

        const extension = configManager.getNoteExtension();
        const vaultRoot = configManager.getVaultRoot();

        // ワークスペースフォルダーの確認
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('No workspace folder found. Please open a folder first.');
            return;
        }

        // Check if subdirectory search is enabled
        const searchSubdirectories = configManager.getSearchSubdirectories();

        if (searchSubdirectories) {
            // Try to find the note in subdirectories
            const foundFile = await NoteFinder.findNoteByTitle(
                fileName,
                workspaceFolder,
                vaultRoot,
                extension
            );

            if (foundFile) {
                // If found, open the existing file
                await vscode.window.showTextDocument(foundFile.uri);
                return;
            }
        }

        // If not found, create a new file in the default location
        // PathUtilを使用した安全なURI作成
        const uri = PathUtil.createSafeUri(
            vaultRoot,
            fileName,
            extension,
            workspaceFolder
        );

        // ファイル存在チェックと作成処理
        try {
            await vscode.workspace.fs.stat(uri);
            await vscode.window.showTextDocument(uri);
        } catch {
            // ファイルが存在しない場合は新規作成
            try {
                // ディレクトリ作成の改善
                const dirUri = vscode.Uri.file(path.dirname(uri.fsPath));
                await vscode.workspace.fs.createDirectory(dirUri);

                const template = configManager.getTemplate();
                const data = new TextEncoder().encode(template);
                await vscode.workspace.fs.writeFile(uri, data);
                await vscode.window.showTextDocument(uri);
            } catch (createError) {
                vscode.window.showErrorMessage(
                    `Failed to create file: ${createError instanceof Error ? createError.message : String(createError)}`
                );
            }
        }
    } catch (error) {
        vscode.window.showErrorMessage(
            `WikiLink operation failed: ${error instanceof Error ? error.message : String(error)}`
        );
    }
}

/**
 * Inserts the current date at the cursor position using the configured format.
 *
 * @param configManager - Configuration manager for accessing date format settings
 * @param dateTimeFormatter - Formatter for converting dates to strings
 * @throws {Error} When text insertion fails
 */
async function insertDate(configManager: ConfigurationManager, dateTimeFormatter: DateTimeFormatter): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        return;
    }
    
    const dateFormat = configManager.getDateFormat();
    const formattedDate = dateTimeFormatter.formatDate(new Date(), dateFormat);
    
    const position = editor.selection.active;
    const edit = new vscode.WorkspaceEdit();
    edit.insert(editor.document.uri, position, formattedDate);
    await vscode.workspace.applyEdit(edit);
}

/**
 * Inserts the current time at the cursor position using the configured format.
 *
 * @param configManager - Configuration manager for accessing time format settings
 * @param dateTimeFormatter - Formatter for converting times to strings
 * @throws {Error} When text insertion fails
 */
async function insertTime(configManager: ConfigurationManager, dateTimeFormatter: DateTimeFormatter): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        return;
    }
    
    const timeFormat = configManager.getTimeFormat();
    const formattedTime = dateTimeFormatter.formatTime(new Date(), timeFormat);
    
    const position = editor.selection.active;
    const edit = new vscode.WorkspaceEdit();
    edit.insert(editor.document.uri, position, formattedTime);
    await vscode.workspace.applyEdit(edit);
}

/**
 * Shows a preview of the current Markdown document.
 * Currently displays a placeholder message. Future implementation will provide
 * enhanced preview functionality.
 *
 * @throws {Error} When preview cannot be displayed
 */
async function showPreview(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.languageId !== 'markdown') {
        vscode.window.showInformationMessage('Open a Markdown file to use preview');
        return;
    }
    
    vscode.window.showInformationMessage('Preview feature coming soon!');
}

/**
 * Extracts WikiLink text at the specified position in the document.
 * Searches for [[]] patterns around the cursor position and returns the link text.
 *
 * @param document - The VS Code text document to search
 * @param position - The cursor position to search around
 * @returns The WikiLink text without brackets, or empty string if none found
 */
function getWikiLinkAtPosition(document: vscode.TextDocument, position: vscode.Position): string {
    const text = document.getText();
    const offset = document.offsetAt(position);
    
    const lastOpenBracket = text.lastIndexOf('[[', offset);
    if (lastOpenBracket === -1) {
        return '';
    }

    const closingIndex = text.indexOf(']]', lastOpenBracket);
    if (closingIndex === -1) {
        return '';
    }

    const linkStartContent = lastOpenBracket + 2;
    const linkEndInclusive = closingIndex + 1;

    if (offset < linkStartContent || offset > linkEndInclusive) {
        return '';
    }

    const wikiLinkFull = text.substring(lastOpenBracket, closingIndex + 2);
    
    const match = wikiLinkFull.match(/^\[\[([^\]]+)\]\]$/);
    if (!match) {
        return '';
    }
    
    return match[1];
}

/**
 * Deactivates the extension.
 * Called when the extension is being deactivated. Currently performs no cleanup
 * as all resources are managed through VS Code's subscription system.
 */
export function deactivate() {}
