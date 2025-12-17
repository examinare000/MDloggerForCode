import * as path from 'path';
import * as cp from 'child_process';
import { downloadAndUnzipVSCode } from '@vscode/test-electron';

function detectInstalledVSCodeVersion(): string | undefined {
    // Try explicit CLI path hints first, then fall back to standard commands
    const candidates = [
        process.env.VSCODE_CLI_PATH,
        process.env.CODE_PATH,
        process.env.CODE_CMD,
        'code',
        'code-insiders'
    ].filter(Boolean) as string[];

    const tried = new Set<string>();

    for (const candidate of candidates) {
        const command = candidate.trim();
        if (!command || tried.has(command)) {
            continue;
        }

        tried.add(command);

        try {
            const result = cp.spawnSync(command, ['--version'], {
                encoding: 'utf8'
            });
            const stdout = (result.stdout ?? '').toString().trim();
            if (result.status === 0 && stdout) {
                const version = stdout.split(/\r?\n/)[0]?.trim();
                if (version) {
                    return version;
                }
            }
        } catch {
            // Ignore and continue to next candidate
        }
    }

    return undefined;
}

async function main() {
    try {
        // The folder containing the Extension Manifest package.json
        // Passed to `--extensionDevelopmentPath`
        const extensionDevelopmentPath = path.resolve(__dirname, '../../');

        // The path to the extension test script
        // Passed to --extensionTestsPath
        const extensionTestsPath = path.resolve(__dirname, './suite/index');

        // Always download the same VS Code version as the one installed locally (if detectable)
        const installedVSCodeVersion = detectInstalledVSCodeVersion();
        const fallbackEnginesVersion =
            require('../../package.json')?.engines?.vscode?.replace(/^[^0-9]*/, '') || 'stable';

        const versionToDownload = installedVSCodeVersion ?? fallbackEnginesVersion;
        const vscodeExecutablePath = await downloadAndUnzipVSCode({
            version: versionToDownload
        });

        const args = [
            `--extensionDevelopmentPath=${extensionDevelopmentPath}`,
            `--extensionTestsPath=${extensionTestsPath}`
        ];

        // On Windows, wrap the path in quotes when using shell spawn
        const command = process.platform === 'win32' ? `"${vscodeExecutablePath}"` : vscodeExecutablePath;
        const proc = cp.spawn(command, args, {
            stdio: 'inherit',
            shell: process.platform === 'win32'
        });

        proc.on('close', code => {
            if (code !== 0) {
                console.error(`VS Code exited with code ${code}`);
                process.exit(code ?? 1);
            }
        });
    } catch (err) {
        console.error('Failed to run tests', err);
        process.exit(1);
    }
}

main();
