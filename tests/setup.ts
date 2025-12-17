import { expect } from 'chai';

// Chaiのセットアップ
(global as any).expect = expect;

// VS Code APIのモック
const vscode = {
    workspace: {
        getConfiguration: (section?: string) => {
            const sharedConfig = {
                vaultRoot: '/test/vault',
                noteExtension: '.md',
                slugStrategy: 'passthrough',
                dateFormat: 'YYYY-MM-DD',
                timeFormat: 'HH:mm',
                template: '# {{title}}\n\n',
                dailyNoteTemplate: '',
                dailyNotePath: 'dailynotes',
                dailyNoteEnabled: true,
                listContinuationEnabled: true,
                searchSubdirectories: true
            };

            const configData: Record<string, any> = {
                mdlg: sharedConfig
            };

            // If a section is specified, scope to that section
            let scopedData = configData;
            if (section) {
                scopedData = configData[section] || {};
            }

            return {
                get: (key: string, defaultValue?: any) => {
                    const keys = key.split('.');
                    let value = scopedData;
                    for (const k of keys) {
                        if (value && typeof value === 'object' && k in value) {
                            value = value[k];
                        } else {
                            return defaultValue;
                        }
                    }
                    return value !== undefined ? value : defaultValue;
                },
                has: (key: string) => {
                    const keys = key.split('.');
                    let value = scopedData;
                    for (const k of keys) {
                        if (value && typeof value === 'object' && k in value) {
                            value = value[k];
                        } else {
                            return false;
                        }
                    }
                    return true;
                },
                update: () => Promise.resolve()
            };
        },
        workspaceFolders: [{
            uri: { fsPath: '/test/workspace' },
            name: 'test-workspace',
            index: 0,
            createFileSystemWatcher: () => ({
                onDidCreate: () => ({ dispose: () => {} }),
                onDidDelete: () => ({ dispose: () => {} }),
                onDidChange: () => ({ dispose: () => {} }),
                dispose: () => {}
            })
        }],
        fs: {
            stat: async () => ({ type: 1 }),
            readFile: async () => new Uint8Array(),
            writeFile: async () => {},
            createDirectory: async () => {},
            delete: async () => {}
        },
        findFiles: async () => [],
        getWorkspaceFolder: () => ({
            uri: { fsPath: '/test/workspace' },
            name: 'test-workspace',
            index: 0,
            createFileSystemWatcher: () => ({
                onDidCreate: () => ({ dispose: () => {} }),
                onDidDelete: () => ({ dispose: () => {} }),
                onDidChange: () => ({ dispose: () => {} }),
                dispose: () => {}
            })
        }),
        applyEdit: async () => true,
        createFileSystemWatcher: () => ({
            onDidCreate: () => ({ dispose: () => {} }),
            onDidDelete: () => ({ dispose: () => {} }),
            onDidChange: () => ({ dispose: () => {} }),
            dispose: () => {}
        })
    },
    window: {
        showTextDocument: async () => ({}),
        showErrorMessage: () => {},
        showInformationMessage: () => {},
        showQuickPick: async (items: any[]) => (Array.isArray(items) ? items[0] : undefined),
        onDidChangeTextEditorSelection: () => ({ dispose: () => {} }),
        onDidChangeActiveTextEditor: () => ({ dispose: () => {} })
    },
    commands: {
        executeCommand: () => Promise.resolve(),
        registerCommand: () => ({ dispose: () => {} })
    },
    languages: {
        registerDocumentLinkProvider: () => ({ dispose: () => {} })
    },
    Uri: {
        file: (path: string) => ({
            fsPath: path,
            toString: () => path,
            with: (change: any) => ({
                fsPath: change.path || path,
                toString: () => change.path || path
            })
        }),
        joinPath: (base: any, ...paths: string[]) => ({
            fsPath: `${base.fsPath}/${paths.join('/')}`,
            toString: () => `${base.fsPath}/${paths.join('/')}`,
            with: (change: any) => ({
                fsPath: change.path || `${base.fsPath}/${paths.join('/')}`,
                toString: () => change.path || `${base.fsPath}/${paths.join('/')}`
            })
        })
    },
    RelativePattern: class RelativePattern {
        constructor(public base: any, public pattern: string) {}
    },
    Range: class Range {
        constructor(public start: any, public end: any) {}
    },
    Position: class Position {
        constructor(public line: number, public character: number) {}
    },
    Selection: class Selection {
        constructor(public anchor: any, public active: any) {}
        get isEmpty(): boolean {
            return this.anchor.line === this.active.line &&
                   this.anchor.character === this.active.character;
        }
        get start(): any {
            if (this.anchor.line < this.active.line ||
                (this.anchor.line === this.active.line && this.anchor.character < this.active.character)) {
                return this.anchor;
            }
            return this.active;
        }
        get end(): any {
            if (this.anchor.line > this.active.line ||
                (this.anchor.line === this.active.line && this.anchor.character > this.active.character)) {
                return this.anchor;
            }
            return this.active;
        }
    },
    CancellationTokenSource: class CancellationTokenSource {
        token = { isCancellationRequested: false, onCancellationRequested: () => ({ dispose: () => {} }) };
        cancel() {}
        dispose() {}
    },
    FileType: {
        File: 1,
        Directory: 2
    },
    EndOfLine: {
        LF: 1,
        CRLF: 2
    },
    ViewColumn: {
        Active: -1,
        Beside: -2,
        One: 1,
        Two: 2,
        Three: 3,
        Four: 4,
        Five: 5,
        Six: 6,
        Seven: 7,
        Eight: 8,
        Nine: 9
    },
    CompletionTriggerKind: {
        Invoke: 0,
        TriggerCharacter: 1,
        TriggerForIncompleteCompletions: 2
    },
    CompletionItemKind: {
        Text: 0,
        Method: 1,
        Function: 2,
        Constructor: 3,
        Field: 4,
        Variable: 5,
        Class: 6,
        Interface: 7,
        Module: 8,
        Property: 9,
        Unit: 10,
        Value: 11,
        Enum: 12,
        Keyword: 13,
        Snippet: 14,
        Color: 15,
        File: 16,
        Reference: 17,
        Folder: 18,
        EnumMember: 19,
        Constant: 20,
        Struct: 21,
        Event: 22,
        Operator: 23,
        TypeParameter: 24
    },
    CompletionItem: class CompletionItem {
        constructor(public label: string, public kind?: number) {}
    },
    MarkdownString: class MarkdownString {
        value: string;
        isTrusted?: boolean;
        constructor(value?: string, supportThemeIcons?: boolean) {
            this.value = value || '';
        }
        appendText(value: string): MarkdownString {
            this.value += value;
            return this;
        }
        appendMarkdown(value: string): MarkdownString {
            this.value += value;
            return this;
        }
        appendCodeblock(value: string, language?: string): MarkdownString {
            this.value += `\`\`\`${language || ''}\n${value}\n\`\`\``;
            return this;
        }
    },
    WorkspaceEdit: class WorkspaceEdit {
        private _edits: Map<string, any[]> = new Map();
        replace(uri: any, range: any, newText: string): void {
            if (!this._edits.has(uri.toString())) {
                this._edits.set(uri.toString(), []);
            }
            this._edits.get(uri.toString())!.push({ type: 'replace', range, newText });
        }
        insert(uri: any, position: any, newText: string): void {
            if (!this._edits.has(uri.toString())) {
                this._edits.set(uri.toString(), []);
            }
            this._edits.get(uri.toString())!.push({ type: 'insert', position, newText });
        }
        delete(uri: any, range: any): void {
            if (!this._edits.has(uri.toString())) {
                this._edits.set(uri.toString(), []);
            }
            this._edits.get(uri.toString())!.push({ type: 'delete', range });
        }
    }
};

// グローバルなvscodeモックを設定
(global as any).vscode = vscode;

// requireでvscodeモジュールが要求された場合のモック
const Module = require('module');
const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function (request: string, ...args: any[]) {
    if (request === 'vscode') {
        return 'vscode';
    }
    return originalResolveFilename.apply(this, [request, ...args]);
};

require.cache['vscode'] = {
    id: 'vscode',
    filename: 'vscode',
    loaded: true,
    exports: vscode,
    paths: []
} as any;
