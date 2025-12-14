import { describe, it } from 'mocha';
import { expect } from 'chai';
import { extractTasks, markTaskCompleted } from '../../../src/utils/NoteParser';

describe('NoteParser', () => {
    describe('extractTasks', () => {
        it('extracts unchecked checklist items with correct line numbers', () => {
            const md = `Title\n- [ ] Task A\n- [x] Done\n  - [ ] Subtask\nFinal line`;
            const tasks = extractTasks(md);
            expect(tasks).to.have.length(2);
            expect(tasks[0].line).to.equal(1);
            expect(tasks[0].text).to.equal('Task A');
            expect(tasks[1].line).to.equal(3);
            expect(tasks[1].text).to.equal('Subtask');
        });

        it('returns empty array when no tasks', () => {
            const md = 'No tasks here\nJust text';
            const tasks = extractTasks(md);
            expect(tasks).to.be.an('array').that.is.empty;
        });
    });

    describe('markTaskCompleted', () => {
        it('marks an unchecked task as completed and appends completion tag', () => {
            const md = `Heading\n- [ ] Buy milk\n- [ ] Walk dog`;
            const out = markTaskCompleted(md, 1, '2025-10-30');
            const lines = out.split('\n');
            expect(lines[1]).to.match(/- \[x\] Buy milk \[completion: 2025-10-30\]/);
        });

        it('does not change content if completion tag already present', () => {
            const md = `A\n- [ ] Task \[completion: 2025-10-29]\nB`;
            const out = markTaskCompleted(md, 1, '2025-10-30');
            expect(out).to.equal(md);
        });

        it('returns original content when line index is out of range', () => {
            const md = 'A\n- [ ] Task';
            const out = markTaskCompleted(md, 5, '2025-10-30');
            expect(out).to.equal(md);
        });
    });
});
