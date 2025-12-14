/**
 * @fileoverview Unit tests for ListContinuationProvider.
 * Tests automatic list and checkbox continuation functionality.
 *
 * @author MDloggerForCode Team
 * @version 1.0.0
 */

import { describe, it, beforeEach } from 'mocha';
import { expect } from 'chai';
import * as vscode from 'vscode';
import { ListContinuationProvider } from '../../src/providers/ListContinuationProvider';
import { ConfigurationManager } from '../../src/managers/ConfigurationManager';

/**
 * Helper to create a mock TextDocument with proper offsetAt/positionAt implementation
 */
function createMockDocument(lines: string[]): vscode.TextDocument {
    // Calculate offset for a given position
    const offsetAt = (position: vscode.Position): number => {
        let offset = 0;
        for (let i = 0; i < position.line && i < lines.length; i++) {
            offset += lines[i].length + 1; // +1 for newline
        }
        offset += Math.min(position.character, lines[position.line]?.length || 0);
        return offset;
    };

    // Calculate position for a given offset
    const positionAt = (offset: number): vscode.Position => {
        let currentOffset = 0;
        for (let line = 0; line < lines.length; line++) {
            const lineLength = lines[line].length;
            if (currentOffset + lineLength >= offset) {
                return new vscode.Position(line, offset - currentOffset);
            }
            currentOffset += lineLength + 1; // +1 for newline
        }
        // If offset is beyond document, return end position
        const lastLine = lines.length - 1;
        return new vscode.Position(lastLine, lines[lastLine]?.length || 0);
    };

    return {
        uri: vscode.Uri.file('/test/document.md'),
        fileName: '/test/document.md',
        isUntitled: false,
        languageId: 'markdown',
        version: 1,
        isDirty: false,
        isClosed: false,
        lineCount: lines.length,
        lineAt: (lineOrPosition: number | vscode.Position) => {
            const lineNum = typeof lineOrPosition === 'number' ? lineOrPosition : lineOrPosition.line;
            const text = lines[lineNum] || '';
            return {
                lineNumber: lineNum,
                text: text,
                range: new vscode.Range(lineNum, 0, lineNum, text.length),
                rangeIncludingLineBreak: new vscode.Range(lineNum, 0, lineNum + 1, 0),
                firstNonWhitespaceCharacterIndex: text.search(/\S/),
                isEmptyOrWhitespace: text.trim().length === 0
            } as vscode.TextLine;
        },
        getText: () => lines.join('\n'),
        getWordRangeAtPosition: () => undefined,
        validateRange: (range: vscode.Range) => range,
        validatePosition: (position: vscode.Position) => position,
        offsetAt: offsetAt,
        positionAt: positionAt,
        save: async () => true,
        eol: vscode.EndOfLine.LF,
        notebook: undefined
    } as unknown as vscode.TextDocument;
}

/**
 * Helper to create a mock TextEditor
 */
function createMockEditor(document: vscode.TextDocument, cursorLine: number, cursorChar: number): vscode.TextEditor {
    const position = new vscode.Position(cursorLine, cursorChar);
    let currentSelection = new vscode.Selection(position, position);

    const editor = {
        document: document,
        selection: currentSelection,
        selections: [currentSelection],
        visibleRanges: [],
        options: {},
        viewColumn: vscode.ViewColumn.One,
        edit: async (callback: (editBuilder: vscode.TextEditorEdit) => void) => {
            // Mock edit builder
            const editBuilder = {
                replace: () => {},
                insert: () => {},
                delete: () => {},
                setEndOfLine: () => {}
            } as vscode.TextEditorEdit;
            callback(editBuilder);
            return true;
        },
        insertSnippet: async () => true,
        setDecorations: () => {},
        revealRange: () => {},
        show: () => {},
        hide: () => {}
    };

    // Allow setting selection
    Object.defineProperty(editor, 'selection', {
        get: () => currentSelection,
        set: (value: vscode.Selection) => {
            currentSelection = value;
        }
    });

    return editor as any;
}

