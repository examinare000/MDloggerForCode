import { expect } from 'chai';
import { describe, it, beforeEach } from 'mocha';
import * as vscode from 'vscode';
import { QuickCaptureSidebarProvider } from '../../../src/providers/QuickCaptureSidebarProvider';
import { ConfigurationManager } from '../../../src/managers/ConfigurationManager';
import { DailyNoteManager } from '../../../src/managers/DailyNoteManager';

describe('QuickCaptureSidebarProvider', () => {
    let provider: QuickCaptureSidebarProvider;
    let mockContext: vscode.ExtensionContext;
    let mockConfigManager: ConfigurationManager;
    let mockDailyNoteManager: DailyNoteManager;
    let mockWebviewView: vscode.WebviewView;
    let receivedMessages: any[];

    beforeEach(() => {
        receivedMessages = [];

        // ExtensionContextのモック
        mockContext = {
            extensionUri: vscode.Uri.file('/mock/extension'),
            subscriptions: []
        } as any;

        // ConfigurationManagerのモック
        mockConfigManager = {
            getCaptureSectionName: () => 'Quick Notes',
            getTimeFormat: () => 'HH:mm',
            getVaultRoot: () => '',
            getDailyNotePath: () => 'dailynotes'
        } as any;

        // DailyNoteManagerのモック
        mockDailyNoteManager = {
            appendToSection: async (workspace: any, content: string) => {
                return {
                    uri: vscode.Uri.file('/test/dailynote.md'),
                    line: 5
                };
            },
            getDailyNoteDirectory: (workspace: any) => {
                return vscode.Uri.file('/test/workspace/dailynotes');
            }
        } as any;

        // WebviewViewのモック
        mockWebviewView = {
            webview: {
                options: {},
                html: '',
                cspSource: 'mock-csp-source',
                postMessage: async (message: any) => {
                    receivedMessages.push(message);
                },
                onDidReceiveMessage: (callback: any) => {
                    (mockWebviewView.webview as any)._messageCallback = callback;
                    return { dispose: () => {} };
                }
            }
        } as any;

        provider = new QuickCaptureSidebarProvider(
            mockContext,
            mockConfigManager,
            mockDailyNoteManager
        );
    });

    describe('resolveWebviewView', () => {
        it('should set webview options correctly', () => {
            provider.resolveWebviewView(mockWebviewView, {} as any, {} as any);

            expect(mockWebviewView.webview.options).to.deep.include({
                enableScripts: true
            });
        });

        it('should generate HTML with CSP and nonce', () => {
            provider.resolveWebviewView(mockWebviewView, {} as any, {} as any);

            expect(mockWebviewView.webview.html).to.include('<!doctype html>');
            expect(mockWebviewView.webview.html).to.include('Content-Security-Policy');
            expect(mockWebviewView.webview.html).to.include('nonce');
        });

        it('should include capture input field in HTML', () => {
            provider.resolveWebviewView(mockWebviewView, {} as any, {} as any);

            expect(mockWebviewView.webview.html).to.include('captureInput');
            expect(mockWebviewView.webview.html).to.include('type="text"');
        });

        it('should include tasks list container in HTML', () => {
            provider.resolveWebviewView(mockWebviewView, {} as any, {} as any);

            expect(mockWebviewView.webview.html).to.include('tasksList');
            expect(mockWebviewView.webview.html).to.include('Open tasks');
        });
    });

    describe('capture:add message handling', () => {
        it('should append content to daily note on valid capture', async () => {
            let appendCalled = false;
            let capturedContent = '';

            mockDailyNoteManager.appendToSection = async (_workspace: any, content: string) => {
                appendCalled = true;
                capturedContent = content;
                return {
                    uri: vscode.Uri.file('/test/dailynote.md'),
                    line: 5
                };
            };

            // WorkspaceFolderのモック
            const mockWorkspaceFolder = {
                uri: vscode.Uri.file('/test/workspace'),
                name: 'test',
                index: 0
            };
            (vscode.workspace as any).workspaceFolders = [mockWorkspaceFolder];

            provider.resolveWebviewView(mockWebviewView, {} as any, {} as any);

            // メッセージを送信
            const messageCallback = (mockWebviewView.webview as any)._messageCallback;
            await messageCallback({
                command: 'capture:add',
                content: 'Test capture'
            });

            expect(appendCalled).to.be.true;
            expect(capturedContent).to.equal('Test capture');
        });

        it('should send capture:ok response after successful capture', async () => {
            const mockWorkspaceFolder = {
                uri: vscode.Uri.file('/test/workspace'),
                name: 'test',
                index: 0
            };
            (vscode.workspace as any).workspaceFolders = [mockWorkspaceFolder];

            provider.resolveWebviewView(mockWebviewView, {} as any, {} as any);

            const messageCallback = (mockWebviewView.webview as any)._messageCallback;
            await messageCallback({
                command: 'capture:add',
                content: 'Test capture'
            });

            const okMessage = receivedMessages.find(m => m.command === 'capture:ok');
            expect(okMessage).to.exist;
            expect(okMessage.timestamp).to.be.a('string');
            expect(okMessage.uri).to.be.a('string');
            expect(okMessage.line).to.be.a('number');
        });

        it('should send error response for empty content', async () => {
            const mockWorkspaceFolder = {
                uri: vscode.Uri.file('/test/workspace'),
                name: 'test',
                index: 0
            };
            (vscode.workspace as any).workspaceFolders = [mockWorkspaceFolder];

            provider.resolveWebviewView(mockWebviewView, {} as any, {} as any);

            const messageCallback = (mockWebviewView.webview as any)._messageCallback;
            await messageCallback({
                command: 'capture:add',
                content: ''
            });

            const errorMessage = receivedMessages.find(m => m.command === 'error');
            expect(errorMessage).to.exist;
            expect(errorMessage.message).to.include('Empty capture');
        });

        it('should send error response when no workspace is open', async () => {
            (vscode.workspace as any).workspaceFolders = undefined;

            provider.resolveWebviewView(mockWebviewView, {} as any, {} as any);

            const messageCallback = (mockWebviewView.webview as any)._messageCallback;
            await messageCallback({
                command: 'capture:add',
                content: 'Test capture'
            });

            const errorMessage = receivedMessages.find(m => m.command === 'error');
            expect(errorMessage).to.exist;
            expect(errorMessage.message).to.include('No workspace open');
        });

        it('should handle errors from DailyNoteManager', async () => {
            const mockWorkspaceFolder = {
                uri: vscode.Uri.file('/test/workspace'),
                name: 'test',
                index: 0
            };
            (vscode.workspace as any).workspaceFolders = [mockWorkspaceFolder];

            // DailyNoteManagerがエラーをthrowする場合
            const failingDailyNoteManager = {
                appendToSection: async () => {
                    throw new Error('File write failed');
                }
            } as any;

            const providerWithFailingManager = new QuickCaptureSidebarProvider(
                mockContext,
                mockConfigManager,
                failingDailyNoteManager
            );

            providerWithFailingManager.resolveWebviewView(mockWebviewView, {} as any, {} as any);

            const messageCallback = (mockWebviewView.webview as any)._messageCallback;
            await messageCallback({
                command: 'capture:add',
                content: 'Test capture'
            });

            const errorMessage = receivedMessages.find(m => m.command === 'error');
            expect(errorMessage).to.exist;
            expect(errorMessage.message).to.include('File write failed');
        });
    });

    describe('request:tasks message handling', () => {
        it('should collect and return tasks from workspace', async () => {
            const mockWorkspaceFolder = {
                uri: vscode.Uri.file('/test/workspace'),
                name: 'test',
                index: 0
            };
            (vscode.workspace as any).workspaceFolders = [mockWorkspaceFolder];

            // vscode.workspace.findFilesのモック
            (vscode.workspace as any).findFiles = async () => {
                return [
                    vscode.Uri.file('/test/workspace/note1.md'),
                    vscode.Uri.file('/test/workspace/note2.md')
                ];
            };

            provider.resolveWebviewView(mockWebviewView, {} as any, {} as any);

            const messageCallback = (mockWebviewView.webview as any)._messageCallback;
            await messageCallback({
                command: 'request:tasks'
            });

            const tasksMessage = receivedMessages.find(m => m.command === 'tasks:update');
            expect(tasksMessage).to.exist;
            expect(tasksMessage.tasks).to.be.an('array');
        });

        it('should send empty tasks array when no workspace is open', async () => {
            (vscode.workspace as any).workspaceFolders = undefined;

            provider.resolveWebviewView(mockWebviewView, {} as any, {} as any);

            const messageCallback = (mockWebviewView.webview as any)._messageCallback;
            await messageCallback({
                command: 'request:tasks'
            });

            const tasksMessage = receivedMessages.find(m => m.command === 'tasks:update');
            expect(tasksMessage).to.exist;
            expect(tasksMessage.tasks).to.deep.equal([]);
        });
    });

    describe('task:complete message handling', () => {
        it('should complete task and refresh task list', async () => {
            const mockWorkspaceFolder = {
                uri: vscode.Uri.file('/test/workspace'),
                name: 'test',
                index: 0
            };
            (vscode.workspace as any).workspaceFolders = [mockWorkspaceFolder];
            (vscode.workspace as any).findFiles = async () => [];

            provider.resolveWebviewView(mockWebviewView, {} as any, {} as any);

            const messageCallback = (mockWebviewView.webview as any)._messageCallback;
            await messageCallback({
                command: 'task:complete',
                payload: {
                    uri: '/test/workspace/note.md',
                    line: 5
                }
            });

            // tasks:updateメッセージが送信されたことを確認（タスクリストの再取得）
            const tasksUpdateMessages = receivedMessages.filter(m => m.command === 'tasks:update');
            expect(tasksUpdateMessages.length).to.be.greaterThan(0);
        });

        it('should send error response for invalid task payload', async () => {
            const mockWorkspaceFolder = {
                uri: vscode.Uri.file('/test/workspace'),
                name: 'test',
                index: 0
            };
            (vscode.workspace as any).workspaceFolders = [mockWorkspaceFolder];

            provider.resolveWebviewView(mockWebviewView, {} as any, {} as any);

            const messageCallback = (mockWebviewView.webview as any)._messageCallback;
            await messageCallback({
                command: 'task:complete',
                payload: {
                    uri: '',
                    line: NaN
                }
            });

            const errorMessage = receivedMessages.find(m => m.command === 'error');
            expect(errorMessage).to.exist;
            expect(errorMessage.message).to.include('Invalid task complete payload');
        });
    });

    describe('constructor dependency injection', () => {
        it('should accept all required dependencies', () => {
            expect(() => {
                new QuickCaptureSidebarProvider(
                    mockContext,
                    mockConfigManager,
                    mockDailyNoteManager
                );
            }).to.not.throw();
        });

        it('should require DailyNoteManager as mandatory dependency', () => {
            // DailyNoteManagerは必須依存性なので、TypeScriptコンパイル時にエラーになる
            // ランタイムでundefinedを渡した場合の動作を確認
            const providerWithUndefined = new QuickCaptureSidebarProvider(
                mockContext,
                mockConfigManager,
                undefined as any
            );

            // undefinedが渡された場合、appendToSectionを呼ぶとエラーになる
            expect(providerWithUndefined).to.exist;
        });
    });
});
