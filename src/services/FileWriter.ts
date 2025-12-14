import * as vscode from 'vscode';
import * as path from 'path';

export interface IFileWriter {
    read(uri: vscode.Uri): Promise<string>;
    write(uri: vscode.Uri, content: string): Promise<void>;
    exists(uri: vscode.Uri): Promise<boolean>;
    createDirectory(uri: vscode.Uri): Promise<void>;
}

/**
 * A thin wrapper around VS Code's workspace.fs to perform file reads/writes.
 * Kept minimal so tests can mock IFileWriter.
 */
export class VscodeFileWriter implements IFileWriter {
    async read(uri: vscode.Uri): Promise<string> {
        const bytes = await vscode.workspace.fs.readFile(uri);
        return Buffer.from(bytes).toString('utf8');
    }

    async write(uri: vscode.Uri, content: string): Promise<void> {
        const bytes = Buffer.from(content, 'utf8');
        await vscode.workspace.fs.writeFile(uri, bytes);
    }

    async exists(uri: vscode.Uri): Promise<boolean> {
        try {
            await vscode.workspace.fs.stat(uri);
            return true;
        } catch {
            return false;
        }
    }

    async createDirectory(uri: vscode.Uri): Promise<void> {
        await vscode.workspace.fs.createDirectory(uri);
    }
}

/**
 * Returns the parent directory URI for a given file URI.
 */
export function getParentDirectory(fileUri: vscode.Uri): vscode.Uri {
    const uriPath = fileUri.path || fileUri.fsPath;
    const dirPath = path.dirname(uriPath);
    return fileUri.with({ path: dirPath });
}

export default IFileWriter;
