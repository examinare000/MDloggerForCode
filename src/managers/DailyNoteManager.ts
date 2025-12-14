/**
 * @fileoverview Daily note management functionality for MDloggerForCode extension.
 * Provides automated daily note creation, template management, and date-based file organization.
 *
 * @author MDloggerForCode Team
 * @version 1.1.0
 */

import * as vscode from 'vscode';
import { ConfigurationManager } from './ConfigurationManager';
import { DateTimeFormatter } from '../utils/DateTimeFormatter';
import { IFileWriter, VscodeFileWriter, getParentDirectory } from '../services/FileWriter';
import { insertIntoSection } from '../utils/NoteParser';

/**
 * Options for resolving vault-based paths.
 */
interface VaultPathOptions {
    workspaceFolder: vscode.WorkspaceFolder;
    vaultRoot: string;
    relativePath: string;
    fileName?: string;
}

/**
 * Normalizes an absolute path for safe URI construction in remote environments.
 * Converts Windows backslashes to forward slashes and ensures proper URI path format.
 *
 * @param absolutePath - The absolute path to normalize
 * @returns Normalized path suitable for URI construction
 */
function normalizeAbsolutePath(absolutePath: string): string {
    // Convert Windows backslashes to forward slashes
    let normalized = absolutePath.replace(/\\/g, '/');

    // Ensure single leading slash for absolute paths
    if (!normalized.startsWith('/')) {
        normalized = '/' + normalized;
    }

    // Remove duplicate slashes
    normalized = normalized.replace(/\/+/g, '/');

    return normalized;
}

/**
 * Checks if a vault root path is absolute (Unix or Windows style).
 */
function isAbsoluteVaultRoot(vaultRoot: string): boolean {
    return vaultRoot.startsWith('/') || /^[A-Za-z]:/.test(vaultRoot);
}

/**
 * Resolves a URI based on vault root configuration.
 * Handles both absolute and relative vault root paths, combining them with
 * additional path segments.
 *
 * @param options - Path resolution options
 * @returns Resolved URI
 */
function resolveVaultUri(options: VaultPathOptions): vscode.Uri {
    const { workspaceFolder, vaultRoot, relativePath, fileName } = options;
    const pathSegments = fileName
        ? [relativePath, fileName].filter(Boolean)
        : [relativePath].filter(Boolean);
    const pathSuffix = pathSegments.join('/');

    if (vaultRoot && vaultRoot.trim() !== '') {
        if (isAbsoluteVaultRoot(vaultRoot)) {
            const scheme = workspaceFolder.uri.scheme;
            const fullPath = fileName
                ? `${vaultRoot}/${relativePath}/${fileName}`
                : `${vaultRoot}/${relativePath}`;

            if (scheme === 'file') {
                return vscode.Uri.file(fullPath);
            } else {
                // Remote environment: normalize path and preserve scheme
                const normalizedVaultRoot = normalizeAbsolutePath(vaultRoot);
                const normalizedPath = fileName
                    ? `${normalizedVaultRoot}/${relativePath}/${fileName}`
                    : `${normalizedVaultRoot}/${relativePath}`;
                return workspaceFolder.uri.with({ path: normalizedPath });
            }
        } else {
            // Relative vault root
            return fileName
                ? vscode.Uri.joinPath(workspaceFolder.uri, vaultRoot, relativePath, fileName)
                : vscode.Uri.joinPath(workspaceFolder.uri, vaultRoot, relativePath);
        }
    } else {
        // No vault root configured
        return fileName
            ? vscode.Uri.joinPath(workspaceFolder.uri, relativePath, fileName)
            : vscode.Uri.joinPath(workspaceFolder.uri, relativePath);
    }
}

/**
 * Manages daily note creation and organization.
 * Handles file naming, path resolution, template loading, and automatic directory creation
 * for date-based notes following user configuration.
 *
 * @class DailyNoteManager
 */
export class DailyNoteManager {
    private readonly fileWriter: IFileWriter;

    /**
     * Creates a new DailyNoteManager instance.
     *
     * @param configManager - Configuration manager for accessing daily note settings
     * @param dateTimeFormatter - Formatter for converting dates to file names
     * @param fileWriter - Optional file I/O abstraction (defaults to VscodeFileWriter)
     */
    constructor(
        private configManager: ConfigurationManager,
        private dateTimeFormatter: DateTimeFormatter,
        fileWriter?: IFileWriter
    ) {
        this.fileWriter = fileWriter ?? new VscodeFileWriter();
    }

    /**
     * Generates a daily note file name for the specified date.
     * Uses the configured date format and note extension.
     *
     * @param date - The date to generate a file name for
     * @returns The formatted file name with extension
     */
    getDailyNoteFileName(date: Date): string {
        const dateFormat = this.configManager.getDateFormat();
        const formattedDate = this.dateTimeFormatter.formatDate(date, dateFormat);
        const extension = this.configManager.getNoteExtension();
        return `${formattedDate}${extension}`;
    }

