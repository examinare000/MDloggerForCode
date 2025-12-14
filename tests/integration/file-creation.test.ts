import { describe, it, before } from 'mocha';
import { expect } from 'chai';
import * as vscode from 'vscode';
import * as path from 'path';
import { WikiLinkProcessor } from '../../src/processors/WikiLinkProcessor';
import { ConfigurationManager } from '../../src/managers/ConfigurationManager';

describe('File Creation Integration Tests', function() {
    let testWorkspaceUri: vscode.Uri;
    let configManager: ConfigurationManager;

    before(async function() {
        this.timeout(5000);
        
        // テスト用ワークスペースの設定
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            throw new Error('No workspace folder found for testing');
        }
        
        testWorkspaceUri = workspaceFolders[0].uri;
        console.log(`Test workspace: ${testWorkspaceUri.fsPath}`);

        // ConfigurationManagerのセットアップ（グローバルモックを使用）
        const config = vscode.workspace.getConfiguration('mdlg');
        configManager = new ConfigurationManager(config);
    });

    it.skip('should create file with correct path in workspace root', async function() {
        // Skip: Requires actual file system operations not supported by global mock
        const wikiLinkProcessor = new WikiLinkProcessor({ slugStrategy: 'passthrough' });
        const parsedLink = wikiLinkProcessor.parseWikiLink('Test Page');
        let fileName = wikiLinkProcessor.transformFileName(parsedLink.pageName);
        
        // ファイル名を安全にする
        fileName = fileName.replace(/[/\\:*?"<>|]/g, '-').replace(/\s+/g, ' ').trim();
        
        const extension = configManager.getNoteExtension();
        const vaultRoot = configManager.getVaultRoot();
        
        // ファイルパス作成
        let targetUri: vscode.Uri;
        if (vaultRoot && vaultRoot.trim() !== '') {
            if (vaultRoot.startsWith('/') || vaultRoot.match(/^[A-Za-z]:/)) {
                targetUri = vscode.Uri.file(`${vaultRoot}/${fileName}${extension}`);
            } else {
                targetUri = vscode.Uri.joinPath(testWorkspaceUri, vaultRoot, `${fileName}${extension}`);
            }
        } else {
            targetUri = vscode.Uri.joinPath(testWorkspaceUri, `${fileName}${extension}`);
        }
        
        console.log(`Target URI: ${targetUri.toString()}`);
        console.log(`Target path: ${targetUri.fsPath}`);
        
        // ファイルが存在しないことを確認
        let fileExists = false;
        try {
            await vscode.workspace.fs.stat(targetUri);
            fileExists = true;
        } catch (error) {
            // ファイルが存在しない場合は期待通り
        }
        
        if (fileExists) {
            // 既存ファイルを削除してクリーンな状態にする
            await vscode.workspace.fs.delete(targetUri);
        }
        
        // ファイル作成
        const template = configManager.getTemplate();
        const content = template || `# ${parsedLink.pageName}\n\nContent here...`;
        const data = new TextEncoder().encode(content);
        
        try {
            await vscode.workspace.fs.writeFile(targetUri, data);
            console.log(`File created successfully at: ${targetUri.fsPath}`);
            
            // ファイルが作成されたことを確認
            const stat = await vscode.workspace.fs.stat(targetUri);
            expect(stat).to.exist;
            expect(stat.type).to.equal(vscode.FileType.File);
            
            // ファイル内容を確認
            const readData = await vscode.workspace.fs.readFile(targetUri);
            const readContent = new TextDecoder().decode(readData);
            // グローバルモックのテンプレート: '# {{title}}\n\n'
            expect(readContent).to.equal('# {{title}}\n\n');
            
        } finally {
            // テスト後のクリーンアップ
            try {
                await vscode.workspace.fs.delete(targetUri);
            } catch (error) {
                console.log('Cleanup error:', error);
            }
        }
    });

    it('should handle file names with spaces correctly', async function() {
        const testFileName = 'Simple Page';
        const sanitizedName = testFileName.replace(/[/\\:*?"<>|]/g, '-').replace(/\s+/g, ' ').trim();
        
        const targetUri = vscode.Uri.joinPath(testWorkspaceUri, `${sanitizedName}.md`);
        
        console.log(`Testing file with spaces: ${targetUri.fsPath}`);
        
        // URIのfsPathがルートディレクトリでないことを確認
        expect(targetUri.fsPath).to.not.equal('/Simple Page.md');
        expect(targetUri.fsPath).to.include(testWorkspaceUri.fsPath);
        
        // ファイル作成テスト
        const content = `# ${testFileName}\n\nTest content`;
        const data = new TextEncoder().encode(content);
        
        try {
            await vscode.workspace.fs.writeFile(targetUri, data);
            
            const stat = await vscode.workspace.fs.stat(targetUri);
            expect(stat.type).to.equal(vscode.FileType.File);
            
        } finally {
            try {
                await vscode.workspace.fs.delete(targetUri);
            } catch (error) {
                console.log('Cleanup error:', error);
            }
        }
    });
});
