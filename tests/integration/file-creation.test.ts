import { describe, it, before } from 'mocha';
import { expect } from 'chai';
import * as vscode from 'vscode';
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

        // ConfigurationManagerのセットアップ（グローバルモックを使用）
        const config = vscode.workspace.getConfiguration('mdlg');
        configManager = new ConfigurationManager(config);
    });

    it('should handle file names with spaces correctly', async function() {
        const testFileName = 'Simple Page';
        const sanitizedName = testFileName.replace(/[/\\:*?"<>|]/g, '-').replace(/\s+/g, ' ').trim();
        
        const targetUri = vscode.Uri.joinPath(testWorkspaceUri, `${sanitizedName}.md`);
        
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
                // クリーンアップ失敗は無視（テスト本体の検証には影響しない）
            }
        }
    });
});
