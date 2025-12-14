import { describe, it } from 'mocha';
import { expect } from 'chai';
import { collectOpenTasksFromFiles, applyTaskCompletionToContent } from '../../../src/utils/TaskCollector';

describe('TaskCollector', () => {
    describe('collectOpenTasksFromFiles', () => {
        it('collects tasks from multiple files with correct metadata', () => {
            const files = [
                { uri: 'file:///a.md', file: 'a.md', content: '# A\n- [ ] task1\n- [x] done' },
                { uri: 'file:///b.md', file: 'sub/b.md', content: 'intro\n  - [ ] subtask\nend' }
            ];

            const tasks = collectOpenTasksFromFiles(files);
            expect(tasks).to.have.length(2);
            expect(tasks[0]).to.include({ uri: 'file:///a.md', file: 'a.md', text: 'task1', line: 1 });
            expect(tasks[1]).to.include({ uri: 'file:///b.md', file: 'sub/b.md', text: 'subtask', line: 1 });
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
