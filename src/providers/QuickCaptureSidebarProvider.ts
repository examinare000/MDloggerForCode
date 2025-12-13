import * as vscode from 'vscode';
import { ConfigurationManager } from '../managers/ConfigurationManager';
import { DailyNoteManager } from '../managers/DailyNoteManager';
import { TaskService } from '../services/TaskService';
import { VscodeFileWriter } from '../services/FileWriter';

export class QuickCaptureSidebarProvider implements vscode.WebviewViewProvider {
    public static readonly viewId = 'mdlg.quickCapture';
    private view?: vscode.WebviewView;
    private taskServiceInstance?: TaskService;

    constructor(
        private readonly context: vscode.ExtensionContext,
        private readonly configManager: ConfigurationManager,
        private readonly dailyNoteManager: DailyNoteManager
    ) {}

  private get taskService(): TaskService {
    // lazy init with VscodeFileWriter to allow easier testing/mocking
    if (!this.taskServiceInstance) {
      this.taskServiceInstance = new TaskService(new VscodeFileWriter());
    }
    return this.taskServiceInstance;
  }

    resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext<unknown>,
        _token: vscode.CancellationToken
    ): void {
        this.view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this.context.extensionUri]
        };

        webviewView.webview.html = this.getHtmlForWebview(webviewView.webview);

        type CaptureAddMessage = { command: 'capture:add'; content?: string };
        type RequestTasksMessage = { command: 'request:tasks' };
        type TaskCompleteMessage = { command: 'task:complete'; payload?: { uri: string; line: number } };
        type QuickCaptureMessage = CaptureAddMessage | RequestTasksMessage | TaskCompleteMessage;

        webviewView.webview.onDidReceiveMessage(async (msg: QuickCaptureMessage) => {
            try {
                switch (msg.command) {
                    case 'capture:add': {
                        const text: string = (msg as CaptureAddMessage).content || '';
                        if (!text || text.trim() === '') {
                            webviewView.webview.postMessage({ command: 'error', message: 'Empty capture' });
                            return;
                        }

                        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
                        if (!workspaceFolder) {
                            webviewView.webview.postMessage({ command: 'error', message: 'No workspace open' });
                            return;
                        }

                        const result = await this.dailyNoteManager.appendToSection(workspaceFolder, text);
                        webviewView.webview.postMessage({ command: 'capture:ok', timestamp: new Date().toISOString(), uri: result.uri.toString(), line: result.line });
                        return;
                    }

                    case 'request:tasks': {
            // Collect open tasks from dailyNote directory only
            try {
              const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
              if (!workspaceFolder) {
                webviewView.webview.postMessage({ command: 'tasks:update', tasks: [] });
                return;
              }

              // Restrict search to the configured daily note directory
              const dailyNoteDir = this.dailyNoteManager.getDailyNoteDirectory(workspaceFolder);
              const files = await vscode.workspace.findFiles(new vscode.RelativePattern(dailyNoteDir, '**/*.md'), '**/node_modules/**', 200);
              const tasks = await this.taskService.collectTasksFromUris(files);
              webviewView.webview.postMessage({ command: 'tasks:update', tasks });
            } catch (err) {
              webviewView.webview.postMessage({ command: 'tasks:update', tasks: [] });
            }
                        return;
                    }
          case 'task:complete': {
            // payload: { uri: string, line: number }
            const payload = (msg as TaskCompleteMessage).payload || { uri: '', line: NaN };
            try {
              const uriStr = payload.uri;
              const line = Number(payload.line);
              if (!uriStr || Number.isNaN(line)) {
                webviewView.webview.postMessage({ command: 'error', message: 'Invalid task complete payload' });
                return;
              }
              const uri = vscode.Uri.file(uriStr);
              const today = new Date().toISOString().slice(0, 10);
              await this.taskService.completeTask(uri, line, today);
              // refresh tasks from dailyNote directory only
              const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
              if (!workspaceFolder) {
                webviewView.webview.postMessage({ command: 'tasks:update', tasks: [] });
                return;
              }
              const dailyNoteDir = this.dailyNoteManager.getDailyNoteDirectory(workspaceFolder);
              const files = await vscode.workspace.findFiles(new vscode.RelativePattern(dailyNoteDir, '**/*.md'), '**/node_modules/**', 200);
              const tasks = await this.taskService.collectTasksFromUris(files);
              webviewView.webview.postMessage({ command: 'tasks:update', tasks });
            } catch (err) {
              webviewView.webview.postMessage({ command: 'error', message: err instanceof Error ? err.message : String(err) });
            }
            return;
          }
                }
            } catch (e) {
                webviewView.webview.postMessage({ command: 'error', message: e instanceof Error ? e.message : String(e) });
            }
        });
    }

    private getHtmlForWebview(webview: vscode.Webview): string {
        const nonce = getNonce();
        return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 8px; }
    .capture { display:flex; gap:8px; }
    input[type="text"] { flex:1; padding:6px 8px; }
    button { padding:6px 8px; }
    .tasks { margin-top:12px; }
    .task { display:flex; align-items:center; gap:8px; padding:4px 0; }
    .task button { margin-left:auto; }
  </style>
</head>
<body>
  <div>
    <div class="capture">
      <input id="captureInput" type="text" placeholder="Quick note..." />
      <button id="captureBtn">Add</button>
    </div>

    <div class="tasks">
      <h4>Open tasks</h4>
      <div id="tasksList">(loading...)</div>
    </div>
  </div>
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const input = document.getElementById('captureInput');
    const btn = document.getElementById('captureBtn');
    const tasksList = document.getElementById('tasksList');

    function submitCapture() {
      const v = input.value.trim();
      if (!v) return;
      vscode.postMessage({ command: 'capture:add', content: v });
      input.value = '';
    }

    btn.addEventListener('click', submitCapture);

    // Ctrl+Enter (Cmd+Enter on Mac) to submit
    input.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        submitCapture();
      }
    });

    window.addEventListener('message', event => {
      const msg = event.data;
      switch (msg.command) {
        case 'capture:ok':
          // Simple ack
          tasksList.innerText = 'Captured at ' + new Date(msg.timestamp).toLocaleTimeString();
          break;
        case 'tasks:update':
          const tasks = msg.tasks || [];
          if (tasks.length === 0) {
            tasksList.innerText = '(no tasks)';
          } else {
            // Build DOM nodes to avoid nested template/backtick issues
            tasksList.innerHTML = '';
            tasks.forEach(t => {
              const div = document.createElement('div');
              div.className = 'task';
              const span = document.createElement('span');
              span.textContent = t.text;
              const btn = document.createElement('button');
              btn.textContent = 'Complete';
              btn.dataset.uri = t.uri;
              btn.dataset.line = String(t.line);
              btn.addEventListener('click', () => {
                vscode.postMessage({ command: 'task:complete', payload: { uri: t.uri, line: t.line } });
              });
              div.appendChild(span);
              div.appendChild(btn);
              tasksList.appendChild(div);
            });
          }
          break;
        case 'error':
          tasksList.innerText = 'Error: ' + msg.message;
          break;
      }
    });

    // request initial tasks
    vscode.postMessage({ command: 'request:tasks' });

    function escapeHtml(s) { return s.replace(/[&<>\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
  </script>
</body>
</html>`;
    }
}

function getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
