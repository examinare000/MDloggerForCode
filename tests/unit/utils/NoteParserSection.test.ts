import { describe, it } from 'mocha';
import { expect } from 'chai';
import { insertIntoSection } from '../../../src/utils/NoteParser';

describe('NoteParser.insertIntoSection', () => {
    it('inserts into existing section before next heading', () => {
        const md = `# Title\n\n## Quick Notes\n- [ ] existing\n\n## Other\ncontent`;
        const res = insertIntoSection(md, 'Quick Notes', '- [ ] new task');
        const lines = res.newContent.split('\n');
        // After heading and existing line, new line should be inserted before empty line
        expect(lines[3].trim()).to.equal('- [ ] existing');
        expect(lines[4].trim()).to.equal('- [ ] new task');
        expect(res.line).to.equal(4);
    });

    it('creates section if missing and appends line', () => {
        const md = `# Title\nSome content`;
        const res = insertIntoSection(md, 'Quick Notes', '- [ ] created');
        const lines = res.newContent.split('\n');
        // Last two lines should be heading and inserted line
        expect(lines[lines.length - 2]).to.equal('## Quick Notes');
        expect(lines[lines.length - 1]).to.equal('- [ ] created');
    });

    it('inserts at end if section is last and no following heading', () => {
        const md = `# Title\n\n## Quick Notes\n- [ ] a`;
        const res = insertIntoSection(md, 'Quick Notes', '- [ ] b');
        const lines = res.newContent.split('\n');
        expect(lines[lines.length - 2].trim()).to.equal('- [ ] a');
        expect(lines[lines.length - 1].trim()).to.equal('- [ ] b');
    });
});
