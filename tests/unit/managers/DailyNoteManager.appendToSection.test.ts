import { expect } from 'chai';
import * as vscode from 'vscode';
import { DailyNoteManager } from '../../../src/managers/DailyNoteManager';
import { ConfigurationManager } from '../../../src/managers/ConfigurationManager';
import { DateTimeFormatter } from '../../../src/utils/DateTimeFormatter';
import { IFileWriter } from '../../../src/services/FileWriter';

/**
 * DailyNoteManager.appendToSection のユニットテスト
 *
 * IFileWriter を DI することで、vscode.workspace.fs に依存せずテスト可能になりました。
 */
describe('DailyNoteManager.appendToSection', () => {
    let dailyNoteManager: DailyNoteManager;
    let mockConfigManager: ConfigurationManager;
    let mockDateTimeFormatter: DateTimeFormatter;
    let mockWorkspaceFolder: vscode.WorkspaceFolder;
    let mockFileWriter: IFileWriter;
    let fileStore: Map<string, string>;

    beforeEach(() => {
        // In-memory file store
        fileStore = new Map();

        // ConfigurationManager mock
        mockConfigManager = {
            getDailyNoteTemplate: () => '',
            getDailyNotePath: () => 'dailynotes',
            getDateFormat: () => 'YYYY-MM-DD',
            getTimeFormat: () => 'HH:mm',
            getVaultRoot: () => '',
            getNoteExtension: () => '.md',
            getCaptureSectionName: () => 'Quick Notes'
        } as any;

        // DateTimeFormatter mock with fixed time for predictable tests
        mockDateTimeFormatter = {
            formatDate: (date: Date, _format: string) => {
                return date.toISOString().split('T')[0];
            },
            formatTime: (_date: Date, _format: string) => {
                // Return fixed time for predictable test output
                return '14:30';
            }
        } as any;

        // WorkspaceFolder mock
        mockWorkspaceFolder = {
            uri: vscode.Uri.file('/test/workspace'),
            name: 'test-workspace',
            index: 0
        };

        // IFileWriter mock using in-memory store
        mockFileWriter = {
            read: async (uri: vscode.Uri): Promise<string> => {
                const content = fileStore.get(uri.fsPath);
                if (content === undefined) {
                    throw new Error('File not found');
                }
                return content;
            },
            write: async (uri: vscode.Uri, content: string): Promise<void> => {
                fileStore.set(uri.fsPath, content);
            },
            exists: async (uri: vscode.Uri): Promise<boolean> => {
                return fileStore.has(uri.fsPath);
            },
            createDirectory: async (_uri: vscode.Uri): Promise<void> => {
                // No-op for in-memory store
            }
        };

        dailyNoteManager = new DailyNoteManager(
            mockConfigManager,
            mockDateTimeFormatter,
            mockFileWriter
        );
    });

    describe('空ファイルへのセクション作成と追記', () => {
        it('should create section and append content to empty file', async () => {
            const testDate = new Date('2025-11-07T14:30:00');
            const content = 'Test capture content';

            // Create empty file
            const dailyNoteUri = vscode.Uri.file('/test/workspace/dailynotes/2025-11-07.md');
            fileStore.set(dailyNoteUri.fsPath, '');

            const result = await dailyNoteManager.appendToSection(
                mockWorkspaceFolder,
                content,
                undefined, // Use default section name
                testDate
            );

            expect(result.uri.fsPath).to.equal(dailyNoteUri.fsPath);
            expect(result.line).to.be.a('number');

            // Check file contents
            const fileContent = fileStore.get(dailyNoteUri.fsPath)!;
            expect(fileContent).to.include('## Quick Notes');
            expect(fileContent).to.include('14:30 — Test capture content');
            expect(fileContent).to.match(/- \[ \] 14:30 — Test capture content/);
        });
    });

    describe('既存セクションへの追記', () => {
        it('should append content to existing section', async () => {
            const testDate = new Date('2025-11-07T15:45:00');
            const content = 'Another task';

            const dailyNoteUri = vscode.Uri.file('/test/workspace/dailynotes/2025-11-07.md');
            const initialContent = `# Daily Note

## Quick Notes
- [ ] 10:00 — First task

## Other Section
Some other content`;

            fileStore.set(dailyNoteUri.fsPath, initialContent);

            const result = await dailyNoteManager.appendToSection(
                mockWorkspaceFolder,
                content,
                undefined,
                testDate
            );

            const fileContent = fileStore.get(dailyNoteUri.fsPath)!;

            // Verify existing task is preserved
            expect(fileContent).to.include('- [ ] 10:00 — First task');

            // Verify new task is added
            expect(fileContent).to.include('- [ ] 14:30 — Another task');

            // Verify insertion order: Quick Notes < new task < Other Section
            const quickNotesIndex = fileContent.indexOf('## Quick Notes');
            const newTaskIndex = fileContent.indexOf('- [ ] 14:30 — Another task');
            const otherSectionIndex = fileContent.indexOf('## Other Section');

            expect(quickNotesIndex).to.be.lessThan(newTaskIndex);
            expect(newTaskIndex).to.be.lessThan(otherSectionIndex);
        });
    });

    describe('複数セクションがある場合の正しい位置への挿入', () => {
        it('should insert before next section heading', async () => {
            const testDate = new Date('2025-11-07T16:00:00');
            const content = 'Middle task';

            const dailyNoteUri = vscode.Uri.file('/test/workspace/dailynotes/2025-11-07.md');
            const initialContent = `# Daily Note

## Section 1
Content 1

## Quick Notes
- [ ] 10:00 — Task 1

## Section 2
Content 2

## Section 3
Content 3`;

            fileStore.set(dailyNoteUri.fsPath, initialContent);

            await dailyNoteManager.appendToSection(
                mockWorkspaceFolder,
                content,
                undefined,
                testDate
            );

            const fileContent = fileStore.get(dailyNoteUri.fsPath)!;

            // Verify new task is inserted between Quick Notes and Section 2
            const lines = fileContent.split('\n');
            const quickNotesIndex = lines.findIndex(line => line.includes('## Quick Notes'));
            const section2Index = lines.findIndex(line => line.includes('## Section 2'));
            const newTaskIndex = lines.findIndex(line => line.includes('14:30 — Middle task'));

            expect(newTaskIndex).to.be.greaterThan(quickNotesIndex);
            expect(newTaskIndex).to.be.lessThan(section2Index);
        });
    });

    describe('セクションがない場合の新規作成', () => {
        it('should create new section when it does not exist', async () => {
            const testDate = new Date('2025-11-07T17:00:00');
            const content = 'New section task';

            const dailyNoteUri = vscode.Uri.file('/test/workspace/dailynotes/2025-11-07.md');
            const initialContent = `# Daily Note

## Existing Section
Some content`;

            fileStore.set(dailyNoteUri.fsPath, initialContent);

            await dailyNoteManager.appendToSection(
                mockWorkspaceFolder,
                content,
                undefined,
                testDate
            );

            const fileContent = fileStore.get(dailyNoteUri.fsPath)!;

            // Verify new section is created
            expect(fileContent).to.include('## Quick Notes');
            expect(fileContent).to.include('- [ ] 14:30 — New section task');
        });

        it('should create section with custom name', async () => {
            const testDate = new Date('2025-11-07T18:00:00');
            const content = 'Custom section task';
            const customSectionName = 'My Custom Section';

            const dailyNoteUri = vscode.Uri.file('/test/workspace/dailynotes/2025-11-07.md');
            fileStore.set(dailyNoteUri.fsPath, '# Daily Note\n');

            await dailyNoteManager.appendToSection(
                mockWorkspaceFolder,
                content,
                customSectionName,
                testDate
            );

            const fileContent = fileStore.get(dailyNoteUri.fsPath)!;

            expect(fileContent).to.include(`## ${customSectionName}`);
            expect(fileContent).to.include('- [ ] 14:30 — Custom section task');
        });
    });

    describe('タイムスタンプ付き行の正しいフォーマット', () => {
        it('should format line with timestamp and checkbox', async () => {
            const testDate = new Date('2025-11-07T09:05:00');
            const content = 'Formatted task';

            const dailyNoteUri = vscode.Uri.file('/test/workspace/dailynotes/2025-11-07.md');
            fileStore.set(dailyNoteUri.fsPath, '');

            await dailyNoteManager.appendToSection(
                mockWorkspaceFolder,
                content,
                undefined,
                testDate
            );

            const fileContent = fileStore.get(dailyNoteUri.fsPath)!;

            // Format: "- [ ] HH:mm — content"
            expect(fileContent).to.match(/- \[ \] 14:30 — Formatted task/);
        });
    });

    describe('ファイルが存在しない場合の作成', () => {
        it('should create file if it does not exist', async () => {
            const testDate = new Date('2025-11-07T20:00:00');
            const content = 'Task in new file';

            // Do not pre-create the file

            const result = await dailyNoteManager.appendToSection(
                mockWorkspaceFolder,
                content,
                undefined,
                testDate
            );

            expect(result.uri.fsPath).to.include('2025-11-07.md');
            expect(result.line).to.be.a('number');

            // Verify file was created with content
            const fileContent = fileStore.get(result.uri.fsPath);
            expect(fileContent).to.exist;
            expect(fileContent).to.include('## Quick Notes');
            expect(fileContent).to.include('14:30 — Task in new file');
        });
    });

    describe('最後のセクションの場合、ファイル末尾に追記', () => {
        it('should append to end of file when section is last', async () => {
            const testDate = new Date('2025-11-07T21:00:00');
            const content = 'Last section task';

            const dailyNoteUri = vscode.Uri.file('/test/workspace/dailynotes/2025-11-07.md');
            const initialContent = `# Daily Note

## First Section
Content 1

## Quick Notes
- [ ] 10:00 — Task 1`;

            fileStore.set(dailyNoteUri.fsPath, initialContent);

            await dailyNoteManager.appendToSection(
                mockWorkspaceFolder,
                content,
                undefined,
                testDate
            );

            const fileContent = fileStore.get(dailyNoteUri.fsPath)!;

            // Verify new task is appended after existing task
            const lines = fileContent.split('\n');
            const task1Index = lines.findIndex(line => line.includes('10:00 — Task 1'));
            const newTaskIndex = lines.findIndex(line => line.includes('14:30 — Last section task'));

            expect(newTaskIndex).to.be.greaterThan(task1Index);
        });
    });

    describe('CRLF/LF normalization', () => {
        it('should preserve CRLF line endings when present', async () => {
            const testDate = new Date('2025-11-07T12:00:00');
            const content = 'Task with CRLF';

            const dailyNoteUri = vscode.Uri.file('/test/workspace/dailynotes/2025-11-07.md');
            const initialContent = '# Daily Note\r\n\r\n## Quick Notes\r\n- [ ] 10:00 — Task 1';

            fileStore.set(dailyNoteUri.fsPath, initialContent);

            await dailyNoteManager.appendToSection(
                mockWorkspaceFolder,
                content,
                undefined,
                testDate
            );

            const fileContent = fileStore.get(dailyNoteUri.fsPath)!;

            // CRLF should be preserved
            expect(fileContent).to.include('\r\n');
        });

        it('should use LF for files without CRLF', async () => {
            const testDate = new Date('2025-11-07T12:00:00');
            const content = 'Task with LF';

            const dailyNoteUri = vscode.Uri.file('/test/workspace/dailynotes/2025-11-07.md');
            const initialContent = '# Daily Note\n\n## Quick Notes\n- [ ] 10:00 — Task 1';

            fileStore.set(dailyNoteUri.fsPath, initialContent);

            await dailyNoteManager.appendToSection(
                mockWorkspaceFolder,
                content,
                undefined,
                testDate
            );

            const fileContent = fileStore.get(dailyNoteUri.fsPath)!;

            // Should not have CRLF
            expect(fileContent).to.not.include('\r\n');
        });
    });
});
