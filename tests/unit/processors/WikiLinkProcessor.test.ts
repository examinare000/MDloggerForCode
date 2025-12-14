import { describe, it, beforeEach } from 'mocha';
import { expect } from 'chai';
import { WikiLinkProcessor, ParsedWikiLink, WikiLinkError } from '../../../src/processors/WikiLinkProcessor';

describe('WikiLinkProcessor', () => {
    let processor: WikiLinkProcessor;

    beforeEach(() => {
        processor = new WikiLinkProcessor();
    });

    describe('parseWikiLink', () => {
        it('シンプルなWikiLinkを解析できる', () => {
            // テスト対象: [[Simple Page]]
            const linkText = 'Simple Page';
            const result = processor.parseWikiLink(linkText);
            
            const expected: ParsedWikiLink = {
                pageName: 'Simple Page',
                isAlias: false
            };
            
            expect(result).to.deep.equal(expected);
        });

        it('別名付きWikiLinkを解析できる', () => {
            // テスト対象: [[Target Page|Display Name]]
            const linkText = 'Target Page|Display Name';
            const result = processor.parseWikiLink(linkText);
            
            const expected: ParsedWikiLink = {
                pageName: 'Target Page',
                displayName: 'Display Name',
                isAlias: true
            };
            
            expect(result).to.deep.equal(expected);
        });

        it('見出しリンクを解析できる', () => {
            // テスト対象: [[Page Name#Heading]]
            const linkText = 'Page Name#Heading';
            const result = processor.parseWikiLink(linkText);
            
            const expected: ParsedWikiLink = {
                pageName: 'Page Name',
                heading: 'Heading',
                isAlias: false
            };
            
            expect(result).to.deep.equal(expected);
        });

        it('複雑なWikiLink（別名+見出し）を解析できる', () => {
            // テスト対象: [[Target#Section|Display]]
            const linkText = 'Target#Section|Display';
            const result = processor.parseWikiLink(linkText);
            
            const expected: ParsedWikiLink = {
                pageName: 'Target',
                heading: 'Section',
                displayName: 'Display',
                isAlias: true
            };
            
            expect(result).to.deep.equal(expected);
        });

        it('空文字を渡すとWikiLinkErrorを投げる', () => {
            expect(() => processor.parseWikiLink('')).to.throw(WikiLinkError, 'WikiLink text cannot be empty');
        });

        it('前後の空白を除去する', () => {
            const linkText = '  Trimmed Page  ';
            const result = processor.parseWikiLink(linkText);
            
            expect(result.pageName).to.equal('Trimmed Page');
        });
    });

    describe('ファイル名変換機能', () => {
        it('passthroughモードでは元の名前を保持する', () => {
            const processor = new WikiLinkProcessor({ slugStrategy: 'passthrough' });
            const result = processor.transformFileName('My Test Page');
            
            expect(result).to.equal('My Test Page');
        });

        it('kebab-caseモードではハイフン区切りに変換する', () => {
            const processor = new WikiLinkProcessor({ slugStrategy: 'kebab-case' });
            const result = processor.transformFileName('My Test Page');
            
            expect(result).to.equal('my-test-page');
        });

        it('snake_caseモードではアンダースコア区切りに変換する', () => {
            const processor = new WikiLinkProcessor({ slugStrategy: 'snake_case' });
            const result = processor.transformFileName('My Test Page');
            
            expect(result).to.equal('my_test_page');
        });

        it('特殊文字を安全な文字に変換する', () => {
            const processor = new WikiLinkProcessor({ slugStrategy: 'kebab-case' });
            const result = processor.transformFileName('Page with/special:chars?');
            
            expect(result).to.equal('page-with-special-chars');
        });
    });
});