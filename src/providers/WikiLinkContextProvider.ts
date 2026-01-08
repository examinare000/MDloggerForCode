/**
 * @fileoverview Context provider for WikiLink cursor detection in VS Code.
 * Manages the 'mdlg.inWikiLink' context variable for conditional command activation
 * and UI element visibility based on cursor position within WikiLink syntax.
 *
 * @author MDloggerForCode Team
 * @version 1.0.0
 */

import * as vscode from 'vscode';

/**
 * Provides context awareness for WikiLink cursor positioning.
 * Monitors cursor position and sets VS Code context variables to enable
 * conditional command activation when the cursor is within WikiLink syntax.
 *
 * @class WikiLinkContextProvider
 */
export class WikiLinkContextProvider {
    private disposables: vscode.Disposable[] = [];
    
    /**
     * Creates a new WikiLinkContextProvider instance.
     * Sets up event listeners for cursor movement and editor changes.
     *
     * @param context - VS Code extension context for managing subscriptions
     */
    constructor(context: vscode.ExtensionContext) {
        // カーソル位置変更時の監視
        const selectionChangeListener = vscode.window.onDidChangeTextEditorSelection(
            this.onSelectionChange, this
        );
        
        // アクティブエディター変更時の監視
        const activeEditorChangeListener = vscode.window.onDidChangeActiveTextEditor(
            this.onActiveEditorChange, this
        );
        
        this.disposables.push(selectionChangeListener, activeEditorChangeListener);
        
        // 初期状態の設定
        this.updateContext();
        
        context.subscriptions.push(...this.disposables);
    }
    
    /**
     * Handles text editor selection change events.
     *
     * @param event - The selection change event from VS Code
     */
    private onSelectionChange(event: vscode.TextEditorSelectionChangeEvent): void {
        this.updateContext(event.textEditor);
    }
    
    /**
     * Handles active text editor change events.
     *
     * @param editor - The newly active text editor, or undefined if none
     */
    private onActiveEditorChange(editor: vscode.TextEditor | undefined): void {
        this.updateContext(editor);
    }
    
    /**
     * Updates the 'mdlg.inWikiLink' context variable based on cursor position.
     * Checks if the cursor is within WikiLink syntax and sets the context accordingly.
     *
     * @param editor - The text editor to check, defaults to active editor
     */
    private updateContext(editor?: vscode.TextEditor): void {
        editor = editor || vscode.window.activeTextEditor;

        if (!editor) {
            void vscode.commands.executeCommand('setContext', 'mdlg.inWikiLink', false);
            return;
        }

        if (editor.document.languageId !== 'markdown') {
            void vscode.commands.executeCommand('setContext', 'mdlg.inWikiLink', false);
            return;
        }

        const position = editor.selection.active;
        const inWikiLink = this.isPositionInWikiLink(editor.document, position);

        void vscode.commands.executeCommand('setContext', 'mdlg.inWikiLink', inWikiLink);
    }
    
    /**
     * Determines if the given position is within WikiLink syntax.
     * Scans the document for [[]] patterns and checks if the position falls within any.
     *
     * @param document - The text document to scan
     * @param position - The cursor position to check
     * @returns True if position is within WikiLink brackets, false otherwise
     */
    private isPositionInWikiLink(document: vscode.TextDocument, position: vscode.Position): boolean {
        const text = document.getText();
        const offset = document.offsetAt(position);

        // 全体のテキストでWikiLinkパターンを検索
        const wikiLinkRegex = /\[\[([^\]]+)\]\]/g;
        let match;

        while ((match = wikiLinkRegex.exec(text)) !== null) {
            const linkStart = match.index;
            const linkEnd = match.index + match[0].length;

            // カーソルがこのWikiLink内にあるかチェック
            // [[ の直後から ]] の直前まで（内側）にある場合のみtrue
            // linkEnd - 2 は最後の閉じ括弧 ]] の位置なので、その直前までを含める
            if (offset >= linkStart + 2 && offset <= linkEnd - 1) {
                return true;
            }
        }

        return false;
    }
    
    /**
     * Disposes of all event listeners and cleans up resources.
     * Called when the provider is no longer needed.
     */
    dispose(): void {
        this.disposables.forEach(disposable => disposable.dispose());
        this.disposables = [];
    }
}
