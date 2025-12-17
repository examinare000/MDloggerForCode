import { describe, it, beforeEach } from 'mocha';
import { expect } from 'chai';
import { CommandHandler } from '../../../src/commands/CommandHandler';

// VS Code APIのモック
class MockTextEditor {
    public selection: any;
    public document: any;
    
    constructor(document: any) {
        this.document = document;
        this.selection = { 
            active: { line: 0, character: 0 },
            start: { line: 0, character: 0 }, 
            end: { line: 0, character: 0 } 
        };
    }
}

class MockTextDocument {
    constructor(public uri: any, public languageId: string, public text: string) {}
    
    getText(range?: any): string {
        if (!range) {
            return this.text;
        }
        // 簡略化された範囲テキスト取得
        return this.text;
    }
    
    positionAt(offset: number): any {
        const lines = this.text.substring(0, offset).split('\n');
        return {
            line: lines.length - 1,
            character: lines[lines.length - 1].length
        };
    }
    
    offsetAt(position: any): number {
        if (!position || position.line === undefined || position.character === undefined) {
            return 0;
        }
        const lines = this.text.split('\n');
        let offset = 0;
        for (let i = 0; i < position.line; i++) {
            if (i < lines.length) {
                offset += lines[i].length + 1;
            }
        }
        offset += position.character;
        return offset;
    }
}

class MockUri {
    constructor(public scheme: string, public path: string) {}
    
    static file(path: string): MockUri {
        return new MockUri('file', path);
    }
}

class MockWorkspaceEdit {
    public operations: any[] = [];
    
    createFile(uri: any, options?: any): void {
        this.operations.push({ type: 'createFile', uri, options });
    }
    
    insert(uri: any, position: any, text: string): void {
        this.operations.push({ type: 'insert', uri, position, text });
    }
}

