import { expect } from 'chai';
import { describe, it } from 'mocha';
import * as vscode from 'vscode';
import { TaskService } from '../../../src/services/TaskService';
import { IFileWriter } from '../../../src/services/FileWriter';

class MockFileWriter implements IFileWriter {
    private store: Record<string, string> = {};

    constructor(initial: Record<string, string>) {
        this.store = { ...initial };
    }

    async read(uri: vscode.Uri): Promise<string> {
        return this.store[uri.fsPath] ?? '';
    }

    async write(uri: vscode.Uri, content: string): Promise<void> {
        this.store[uri.fsPath] = content;
    }

    async exists(uri: vscode.Uri): Promise<boolean> {
        return uri.fsPath in this.store;
    }

    async createDirectory(_uri: vscode.Uri): Promise<void> {
        // No-op for in-memory store
    }

    getContent(pathStr: string) {
        return this.store[pathStr];
    }
}

describe('TaskService', () => {
    it('collects tasks from multiple URIs', async () => {
        const uri1 = vscode.Uri.file('/tmp/note1.md');
        const uri2 = vscode.Uri.file('/tmp/note2.md');

        const content1 = '# Note1\n- [ ] task one\n- [x] done';
        const content2 = '# Note2\nSome text\n- [ ] another task';

        const mock = new MockFileWriter({
            [uri1.fsPath]: content1,
            [uri2.fsPath]: content2
        });

        const svc = new TaskService(mock);
        const tasks = await svc.collectTasksFromUris([uri1, uri2]);

        expect(tasks).to.have.lengthOf(2);
        expect(tasks.some(t => t.text.includes('task one'))).to.be.true;
        expect(tasks.some(t => t.text.includes('another task'))).to.be.true;
    });

    it('completes a task and writes back content', async () => {
        const uri = vscode.Uri.file('/tmp/note3.md');
        const original = '# Note3\n- [ ] finish this';

        const mock = new MockFileWriter({ [uri.fsPath]: original });
        const svc = new TaskService(mock);

        const newContent = await svc.completeTask(uri, 1, '2025-10-30');

        expect(newContent).to.include('[x]');
        expect(newContent).to.include('[completion: 2025-10-30]');
        // also ensure it's written back to the mock store
        expect(mock.getContent(uri.fsPath)).to.equal(newContent);
    });
});
