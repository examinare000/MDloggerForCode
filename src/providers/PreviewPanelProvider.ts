/**
 * @fileoverview Webview-based lightweight Markdown preview with WikiLink support.
 * Renders the active Markdown document using MarkdownIt and handles WikiLink clicks
 * to open or create notes.
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { MarkdownRenderer } from '../renderers/MarkdownRenderer';
import { ConfigurationManager } from '../managers/ConfigurationManager';
import { WikiLinkProcessor } from '../processors/WikiLinkProcessor';
import { PathUtil } from '../utils/PathUtil';
import { NoteFinder } from '../utils/NoteFinder';

type PreviewMessage =
    | { command: 'openWikiLink'; link: string }
    | { command: string; [key: string]: unknown };

function getNonce(): string {
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let nonce = '';
    for (let i = 0; i < 32; i++) {
        nonce += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return nonce;
}

export class PreviewPanelProvider implements vscode.Disposable {
    private panel: vscode.WebviewPanel | undefined;
    private readonly renderer = new MarkdownRenderer();
    private readonly configManager: ConfigurationManager;
    private readonly extensionUri: vscode.Uri;
    private readonly disposables: vscode.Disposable[] = [];
    private activeDocumentUri: vscode.Uri | undefined;

    constructor(context: vscode.ExtensionContext, configManager: ConfigurationManager) {
        this.extensionUri = context.extensionUri;
        this.configManager = configManager;
    }

    dispose(): void {
        for (const d of this.disposables.splice(0)) {
            try {
                d.dispose();
            } catch {
                // ignore
            }
        }

        if (this.panel) {
            try {
                this.panel.dispose();
            } catch {
                // ignore
            }
            this.panel = undefined;
        }
    }

    async show(params?: { document?: vscode.TextDocument; viewColumn?: vscode.ViewColumn }): Promise<void> {
        const document = params?.document ?? vscode.window.activeTextEditor?.document;
        if (!document || document.languageId !== 'markdown') {
            vscode.window.showInformationMessage('Open a Markdown file to use preview');
            return;
        }

        this.activeDocumentUri = document.uri;

        const viewColumn = params?.viewColumn ?? vscode.ViewColumn.Beside;
        if (!this.panel) {
            this.panel = vscode.window.createWebviewPanel(
                'mdlg.preview',
                'MDlogger Preview',
                viewColumn,
                {
                    enableScripts: true,
                    localResourceRoots: [this.extensionUri]
                }
            );

            this.panel.onDidDispose(() => {
                this.panel = undefined;
                this.activeDocumentUri = undefined;
            }, null, this.disposables);

            this.panel.webview.onDidReceiveMessage(
                (message: PreviewMessage) => this.onMessage(message),
                null,
                this.disposables
            );

            this.disposables.push(
                vscode.window.onDidChangeActiveTextEditor(() => this.refresh()),
                vscode.workspace.onDidChangeTextDocument((e) => {
                    if (!this.activeDocumentUri) {
                        return;
                    }
                    if (e.document.uri.toString() !== this.activeDocumentUri.toString()) {
                        return;
                    }
                    void this.refresh();
                })
            );
        } else {
            this.panel.reveal(viewColumn, true);
        }

        await this.refresh();
    }

    private async refresh(): Promise<void> {
        if (!this.panel) {
            return;
        }

        const document = this.getActiveMarkdownDocument();
        if (!document) {
            this.panel.webview.html = this.wrapHtml('<p>No markdown file active</p>');
            return;
        }

        this.activeDocumentUri = document.uri;
        const markdown = document.getText();
        const html = this.renderer.render(markdown);
        this.panel.webview.html = this.wrapHtml(html);
    }

    private getActiveMarkdownDocument(): vscode.TextDocument | undefined {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return undefined;
        }
        if (editor.document.languageId !== 'markdown') {
            return undefined;
        }
        return editor.document;
    }

    private wrapHtml(bodyHtml: string): string {
        const nonce = getNonce();
        const csp = [
            `default-src 'none'`,
            `img-src ${this.panel?.webview.cspSource ?? ''} https: data:`,
            `style-src 'unsafe-inline'`,
            `script-src 'nonce-${nonce}'`
        ].join('; ');

        return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="${csp}">
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>MDlogger Preview</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      padding: 16px;
    }
    pre, code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace; }
    .mdlg-wikilink { color: var(--vscode-textLink-foreground); text-decoration: none; cursor: pointer; }
    .mdlg-wikilink:hover { text-decoration: underline; }
  </style>
</head>
<body>
  ${bodyHtml}
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    document.addEventListener('click', (e) => {
      const el = e.target instanceof Element ? e.target.closest('[data-mdlg-wikilink]') : null;
      if (!el) return;
      e.preventDefault();
      const link = el.getAttribute('data-mdlg-wikilink');
      if (!link) return;
      vscode.postMessage({ command: 'openWikiLink', link });
    });
  </script>
</body>
</html>`;
    }

    private async onMessage(message: PreviewMessage): Promise<void> {
        if (message?.command !== 'openWikiLink') {
            return;
        }

        const link = (message as any).link;
        if (typeof link !== 'string' || !link.trim()) {
            return;
        }

        const sourceUri = this.activeDocumentUri ?? vscode.window.activeTextEditor?.document.uri;
        if (!sourceUri) {
            return;
        }

        await this.openOrCreateWikiLinkFromText(link, sourceUri);
    }

    private async openOrCreateWikiLinkFromText(linkText: string, sourceUri: vscode.Uri): Promise<void> {
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(sourceUri) ?? vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('No workspace folder found');
            return;
        }

        const slugStrategy = this.configManager.getSlugStrategy();
        const processor = new WikiLinkProcessor({ slugStrategy });
        const parsed = processor.parseWikiLink(linkText);

        const extension = this.configManager.getNoteExtension();
        const vaultRoot = this.configManager.getVaultRoot();
        const searchSubdirectories = this.configManager.getSearchSubdirectories();

        let fileName = processor.transformFileName(parsed.pageName);
        fileName = PathUtil.sanitizeFileName(fileName);

        if (searchSubdirectories) {
            const found = await NoteFinder.findNoteByTitle(fileName, workspaceFolder, vaultRoot, extension);
            if (found) {
                await vscode.window.showTextDocument(found.uri);
                return;
            }
        }

        const uri = PathUtil.createSafeUri(vaultRoot, fileName, extension, workspaceFolder);

        try {
            await vscode.workspace.fs.stat(uri);
            await vscode.window.showTextDocument(uri);
            return;
        } catch {
            // fall through to create
        }

        try {
            const dirUri = vscode.Uri.file(path.dirname(uri.fsPath));
            await vscode.workspace.fs.createDirectory(dirUri);

            const template = this.configManager.getTemplate();
            const data = new TextEncoder().encode(template);
            await vscode.workspace.fs.writeFile(uri, data);
            await vscode.window.showTextDocument(uri);
        } catch (createError) {
            vscode.window.showErrorMessage(
                `Failed to create file: ${createError instanceof Error ? createError.message : String(createError)}`
            );
        }
    }
}