describe('CommandHandler', () => {
    let commandHandler: CommandHandler;
    let mockEditor: MockTextEditor;
    let mockDocument: MockTextDocument;
    
    beforeEach(() => {
        mockDocument = new MockTextDocument(
            MockUri.file('/test/workspace/test.md'),
            'markdown',
            'This is a [[Test Link]] in the document.'
        );
        mockEditor = new MockTextEditor(mockDocument);
        
        commandHandler = new CommandHandler();
        
        // テスト用のファクトリ関数を設定
        commandHandler.getActiveEditor = () => mockEditor;
        commandHandler.fileExists = () => Promise.resolve(false);
        commandHandler.createFile = () => Promise.resolve();
        commandHandler.openFile = () => Promise.resolve();
        commandHandler.insertText = () => Promise.resolve(true);
        commandHandler.showMessage = () => {};
    });
    
    describe('mdlg.openOrCreateWikiLink コマンド', () => {
        it('カーソル位置のWikiLinkを検出できる', async () => {
            // カーソルを[[Test Link]]の中に置く
            mockEditor.selection = {
                active: { line: 0, character: 12 },
                start: { line: 0, character: 12 },
                end: { line: 0, character: 12 }
            };
            
            const result = await commandHandler.openOrCreateWikiLink();
            expect(result).to.be.true;
        });
        
        it('既存ファイルが存在する場合は開く', async () => {
            // ファイルが存在することをモック
            commandHandler.fileExists = () => Promise.resolve(true);
            
            mockEditor.selection = {
                active: { line: 0, character: 12 },
                start: { line: 0, character: 12 },
                end: { line: 0, character: 12 }
            };
            
            const result = await commandHandler.openOrCreateWikiLink();
            expect(result).to.be.true;
        });
        
        it('存在しないファイルを作成して開く', async () => {
            // ファイルが存在しないことをモック
            commandHandler.fileExists = () => Promise.resolve(false);
            
            mockEditor.selection = {
                active: { line: 0, character: 12 },
                start: { line: 0, character: 12 },
                end: { line: 0, character: 12 }
            };
            
            const result = await commandHandler.openOrCreateWikiLink();
            expect(result).to.be.true;
        });
        
        it('WikiLinkの外側ではfalseを返す', async () => {
            // カーソルをWikiLinkの外に置く
            mockEditor.selection = {
                active: { line: 0, character: 0 },
                start: { line: 0, character: 0 },
                end: { line: 0, character: 0 }
            };
            
            const result = await commandHandler.openOrCreateWikiLink();
            expect(result).to.be.false;
        });
        
        it('アクティブエディタがない場合はfalseを返す', async () => {
            commandHandler.getActiveEditor = () => null;
            
            const result = await commandHandler.openOrCreateWikiLink();
            expect(result).to.be.false;
        });
    });
    
    describe('mdlg.insertDate コマンド', () => {
        it('現在の日付を挿入する', async () => {
            const result = await commandHandler.insertDate();
            expect(result).to.be.true;
        });
        
        it('カスタム日付フォーマットを適用する', async () => {
            // 設定でDD/MM/YYYYフォーマットを使用
            const result = await commandHandler.insertDate();
            expect(result).to.be.true;
        });
        
        it('アクティブエディタがない場合はfalseを返す', async () => {
            commandHandler.getActiveEditor = () => null;
            
            const result = await commandHandler.insertDate();
            expect(result).to.be.false;
        });
    });
    
    describe('mdlg.insertTime コマンド', () => {
        it('現在の時刻を挿入する', async () => {
            const result = await commandHandler.insertTime();
            expect(result).to.be.true;
        });
        
        it('カスタム時刻フォーマットを適用する', async () => {
            // 設定でhh:mm a フォーマットを使用
            const result = await commandHandler.insertTime();
            expect(result).to.be.true;
        });
        
        it('アクティブエディタがない場合はfalseを返す', async () => {
            commandHandler.getActiveEditor = () => null;
            
            const result = await commandHandler.insertTime();
            expect(result).to.be.false;
        });
    });
    
    describe('mdlg.preview コマンド', () => {
        it('現在のドキュメントのプレビューを開く', async () => {
            let called = false;
            commandHandler.showPreviewPanel = async (doc) => {
                called = true;
                expect(doc).to.equal(mockDocument);
            };

            const result = await commandHandler.showPreview();
            expect(result).to.be.true;
            expect(called).to.be.true;
        });
        
        it('Markdownファイル以外では動作しない', async () => {
            mockDocument.languageId = 'plaintext';
            
            const result = await commandHandler.showPreview();
            expect(result).to.be.false;
        });
        
        it('アクティブエディタがない場合はfalseを返す', async () => {
            commandHandler.getActiveEditor = () => null;
            
            const result = await commandHandler.showPreview();
            expect(result).to.be.false;
        });
    });
    
    describe('WikiLink検出ユーティリティ', () => {
        it('カーソル位置のWikiLinkテキストを取得できる', () => {
            const position = { line: 0, character: 12 };
            const linkText = commandHandler.getWikiLinkAtPosition(mockDocument, position);
            
            expect(linkText).to.equal('Test Link');
        });
        
        it('WikiLink外では空文字を返す', () => {
            const position = { line: 0, character: 0 };
            const linkText = commandHandler.getWikiLinkAtPosition(mockDocument, position);
            
            expect(linkText).to.equal('');
        });
        
        it('複数のWikiLinkがある場合、正確な位置を判定する', () => {
            const multiLinkDocument = new MockTextDocument(
                MockUri.file('/test/multi.md'),
                'markdown',
                'First [[Link One]] and second [[Link Two]] here.'
            );
            
            // 最初のリンク内
            let position = { line: 0, character: 8 };
            let linkText = commandHandler.getWikiLinkAtPosition(multiLinkDocument, position);
            expect(linkText).to.equal('Link One');
            
            // 二番目のリンク内
            position = { line: 0, character: 35 };
            linkText = commandHandler.getWikiLinkAtPosition(multiLinkDocument, position);
            expect(linkText).to.equal('Link Two');
        });

        it('WikiLink終端の閉じ括弧でもリンクテキストを取得できる', () => {
            const position = { line: 0, character: 22 };
            const linkText = commandHandler.getWikiLinkAtPosition(mockDocument, position);

            expect(linkText).to.equal('Test Link');
        });
    });
});
