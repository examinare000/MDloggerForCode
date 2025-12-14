import { describe, it } from 'mocha';
import { expect } from 'chai';

// シンプルなテストファイル - DailyNoteManagerの基本機能確認
describe('DailyNoteManager - Basic Functionality', () => {

    it('should be importable', () => {
        // モジュールの読み込みテスト
        try {
            const { DailyNoteManager } = require('../../../src/managers/DailyNoteManager');
            expect(DailyNoteManager).to.be.a('function');
        } catch (error) {
            expect.fail('DailyNoteManager should be importable');
        }
    });

    it('should create instance with mocked dependencies', () => {
        const { DailyNoteManager } = require('../../../src/managers/DailyNoteManager');

        // ConfigurationManagerのモック
        const mockConfigManager = {
            getDateFormat: () => 'YYYY-MM-DD',
            getNoteExtension: () => '.md',
            getDailyNotePath: () => 'dailynotes',
            getDailyNoteTemplate: () => '',
            getVaultRoot: () => ''
        };

        // DateTimeFormatterのモック
        const mockDateTimeFormatter = {
            formatDate: (date: Date, format: string) => '2025-09-18'
        };

        const manager = new DailyNoteManager(mockConfigManager, mockDateTimeFormatter);
        expect(manager).to.be.an('object');
    });

    it('should generate correct daily note filename', () => {
        const { DailyNoteManager } = require('../../../src/managers/DailyNoteManager');

        const mockConfigManager = {
            getDateFormat: () => 'YYYY-MM-DD',
            getNoteExtension: () => '.md',
            getDailyNotePath: () => 'dailynotes',
            getDailyNoteTemplate: () => '',
            getVaultRoot: () => ''
        };

        const mockDateTimeFormatter = {
            formatDate: (date: Date, format: string) => '2025-09-18'
        };

        const manager = new DailyNoteManager(mockConfigManager, mockDateTimeFormatter);
        const testDate = new Date('2025-09-18');
        const fileName = manager.getDailyNoteFileName(testDate);

        expect(fileName).to.equal('2025-09-18.md');
    });

    it('should generate correct daily note path', () => {
        const { DailyNoteManager } = require('../../../src/managers/DailyNoteManager');

        const mockConfigManager = {
            getDateFormat: () => 'YYYY-MM-DD',
            getNoteExtension: () => '.md',
            getDailyNotePath: () => 'dailynotes',
            getDailyNoteTemplate: () => '',
            getVaultRoot: () => ''
        };

        const mockDateTimeFormatter = {
            formatDate: (date: Date, format: string) => '2025-09-18'
        };

        const mockWorkspaceFolder = {
            uri: { fsPath: '/test/workspace' },
            name: 'test-workspace',
            index: 0
        };

        const manager = new DailyNoteManager(mockConfigManager, mockDateTimeFormatter);
        const testDate = new Date('2025-09-18');
        const path = manager.getDailyNotePath(mockWorkspaceFolder, testDate);

        expect(path.fsPath).to.include('dailynotes');
        expect(path.fsPath).to.include('2025-09-18.md');
    });

    it('should return empty template when no template specified', async () => {
        const { DailyNoteManager } = require('../../../src/managers/DailyNoteManager');

        const mockConfigManager = {
            getDateFormat: () => 'YYYY-MM-DD',
            getNoteExtension: () => '.md',
            getDailyNotePath: () => 'dailynotes',
            getDailyNoteTemplate: () => '', // 空のテンプレート
            getVaultRoot: () => ''
        };

        const mockDateTimeFormatter = {
            formatDate: (date: Date, format: string) => '2025-09-18'
        };

        const mockWorkspaceFolder = {
            uri: { fsPath: '/test/workspace' },
            name: 'test-workspace',
            index: 0
        };

        const manager = new DailyNoteManager(mockConfigManager, mockDateTimeFormatter);
        const content = await manager.getTemplateContent(mockWorkspaceFolder);

        expect(content).to.equal('');
    });
});