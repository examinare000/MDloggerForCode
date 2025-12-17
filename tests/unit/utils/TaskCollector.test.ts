import { describe, it } from 'mocha';
import { expect } from 'chai';
import { collectOpenTasksFromFiles, applyTaskCompletionToContent } from '../../../src/utils/TaskCollector';

describe('TaskCollector', () => {
    describe('collectOpenTasksFromFiles', () => {
        it('collects tasks from multiple files and groups by text', () => {
            const files = [
                { uri: 'file:///a.md', file: 'a.md', content: '# A\n- [ ] task1\n- [x] done' },
                { uri: 'file:///b.md', file: 'sub/b.md', content: 'intro\n  - [ ] subtask\nend' }
            ];

            const groups = collectOpenTasksFromFiles(files) as any;
            expect(groups).to.have.length(2);
            const t1 = groups.find((g: any) => g.text === 'task1');
            const t2 = groups.find((g: any) => g.text === 'subtask');
            expect(t1).to.include({ text: 'task1', count: 1 });
            expect(t1.files).to.deep.equal(['a.md']);
            expect(t1.items[0]).to.include({ uri: 'file:///a.md', file: 'a.md', line: 1 });
            expect(t2).to.include({ text: 'subtask', count: 1 });
            expect(t2.files).to.deep.equal(['sub/b.md']);
        });

        it('groups tasks by identical text with counts and file set (spec)', () => {
            const files = [
                { uri: 'file:///a.md', file: 'a.md', content: '- [ ] duplicate\n- [ ] another' },
                { uri: 'file:///b.md', file: 'b.md', content: '- [ ] duplicate\n- [ ] duplicate' }
            ];

            const groups = collectOpenTasksFromFiles(files) as any;

            expect(groups).to.be.an('array');
            const dupGroup = groups.find((g: any) => g.text === 'duplicate');
            expect(dupGroup, 'should group identical texts into one entry').to.exist;
            expect(dupGroup.count).to.equal(3);
            expect(dupGroup.files).to.have.members(['a.md', 'b.md']);
            expect(dupGroup.items).to.have.length(3);
            expect(dupGroup.items.every((i: any) => typeof i.uri === 'string' && typeof i.line === 'number')).to.be.true;
        });

        it('keeps item references while de-duplicating file list for the same file', () => {
            const files = [
                { uri: 'file:///a.md', file: 'a.md', content: '- [ ] same\n- [ ] same' },
                { uri: 'file:///c.md', file: 'c.md', content: '- [ ] other' }
            ];

            const groups = collectOpenTasksFromFiles(files) as any;
            const sameGroup = groups.find((g: any) => g.text === 'same');
            expect(sameGroup.files).to.deep.equal(['a.md'], 'file list should not repeat entries');
            expect(sameGroup.items).to.have.length(2);
            expect(sameGroup.items.map((i: any) => i.line)).to.deep.equal([0, 1]);
        });
    });

    describe('applyTaskCompletionToContent', () => {
        it('marks the given line as completed and appends completion tag', () => {
            const content = 'x\n- [ ] do this\ny';
            const out = applyTaskCompletionToContent(content, 1, '2025-10-30');
            expect(out.split('\n')[1]).to.match(/- \[x\] do this \[completion: 2025-10-30\]/);
        });
    });
});
