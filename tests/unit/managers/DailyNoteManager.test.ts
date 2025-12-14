import { describe, it, beforeEach } from 'mocha';
import { expect } from 'chai';
import * as vscode from 'vscode';
import { DailyNoteManager } from '../../../src/managers/DailyNoteManager';
import { ConfigurationManager } from '../../../src/managers/ConfigurationManager';
import { DateTimeFormatter } from '../../../src/utils/DateTimeFormatter';

describe('DailyNoteManager', () => {
    let dailyNoteManager: DailyNoteManager;
    let mockConfigManager: ConfigurationManager;
    let mockDateTimeFormatter: DateTimeFormatter;
    let mockWorkspaceFolder: vscode.WorkspaceFolder;

    beforeEach(() => {
        // ConfigurationManagerのモック
        mockConfigManager = {
            getDailyNoteTemplate: () => '',
            getDailyNotePath: () => 'dailynotes',
            getDateFormat: () => 'YYYY-MM-DD',
            getVaultRoot: () => '',
            getNoteExtension: () => '.md'
        } as any;

        // DateTimeFormatterのモック
        mockDateTimeFormatter = {
            formatDate: (date: Date, format: string) => {
                if (format === 'YYYY-MM-DD') {
                    return date.toISOString().split('T')[0];
                }
                return format;
            }
        } as any;

        // WorkspaceFolderのモック
        mockWorkspaceFolder = {
            uri: { fsPath: '/test/workspace' } as vscode.Uri,
            name: 'test-workspace',
            index: 0
        };

        dailyNoteManager = new DailyNoteManager(mockConfigManager, mockDateTimeFormatter);
    });

    describe('getDailyNoteFileName', () => {
        it('should generate correct filename with default format', () => {
            const testDate = new Date('2025-09-18');
            const fileName = dailyNoteManager.getDailyNoteFileName(testDate);

            expect(fileName).to.equal('2025-09-18.md');
        });

        it('should generate correct filename with custom format', () => {
            mockConfigManager.getDateFormat = () => 'YYYY-MM-DD';
            mockConfigManager.getNoteExtension = () => '.txt';

            const testDate = new Date('2025-09-18');
            const fileName = dailyNoteManager.getDailyNoteFileName(testDate);

            expect(fileName).to.equal('2025-09-18.txt');
        });
    });

    describe('getDailyNotePath', () => {
        it('should generate correct path with default dailynotes directory', () => {
            const testDate = new Date('2025-09-18');
            const path = dailyNoteManager.getDailyNotePath(mockWorkspaceFolder, testDate);

            expect(path.fsPath).to.include('dailynotes');
            expect(path.fsPath).to.include('2025-09-18.md');
        });

        it('should generate correct path with custom directory', () => {
            mockConfigManager.getDailyNotePath = () => 'journal';

            const testDate = new Date('2025-09-18');
            const path = dailyNoteManager.getDailyNotePath(mockWorkspaceFolder, testDate);

            expect(path.fsPath).to.include('journal');
            expect(path.fsPath).to.include('2025-09-18.md');
        });

        it('should handle vault root setting', () => {
            mockConfigManager.getVaultRoot = () => 'vault';

            const testDate = new Date('2025-09-18');
            const path = dailyNoteManager.getDailyNotePath(mockWorkspaceFolder, testDate);

            expect(path.fsPath).to.include('vault');
            expect(path.fsPath).to.include('dailynotes');
        });
    });

    describe('getTemplateContent', () => {
        it('should return empty string when no template specified', async () => {
            const content = await dailyNoteManager.getTemplateContent(mockWorkspaceFolder);

            expect(content).to.equal('');
        });

        it('should read template file when specified', async () => {
            mockConfigManager.getDailyNoteTemplate = () => 'templates/daily.md';

            // VS Code filesystem APIのモック
            const mockReadFile = async (uri: vscode.Uri): Promise<Uint8Array> => {
                if (uri.fsPath.includes('daily.md')) {
                    return new TextEncoder().encode('# Daily Note Template\n\n## Tasks\n- [ ] ');
                }
                throw new Error('File not found');
            };

            // vscode.workspace.fs.readFileをモック
            const originalReadFile = vscode.workspace.fs.readFile;
            (vscode.workspace.fs as any).readFile = mockReadFile;

            try {
                const content = await dailyNoteManager.getTemplateContent(mockWorkspaceFolder);
                expect(content).to.equal('# Daily Note Template\n\n## Tasks\n- [ ] ');
            } finally {
                (vscode.workspace.fs as any).readFile = originalReadFile;
            }
        });

        it('should return empty string when template file not found', async () => {
            mockConfigManager.getDailyNoteTemplate = () => 'nonexistent.md';

            // VS Code filesystem APIのモック（ファイルが見つからない場合）
            const mockReadFile = async (uri: vscode.Uri): Promise<Uint8Array> => {
                throw new Error('File not found');
            };

            const originalReadFile = vscode.workspace.fs.readFile;
            (vscode.workspace.fs as any).readFile = mockReadFile;

            try {
                const content = await dailyNoteManager.getTemplateContent(mockWorkspaceFolder);
                expect(content).to.equal('');
            } finally {
                (vscode.workspace.fs as any).readFile = originalReadFile;
            }
        });
    });

    describe('openOrCreateDailyNote', () => {
        it('should open existing daily note file', async () => {
            const testDate = new Date('2025-09-18');

            // VS Code filesystem APIのモック（ファイルが存在する場合）
            const mockStat = async (uri: vscode.Uri) => {
                return { type: vscode.FileType.File } as vscode.FileStat;
            };

            let openedUri: vscode.Uri | undefined;
            const mockShowTextDocument = async (uri: vscode.Uri) => {
                openedUri = uri;
                return {} as vscode.TextEditor;
            };

            const originalStat = vscode.workspace.fs.stat;
            const originalShowTextDocument = vscode.window.showTextDocument;

            (vscode.workspace.fs as any).stat = mockStat;
            (vscode.window as any).showTextDocument = mockShowTextDocument;

            try {
                await dailyNoteManager.openOrCreateDailyNote(mockWorkspaceFolder, testDate);

                expect(openedUri).to.not.be.undefined;
                expect(openedUri!.fsPath).to.include('2025-09-18.md');
            } finally {
                (vscode.workspace.fs as any).stat = originalStat;
                (vscode.window as any).showTextDocument = originalShowTextDocument;
            }
        });

        it('should create new daily note file when not exists', async () => {
            const testDate = new Date('2025-09-18');

            // VS Code filesystem APIのモック（ファイルが存在しない場合）
            const mockStat = async (uri: vscode.Uri) => {
                throw new Error('File not found');
            };

            let createdUri: vscode.Uri | undefined;
            let createdContent: string | undefined;

            const mockWriteFile = async (uri: vscode.Uri, content: Uint8Array) => {
                createdUri = uri;
                createdContent = new TextDecoder().decode(content);
            };

            const mockShowTextDocument = async (uri: vscode.Uri) => {
                return {} as vscode.TextEditor;
            };

            const originalStat = vscode.workspace.fs.stat;
            const originalWriteFile = vscode.workspace.fs.writeFile;
            const originalShowTextDocument = vscode.window.showTextDocument;

            (vscode.workspace.fs as any).stat = mockStat;
            (vscode.workspace.fs as any).writeFile = mockWriteFile;
            (vscode.window as any).showTextDocument = mockShowTextDocument;

            try {
                await dailyNoteManager.openOrCreateDailyNote(mockWorkspaceFolder, testDate);

                expect(createdUri).to.not.be.undefined;
                expect(createdUri!.fsPath).to.include('2025-09-18.md');
                expect(createdContent).to.equal('');
            } finally {
                (vscode.workspace.fs as any).stat = originalStat;
                (vscode.workspace.fs as any).writeFile = originalWriteFile;
                (vscode.window as any).showTextDocument = originalShowTextDocument;
            }
        });
    });
});