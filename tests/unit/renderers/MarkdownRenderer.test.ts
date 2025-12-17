import { describe, it } from 'mocha';
import { expect } from 'chai';
import { MarkdownRenderer } from '../../../src/renderers/MarkdownRenderer';

describe('MarkdownRenderer', () => {
    it('renders basic markdown', () => {
        const renderer = new MarkdownRenderer();
        const html = renderer.render('# Title');
        expect(html).to.contain('<h1>');
        expect(html).to.contain('Title');
    });

    it('renders WikiLinks as clickable anchors', () => {
        const renderer = new MarkdownRenderer();
        const html = renderer.render('See [[My Page]]');
        expect(html).to.contain('class="mdlg-wikilink"');
        expect(html).to.contain('data-mdlg-wikilink="My Page"');
        expect(html).to.contain('>My Page<');
    });

    it('renders aliased WikiLinks using the alias as label', () => {
        const renderer = new MarkdownRenderer();
        const html = renderer.render('See [[My Page|Alias]]');
        expect(html).to.contain('data-mdlg-wikilink="My Page|Alias"');
        expect(html).to.contain('>Alias<');
    });

    it('does not transform WikiLinks inside code blocks', () => {
        const renderer = new MarkdownRenderer();
        const html = renderer.render('```\n[[Nope]]\n```');
        expect(html).to.not.contain('class="mdlg-wikilink"');
        expect(html).to.contain('[[Nope]]');
    });
});

