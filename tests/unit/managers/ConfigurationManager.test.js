"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mocha_1 = require("mocha");
const chai_1 = require("chai");
const ConfigurationManager_1 = require("../../../src/managers/ConfigurationManager");
// VS Code Configuration APIのモック
class MockWorkspaceConfiguration {
    constructor(configData = {}) {
        this.configData = configData;
    }
    get(key, defaultValue) {
        const keys = key.split('.');
        let value = this.configData;
        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            }
            else {
                return defaultValue;
            }
        }
        return value;
    }
    has(key) {
        return this.get(key) !== undefined;
    }
    update(key, value) {
        const keys = key.split('.');
        let target = this.configData;
        for (let i = 0; i < keys.length - 1; i++) {
            const k = keys[i];
            if (!target[k] || typeof target[k] !== 'object') {
                target[k] = {};
            }
            target = target[k];
        }
        target[keys[keys.length - 1]] = value;
        return Promise.resolve();
    }
}
(0, mocha_1.describe)('ConfigurationManager', () => {
    let configManager;
    let mockConfig;
    (0, mocha_1.beforeEach)(() => {
        mockConfig = new MockWorkspaceConfiguration({
            mdlg: {
                vaultRoot: '/test/vault',
                noteExtension: '.md',
                slugStrategy: 'passthrough',
                dateFormat: 'YYYY-MM-DD',
                timeFormat: 'HH:mm',
                template: '# {{title}}\n\n'
            }
        });
        configManager = new ConfigurationManager_1.ConfigurationManager(mockConfig);
    });
    (0, mocha_1.describe)('基本設定取得', () => {
        (0, mocha_1.it)('vaultRootの設定値を取得できる', () => {
            const vaultRoot = configManager.getVaultRoot();
            (0, chai_1.expect)(vaultRoot).to.equal('/test/vault');
        });
        (0, mocha_1.it)('noteExtensionのデフォルト値を取得できる', () => {
            const mockConfigEmpty = new MockWorkspaceConfiguration();
            const manager = new ConfigurationManager_1.ConfigurationManager(mockConfigEmpty);
            const extension = manager.getNoteExtension();
            (0, chai_1.expect)(extension).to.equal('.md');
        });
        (0, mocha_1.it)('カスタムnoteExtension値を取得できる', () => {
            mockConfig.update('mdlg.noteExtension', '.txt');
            const extension = configManager.getNoteExtension();
            (0, chai_1.expect)(extension).to.equal('.txt');
        });
        (0, mocha_1.it)('slugStrategyの設定値を取得できる', () => {
            const strategy = configManager.getSlugStrategy();
            (0, chai_1.expect)(strategy).to.equal('passthrough');
        });
        (0, mocha_1.it)('無効なslugStrategyの場合デフォルト値を返す', () => {
            mockConfig.update('mdlg.slugStrategy', 'invalid-strategy');
            const strategy = configManager.getSlugStrategy();
            (0, chai_1.expect)(strategy).to.equal('passthrough');
        });
    });
    (0, mocha_1.describe)('日時フォーマット設定', () => {
        (0, mocha_1.it)('dateFormatの設定値を取得できる', () => {
            const format = configManager.getDateFormat();
            (0, chai_1.expect)(format).to.equal('YYYY-MM-DD');
        });
        (0, mocha_1.it)('timeFormatの設定値を取得できる', () => {
            const format = configManager.getTimeFormat();
            (0, chai_1.expect)(format).to.equal('HH:mm');
        });
        (0, mocha_1.it)('カスタム日付フォーマットを取得できる', () => {
            mockConfig.update('mdlg.dateFormat', 'DD/MM/YYYY');
            const format = configManager.getDateFormat();
            (0, chai_1.expect)(format).to.equal('DD/MM/YYYY');
        });
    });
    (0, mocha_1.describe)('テンプレート機能', () => {
        (0, mocha_1.it)('テンプレート設定値を取得できる', () => {
            const template = configManager.getTemplate();
            (0, chai_1.expect)(template).to.equal('# {{title}}\n\n');
        });
        (0, mocha_1.it)('空のテンプレートを処理できる', () => {
            mockConfig.update('mdlg.template', '');
            const template = configManager.getTemplate();
            (0, chai_1.expect)(template).to.equal('');
        });
    });
    (0, mocha_1.describe)('設定検証', () => {
        (0, mocha_1.it)('有効な設定を正しく検証する', () => {
            const config = {
                vaultRoot: '/valid/path',
                noteExtension: '.md',
                slugStrategy: 'kebab-case',
                dateFormat: 'YYYY-MM-DD',
                timeFormat: 'HH:mm',
                template: '# Title\n'
            };
            const result = configManager.validateConfiguration(config);
            (0, chai_1.expect)(result.isValid).to.be.true;
            (0, chai_1.expect)(result.errors).to.have.length(0);
        });
        (0, mocha_1.it)('無効なslugStrategyでエラーを返す', () => {
            const config = {
                slugStrategy: 'invalid-strategy'
            };
            const result = configManager.validateConfiguration(config);
            (0, chai_1.expect)(result.isValid).to.be.false;
            (0, chai_1.expect)(result.errors).to.have.length(1);
            (0, chai_1.expect)(result.errors[0].field).to.equal('slugStrategy');
        });
        (0, mocha_1.it)('空のvaultRootで警告を返す', () => {
            const config = {
                vaultRoot: ''
            };
            const result = configManager.validateConfiguration(config);
            (0, chai_1.expect)(result.warnings).to.have.length(1);
            (0, chai_1.expect)(result.warnings[0].field).to.equal('vaultRoot');
        });
        (0, mocha_1.it)('無効な日付フォーマットでエラーを返す', () => {
            const config = {
                dateFormat: 'invalid-format'
            };
            const result = configManager.validateConfiguration(config);
            (0, chai_1.expect)(result.isValid).to.be.false;
            (0, chai_1.expect)(result.errors).to.have.length(1);
            (0, chai_1.expect)(result.errors[0].field).to.equal('dateFormat');
        });
    });
    (0, mocha_1.describe)('全設定取得', () => {
        (0, mocha_1.it)('すべての設定を含むオブジェクトを返す', () => {
            const config = configManager.getConfiguration();
            (0, chai_1.expect)(config).to.deep.include({
                vaultRoot: '/test/vault',
                noteExtension: '.md',
                slugStrategy: 'passthrough',
                dateFormat: 'YYYY-MM-DD',
                timeFormat: 'HH:mm',
                template: '# {{title}}\n\n'
            });
        });
    });
    (0, mocha_1.describe)('設定変更監視', () => {
        (0, mocha_1.it)('設定変更コールバックを登録できる', () => {
            let callbackCalled = false;
            let callbackConfig;
            const disposable = configManager.onConfigurationChanged((config) => {
                callbackCalled = true;
                callbackConfig = config;
            });
            // 設定変更をシミュレート
            mockConfig.update('mdlg.vaultRoot', '/new/vault');
            configManager.triggerConfigurationChanged(); // テスト用メソッド
            (0, chai_1.expect)(callbackCalled).to.be.true;
            (0, chai_1.expect)(callbackConfig.vaultRoot).to.equal('/new/vault');
            disposable.dispose();
        });
    });
});
//# sourceMappingURL=ConfigurationManager.test.js.map
