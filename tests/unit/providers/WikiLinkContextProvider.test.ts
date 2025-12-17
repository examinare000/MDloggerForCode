import { describe, it } from 'mocha';
import { expect } from 'chai';

// WikiLink検出のヘルパー関数（修正された実装の模倣）
function isPositionInWikiLink(text: string, offset: number): boolean {
    const wikiLinkRegex = /\[\[([^\]]+)\]\]/g;
    let match;

    while ((match = wikiLinkRegex.exec(text)) !== null) {
        const linkStart = match.index;
        const linkEnd = match.index + match[0].length;

        // カーソルがこのWikiLink内にあるかチェック
        // [[  と ]] の間（内側）にある場合のみtrue
        if (offset >= linkStart + 2 && offset <= linkEnd - 1) {
            return true;
        }
    }

    return false;
}

describe('WikiLinkContextProvider ロジック検証', () => {
    describe('isPositionInWikiLink ロジック', () => {
        it('Simple PageリンクでWikiLink内の位置を正しく検出する', () => {
            const text = '- [[Simple Page]]';
            //           0123456789012345  6
            //           - [[Simple Page]]
            // linkStart=2, linkEnd=17, so valid range is 4-16

            // [[Simple Page]] の各位置をテスト
            expect(isPositionInWikiLink(text, 2)).to.be.false; // '[' の位置（1個目）
            expect(isPositionInWikiLink(text, 3)).to.be.false; // '[' の位置（2個目）
            expect(isPositionInWikiLink(text, 4)).to.be.true;  // 'S' の位置 ← これが重要（[[ の直後）
            expect(isPositionInWikiLink(text, 8)).to.be.true;  // 'l' の位置
            expect(isPositionInWikiLink(text, 11)).to.be.true; // ' ' の位置
            expect(isPositionInWikiLink(text, 14)).to.be.true; // 'e' の位置（]] の直前）
            expect(isPositionInWikiLink(text, 15)).to.be.true; // ']' の位置（1個目）
            expect(isPositionInWikiLink(text, 16)).to.be.true; // ']' の位置（2個目）
        });

        it('sample/test-document.mdの実際の内容でテストする', () => {
            const sampleLines = [
                '# Test Document for MDloggerForCode',
                '',
                'This document contains various WikiLink patterns to test the extension:',
                '',
                '## Simple Links',
                '- [[Simple Page]]',
                '- [[Another Note]]'
            ];
            const text = sampleLines.join('\n');

            // 5行目の '- [[Simple Page]]' の各位置を計算
            const line5Start = sampleLines.slice(0, 5).join('\n').length + 1; // +1 for newline

            // [[Simple Page]] 内の位置（[[ の直後から ]] の直前まで）
            const linkStart = line5Start + 2; // "- [["の"["の位置
            const simplePageStart = linkStart + 2; // "- [["の直後 = 'S'の位置
            expect(isPositionInWikiLink(text, simplePageStart)).to.be.true; // 'S'
            expect(isPositionInWikiLink(text, simplePageStart + 6)).to.be.true; // ' '
            expect(isPositionInWikiLink(text, simplePageStart + 7)).to.be.true; // 'P'

            // WikiLink外の位置
            expect(isPositionInWikiLink(text, line5Start + 1)).to.be.false; // '- '
        });

        it('複数のWikiLinkがある場合の検出', () => {
            const text = 'First [[Link One]] and [[Link Two]] text';

            // First Link のテスト
            expect(isPositionInWikiLink(text, 8)).to.be.true;  // 'L' in "Link One"
            expect(isPositionInWikiLink(text, 12)).to.be.true; // ' ' in "Link One"

            // 中間のテキスト
            expect(isPositionInWikiLink(text, 20)).to.be.false; // ' and '

            // Second Link のテスト
            expect(isPositionInWikiLink(text, 25)).to.be.true;  // 'L' in "Link Two"
            expect(isPositionInWikiLink(text, 29)).to.be.true;  // ' ' in "Link Two"
            expect(isPositionInWikiLink(text, 32)).to.be.true;  // 'o' in "Link Two"
        });

        it('不完全なWikiLinkの場合', () => {
            const text = 'Incomplete [[Link without closing';

            // 開始ブラケットはあるが終了ブラケットがない
            expect(isPositionInWikiLink(text, 13)).to.be.false; // 'L' の位置
            expect(isPositionInWikiLink(text, 18)).to.be.false; // ' ' の位置
        });
    });

    describe('実際のVSCodeファイルで検出できるかのシミュレーション', () => {
        it('test-document.mdでコマンド実行可能位置を特定', () => {
            // 実際のファイル内容をシミュレート
            const fileContent = `# Test Document for MDloggerForCode

This document contains various WikiLink patterns to test the extension:

## Simple Links
- [[Simple Page]]
- [[Another Note]]
- [[My Important Document]]

## Links with Display Names
- [[actual-file|Display Name]]`;

            // ファイル内容を行とオフセットで解析
            const lines = fileContent.split('\n');

            // 5行目の "- [[Simple Page]]" を探す
            const line5 = lines[5]; // 0-based index
            expect(line5).to.equal('- [[Simple Page]]');

            // この行での各位置での WikiLink 検出をテスト
            let line5Offset = 0;
            for (let i = 0; i < 5; i++) {
                line5Offset += lines[i].length + 1; // +1 for newline
            }

            // [[Simple Page]] 内の位置 - [[ の直後から ]] の直前まで
            const positions = [
                { char: 4, desc: 'after [[', expected: true },      // S（[[ の直後）
                { char: 7, desc: 'middle of Simple', expected: true }, // p
                { char: 11, desc: 'space', expected: true },         // ' '
                { char: 12, desc: 'P in Page', expected: true },     // P
                { char: 15, desc: 'end of Page', expected: true },   // ']' の直前
                { char: 16, desc: 'closing bracket', expected: true } // 2つ目の閉じ括弧
            ];

            positions.forEach(pos => {
                const offset = line5Offset + pos.char;
                const result = isPositionInWikiLink(fileContent, offset);
                expect(result).to.equal(pos.expected,
                    `Position ${pos.char} (${pos.desc}) should be ${pos.expected}`);
            });
        });
    });

    it('閉じ括弧上のカーソルでもWikiLink内と判定する', () => {
        const text = 'Example [[Page]] text';
        const secondClosingOffset = text.indexOf(']]') + 1; // 2つ目の ']' の位置

        const result = isPositionInWikiLink(text, secondClosingOffset);
        expect(result).to.be.true;
    });
});