    /**
     * Resolves the complete path for a daily note file.
     * Handles both absolute and relative vault root paths, combining them with
     * the daily note directory and generated file name.
     *
     * @param workspaceFolder - The VS Code workspace folder
     * @param date - The date for the daily note
     * @returns Complete URI for the daily note file
     */
    getDailyNotePath(workspaceFolder: vscode.WorkspaceFolder, date: Date): vscode.Uri {
        const fileName = this.getDailyNoteFileName(date);
        const dailyNotePath = this.configManager.getDailyNotePath();
        const vaultRoot = this.configManager.getVaultRoot();

        return resolveVaultUri({
            workspaceFolder,
            vaultRoot,
            relativePath: dailyNotePath,
            fileName
        });
    }

    /**
     * Resolves the directory URI containing all daily notes.
     * Mirrors getDailyNotePath logic but without appending the file name so other
     * features (e.g. task collection) can scope operations to the configured folder.
     *
     * @param workspaceFolder - The VS Code workspace folder
     * @returns URI pointing to the daily note directory
     */
    getDailyNoteDirectory(workspaceFolder: vscode.WorkspaceFolder): vscode.Uri {
        const dailyNotePath = this.configManager.getDailyNotePath();
        const vaultRoot = this.configManager.getVaultRoot();

        return resolveVaultUri({
            workspaceFolder,
            vaultRoot,
            relativePath: dailyNotePath
        });
    }

    /**
     * Loads template content from the configured template file.
     * Attempts to read the daily note template file and returns its content.
     * Returns empty string if template file is not found or not configured.
     *
     * @param workspaceFolder - The VS Code workspace folder
     * @returns Promise resolving to template content or empty string
     * @throws {Error} When template file cannot be read (non-existence is handled gracefully)
     */
    async getTemplateContent(workspaceFolder: vscode.WorkspaceFolder): Promise<string> {
        const templatePath = this.configManager.getDailyNoteTemplate();

        if (!templatePath || templatePath.trim() === '') {
            return '';
        }

        try {
            const vaultRoot = this.configManager.getVaultRoot();
            const templateUri = resolveVaultUri({
                workspaceFolder,
                vaultRoot,
                relativePath: templatePath
            });

            return await this.fileWriter.read(templateUri);
        } catch (error) {
            // テンプレートファイルが見つからない場合は空文字列を返す
            return '';
        }
    }

    /**
     * Ensures the daily note file exists, creating it with template content if not.
     * Does not open the file in the editor.
     *
     * @param workspaceFolder - The VS Code workspace folder
     * @param date - The date for the daily note (defaults to current date)
     * @returns The URI of the daily note file
     */
    async ensureDailyNoteExists(workspaceFolder: vscode.WorkspaceFolder, date: Date = new Date()): Promise<vscode.Uri> {
        const dailyNoteUri = this.getDailyNotePath(workspaceFolder, date);

        const exists = await this.fileWriter.exists(dailyNoteUri);
        if (!exists) {
            const templateContent = await this.getTemplateContent(workspaceFolder);

            // Ensure parent directory exists
            const dirUri = getParentDirectory(dailyNoteUri);
            await this.fileWriter.createDirectory(dirUri);

            // Create file with template content
            await this.fileWriter.write(dailyNoteUri, templateContent);
        }

        return dailyNoteUri;
    }

    /**
     * Opens an existing daily note or creates a new one for the specified date.
     * Main entry point for daily note functionality. Handles file existence checking,
     * directory creation, template application, and file opening.
     *
     * @param workspaceFolder - The VS Code workspace folder
     * @param date - The date for the daily note (defaults to current date)
     * @throws {Error} When file creation or opening fails
     */
    async openOrCreateDailyNote(workspaceFolder: vscode.WorkspaceFolder, date: Date = new Date()): Promise<void> {
        const dailyNoteUri = await this.ensureDailyNoteExists(workspaceFolder, date);
        await vscode.window.showTextDocument(dailyNoteUri);
    }

    /**
     * Appends a captured line to a named section inside today's daily note.
     * If the daily note or the section does not exist, they will be created.
     * Uses NoteParser.insertIntoSection for pure string manipulation.
     *
     * @param workspaceFolder - The VS Code workspace folder
     * @param content - The content to append (single-line)
     * @param sectionName - Optional section heading to append into. If omitted, uses ConfigurationManager.getCaptureSectionName().
     * @param date - Optional date for which daily note to append (defaults to today)
     * @returns Promise resolving to the inserted line index and target URI
     */
    async appendToSection(
        workspaceFolder: vscode.WorkspaceFolder,
        content: string,
        sectionName?: string,
        date: Date = new Date()
    ): Promise<{ uri: vscode.Uri; line: number }> {
        const targetSection = sectionName || this.configManager.getCaptureSectionName();

        // Ensure file exists (creates if necessary)
        const dailyUri = await this.ensureDailyNoteExists(workspaceFolder, date);

        // Read file content
        const text = await this.fileWriter.read(dailyUri);

        // Create the capture line with timestamp
        const timeFormat = this.configManager.getTimeFormat();
        const timeString = this.dateTimeFormatter.formatTime(new Date(), timeFormat);
        const lineText = `- [ ] ${timeString} — ${content}`;

        // Use NoteParser for pure string manipulation
        const { newContent, line } = insertIntoSection(text, targetSection, lineText);

        // Write back
        await this.fileWriter.write(dailyUri, newContent);

        return { uri: dailyUri, line };
    }
}
