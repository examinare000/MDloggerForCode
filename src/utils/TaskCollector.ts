import { TaskItem, extractTasks, markTaskCompleted } from './NoteParser';

export interface TaskItemRef {
    uri: string;
    file: string;
    line: number;
}

export interface TaskGroup {
    text: string;
    count: number;
    files: string[];
    items: TaskItemRef[];
}

/**
 * Collect open (unchecked) tasks from multiple file contents and group them by text.
 * Returns [{ text, count, files, items[] }]
 */
export function collectOpenTasksFromFiles(files: { uri: string; file: string; content: string }[]): TaskGroup[] {
    const groups = new Map<string, { count: number; files: Set<string>; items: TaskItemRef[] }>();

    for (const f of files) {
        const tasks = extractTasks(f.content);
        for (const t of tasks) {
            const entry = groups.get(t.text) || { count: 0, files: new Set<string>(), items: [] };
            entry.count += 1;
            entry.files.add(f.file);
            entry.items.push({ uri: f.uri, file: f.file, line: t.line });
            groups.set(t.text, entry);
        }
    }

    return Array.from(groups.entries()).map(([text, value]) => ({
        text,
        count: value.count,
        files: Array.from(value.files),
        items: value.items
    }));
}

/**
 * Apply task completion to the given file content at lineIndex and return the new content.
 * This is a pure wrapper around NoteParser.markTaskCompleted to keep semantics clear.
 */
export function applyTaskCompletionToContent(content: string, lineIndex: number, completionDate: string): string {
    return markTaskCompleted(content, lineIndex, completionDate);
}
