import * as vscode from 'vscode';
import * as path from 'path';
import { IFileWriter } from './FileWriter';
import { collectOpenTasksFromFiles, applyTaskCompletionToContent, TaskGroup } from '../utils/TaskCollector';

/**
 * TaskService orchestrates reading files, collecting open tasks and applying completions.
 * It is intentionally small and uses an injected IFileWriter so it can be unit tested.
 */
export class TaskService {
    private fileWriter: IFileWriter;

    constructor(fileWriter: IFileWriter) {
        this.fileWriter = fileWriter;
    }

    /**
     * Collect open tasks from the provided URIs.
     * Reads each file via the fileWriter and returns collected tasks.
     */
    async collectTasksFromUris(uris: vscode.Uri[]): Promise<TaskGroup[]> {
        const filesForCollector: { uri: string; file: string; content: string }[] = [];
        for (const uri of uris) {
            const content = await this.fileWriter.read(uri);
            filesForCollector.push({ uri: uri.fsPath, file: path.basename(uri.fsPath), content });
        }

        return collectOpenTasksFromFiles(filesForCollector);
    }

    /**
     * Mark a single task as completed in the given file.
     * Returns the updated content after write.
     */
    async completeTask(uri: vscode.Uri, lineIndex: number, completionDate: string): Promise<string> {
        const content = await this.fileWriter.read(uri);
        const newContent = applyTaskCompletionToContent(content, lineIndex, completionDate);
        await this.fileWriter.write(uri, newContent);
        return newContent;
    }

    /**
     * Complete all tasks provided in the payload (grouped completion).
     * Returns the updated content of the last processed file.
     */
    async completeTasks(items: { uri: vscode.Uri; line: number }[], completionDate: string): Promise<string> {
        const byUri = new Map<string, { uri: vscode.Uri; lines: number[] }>();
        for (const item of items) {
            const key = item.uri.toString();
            const bucket = byUri.get(key) || { uri: item.uri, lines: [] };
            bucket.lines.push(item.line);
            byUri.set(key, bucket);
        }

        let lastContent = '';
        for (const { uri, lines } of byUri.values()) {
            const content = await this.fileWriter.read(uri);
            // Ensure deterministic order
            const sortedLines = [...lines].sort((a, b) => a - b);
            let updated = content;
            for (const lineIndex of sortedLines) {
                updated = applyTaskCompletionToContent(updated, lineIndex, completionDate);
            }
            await this.fileWriter.write(uri, updated);
            lastContent = updated;
        }
        return lastContent;
    }
}

export default TaskService;