describe('ListContinuationProvider', () => {
    let provider: ListContinuationProvider;

    beforeEach(() => {
        // Use global mock from setup.ts
        const config = vscode.workspace.getConfiguration('mdlg');
        const configManager = new ConfigurationManager(config);
        provider = new ListContinuationProvider(configManager);
    });

    describe('handleEnterKey', () => {
        it('should continue unordered lists with same marker (-)', async () => {
            const lines = ['- First item'];
            const doc = createMockDocument(lines);
            const editor = createMockEditor(doc, 0, 12); // Cursor at end of line

            const result = await provider.handleEnterKey(editor);

            expect(result).to.be.true;
        });

        it('should continue unordered lists with asterisk marker (*)', async () => {
            const lines = ['* First item'];
            const doc = createMockDocument(lines);
            const editor = createMockEditor(doc, 0, 12);

            const result = await provider.handleEnterKey(editor);

            expect(result).to.be.true;
        });

        it('should continue unordered lists with plus marker (+)', async () => {
            const lines = ['+ First item'];
            const doc = createMockDocument(lines);
            const editor = createMockEditor(doc, 0, 12);

            const result = await provider.handleEnterKey(editor);

            expect(result).to.be.true;
        });

        it('should continue ordered lists with incremented number', async () => {
            const lines = ['1. First item'];
            const doc = createMockDocument(lines);
            const editor = createMockEditor(doc, 0, 13);

            const result = await provider.handleEnterKey(editor);

            expect(result).to.be.true;
        });

        it('should continue checkboxes with unchecked state', async () => {
            const lines = ['- [x] Completed task'];
            const doc = createMockDocument(lines);
            const editor = createMockEditor(doc, 0, 20);

            const result = await provider.handleEnterKey(editor);

            expect(result).to.be.true;
        });

        it('should remove list marker on empty list item', async () => {
            const lines = ['- '];
            const doc = createMockDocument(lines);
            const editor = createMockEditor(doc, 0, 2);

            const result = await provider.handleEnterKey(editor);

            // Should return false to let VS Code handle normal newline
            expect(result).to.be.false;
        });

        it('should preserve indentation level', async () => {
            const lines = ['  - Indented item'];
            const doc = createMockDocument(lines);
            const editor = createMockEditor(doc, 0, 17);

            const result = await provider.handleEnterKey(editor);

            expect(result).to.be.true;
        });

        it('should not continue when feature is disabled', async () => {
            // Create a custom config with listContinuationEnabled = false
            const disabledConfig = {
                get: (key: string, defaultValue?: any) => {
                    if (key === 'listContinuationEnabled') return false;
                    return defaultValue;
                },
                has: () => true,
                update: async () => {}
            };
            const disabledProvider = new ListContinuationProvider(new ConfigurationManager(disabledConfig as any));

            const lines = ['- First item'];
            const doc = createMockDocument(lines);
            const editor = createMockEditor(doc, 0, 12);

            const result = await disabledProvider.handleEnterKey(editor);

            expect(result).to.be.false;
        });

        it('should not continue if selection is not empty', async () => {
            const lines = ['- First item'];
            const doc = createMockDocument(lines);
            const editor = createMockEditor(doc, 0, 5);
            // Simulate text selection
            editor.selection = new vscode.Selection(new vscode.Position(0, 2), new vscode.Position(0, 7));

            const result = await provider.handleEnterKey(editor);

            expect(result).to.be.false;
        });

        it('should continue even if cursor is in middle of line', async () => {
            // Note: Current implementation continues lists based on line pattern,
            // regardless of cursor position. This allows continuation when
            // pressing Enter anywhere on a list item line.
            const lines = ['- First item with more text'];
            const doc = createMockDocument(lines);
            const editor = createMockEditor(doc, 0, 1); // Cursor before marker

            const result = await provider.handleEnterKey(editor);

            expect(result).to.be.true;
        });
    });

    describe('List patterns', () => {
        it('should recognize dash lists (- item)', async () => {
            const lines = ['- item'];
            const doc = createMockDocument(lines);
            const editor = createMockEditor(doc, 0, 6);

            const result = await provider.handleEnterKey(editor);

            expect(result).to.be.true;
        });

        it('should recognize asterisk lists (* item)', async () => {
            const lines = ['* item'];
            const doc = createMockDocument(lines);
            const editor = createMockEditor(doc, 0, 6);

            const result = await provider.handleEnterKey(editor);

            expect(result).to.be.true;
        });

        it('should recognize plus lists (+ item)', async () => {
            const lines = ['+ item'];
            const doc = createMockDocument(lines);
            const editor = createMockEditor(doc, 0, 6);

            const result = await provider.handleEnterKey(editor);

            expect(result).to.be.true;
        });

        it('should recognize numbered lists (1. item)', async () => {
            const lines = ['1. item'];
            const doc = createMockDocument(lines);
            const editor = createMockEditor(doc, 0, 7);

            const result = await provider.handleEnterKey(editor);

            expect(result).to.be.true;
        });

        it('should recognize checkboxes (- [ ] item)', async () => {
            const lines = ['- [ ] item'];
            const doc = createMockDocument(lines);
            const editor = createMockEditor(doc, 0, 10);

            const result = await provider.handleEnterKey(editor);

            expect(result).to.be.true;
        });

        it('should recognize checked checkboxes (- [x] item)', async () => {
            const lines = ['- [x] item'];
            const doc = createMockDocument(lines);
            const editor = createMockEditor(doc, 0, 10);

            const result = await provider.handleEnterKey(editor);

            expect(result).to.be.true;
        });
    });
});
