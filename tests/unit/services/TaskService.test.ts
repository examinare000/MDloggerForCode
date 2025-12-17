import { expect } from 'chai';
import { describe, it } from 'mocha';
import * as vscode from 'vscode';
import { TaskService } from '../../../src/services/TaskService';
import { IFileWriter } from '../../../src/services/FileWriter';

class MockFileWriter implements IFileWriter {
    private store: Record<string, string> = {};
    private writes: Record<string, number> = {};

    constructor(initial: Record<string, string>) {
        this.store = { ...initial };
    }

    async read(uri: vscode.Uri): Promise<string> {
        return this.store[uri.fsPath] ?? '';
    }

    async write(uri: vscode.Uri, content: string): Promise<void> {
        this.store[uri.fsPath] = content;
        this.writes[uri.fsPath] = (this.writes[uri.fsPath] || 0) + 1;
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

    getWriteCount(pathStr: string) {
        return this.writes[pathStr] || 0;
    }
}

describe('TaskService', () => {
    it('collects tasks from multiple URIs and groups by text', async () => {
        const uri1 = vscode.Uri.file('/tmp/note1.md');
        const uri2 = vscode.Uri.file('/tmp/note2.md');

        const content1 = '# Note1\n- [ ] task one\n- [x] done';
        const content2 = '# Note2\nSome text\n- [ ] another task';

        const mock = new MockFileWriter({
            [uri1.fsPath]: content1,
            [uri2.fsPath]: content2
        });

        const svc = new TaskService(mock);
        const groups = await svc.collectTasksFromUris([uri1, uri2]) as any;

        expect(groups).to.have.lengthOf(2);
        const g1 = groups.find((g: any) => g.text === 'task one');
        const g2 = groups.find((g: any) => g.text === 'another task');
        expect(g1.count).to.equal(1);
        expect(g2.count).to.equal(1);
    });

    it('groups collected tasks by text with counts/files/items (spec)', async () => {
        const uri1 = vscode.Uri.file('/tmp/note1.md');
        const uri2 = vscode.Uri.file('/tmp/note2.md');

        const content1 = '- [ ] duplicate\n- [ ] unique';
        const content2 = '- [ ] duplicate\n- [ ] duplicate';

        const mock = new MockFileWriter({
            [uri1.fsPath]: content1,
            [uri2.fsPath]: content2
        });

        const svc = new TaskService(mock);
        const groups = await (svc as any).collectTasksFromUris([uri1, uri2]) as any; // spec: grouped result

        expect(groups).to.be.an('array');
        const dup = groups.find((g: any) => g.text === 'duplicate');
        expect(dup, 'should group identical text into one entry').to.exist;
        expect(dup.count).to.equal(3);
        expect(dup.files).to.have.members([uri1.fsPath.split(/[\\/]/).pop(), uri2.fsPath.split(/[\\/]/).pop()]);
        expect(dup.items).to.have.length(3);
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

    it('completes all tasks in a group payload (spec)', async () => {
        const uri = vscode.Uri.file('/tmp/note4.md');
        const original = '- [ ] duplicate\n- [ ] duplicate\n- [ ] other';

        const mock = new MockFileWriter({ [uri.fsPath]: original });
        const svc = new TaskService(mock) as any;

        expect(typeof svc.completeTasks).to.equal('function', 'completeTasks should be implemented for group completion');

        const payload = [
            { uri, line: 0 },
            { uri, line: 1 }
        ];

        const updated = await svc.completeTasks(payload, '2025-12-17');
        const lines = updated.split('\n');
        expect(lines[0]).to.include('[completion: 2025-12-17]');
        expect(lines[1]).to.include('[completion: 2025-12-17]');
        expect(lines[2]).to.include('other'); // untouched
    });

    it('completes grouped tasks across multiple files in deterministic order', async () => {
        const uri1 = vscode.Uri.file('/tmp/a.md');
        const uri2 = vscode.Uri.file('/tmp/b.md');

        const mock = new MockFileWriter({
            [uri1.fsPath]: 'line0\n- [ ] first a\n- [ ] later a',
            [uri2.fsPath]: '- [ ] first b\nmiddle\n- [ ] later b'
        });
        const svc = new TaskService(mock);

        // deliberately shuffled order; service should sort per file
        const payload = [
            { uri: uri1, line: 2 },
            { uri: uri2, line: 2 },
            { uri: uri1, line: 1 },
            { uri: uri2, line: 0 }
        ];

        const lastContent = await svc.completeTasks(payload, '2024-12-01');

        const aLines = (mock.getContent(uri1.fsPath) || '').split('\n');
        expect(aLines[1]).to.match(/\[completion: 2024-12-01\]/);
        expect(aLines[2]).to.match(/\[completion: 2024-12-01\]/);
        expect(mock.getWriteCount(uri1.fsPath)).to.equal(1, 'writes per file should be batched');

        const bLines = (mock.getContent(uri2.fsPath) || '').split('\n');
        expect(bLines[0]).to.match(/\[completion: 2024-12-01\]/);
        expect(bLines[2]).to.match(/\[completion: 2024-12-01\]/);
        expect(mock.getWriteCount(uri2.fsPath)).to.equal(1, 'writes per file should be batched');

        expect(lastContent).to.equal(mock.getContent(uri2.fsPath));
    });
});
