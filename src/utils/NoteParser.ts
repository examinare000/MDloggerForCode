/**
 * Utilities for parsing and editing checklist tasks inside Markdown notes.
 * Pure text operations (no VS Code API) so they are easy to unit test.
 */
export interface TaskItem {
    line: number;
    text: string;
    raw: string;
}

/**
 * Extract unchecked checklist items from the given Markdown content.
 * Matches lines like: "- [ ] Task text" (allowing indentation and other list markers)
 */
export function extractTasks(content: string): TaskItem[] {
    const lines = content.split(/\r?\n/);
    const regex = /^(\s*[-*+]\s+)\[\s*\]\s+(.*)$/;
    const results: TaskItem[] = [];

    for (let i = 0; i < lines.length; i++) {
        const m = lines[i].match(regex);
        if (m) {
            results.push({ line: i, text: m[2], raw: lines[i] });
        }
    }

    return results;
}

/**
 * Mark a task line as completed by converting the checkbox and appending a completion tag.
 * - If the target line is an unchecked task (- [ ] ...), it becomes - [x] ... [completion: YYYY-MM-DD]
 * - If it's already checked but missing completion tag, the tag is appended.
 * - If completion tag already exists, the line is left unchanged.
 * Returns the new content.
 */
export function markTaskCompleted(content: string, lineIndex: number, completionDate: string): string {
    const newline = content.includes('\r\n') ? '\r\n' : '\n';
    const lines = content.split(/\r?\n/);
    if (lineIndex < 0 || lineIndex >= lines.length) {
        return content;
    }

    const line = lines[lineIndex];

    // Detect completion tag presence
    const completionTagRegex = /\[completion:\s*\d{4}-\d{2}-\d{2}\]/i;
    if (completionTagRegex.test(line)) {
        return content; // already marked
    }

    // Match list marker and checkbox
    const checkboxRegex = /^(\s*([-*+]\s+))\[( |x|X)?\]\s*(.*)$/;
    const m = line.match(checkboxRegex);
    if (!m) {
        return content; // not a checklist line
    }

    const prefix = m[1];
    // m[3] is current checkbox state (space or x)
    const rest = m[4] || '';

    const newLine = `${prefix}[x] ${rest} [completion: ${completionDate}]`;
    lines[lineIndex] = newLine;

    return lines.join(newline);
}

function findSectionInsertLine(lines: string[], headingIndex: number): number {
    let j = headingIndex + 1;
    let lastContentLine = headingIndex;
    for (; j < lines.length; j++) {
        if (/^#{1,6}\s+/.test(lines[j])) {
            break; // next heading starts here
        }
        if (lines[j].trim() !== '') {
            lastContentLine = j;
        }
    }
    // Insert after the last content line; if none, insert directly after heading
    return lastContentLine === headingIndex ? headingIndex + 1 : lastContentLine + 1;
}

/**
 * Insert a line into the named section inside the provided content.
 * If the section exists, insert before the next heading (or at EOF if none).
 * If the section does not exist, append a new heading (## {section}) and then the line.
 * Returns an object with newContent and the inserted line index.
 */
export function insertIntoSection(content: string, sectionName: string, lineText: string): { newContent: string; line: number } {
    const newline = content.includes('\r\n') ? '\r\n' : '\n';
    const lines = content.split(/\r?\n/);

    const escaped = sectionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const headingRegex = new RegExp(`^#{1,6}\\s*${escaped}\\s*$`, 'i');

    let insertLine = lines.length;
    let found = false;

    for (let i = 0; i < lines.length; i++) {
        if (headingRegex.test(lines[i])) {
            found = true;
            insertLine = findSectionInsertLine(lines, i);
            break;
        }
    }

    if (!found) {
        // append heading then insert
        if (lines.length > 0 && lines[lines.length - 1].trim() !== '') {
            lines.push('');
        }
        lines.push(`## ${sectionName}`);
        insertLine = lines.length;
    }

    lines.splice(insertLine, 0, lineText);

    return { newContent: lines.join(newline), line: insertLine };
}
