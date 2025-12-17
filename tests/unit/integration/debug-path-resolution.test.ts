import { describe, it } from 'mocha';
import { expect } from 'chai';

describe('デバッグ: パス解決問題の調査', () => {
    describe('VS Code設定模擬テスト', () => {
        it('mdlg.vaultRootが未設定の場合の動作', () => {
            // VS Code設定のモック
            const mockVSCodeConfig = {
                get<T>(key: string, defaultValue?: T): T {
                    // mdlg.vaultRoot が未設定の場合、空文字がデフォルト
                    if (key === 'vaultRoot') {
                        return (defaultValue || '') as T;
                    }

                    if (key === 'noteExtension') {
                        return '.md' as T;
                    }

                    return defaultValue as T;
                },
                has: () => false,
                update: () => Promise.resolve()
            };

            // 実際のワークスペースパス模擬
            const workspacePath = '/Users/rio/git/MDloggerForCode';
            const fileName = 'Simple Page';

            // ConfigurationManagerの模擬
            const vaultRoot = mockVSCodeConfig.get('vaultRoot', '');
            const noteExtension = mockVSCodeConfig.get('noteExtension', '.md');

            // パス解決
            let resolvedPath: string;
            const vaultRootStr = String(vaultRoot);
            if (vaultRootStr && vaultRootStr.trim() !== '') {
                resolvedPath = `${vaultRoot}/${fileName}${noteExtension}`;
            } else {
                // 空の場合、ワークスペースルートを使用
                resolvedPath = `${workspacePath}/${fileName}${noteExtension}`;
            }

            // 検証
            expect(resolvedPath).to.equal('/Users/rio/git/MDloggerForCode/Simple Page.md');
            expect(resolvedPath).to.not.equal('/Simple Page.md'); // ルートディレクトリ作成を避ける
        });

        it('ConfigurationManager getVaultRoot() の実際の挙動', () => {
            // VS Codeの設定から取得される値をシミュレート
            interface TestConfig {
                get<T>(key: string, defaultValue?: T): T;
                has(key: string): boolean;
                update(key: string, value: any): Promise<void>;
            }

            const testConfig: TestConfig = {
                get<T>(key: string, defaultValue?: T): T {
                    // ユーザーが何も設定していない場合の動作
                    if (key === 'vaultRoot') {
                        // VS Codeでは未設定の場合、defaultValueが返される
                        return (defaultValue !== undefined ? defaultValue : '') as T;
                    }

                    return defaultValue as T;
                },
                has: (key: string) => false, // 設定がない
                update: (key: string, value: any) => Promise.resolve()
            };

            // ConfigurationManagerの動作を模擬
            function getVaultRoot(config: TestConfig): string {
                return config.get<string>('vaultRoot', '');
            }

            const result = getVaultRoot(testConfig);
            expect(result).to.equal(''); // 空文字が正常
        });
    });

    describe('実際のエラーケースの解析', () => {
        it('エラーメッセージ "Error: EROFS: read-only file system, open \'/Simple Page.md\'" の原因', () => {
            // エラーメッセージから推測されるパス
            const errorPath = '/Simple Page.md';

            // このパスが生成される条件を特定
            const possibleCauses = [
                'vaultRootが空でworkspaceFolderがnull',
                'vaultRootが"/"に設定されている',
                'パス結合ロジックのバグ',
                'VS Code環境でのワークスペース取得失敗'
            ];
            expect(possibleCauses).to.have.length.greaterThan(0);

            // ルートディレクトリパスが生成される条件を特定
            expect(errorPath.startsWith('/')).to.be.true;
            expect(errorPath.length).to.be.lessThan(20); // ワークスペースパスが含まれていない

            // これはワークスペースパスが適用されていないことを意味する
            const hasWorkspacePath = errorPath.includes('Users') || errorPath.includes('git');
            expect(hasWorkspacePath).to.be.false;
        });

        it('修正が必要な箇所の特定', () => {
            // エラーが発生するシナリオ
            const scenarios = [
                {
                    name: 'Scenario 1: workspaceFolder is undefined',
                    workspaceFolder: undefined,
                    vaultRoot: '',
                    expectedError: true
                },
                {
                    name: 'Scenario 2: vaultRoot is root directory',
                    workspaceFolder: { uri: { fsPath: '/Users/rio/git/MDloggerForCode' } },
                    vaultRoot: '/',
                    expectedError: true
                },
                {
                    name: 'Scenario 3: Normal case (should work)',
                    workspaceFolder: { uri: { fsPath: '/Users/rio/git/MDloggerForCode' } },
                    vaultRoot: '',
                    expectedError: false
                }
            ];

            scenarios.forEach(scenario => {
                if (scenario.workspaceFolder && scenario.vaultRoot === '') {
                    // 正常ケース
                    const expectedPath = `${scenario.workspaceFolder.uri.fsPath}/Simple Page.md`;
                    expect(expectedPath).to.not.equal('/Simple Page.md');
                } else if (!scenario.workspaceFolder) {
                    // workspaceFolderがない場合 - これがエラーの原因か？
                    expect(scenario.expectedError).to.be.true;
                } else if (scenario.vaultRoot === '/') {
                    // vaultRootがルートディレクトリの場合
                    const errorPath = `${scenario.vaultRoot}Simple Page.md`;
                    expect(errorPath).to.equal('/Simple Page.md');
                    expect(scenario.expectedError).to.be.true;
                }
            });
        });
    });
});
