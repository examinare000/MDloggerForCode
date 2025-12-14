/**
 * @fileoverview Unit tests for NoteFinder utility.
 * Tests note searching functionality across subdirectories.
 *
 * @author MDloggerForCode Team
 * @version 1.0.0
 */

import { describe, it, afterEach } from 'mocha';
import { expect } from 'chai';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import { NoteFinder } from '../../src/utils/NoteFinder';

describe('NoteFinder', () => {
    let findFilesStub: sinon.SinonStub;

    afterEach(() => {
        sinon.restore();
    });

    describe('findNoteByTitle', () => {
        it('should find note in subdirectory by exact title match', async () => {
            const mockWorkspaceFolder: vscode.WorkspaceFolder = {
                uri: vscode.Uri.file('/test/workspace'),
                name: 'test-workspace',
                index: 0
            };

            const mockFiles = [
                vscode.Uri.file('/test/workspace/notes/subfolder/Meeting Notes.md')
            ];

            findFilesStub = sinon.stub(vscode.workspace, 'findFiles')
                .resolves(mockFiles);

            const result = await NoteFinder.findNoteByTitle(
                'Meeting Notes',
                mockWorkspaceFolder,
                'notes',
                '.md'
            );

            expect(result).to.not.be.null;
            expect(result!.title).to.equal('Meeting Notes');
            expect(result!.uri.fsPath).to.include('Meeting Notes.md');
        });

        it('should prioritize root level files over subdirectory files', async () => {
            const mockWorkspaceFolder: vscode.WorkspaceFolder = {
                uri: vscode.Uri.file('/test/workspace'),
                name: 'test-workspace',
                index: 0
            };

            const mockFiles = [
                vscode.Uri.file('/test/workspace/notes/deep/folder/Test.md'),
                vscode.Uri.file('/test/workspace/notes/Test.md')
            ];

            findFilesStub = sinon.stub(vscode.workspace, 'findFiles')
                .resolves(mockFiles);

            const result = await NoteFinder.findNoteByTitle(
                'Test',
                mockWorkspaceFolder,
                'notes',
                '.md'
            );

            expect(result).to.not.be.null;
            // Should return the shallower path (notes/Test.md)
            expect(result!.relativePath).to.equal('Test.md');
        });

        it('should return null when no matching file is found', async () => {
            const mockWorkspaceFolder: vscode.WorkspaceFolder = {
                uri: vscode.Uri.file('/test/workspace'),
                name: 'test-workspace',
                index: 0
            };

            findFilesStub = sinon.stub(vscode.workspace, 'findFiles')
                .resolves([]);

            const result = await NoteFinder.findNoteByTitle(
                'NonExistent',
                mockWorkspaceFolder,
                'notes',
                '.md'
            );

            expect(result).to.be.null;
        });
    });

    describe('findNotesByPrefix', () => {
        it('should find all notes with titles starting with prefix', async () => {
            const mockWorkspaceFolder: vscode.WorkspaceFolder = {
                uri: vscode.Uri.file('/test/workspace'),
                name: 'test-workspace',
                index: 0
            };

            const mockFiles = [
                vscode.Uri.file('/test/workspace/notes/Project Plan.md'),
                vscode.Uri.file('/test/workspace/notes/Project Notes.md'),
                vscode.Uri.file('/test/workspace/notes/Project Overview.md')
            ];

            findFilesStub = sinon.stub(vscode.workspace, 'findFiles')
                .resolves(mockFiles);

            const result = await NoteFinder.findNotesByPrefix(
                'Project',
                mockWorkspaceFolder,
                'notes',
                '.md',
                10
            );

            expect(result).to.have.lengthOf(3);
            expect(result[0].title).to.include('Project');
            expect(result[1].title).to.include('Project');
            expect(result[2].title).to.include('Project');
        });

        it('should be case-insensitive when matching prefixes', async () => {
            const mockWorkspaceFolder: vscode.WorkspaceFolder = {
                uri: vscode.Uri.file('/test/workspace'),
                name: 'test-workspace',
                index: 0
            };

            const mockFiles = [
                vscode.Uri.file('/test/workspace/notes/Test.md'),
                vscode.Uri.file('/test/workspace/notes/testing.md'),
                vscode.Uri.file('/test/workspace/notes/TEST FILE.md')
            ];

            findFilesStub = sinon.stub(vscode.workspace, 'findFiles')
                .resolves(mockFiles);

            const result = await NoteFinder.findNotesByPrefix(
                'test',
                mockWorkspaceFolder,
                'notes',
                '.md',
                10
            );

            expect(result).to.have.lengthOf(3);
            expect(result[0].title.toLowerCase()).to.include('test');
            expect(result[1].title.toLowerCase()).to.include('test');
            expect(result[2].title.toLowerCase()).to.include('test');
        });

        it('should sort results by relevance (exact match first, then depth, then alphabetically)', async () => {
            const mockWorkspaceFolder: vscode.WorkspaceFolder = {
                uri: vscode.Uri.file('/test/workspace'),
                name: 'test-workspace',
                index: 0
            };

            const mockFiles = [
                vscode.Uri.file('/test/workspace/notes/deep/folder/Test.md'),
                vscode.Uri.file('/test/workspace/notes/Testing.md'),
                vscode.Uri.file('/test/workspace/notes/Test.md'),
                vscode.Uri.file('/test/workspace/notes/subfolder/Test Cases.md')
            ];

            findFilesStub = sinon.stub(vscode.workspace, 'findFiles')
                .resolves(mockFiles);

            const result = await NoteFinder.findNotesByPrefix(
                'Test',
                mockWorkspaceFolder,
                'notes',
                '.md',
                10
            );

            expect(result).to.have.lengthOf(4);
            // First should be exact match at shallowest depth
            expect(result[0].title).to.equal('Test');
            expect(result[0].relativePath).to.equal('Test.md');
        });

        it('should respect maxResults parameter and return top-ranked entries', async () => {
            const mockWorkspaceFolder: vscode.WorkspaceFolder = {
                uri: vscode.Uri.file('/test/workspace'),
                name: 'test-workspace',
                index: 0
            };

            const mockFiles = [
                vscode.Uri.file('/test/workspace/notes/Note1.md'),
                vscode.Uri.file('/test/workspace/notes/Note2.md'),
                vscode.Uri.file('/test/workspace/notes/Note3.md'),
                vscode.Uri.file('/test/workspace/notes/Note4.md'),
                vscode.Uri.file('/test/workspace/notes/Note5.md')
            ];

            findFilesStub = sinon.stub(vscode.workspace, 'findFiles')
                .resolves(mockFiles);

            const result = await NoteFinder.findNotesByPrefix(
                'Note',
                mockWorkspaceFolder,
                'notes',
                '.md',
                3 // maxResults = 3
            );

            // Should return only 3 results, even though 5 files match
            expect(result).to.have.lengthOf(3);
        });

        it('should prioritize exact matches even when found later in the list', async () => {
            const mockWorkspaceFolder: vscode.WorkspaceFolder = {
                uri: vscode.Uri.file('/test/workspace'),
                name: 'test-workspace',
                index: 0
            };

            const mockFiles = [
                vscode.Uri.file('/test/workspace/notes/Testing Advanced.md'),
                vscode.Uri.file('/test/workspace/notes/Testing Guide.md'),
                vscode.Uri.file('/test/workspace/notes/Testing Overview.md'),
                vscode.Uri.file('/test/workspace/notes/deep/folder/Test.md'), // Exact match, deeper
                vscode.Uri.file('/test/workspace/notes/Testing Tutorial.md'),
                vscode.Uri.file('/test/workspace/notes/Test.md') // Exact match, shallow
            ];

            findFilesStub = sinon.stub(vscode.workspace, 'findFiles')
                .resolves(mockFiles);

            const result = await NoteFinder.findNotesByPrefix(
                'Test',
                mockWorkspaceFolder,
                'notes',
                '.md',
                3 // maxResults = 3
            );

            // Should return top 3 after sorting
            expect(result).to.have.lengthOf(3);
            // First should be exact match at shallowest depth
            expect(result[0].title).to.equal('Test');
            expect(result[0].relativePath).to.equal('Test.md');
        });

        it('should filter by directory when prefix contains slash', async () => {
            const mockWorkspaceFolder: vscode.WorkspaceFolder = {
                uri: vscode.Uri.file('/test/workspace'),
                name: 'test-workspace',
                index: 0
            };

            const mockFiles = [
                vscode.Uri.file('/test/workspace/notes/projects/Project Plan.md'),
                vscode.Uri.file('/test/workspace/notes/projects/Project Notes.md'),
                vscode.Uri.file('/test/workspace/notes/Other Project.md') // Should not match
            ];

            findFilesStub = sinon.stub(vscode.workspace, 'findFiles')
                .resolves(mockFiles);

            const result = await NoteFinder.findNotesByPrefix(
                'projects/Project',
                mockWorkspaceFolder,
                'notes',
                '.md',
                10
            );

            expect(result).to.have.lengthOf(2);
            expect(result[0].title).to.include('Project');
            expect(result[0].relativePath).to.include('projects');
            expect(result[1].title).to.include('Project');
            expect(result[1].relativePath).to.include('projects');
        });

        it('should return all files in directory when prefix ends with slash and use broad glob', async () => {
            const mockWorkspaceFolder: vscode.WorkspaceFolder = {
                uri: vscode.Uri.file('/test/workspace'),
                name: 'test-workspace',
                index: 0
            };

            const mockFiles = [
                vscode.Uri.file('/test/workspace/notes/archive/Note1.md'),
                vscode.Uri.file('/test/workspace/notes/archive/Note2.md'),
                vscode.Uri.file('/test/workspace/notes/archive/Note3.md'),
                vscode.Uri.file('/test/workspace/notes/Current.md') // Should not match
            ];

            findFilesStub = sinon.stub(vscode.workspace, 'findFiles')
                .resolves(mockFiles);

            const result = await NoteFinder.findNotesByPrefix(
                'archive/',
                mockWorkspaceFolder,
                'notes',
                '.md',
                10
            );

            expect(result).to.have.lengthOf(3);
            expect(result[0].relativePath).to.include('archive');
            expect(result[1].relativePath).to.include('archive');
            expect(result[2].relativePath).to.include('archive');

            // Verify glob and base were correct
            expect(findFilesStub.calledOnce).to.be.true;
            const callArgs = findFilesStub.firstCall.args;
            const globPattern = callArgs[0] as vscode.RelativePattern;
            expect(globPattern.pattern).to.equal('**/*.md');
            const baseAny: any = (globPattern as any).base;
            const basePath = typeof baseAny === 'string' ? baseAny : (baseAny.fsPath as string);
            expect(basePath).to.include('/test/workspace/notes/archive');
        });

        it('should handle nested directory paths with slashes and narrow glob by file prefix', async () => {
            const mockWorkspaceFolder: vscode.WorkspaceFolder = {
                uri: vscode.Uri.file('/test/workspace'),
                name: 'test-workspace',
                index: 0
            };

            const mockFiles = [
                vscode.Uri.file('/test/workspace/notes/2024/01/Meeting.md'),
                vscode.Uri.file('/test/workspace/notes/2024/01/Minutes.md'),
                vscode.Uri.file('/test/workspace/notes/2024/02/Meeting.md') // Different directory
            ];

            findFilesStub = sinon.stub(vscode.workspace, 'findFiles')
                .resolves(mockFiles);

            const result = await NoteFinder.findNotesByPrefix(
                '2024/01/M',
                mockWorkspaceFolder,
                'notes',
                '.md',
                10
            );

            expect(result).to.have.lengthOf(2);
            expect(result[0].relativePath).to.include('2024/01');
            expect(result[1].relativePath).to.include('2024/01');

            // Verify glob and base were correct
            expect(findFilesStub.calledOnce).to.be.true;
            const callArgs = findFilesStub.firstCall.args;
            const globPattern = callArgs[0] as vscode.RelativePattern;
            expect(globPattern.pattern).to.equal('**/M*.md');
            const baseAny2: any = (globPattern as any).base;
            const basePath = typeof baseAny2 === 'string' ? baseAny2 : (baseAny2.fsPath as string);
            expect(basePath).to.include('/test/workspace/notes/2024/01');
        });

        it('should return empty array when directory does not contain matching files', async () => {
            const mockWorkspaceFolder: vscode.WorkspaceFolder = {
                uri: vscode.Uri.file('/test/workspace'),
                name: 'test-workspace',
                index: 0
            };

            const mockFiles = [
                vscode.Uri.file('/test/workspace/notes/folder/Note1.md'),
                vscode.Uri.file('/test/workspace/notes/folder/Note2.md')
            ];

            findFilesStub = sinon.stub(vscode.workspace, 'findFiles')
                .resolves(mockFiles);

            const result = await NoteFinder.findNotesByPrefix(
                'folder/Nonexistent',
                mockWorkspaceFolder,
                'notes',
                '.md',
                10
            );

            expect(result).to.be.an('array').that.is.empty;
        });

        it('should narrow glob by safe file prefix when no slash is present', async () => {
            const mockWorkspaceFolder: vscode.WorkspaceFolder = {
                uri: vscode.Uri.file('/test/workspace'),
                name: 'test-workspace',
                index: 0
            };

            const mockFiles = [
                vscode.Uri.file('/test/workspace/notes/Project.md'),
                vscode.Uri.file('/test/workspace/notes/subfolder/Project Plan.md')
            ];

            findFilesStub = sinon.stub(vscode.workspace, 'findFiles')
                .resolves(mockFiles);

            const result = await NoteFinder.findNotesByPrefix(
                'Project',
                mockWorkspaceFolder,
                'notes',
                '.md',
                10
            );

            // Should search all directories when no slash is present
            expect(result).to.have.lengthOf(2);

            // Verify findFiles was called with narrowed glob pattern when prefix is safe
            expect(findFilesStub.calledOnce).to.be.true;
            const callArgs = findFilesStub.firstCall.args;
            const globPattern = callArgs[0] as vscode.RelativePattern;
            expect(globPattern.pattern).to.equal('**/Project*.md');
        });

        it('should include files from directories matching prefix and use narrowed glob', async () => {
            const mockWorkspaceFolder: vscode.WorkspaceFolder = {
                uri: vscode.Uri.file('/test/workspace'),
                name: 'test-workspace',
                index: 0
            };

            const mockFiles = [
                vscode.Uri.file('/test/workspace/notes/projects/Plan.md'),
                vscode.Uri.file('/test/workspace/notes/projects/Notes.md'),
                vscode.Uri.file('/test/workspace/notes/Project Root.md') // Also matches prefix
            ];

            findFilesStub = sinon.stub(vscode.workspace, 'findFiles')
                .resolves(mockFiles);

            const result = await NoteFinder.findNotesByPrefix(
                'proj',
                mockWorkspaceFolder,
                'notes',
                '.md',
                10
            );

            // Should include both files from 'projects/' directory and 'Project Root.md'
            expect(result).to.have.lengthOf(3);
            expect(result.some(n => n.title === 'Plan')).to.be.true;
            expect(result.some(n => n.title === 'Notes')).to.be.true;
            expect(result.some(n => n.title === 'Project Root')).to.be.true;

            // Verify narrow glob was used for safe prefix without directory
            expect(findFilesStub.calledOnce).to.be.true;
            const callArgs = findFilesStub.firstCall.args;
            const globPattern = callArgs[0] as vscode.RelativePattern;
            expect(globPattern.pattern).to.equal('**/proj*.md');
            const baseAny3: any = (globPattern as any).base;
            const basePath3 = typeof baseAny3 === 'string' ? baseAny3 : (baseAny3.fsPath as string);
            expect(basePath3).to.include('/test/workspace/notes');
        });

        it('should include files from multiple matching directories', async () => {
            const mockWorkspaceFolder: vscode.WorkspaceFolder = {
                uri: vscode.Uri.file('/test/workspace'),
                name: 'test-workspace',
                index: 0
            };

            const mockFiles = [
                vscode.Uri.file('/test/workspace/notes/archive/2024/Note1.md'),
                vscode.Uri.file('/test/workspace/notes/archive/2023/Note2.md'),
                vscode.Uri.file('/test/workspace/notes/archived/Old.md')
            ];

            findFilesStub = sinon.stub(vscode.workspace, 'findFiles')
                .resolves(mockFiles);

            const result = await NoteFinder.findNotesByPrefix(
                'arc',
                mockWorkspaceFolder,
                'notes',
                '.md',
                10
            );

            // Should include files from both 'archive/' and 'archived/' directories
            expect(result).to.have.lengthOf(3);

            // Verify ordering by depth for same match type (dirPrefix): shallower first
            // 'archived/Old.md' (depth 2) should come before 'archive/2024/Note1.md' (depth 3)
            const titlesInOrder = result.map(r => r.title);
            expect(titlesInOrder[0]).to.equal('Old');
        });

        it('should prioritize file name matches over directory name matches and sort ties alphabetically', async () => {
            const mockWorkspaceFolder: vscode.WorkspaceFolder = {
                uri: vscode.Uri.file('/test/workspace'),
                name: 'test-workspace',
                index: 0
            };

            const mockFiles = [
                vscode.Uri.file('/test/workspace/notes/Test.md'), // Exact file name match
                vscode.Uri.file('/test/workspace/notes/tests/Example.md'), // Directory match
                vscode.Uri.file('/test/workspace/notes/Testing.md') // Partial file name match
            ];

            findFilesStub = sinon.stub(vscode.workspace, 'findFiles')
                .resolves(mockFiles);

            const result = await NoteFinder.findNotesByPrefix(
                'test',
                mockWorkspaceFolder,
                'notes',
                '.md',
                10
            );

            // Verify complete sorting order: exact > filePrefix > dirPrefix, then by depth, then alphabetically
            expect(result).to.have.lengthOf(3);
            expect(result[0].title).to.equal('Test'); // exact match, depth 1
            expect(result[1].title).to.equal('Testing'); // filePrefix match, depth 1
            expect(result[2].title).to.equal('Example'); // dirPrefix match, depth 2
        });

        it('should sort alphabetically when match type and depth are equal (dirPrefix only)', async () => {
            const mockWorkspaceFolder: vscode.WorkspaceFolder = {
                uri: vscode.Uri.file('/test/workspace'),
                name: 'test-workspace',
                index: 0
            };

            const mockFiles = [
                vscode.Uri.file('/test/workspace/notes/zoo/Beta.md'),
                vscode.Uri.file('/test/workspace/notes/zoo/Alpha.md')
            ];

            findFilesStub = sinon.stub(vscode.workspace, 'findFiles')
                .resolves(mockFiles);

            const result = await NoteFinder.findNotesByPrefix(
                'zo', // directory name matches only
                mockWorkspaceFolder,
                'notes',
                '.md',
                10
            );

            // Both are dirPrefix with same depth; expect alphabetical by title
            expect(result).to.have.lengthOf(2);
            expect(result[0].title).to.equal('Alpha');
            expect(result[1].title).to.equal('Beta');
        });

        it('should handle Japanese directory names', async () => {
            const mockWorkspaceFolder: vscode.WorkspaceFolder = {
                uri: vscode.Uri.file('/test/workspace'),
                name: 'test-workspace',
                index: 0
            };

            const mockFiles = [
                vscode.Uri.file('/test/workspace/notes/プロジェクト/計画.md'),
                vscode.Uri.file('/test/workspace/notes/プロジェクト/メモ.md')
            ];

            findFilesStub = sinon.stub(vscode.workspace, 'findFiles')
                .resolves(mockFiles);

            const result = await NoteFinder.findNotesByPrefix(
                'プロ',
                mockWorkspaceFolder,
                'notes',
                '.md',
                10
            );

            // Should include files from 'プロジェクト/' directory
            expect(result).to.have.lengthOf(2);
            expect(result.some(n => n.title === '計画')).to.be.true;
            expect(result.some(n => n.title === 'メモ')).to.be.true;
        });

        it('should not duplicate results when both file and directory match', async () => {
            const mockWorkspaceFolder: vscode.WorkspaceFolder = {
                uri: vscode.Uri.file('/test/workspace'),
                name: 'test-workspace',
                index: 0
            };

            const mockFiles = [
                vscode.Uri.file('/test/workspace/notes/docs/README.md'),
                vscode.Uri.file('/test/workspace/notes/Documentation.md')
            ];

            findFilesStub = sinon.stub(vscode.workspace, 'findFiles')
                .resolves(mockFiles);

            const result = await NoteFinder.findNotesByPrefix(
                'doc',
                mockWorkspaceFolder,
                'notes',
                '.md',
                10
            );

            // Should not have duplicates
            expect(result).to.have.lengthOf(2);
            const titles = result.map(n => n.title);
            expect(new Set(titles).size).to.equal(titles.length);
        });
    });

    describe('getAllNotes', () => {
        it('should return all markdown files in workspace', async () => {
            const mockWorkspaceFolder: vscode.WorkspaceFolder = {
                uri: vscode.Uri.file('/test/workspace'),
                name: 'test-workspace',
                index: 0
            };

            const mockFiles = [
                vscode.Uri.file('/test/workspace/notes/File1.md'),
                vscode.Uri.file('/test/workspace/notes/subfolder/File2.md'),
                vscode.Uri.file('/test/workspace/notes/deep/folder/File3.md')
            ];

            findFilesStub = sinon.stub(vscode.workspace, 'findFiles')
                .resolves(mockFiles);

            const result = await NoteFinder.getAllNotes(
                mockWorkspaceFolder,
                'notes',
                '.md'
            );

            expect(result).to.have.lengthOf(3);
            expect(result[0].title).to.equal('File1');
            expect(result[1].title).to.equal('File2');
            expect(result[2].title).to.equal('File3');
        });

        it('should exclude node_modules directory', async () => {
            const mockWorkspaceFolder: vscode.WorkspaceFolder = {
                uri: vscode.Uri.file('/test/workspace'),
                name: 'test-workspace',
                index: 0
            };

            const mockFiles = [
                vscode.Uri.file('/test/workspace/notes/Valid.md'),
                vscode.Uri.file('/test/workspace/notes/subfolder/Also Valid.md')
            ];

            findFilesStub = sinon.stub(vscode.workspace, 'findFiles')
                .callsFake((include: vscode.GlobPattern, exclude?: vscode.GlobPattern | null) => {
                    // Verify that node_modules is excluded
                    expect(exclude).to.not.be.undefined;
                    expect(exclude).to.not.be.null;
                    expect(exclude!.toString()).to.include('node_modules');
                    return Promise.resolve(mockFiles);
                });

            const result = await NoteFinder.getAllNotes(
                mockWorkspaceFolder,
                'notes',
                '.md'
            );

            expect(result).to.have.lengthOf(2);
            expect(findFilesStub.calledOnce).to.be.true;
        });
    });

    describe('Error handling', () => {
        it('should handle errors from findFiles gracefully in findNoteByTitle', async () => {
            const mockWorkspaceFolder: vscode.WorkspaceFolder = {
                uri: vscode.Uri.file('/test/workspace'),
                name: 'test-workspace',
                index: 0
            };

            findFilesStub = sinon.stub(vscode.workspace, 'findFiles')
                .rejects(new Error('File system error'));

            const result = await NoteFinder.findNoteByTitle(
                'Test',
                mockWorkspaceFolder,
                'notes',
                '.md'
            );

            expect(result).to.be.null;
        });

        it('should handle errors from findFiles gracefully in findNotesByPrefix', async () => {
            const mockWorkspaceFolder: vscode.WorkspaceFolder = {
                uri: vscode.Uri.file('/test/workspace'),
                name: 'test-workspace',
                index: 0
            };

            findFilesStub = sinon.stub(vscode.workspace, 'findFiles')
                .rejects(new Error('File system error'));

            const result = await NoteFinder.findNotesByPrefix(
                'Test',
                mockWorkspaceFolder,
                'notes',
                '.md',
                10
            );

            expect(result).to.be.an('array').that.is.empty;
        });

        it('should handle errors from findFiles gracefully in getAllNotes', async () => {
            const mockWorkspaceFolder: vscode.WorkspaceFolder = {
                uri: vscode.Uri.file('/test/workspace'),
                name: 'test-workspace',
                index: 0
            };

            findFilesStub = sinon.stub(vscode.workspace, 'findFiles')
                .rejects(new Error('File system error'));

            const result = await NoteFinder.getAllNotes(
                mockWorkspaceFolder,
                'notes',
                '.md'
            );

            expect(result).to.be.an('array').that.is.empty;
        });
    });

    describe('Edge cases', () => {
        it('should handle empty title gracefully', async () => {
            const mockWorkspaceFolder: vscode.WorkspaceFolder = {
                uri: vscode.Uri.file('/test/workspace'),
                name: 'test-workspace',
                index: 0
            };

            findFilesStub = sinon.stub(vscode.workspace, 'findFiles')
                .resolves([]);

            const result = await NoteFinder.findNoteByTitle(
                '',
                mockWorkspaceFolder,
                'notes',
                '.md'
            );

            expect(result).to.be.null;
        });

        it('should handle special characters in filenames', async () => {
            const mockWorkspaceFolder: vscode.WorkspaceFolder = {
                uri: vscode.Uri.file('/test/workspace'),
                name: 'test-workspace',
                index: 0
            };

            const mockFiles = [
                vscode.Uri.file('/test/workspace/notes/Note with spaces.md'),
                vscode.Uri.file('/test/workspace/notes/Note-with-dashes.md'),
                vscode.Uri.file('/test/workspace/notes/Note_with_underscores.md'),
                vscode.Uri.file('/test/workspace/notes/Note (with) [brackets].md')
            ];

            findFilesStub = sinon.stub(vscode.workspace, 'findFiles')
                .resolves(mockFiles);

            const result = await NoteFinder.findNotesByPrefix(
                'Note',
                mockWorkspaceFolder,
                'notes',
                '.md',
                10
            );

            expect(result).to.have.lengthOf(4);
            expect(result[0].title).to.include('Note');
            expect(result[1].title).to.include('Note');
            expect(result[2].title).to.include('Note');
            expect(result[3].title).to.include('Note');
        });

        it('should handle vaultRoot with path traversal sequences safely', async () => {
            const mockWorkspaceFolder: vscode.WorkspaceFolder = {
                uri: vscode.Uri.file('/test/workspace'),
                name: 'test-workspace',
                index: 0
            };

            findFilesStub = sinon.stub(vscode.workspace, 'findFiles')
                .resolves([]);

            // Test with potentially dangerous path
            const result = await NoteFinder.findNoteByTitle(
                'Test',
                mockWorkspaceFolder,
                '../../../etc',
                '.md'
            );

            // Should not crash and return null
            expect(result).to.be.null;
            // Verify that findFiles was called (path normalization happens in vscode.RelativePattern)
            expect(findFilesStub.calledOnce).to.be.true;
        });

        it('should prevent path traversal in findNotesByPrefix directory path', async () => {
            const mockWorkspaceFolder: vscode.WorkspaceFolder = {
                uri: vscode.Uri.file('/test/workspace'),
                name: 'test-workspace',
                index: 0
            };

            findFilesStub = sinon.stub(vscode.workspace, 'findFiles')
                .resolves([]);

            // Test with path traversal attempt
            const result = await NoteFinder.findNotesByPrefix(
                '../../etc/Test',
                mockWorkspaceFolder,
                'notes',
                '.md',
                10
            );

            // Should return empty array and not call findFiles
            expect(result).to.be.an('array').that.is.empty;
            expect(findFilesStub.called).to.be.false;
        });

        it('should handle empty vaultRoot string', async () => {
            const mockWorkspaceFolder: vscode.WorkspaceFolder = {
                uri: vscode.Uri.file('/test/workspace'),
                name: 'test-workspace',
                index: 0
            };

            const mockFiles = [
                vscode.Uri.file('/test/workspace/Test.md')
            ];

            findFilesStub = sinon.stub(vscode.workspace, 'findFiles')
                .resolves(mockFiles);

            const result = await NoteFinder.findNoteByTitle(
                'Test',
                mockWorkspaceFolder,
                '',
                '.md'
            );

            expect(result).to.not.be.null;
            expect(result!.title).to.equal('Test');
        });

        it('should handle whitespace-only vaultRoot', async () => {
            const mockWorkspaceFolder: vscode.WorkspaceFolder = {
                uri: vscode.Uri.file('/test/workspace'),
                name: 'test-workspace',
                index: 0
            };

            const mockFiles = [
                vscode.Uri.file('/test/workspace/Test.md')
            ];

            findFilesStub = sinon.stub(vscode.workspace, 'findFiles')
                .resolves(mockFiles);

            const result = await NoteFinder.findNoteByTitle(
                'Test',
                mockWorkspaceFolder,
                '   ',
                '.md'
            );

            expect(result).to.not.be.null;
            expect(result!.title).to.equal('Test');
        });

        it('should handle files with no extension', async () => {
            const mockWorkspaceFolder: vscode.WorkspaceFolder = {
                uri: vscode.Uri.file('/test/workspace'),
                name: 'test-workspace',
                index: 0
            };

            const mockFiles = [
                vscode.Uri.file('/test/workspace/notes/README')
            ];

            findFilesStub = sinon.stub(vscode.workspace, 'findFiles')
                .resolves(mockFiles);

            const result = await NoteFinder.findNoteByTitle(
                'README',
                mockWorkspaceFolder,
                'notes',
                '' // Empty extension
            );

            expect(result).to.not.be.null;
            expect(result!.title).to.equal('README');
        });

        it('should handle unicode characters in filenames', async () => {
            const mockWorkspaceFolder: vscode.WorkspaceFolder = {
                uri: vscode.Uri.file('/test/workspace'),
                name: 'test-workspace',
                index: 0
            };

            const mockFiles = [
                vscode.Uri.file('/test/workspace/notes/日本語ノート.md'),
                vscode.Uri.file('/test/workspace/notes/Español.md'),
                vscode.Uri.file('/test/workspace/notes/中文笔记.md')
            ];

            findFilesStub = sinon.stub(vscode.workspace, 'findFiles')
                .resolves(mockFiles);

            const result = await NoteFinder.getAllNotes(
                mockWorkspaceFolder,
                'notes',
                '.md'
            );

            expect(result).to.have.lengthOf(3);
            expect(result[0].title).to.equal('日本語ノート');
            expect(result[1].title).to.equal('Español');
            expect(result[2].title).to.equal('中文笔记');
        });
    });
});
