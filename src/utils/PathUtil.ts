/**
 * @fileoverview Path utilities for cross-platform file system operations.
 * Provides safe path handling, file name sanitization, and URI creation utilities
 * with support for both absolute and relative paths across different operating systems.
 *
 * @author MDloggerForCode Team
 * @version 1.0.0
 */

import * as vscode from 'vscode';
import * as path from 'path';

/**
 * Utility class for cross-platform path handling and file system operations.
 * Ensures compatibility across Windows, Linux, and macOS by providing safe
 * file name sanitization, path resolution, and URI creation methods.
 *
 * @class PathUtil
 */
export class PathUtil {
    /**
     * Determines if the specified path string is an absolute path.
     * Uses Node.js `path.isAbsolute()` to ensure consistent behavior
     * across Windows, Linux, and macOS platforms.
     *
     * @param pathString - The path string to check
     * @returns True if the path is absolute, false otherwise
     * @example
     * ```typescript
     * PathUtil.isAbsolutePath('/home/user/file.txt')  // true on Unix
     * PathUtil.isAbsolutePath('C:\\Users\\file.txt')   // true on Windows
     * PathUtil.isAbsolutePath('relative/path.txt')   // false
     * ```
     */
    static isAbsolutePath(pathString: string): boolean {
        if (!pathString || pathString.length === 0) {
            return false;
        }

        // Unix-style absolute path
        if (pathString.startsWith('/')) {
            return true;
        }

        // Windows drive-letter absolute path: C:\ or C:/
        if (/^[A-Za-z]:[\\/]/.test(pathString)) {
            return true;
        }

        // Windows UNC path must be like \\server\share (i.e. two path segments after UNC)
        // require at least "\\server\share"
        const uncMatch = pathString.match(/^\\\\([^\\]+)\\([^\\\/]+)([\\/].*)?$/);
        if (uncMatch) {
            return true;
        }

        return false;
    }

    /**
     * ファイル名として使用できない文字をサニタイズし、Windowsの予約名を回避します。
     *
     * - 禁止文字 (`/`, `\`, `:`, `*`, `?`, `"`, `<`, `>`, `|`) をハイフンに置換します。
     * - 制御文字（タブ、改行など）をハイフンに置換します。
     * - ファイル名の前後にある空白を削除します。
     * - ファイル名の末尾にあるピリオドを削除します。
     * - Windowsの予約名（CON, PRNなど）と一致する場合、先頭にアンダースコアを追加します。
     * - ファイル名の長さを255バイトに制限します。
     *
     * @param fileName - サニタイズ対象のファイル名。
     * @returns サニタイズされた安全なファイル名。
     */
    static sanitizeFileName(fileName: string): string {
        // Windows予約名チェック
        const reservedNames = ['CON', 'PRN', 'AUX', 'NUL',
            'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
            'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'];

        let sanitized = fileName
            .replace(/[/\\:*?"<>|]/g, '-')  // 特殊文字をハイフンに変換
            .replace(/\s+/g, ' ')          // 複数の空白を単一の空白に
            .replace(/[\t\n\r]/g, '-')     // タブ・改行をハイフンに変換
            .trim()                        // 前後の空白を削除
            .replace(/\.+$/, '')           // 末尾のピリオドを削除
            .substring(0, 255);            // ファイル名長制限

        // 空文字列チェック（末尾ピリオド削除後）
        if (!sanitized || sanitized.trim() === '') {
            return 'untitled';
        }

        // 予約名チェック（拡張子を除いたベース名、またはそれで始まる場合）
        const baseName = sanitized.split('.')[0].trim();
        const baseNameUpper = baseName.toUpperCase();
        // 予約名と完全一致、または予約名で始まり直後が非英数字の場合
        const isReserved = reservedNames.some(reserved => {
            if (baseNameUpper === reserved) { return true; }
            if (baseNameUpper.startsWith(reserved)) {
                const nextChar = baseName.charAt(reserved.length);
                // 予約名の後に英数字以外が続く場合（例: CON-file, CON:file）
                return nextChar && !/[a-zA-Z0-9]/.test(nextChar);
            }
            return false;
        });
        if (isReserved) {
            sanitized = `_${sanitized.trim()}`;
        }

        return sanitized.trim();
    }

    /**
     * ファイルの保存先URIを安全に生成します。
     *
     * `vaultRoot`が絶対パスか相対パスかを`isAbsolutePath`で判定し、
     * それぞれに応じた方法でURIを構築します。
     * - 絶対パスの場合: `vscode.Uri.file()` を使用して直接URIを生成します。
     * - 相対パスの場合: `vscode.Uri.joinPath()` を使用してワークスペースからの相対URIを生成します。
     *
     * @param vaultRoot - 設定で指定された保管庫のルートパス。
     * @param fileName - 作成するファイルの名前。
     * @param extension - ファイルの拡張子。
     * @param workspaceFolder - 現在のワークスペースフォルダ。
     * @returns 生成された`vscode.Uri`オブジェクト。
     */
    static createSafeUri(
        vaultRoot: string,
        fileName: string,
        extension: string,
        workspaceFolder: vscode.WorkspaceFolder
    ): vscode.Uri {
        const sanitizedFileName = this.sanitizeFileName(fileName) + extension;

        if (!vaultRoot || vaultRoot.trim() === '') {
            // vaultRootが空の場合、ワークスペースルートに作成
            return vscode.Uri.joinPath(workspaceFolder.uri, sanitizedFileName);
        }

        if (this.isAbsolutePath(vaultRoot)) {
            // 絶対パス: path.resolve()でクロスプラットフォーム対応
            const absolutePath = path.resolve(vaultRoot, sanitizedFileName);
            return vscode.Uri.file(absolutePath);
        }

        // 相対パス: joinPathでワークスペースからの相対パス
        return vscode.Uri.joinPath(workspaceFolder.uri, vaultRoot, sanitizedFileName);
    }
}
