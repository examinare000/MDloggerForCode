/**
 * @fileoverview Markdown rendering for MDloggerForCode preview.
 * Renders Markdown to HTML with WikiLink support (`[[Page]]`, `[[Page|Alias]]`).
 */

// markdown-it has no bundled types in this repo; use require() for strict TS compatibility.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const MarkdownIt = require('markdown-it');

interface MarkdownItTokenLike {
    content: string;
    meta?: {
        raw?: string;
    };
}

interface MarkdownItInlineStateLike {
    pos: number;
    src: string;
    push: (type: string, tag: string, nesting: number) => MarkdownItTokenLike;
}

type MarkdownItInstance = {
    render: (markdown: string) => string;
    inline: { ruler: { before: (after: string, name: string, rule: (state: MarkdownItInlineStateLike, silent: boolean) => boolean) => void } };
    renderer: { rules: Record<string, (tokens: MarkdownItTokenLike[], idx: number) => string> };
    utils: { escapeHtml: (text: string) => string };
};

function escapeHtmlAttribute(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function getWikiLinkLabel(raw: string): string {
    const trimmed = raw.trim();
    const pipeIndex = trimmed.indexOf('|');
    if (pipeIndex === -1) {
        return trimmed;
    }

    const label = trimmed.substring(pipeIndex + 1).trim();
    if (label) {
        return label;
    }

    return trimmed.substring(0, pipeIndex).trim();
}

function wikiLinkPlugin(md: MarkdownItInstance): void {
    const ruleName = 'mdlg_wikilink';

    md.inline.ruler.before('emphasis', ruleName, (state: MarkdownItInlineStateLike, silent: boolean) => {
        const start = state.pos as number;
        const src: string = state.src as string;

        if (start + 4 > src.length) {
            return false;
        }
        if (src.charCodeAt(start) !== 0x5B || src.charCodeAt(start + 1) !== 0x5B) {
            return false;
        }

        const end = src.indexOf(']]', start + 2);
        if (end === -1) {
            return false;
        }

        const raw = src.slice(start + 2, end);
        const rawTrimmed = raw.trim();
        if (!rawTrimmed) {
            return false;
        }

        if (silent) {
            return true;
        }

        const token = state.push(ruleName, '', 0);
        token.meta = { raw: rawTrimmed };
        token.content = getWikiLinkLabel(rawTrimmed);

        state.pos = end + 2;
        return true;
    });

    md.renderer.rules[ruleName] = (tokens: MarkdownItTokenLike[], idx: number) => {
        const raw: string = tokens[idx]?.meta?.raw ?? '';
        const label: string = tokens[idx]?.content ?? raw;
        const safeRaw = escapeHtmlAttribute(raw);
        const safeLabel = md.utils.escapeHtml(label);
        return `<a href="#" class="mdlg-wikilink" data-mdlg-wikilink="${safeRaw}">${safeLabel}</a>`;
    };
}

export class MarkdownRenderer {
    private readonly md: MarkdownItInstance;

    constructor() {
        this.md = new MarkdownIt({
            html: false,
            linkify: true,
            breaks: true
        }) as MarkdownItInstance;

        wikiLinkPlugin(this.md);
    }

    render(markdown: string): string {
        return this.md.render(markdown ?? '');
    }
}
