import { describe, it, beforeEach } from 'mocha';
import { expect } from 'chai';
import * as vscode from 'vscode';
import { QuickCaptureSidebarProvider } from '../../src/providers/QuickCaptureSidebarProvider';
import { ConfigurationManager } from '../../src/managers/ConfigurationManager';
import { DailyNoteManager } from '../../src/managers/DailyNoteManager';
import { TaskService } from '../../src/services/TaskService';
import { IFileWriter } from '../../src/services/FileWriter';

class MemoryFileWriter implements IFileWriter {
    private store = new Map<string, string>();

    constructor(initial: Record<string, string>) {
        Object.entries(initial).forEach(([k, v]) => this.store.set(vscode.Uri.file(k).toString(), v));
    }
    async read(uri: vscode.Uri): Promise<string> {
        return this.store.get(uri.toString()) || '';
    }
    async write(uri: vscode.Uri, content: string): Promise<void> {
        this.store.set(uri.toString(), content);
    }
    async exists(uri: vscode.Uri): Promise<boolean> {
        return this.store.has(uri.toString());
    }
    async createDirectory(_uri: vscode.Uri): Promise<void> {
        return;
    }
    get(uri: vscode.Uri): string | undefined {
        return this.store.get(uri.toString());
    }
}

describe('Quick Capture flow (integration)', () => {
    let provider: QuickCaptureSidebarProvider;
    let mockContext: vscode.ExtensionContext;
    let mockConfigManager: ConfigurationManager;
    let mockDailyNoteManager: DailyNoteManager;
    let mockWebviewView: vscode.WebviewView;
    let messages: any[];

    beforeEach(() => {
        messages = [];

        mockContext = {
            extensionUri: vscode.Uri.file('/mock/extension'),
            subscriptions: []
        } as any;

        mockConfigManager = {
            getCaptureSectionName: () => 'Quick Notes',
            getTimeFormat: () => 'HH:mm',
            getVaultRoot: () => '',
            getDailyNotePath: () => 'dailynotes'
        } as any;

        mockDailyNoteManager = {
            appendToSection: async (_workspace: any, content: string) => ({
                uri: vscode.Uri.file('/tmp/daily/note.md'),
                line: 5
            }),
            getDailyNoteDirectory: (_workspace: any) => vscode.Uri.file('/tmp/daily')
        } as any;

        mockWebviewView = {
            webview: {
                options: {},
                html: '',
                cspSource: 'mock-csp-source',
                postMessage: async (m: any) => messages.push(m),
                onDidReceiveMessage: (cb: any) => {
                    (mockWebviewView.webview as any)._cb = cb;
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

    it('returns grouped tasks then completes a group end-to-end', async () => {
        const workspaceFolder = {
            uri: vscode.Uri.file('/tmp'),
            name: 'tmp',
            index: 0
        } as any;
        (vscode.workspace as any).workspaceFolders = [workspaceFolder];

        const noteUri = vscode.Uri.file('/tmp/daily/note.md');
        const writer = new MemoryFileWriter({
            '/tmp/daily/note.md': '- [ ] duplicate\n- [ ] duplicate\n- [ ] other'
        });
        (provider as any).taskServiceInstance = new TaskService(writer);

        (vscode.workspace as any).findFiles = async () => [noteUri];

        provider.resolveWebviewView(mockWebviewView, {} as any, {} as any);
        const cb = (mockWebviewView.webview as any)._cb;

        await cb({ command: 'request:tasks' });
        const firstUpdate = messages.find(m => m.command === 'tasks:update');
        expect(firstUpdate).to.exist;
        expect(firstUpdate.groups).to.be.an('array');
        const dupGroup = firstUpdate.groups.find((g: any) => g.text === 'duplicate');
        expect(dupGroup.count).to.equal(2);

        await cb({
            command: 'task:complete',
            payload: { text: dupGroup.text, items: dupGroup.items }
        });

        const followUps = messages.filter(m => m.command === 'tasks:update');
        const lastUpdate = followUps[followUps.length - 1];
        expect(lastUpdate.groups.every((g: any) => g.text !== 'duplicate')).to.be.true;

        const finalContent = writer.get(noteUri) || '';
        expect(finalContent).to.include('[completion:');
        expect(finalContent.split('\n')[2]).to.contain('other'); // untouched
    });
});
