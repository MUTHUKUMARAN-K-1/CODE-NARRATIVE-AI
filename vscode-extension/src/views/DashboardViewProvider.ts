import * as vscode from 'vscode';
import {
  createCodeNarrativeClient,
  CodeNarrativeClient,
} from '../client/CodeNarrativeClient';
import { SessionTracker, SessionVisualState } from '../pixelOffice/SessionEvents';
import {
  DashboardToHostMessage,
  HostToDashboardMessage,
} from './dashboardMessages';

interface ChatHistoryEntry {
  role: 'user' | 'assistant';
  content: string;
  ts: number;
}

export class DashboardViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'codeNarrative.dashboardView';

  private view?: vscode.WebviewView;
  // Single client instance (not created per message)
  private readonly client: CodeNarrativeClient;
  private readonly output: vscode.OutputChannel;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly sessionTracker: SessionTracker
  ) {
    this.output = vscode.window.createOutputChannel('Code Narrative AI - Dashboard');
    this.client = createCodeNarrativeClient(this.output);
  }

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this.view = webviewView;
    const webview = webviewView.webview;

    webview.options = {
      enableScripts: true,
      localResourceRoots: [this.context.extensionUri],
    };

    webview.html = this.getHtml(webview);

    // Restore history
    const history = this.context.workspaceState.get<ChatHistoryEntry[]>('dashboardHistory', []);
    if (history.length > 0) {
      this.postMessage({ type: 'chatResponse', payload: { user: '__history__', assistant: JSON.stringify(history) } });
    }

    // Push initial sessions
    const initialSessions = this.sessionTracker.getSnapshot();
    this.postMessage({ type: 'initState', payload: { sessions: initialSessions } });

    this.sessionTracker.addListener((sessions: SessionVisualState[]) => {
      this.postMessage({ type: 'sessionSnapshot', payload: { sessions } });
    });

    webview.onDidReceiveMessage(async (raw: unknown) => {
      const message = raw as DashboardToHostMessage;
      if (message.type === 'sendPrompt' && message.text) {
        await this.handleSendPrompt(message.text, message.command);
      } else if (message.type === 'exportMarkdown' && message.content) {
        await this.handleExportMarkdown(message.content);
      } else if (message.type === 'clearHistory') {
        void this.context.workspaceState.update('dashboardHistory', []);
      }
    });

    // Send initial editor context
    this.sendEditorContext(vscode.window.activeTextEditor);

    const editorChange = vscode.window.onDidChangeActiveTextEditor((editor) =>
      this.sendEditorContext(editor)
    );
    const selectionChange = vscode.window.onDidChangeTextEditorSelection((event) =>
      this.sendEditorContext(event.textEditor)
    );

    webviewView.onDidDispose(() => {
      editorChange.dispose();
      selectionChange.dispose();
    });
  }

  public focus() {
    if (this.view) {
      this.view.show?.(true);
    } else {
      void vscode.commands.executeCommand('workbench.view.extension.codeNarrative');
    }
  }

  // ── Handlers ──────────────────────────────────────────────────────────────

  private async handleSendPrompt(
    text: string,
    command: DashboardToHostMessage['command'] = 'chat'
  ) {
    const cleaned = String(text ?? '').trim();
    if (!cleaned) { return; }

    const editor = vscode.window.activeTextEditor;
    const languageId = editor?.document.languageId;
    const fileUri = editor?.document.uri.toString();
    const workspaceFolder = editor
      ? vscode.workspace.getWorkspaceFolder(editor.document.uri)?.name
      : vscode.workspace.workspaceFolders?.[0]?.name;

    const sessionId = `dash-${command}-${Date.now()}`;
    this.sessionTracker.handleEvent({ type: 'session-start', sessionId, timestamp: Date.now(), source: 'chat', fileUri, workspaceFolder });

    try {
      let response;
      if (command === 'explain') {
        await this.runExplainSelection(cleaned);
        return;
      } else if (command === 'summarize') {
        await this.runSummarizeFile(cleaned);
        return;
      } else if (command === 'review') {
        await this.runReview(cleaned);
        return;
      } else if (command === 'changelog') {
        await this.runChangelog();
        return;
      } else if (command === 'pr') {
        await this.runPrDescription();
        return;
      } else {
        response = await this.client.chat({
          messages: [{ role: 'user', content: cleaned }],
          languageId,
          fileUri,
          workspaceFolder,
        });
        this.postMessage({ type: 'chatResponse', payload: { user: cleaned, assistant: response.text } });
        this.saveHistory(cleaned, response.text);
        this.sessionTracker.handleEvent({ type: 'session-complete', sessionId, timestamp: Date.now() });
      }
    } catch (error) {
      this.postMessage({ type: 'error', payload: String(error) });
      this.sessionTracker.handleEvent({ type: 'session-error', sessionId, timestamp: Date.now(), message: String(error) });
    }
  }

  private async runExplainSelection(userText: string) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) { vscode.window.showInformationMessage('Code Narrative AI: Open a file and select some code to explain.'); return; }
    const selectedText = editor.document.getText(editor.selection);
    if (!selectedText.trim()) { vscode.window.showInformationMessage('Code Narrative AI: Select some code first.'); return; }
    const sessionId = `dash-explain-${Date.now()}`;
    const prompt = userText || '/explain (current selection)';
    this.sessionTracker.handleEvent({ type: 'session-start', sessionId, timestamp: Date.now(), source: 'explainSelection' });
    try {
      const response = await this.client.explainSelection({
        code: selectedText,
        languageId: editor.document.languageId,
        fileUri: editor.document.uri.toString(),
        workspaceFolder: vscode.workspace.getWorkspaceFolder(editor.document.uri)?.name,
        narrativeLevel: this.getNarrativeLevel(),
      });
      this.postMessage({ type: 'chatResponse', payload: { user: prompt, assistant: response.text } });
      this.saveHistory(prompt, response.text);
      this.sessionTracker.handleEvent({ type: 'session-complete', sessionId, timestamp: Date.now() });
    } catch (error) {
      this.postMessage({ type: 'error', payload: String(error) });
      this.sessionTracker.handleEvent({ type: 'session-error', sessionId, timestamp: Date.now(), message: String(error) });
    }
  }

  private async runSummarizeFile(userText: string) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) { vscode.window.showInformationMessage('Code Narrative AI: Open a file to summarize.'); return; }
    const sessionId = `dash-summarize-${Date.now()}`;
    const prompt = userText || '/summarize (current file)';
    this.sessionTracker.handleEvent({ type: 'session-start', sessionId, timestamp: Date.now(), source: 'summarizeFile' });
    try {
      const response = await this.client.summarizeFile({
        code: editor.document.getText(),
        languageId: editor.document.languageId,
        fileUri: editor.document.uri.toString(),
        workspaceFolder: vscode.workspace.getWorkspaceFolder(editor.document.uri)?.name,
        narrativeLevel: this.getNarrativeLevel(),
      });
      this.postMessage({ type: 'chatResponse', payload: { user: prompt, assistant: response.text } });
      this.saveHistory(prompt, response.text);
      this.sessionTracker.handleEvent({ type: 'session-complete', sessionId, timestamp: Date.now() });
    } catch (error) {
      this.postMessage({ type: 'error', payload: String(error) });
      this.sessionTracker.handleEvent({ type: 'session-error', sessionId, timestamp: Date.now(), message: String(error) });
    }
  }

  private async runReview(userText: string) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) { vscode.window.showInformationMessage('Code Narrative AI: Open a file to review.'); return; }
    const sessionId = `dash-review-${Date.now()}`;
    const prompt = userText || '/review (current file)';
    this.sessionTracker.handleEvent({ type: 'session-start', sessionId, timestamp: Date.now(), source: 'chat' });
    try {
      const response = await this.client.reviewCode({
        code: editor.document.getText(),
        languageId: editor.document.languageId,
        fileUri: editor.document.uri.toString(),
        workspaceFolder: vscode.workspace.getWorkspaceFolder(editor.document.uri)?.name,
      });
      this.postMessage({ type: 'chatResponse', payload: { user: prompt, assistant: response.text } });
      this.saveHistory(prompt, response.text);
      this.sessionTracker.handleEvent({ type: 'session-complete', sessionId, timestamp: Date.now() });
    } catch (error) {
      this.postMessage({ type: 'error', payload: String(error) });
      this.sessionTracker.handleEvent({ type: 'session-error', sessionId, timestamp: Date.now(), message: String(error) });
    }
  }

  private async runChangelog() {
    const ws = vscode.workspace.workspaceFolders?.[0];
    if (!ws) { vscode.window.showInformationMessage('Code Narrative AI: Open a workspace first.'); return; }
    const sessionId = `dash-changelog-${Date.now()}`;
    const prompt = '/changelog (last 30 commits)';
    this.sessionTracker.handleEvent({ type: 'session-start', sessionId, timestamp: Date.now(), source: 'chat', workspaceFolder: ws.name });
    try {
      const gitLog = await this.runGit(['log', '--oneline', '-30'], ws.uri.fsPath);
      const response = await this.client.changelog({ gitLog, workspaceFolder: ws.name });
      this.postMessage({ type: 'chatResponse', payload: { user: prompt, assistant: response.text } });
      this.saveHistory(prompt, response.text);
      this.sessionTracker.handleEvent({ type: 'session-complete', sessionId, timestamp: Date.now() });
    } catch (error) {
      this.postMessage({ type: 'error', payload: String(error) });
      this.sessionTracker.handleEvent({ type: 'session-error', sessionId, timestamp: Date.now(), message: String(error) });
    }
  }

  private async runPrDescription() {
    const ws = vscode.workspace.workspaceFolders?.[0];
    if (!ws) { vscode.window.showInformationMessage('Code Narrative AI: Open a workspace first.'); return; }
    const sessionId = `dash-pr-${Date.now()}`;
    const prompt = '/pr-description (staged diff)';
    this.sessionTracker.handleEvent({ type: 'session-start', sessionId, timestamp: Date.now(), source: 'chat', workspaceFolder: ws.name });
    try {
      let diff = await this.runGit(['diff', '--staged'], ws.uri.fsPath);
      if (!diff.trim()) { diff = await this.runGit(['diff', 'HEAD~1'], ws.uri.fsPath); }
      if (!diff.trim()) { this.postMessage({ type: 'error', payload: 'No staged changes or recent diff found.' }); return; }
      if (diff.length > 12000) { diff = diff.slice(0, 12000) + '\n\n// ... truncated'; }
      const response = await this.client.prDescription({ diff, workspaceFolder: ws.name });
      this.postMessage({ type: 'chatResponse', payload: { user: prompt, assistant: response.text } });
      this.saveHistory(prompt, response.text);
      this.sessionTracker.handleEvent({ type: 'session-complete', sessionId, timestamp: Date.now() });
    } catch (error) {
      this.postMessage({ type: 'error', payload: String(error) });
      this.sessionTracker.handleEvent({ type: 'session-error', sessionId, timestamp: Date.now(), message: String(error) });
    }
  }

  private async handleExportMarkdown(content: string) {
    const doc = await vscode.workspace.openTextDocument({ content, language: 'markdown' });
    await vscode.window.showTextDocument(doc, { preview: false });
  }

  // ── Utilities ─────────────────────────────────────────────────────────────

  private getNarrativeLevel(): 'short' | 'detailed' {
    return (vscode.workspace
      .getConfiguration('codeNarrative')
      .get<'short' | 'detailed'>('narrativeLevel', 'detailed')) as 'short' | 'detailed';
  }

  private async runGit(args: string[], cwd: string): Promise<string> {
    return new Promise((resolve) => {
      const { exec } = require('child_process') as typeof import('child_process');
      exec('git ' + args.join(' '), { cwd, maxBuffer: 1024 * 512 }, (_err: Error | null, stdout: string) => {
        resolve(stdout || '');
      });
    });
  }

  private saveHistory(userMsg: string, assistantMsg: string) {
    const history = this.context.workspaceState.get<ChatHistoryEntry[]>('dashboardHistory', []);
    const now = Date.now();
    history.push({ role: 'user', content: userMsg, ts: now });
    history.push({ role: 'assistant', content: assistantMsg, ts: now });
    void this.context.workspaceState.update('dashboardHistory', history.slice(-50));
  }

  private postMessage(message: HostToDashboardMessage) {
    if (!this.view) { return; }
    this.view.webview.postMessage(message);
  }

  private sendEditorContext(editor: vscode.TextEditor | undefined) {
    if (!this.view) { return; }
    if (!editor) { this.postMessage({ type: 'editorContextChanged', payload: {} }); return; }
    const document = editor.document;
    const fileUri = document.uri.toString();
    const languageId = document.languageId;
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
    const relativePath = workspaceFolder
      ? vscode.workspace.asRelativePath(document.uri)
      : document.fileName;
    const selection = editor.selection;
    const selectedText = selection.isEmpty
      ? document.lineAt(selection.active.line).text
      : document.getText(selection);
    const fullText = document.getText();
    const MAX_SNIPPET = 2000;
    const fullTextSnippet = fullText.length > MAX_SNIPPET
      ? `${fullText.slice(0, MAX_SNIPPET)}\n\n// … truncated …`
      : fullText;
    this.postMessage({ type: 'editorContextChanged', payload: { fileUri, languageId, relativePath, selectionPreview: selectedText, fullTextSnippet } });
  }

  // ── HTML ──────────────────────────────────────────────────────────────────

  private getHtml(webview: vscode.Webview): string {
    const nonce = getNonce();
    const cspSrc = webview.cspSource;

    const css = [
      ':root{--bg:#0a0a0b;--bg2:#111113;--bg3:#18181b;--bg4:#1e1e22;',
      '--glass:rgba(24,24,27,.75);--brd:rgba(255,255,255,.06);--brd-a:rgba(232,101,10,.4);',
      '--acc:#e8650a;--acc-h:#ff7a1a;--glow:rgba(232,101,10,.15);--sub:rgba(232,101,10,.08);',
      '--t1:#e4e4e7;--t2:#a1a1aa;--t3:#63636e;--ta:#f0a060;',
      '--purple:#a78bfa;--blue:#60a5fa;--green:#4ade80;--amber:#fbbf24;--rose:#fb7185;',
      '--r1:6px;--r2:10px;--r3:14px;',
      '--f:Inter,-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;',
      '--fm:Fira Code,Consolas,monospace;--tr:180ms cubic-bezier(.4,0,.2,1)}',
      '*{box-sizing:border-box;margin:0;padding:0}',
      'body{font-family:var(--f);color:var(--t1);background:var(--bg);display:flex;flex-direction:column;height:100vh;overflow:hidden;-webkit-font-smoothing:antialiased}',
      '.nav{display:flex;align-items:center;gap:8px;padding:10px 14px;background:var(--bg2);border-bottom:1px solid var(--brd);flex-shrink:0}',
      '.nav-logo{width:26px;height:26px;background:linear-gradient(135deg,var(--acc),#ff9040);border-radius:var(--r1);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;color:#fff;box-shadow:0 0 12px var(--glow)}',
      '.nav-t{font-size:12px;font-weight:600}',
      '.nav-v{font-size:9px;font-weight:600;color:var(--acc);background:var(--sub);padding:2px 6px;border-radius:20px}',
      '.nav-sp{flex:1}',
      '.nav-btn{width:24px;height:24px;border-radius:var(--r1);border:1px solid var(--brd);background:0 0;color:var(--t2);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:11px;transition:all var(--tr)}',
      '.nav-btn:hover{background:var(--bg4);color:var(--t1);border-color:var(--brd-a)}',
      '.main{display:flex;flex:1;overflow:hidden}',
      // Left sidebar
      '.sb{width:190px;border-right:1px solid var(--brd);background:var(--bg2);display:flex;flex-direction:column;flex-shrink:0;overflow:hidden}',
      '.sb-hdr{padding:10px 12px;font-size:9px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:var(--t3);border-bottom:1px solid var(--brd)}',
      '.sb-list{padding:6px;flex:0 0 auto}',
      '.sb-item{display:flex;align-items:center;gap:6px;padding:5px 7px;border-radius:var(--r1);font-size:11px;color:var(--t2);cursor:default;transition:all var(--tr)}',
      '.sb-item:hover{background:var(--bg3);color:var(--t1)}',
      '.sb-dot{width:5px;height:5px;border-radius:50%;flex-shrink:0}',
      '.sb-dot-on{background:var(--acc);box-shadow:0 0 5px var(--glow)}.sb-dot-off{background:var(--t3)}',
      '.sb-ctx{padding:10px 12px;border-top:1px solid var(--brd);flex:1;overflow-y:auto;font-size:10px;line-height:1.5}',
      '.sb-ctx-title{font-size:9px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;color:var(--t3);margin-bottom:5px}',
      '.sb-ctx-file{font-family:var(--fm);color:var(--ta);font-size:10px;word-break:break-all;margin-bottom:3px}',
      '.sb-ctx-lang{font-size:9px;color:var(--t3);margin-bottom:6px}',
      '.sb-ctx-prev{font-family:var(--fm);font-size:9px;color:var(--t2);background:var(--bg);border:1px solid var(--brd);border-radius:var(--r1);padding:6px;white-space:pre-wrap;overflow-x:auto;max-height:100px;overflow-y:auto}',
      // Center chat
      '.center{flex:1;display:flex;flex-direction:column;overflow:hidden}',
      '.msgs{flex:1;padding:10px;overflow-y:auto;scroll-behavior:smooth}',
      '.msgs::-webkit-scrollbar{width:3px}.msgs::-webkit-scrollbar-thumb{background:rgba(255,255,255,.08);border-radius:3px}',
      '.wlc{text-align:center;padding:28px 16px}',
      '.wlc-ic{width:44px;height:44px;margin:0 auto 12px;background:linear-gradient(135deg,var(--acc),#ff9040);border-radius:var(--r2);display:flex;align-items:center;justify-content:center;font-size:20px;box-shadow:0 8px 32px var(--glow)}',
      '.wlc h2{font-size:14px;font-weight:600;margin-bottom:6px}',
      '.wlc p{font-size:11px;color:var(--t2);line-height:1.5;max-width:230px;margin:0 auto}',
      '.wlc-cmds{display:flex;flex-wrap:wrap;gap:4px;justify-content:center;margin-top:12px}',
      '.wlc-c{font-size:10px;font-family:var(--fm);color:var(--acc);background:var(--sub);border:1px solid rgba(232,101,10,.15);padding:3px 8px;border-radius:20px;cursor:pointer;transition:all var(--tr)}',
      '.wlc-c:hover{background:rgba(232,101,10,.18);transform:translateY(-1px)}',
      '.mg{margin-bottom:12px;animation:fu .3s ease}',
      '.mg-r{display:flex;gap:7px;align-items:flex-start}',
      '.mg-av{width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;flex-shrink:0;margin-top:2px}',
      '.mg-av-u{background:var(--bg4);color:var(--t2);border:1px solid var(--brd)}',
      '.mg-av-a{background:linear-gradient(135deg,var(--acc),#ff9040);color:#fff;box-shadow:0 2px 10px var(--glow)}',
      '.mg-b{flex:1;min-width:0}',
      '.mg-h{display:flex;align-items:center;gap:6px;margin-bottom:4px}',
      '.mg-n{font-size:10px;font-weight:700}',
      '.mg-badge{font-size:8px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:var(--acc);background:var(--sub);padding:1px 6px;border-radius:20px}',
      '.mg-c{font-size:11px;line-height:1.6;word-wrap:break-word}',
      // Narrative cards
      '.nr-hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;padding-bottom:7px;border-bottom:1px solid var(--brd)}',
      '.nr-hdr-left{display:flex;align-items:center;gap:5px}',
      '.nr-hdr-ic{font-size:12px}',
      '.nr-hdr-t{font-size:9px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--purple)}',
      '.nr-hdr-a{display:flex;gap:3px}',
      '.nr-action{padding:2px 7px;border-radius:3px;border:1px solid var(--brd);background:0 0;color:var(--t3);font-size:8px;cursor:pointer;transition:all var(--tr);font-family:var(--f)}',
      '.nr-action:hover{background:var(--bg4);color:var(--t2)}',
      '.nr-tabs{display:flex;gap:3px;margin-bottom:8px}',
      '.nr-tab{padding:2px 8px;border-radius:20px;border:1px solid var(--brd);background:0 0;color:var(--t3);font-size:8px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;cursor:pointer;transition:all var(--tr);font-family:var(--f)}',
      '.nr-tab.active{border-color:var(--acc);color:var(--acc);background:var(--sub)}',
      '.nr-card{background:var(--bg3);border:1px solid var(--brd);border-radius:var(--r2);padding:9px 11px;margin-bottom:7px;border-left:3px solid var(--purple)}',
      '.nr-card.green{border-left-color:var(--green)}.nr-card.blue{border-left-color:var(--blue)}.nr-card.amber{border-left-color:var(--amber)}.nr-card.rose{border-left-color:var(--rose)}.nr-card.acc{border-left-color:var(--acc)}',
      '.nr-card-hdr{display:flex;align-items:center;gap:5px;cursor:pointer;user-select:none;margin-bottom:5px}',
      '.nr-arrow{font-size:8px;color:var(--t3);transition:transform var(--tr)}',
      '.nr-card.collapsed .nr-arrow{transform:rotate(-90deg)}',
      '.nr-card.collapsed .nr-card-body{display:none}',
      '.nr-lbl{font-size:8px;font-weight:700;letter-spacing:.7px;text-transform:uppercase;color:var(--t3);display:flex;align-items:center;gap:4px}',
      '.nr-lbl-dot{width:4px;height:4px;border-radius:50%}',
      '.nr-lbl-dot.purple{background:var(--purple)}.nr-lbl-dot.green{background:var(--green)}.nr-lbl-dot.blue{background:var(--blue)}.nr-lbl-dot.amber{background:var(--amber)}.nr-lbl-dot.rose{background:var(--rose)}.nr-lbl-dot.acc{background:var(--acc)}',
      '.nr-copy{margin-left:auto;width:18px;height:14px;border-radius:3px;border:1px solid var(--brd);background:0 0;color:var(--t3);font-size:8px;cursor:pointer;display:flex;align-items:center;justify-content:center;opacity:0;transition:all var(--tr)}',
      '.nr-card:hover .nr-copy{opacity:1}',
      '.nr-copy.done{color:var(--green)}',
      '.nr-txt{font-size:10px;line-height:1.65;color:var(--t1)}',
      '.nr-txt code{font-family:var(--fm);font-size:9px;background:var(--bg4);padding:1px 4px;border-radius:3px;color:var(--ta)}',
      '.nr-list{list-style:none;padding:0;margin:3px 0 0}',
      '.nr-list li{font-size:10px;line-height:1.6;color:var(--t2);padding:1px 0 1px 12px;position:relative}',
      '.nr-list li::before{content:"";position:absolute;left:3px;top:8px;width:3px;height:3px;border-radius:50%;background:var(--acc)}',
      '.nr-panel{display:none}.nr-panel.active{display:block}',
      '.nr-plain{background:var(--bg2);border:1px solid var(--brd);border-radius:var(--r2);padding:10px}',
      '.nr-plain-hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px}',
      '.nr-plain-t{font-size:8px;font-weight:700;letter-spacing:.7px;text-transform:uppercase;color:var(--t3)}',
      '.nr-plain p{font-size:11px;line-height:1.6}',
      '.nr-plain code{font-family:var(--fm);font-size:10px;background:var(--bg4);padding:1px 4px;border-radius:3px;color:var(--ta)}',
      '.nr-plain pre{background:var(--bg);border:1px solid var(--brd);border-radius:var(--r1);padding:8px;margin:5px 0;overflow-x:auto;font-family:var(--fm);font-size:10px;line-height:1.5}',
      '.nr-plain pre code{background:none;padding:0;border:none}',
      '.nr-plain strong{color:#fff;font-weight:600}',
      '.nr-plain ul,.nr-plain ol{margin:4px 0;padding-left:14px}',
      '.nr-plain li{margin:2px 0;font-size:11px}',
      // Loading / error
      '.ld{display:none;align-items:center;gap:7px;padding:8px;margin-bottom:8px}',
      '.ld.vis{display:flex}',
      '.ld-d{display:flex;gap:3px}',
      '.ld-dt{width:5px;height:5px;border-radius:50%;background:var(--acc);animation:dp 1.4s ease-in-out infinite}',
      '.ld-dt:nth-child(2){animation-delay:.2s}.ld-dt:nth-child(3){animation-delay:.4s}',
      '.ld-lb{font-size:10px;color:var(--t3);font-style:italic}',
      '.er{display:none;margin:0 10px 7px;padding:7px 10px;background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.25);border-radius:var(--r1);color:#fca5a5;font-size:10px}',
      '.er.vis{display:block}',
      // Input
      '.ia{flex-shrink:0;border-top:1px solid var(--brd);background:var(--bg2)}',
      '.nlv-bar{display:flex;align-items:center;gap:5px;padding:5px 10px;border-bottom:1px solid var(--brd)}',
      '.nlv-lbl{font-size:8px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:var(--t3)}',
      '.nlv-opts{display:flex;gap:3px}',
      '.nlv-opt{padding:2px 7px;border-radius:12px;border:1px solid var(--brd);background:0 0;color:var(--t3);font-size:8px;font-weight:700;cursor:pointer;transition:all var(--tr);font-family:var(--f)}',
      '.nlv-opt.active{background:var(--sub);border-color:var(--brd-a);color:var(--acc)}',
      '.iw{display:flex;align-items:flex-end;gap:6px;background:var(--glass);border:1px solid var(--brd);border-radius:var(--r3);padding:5px 5px 5px 11px;margin:7px 10px 5px;transition:all var(--tr)}',
      '.iw:focus-within{border-color:var(--brd-a);box-shadow:0 0 0 3px var(--glow)}',
      '.it{flex:1;background:0 0;border:none;outline:none;color:var(--t1);font-family:var(--f);font-size:11px;line-height:1.5;resize:none;min-height:16px;max-height:90px;padding:2px 0}',
      '.it::placeholder{color:var(--t3)}',
      '.sn{width:28px;height:28px;border-radius:50%;border:none;background:var(--acc);color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all var(--tr);box-shadow:0 2px 8px var(--glow)}',
      '.sn:hover:not(:disabled){background:var(--acc-h);transform:scale(1.05)}',
      '.sn:disabled{opacity:.4;cursor:default}',
      '.sn svg{width:12px;height:12px}',
      '.sh{font-size:9px;color:var(--t3);padding:0 10px 6px;display:flex;gap:4px;align-items:center;flex-wrap:wrap}',
      '.sh kbd{font-family:var(--fm);font-size:8px;background:var(--bg4);border:1px solid var(--brd);padding:1px 3px;border-radius:3px;color:var(--t2)}',
      // Right panel
      '.rp{width:240px;border-left:1px solid var(--brd);background:var(--bg2);display:flex;flex-direction:column;flex-shrink:0}',
      '.rp-hdr{padding:10px 12px;font-size:9px;font-weight:700;letter-spacing:.7px;text-transform:uppercase;color:var(--t3);border-bottom:1px solid var(--brd)}',
      '.rp-body{flex:1;padding:10px;overflow-y:auto;font-family:var(--fm);font-size:9px;color:var(--t2);white-space:pre-wrap;line-height:1.5}',
      '.rp-empty{color:var(--t3);font-style:italic;font-family:var(--f);font-size:10px;padding:16px;text-align:center}',
      '@keyframes fu{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}',
      '@keyframes dp{0%,80%,100%{transform:scale(.6);opacity:.4}40%{transform:scale(1);opacity:1}}'
    ].join('');

    const js = [
      '(function(){',
      'var api=acquireVsCodeApi();',
      'var msgsEl=document.getElementById("msgs");',
      'var inp=document.getElementById("inp");',
      'var snd=document.getElementById("snd");',
      'var ldEl=document.getElementById("ld");',
      'var erEl=document.getElementById("er");',
      'var wlcEl=document.getElementById("wlc");',
      'var ctxFile=document.getElementById("ctx-file");',
      'var ctxLang=document.getElementById("ctx-lang");',
      'var ctxPrev=document.getElementById("ctx-prev");',
      'var rpEmpty=document.getElementById("rp-empty");',
      'var rpCode=document.getElementById("rp-code");',
      'var sbSess=document.getElementById("sb-sess");',
      'function esc(t){var d=document.createElement("div");d.textContent=t;return d.innerHTML;}',
      'function fmt(t){var h=esc(t);h=h.replace(/\\n/g,"<br>");h=h.replace(/\\*\\*(.+?)\\*\\*/g,"<strong>$1</strong>");return h;}',
      'function copyText(text,btn){navigator.clipboard.writeText(text).then(function(){btn.textContent="Done";btn.classList.add("done");setTimeout(function(){btn.textContent="Copy";btn.classList.remove("done");},1500);}).catch(function(){});}',
      'function card(label,text,color){',
        'var c=document.createElement("div");c.className="nr-card"+(color?" "+color:"");',
        'c.innerHTML=\'<div class="nr-card-hdr"><span class="nr-arrow">&#9660;</span><div class="nr-lbl"><span class="nr-lbl-dot \'+(color||"purple")+\'"></span>\'+ esc(label) +\'</div><button class="nr-copy">Copy</button></div><div class="nr-card-body"><div class="nr-txt">\'+fmt(text)+\'</div></div>\';',
        'c.querySelector(".nr-card-hdr").addEventListener("click",function(e){if(e.target===c.querySelector(".nr-copy"))return;c.classList.toggle("collapsed");});',
        'c.querySelector(".nr-copy").addEventListener("click",function(e){e.stopPropagation();copyText(text,c.querySelector(".nr-copy"));});',
        'return c;',
      '}',
      'function listEl(arr){var ul=document.createElement("ul");ul.className="nr-list";arr.forEach(function(t){var li=document.createElement("li");li.textContent=t;ul.appendChild(li);});return ul;}',
      'function renderLevelInto(el,data){',
        'if(!data)return;',
        'if(data.explanation)el.appendChild(card("Explanation",data.explanation,"purple"));',
        'if(data.analogy)el.appendChild(card("Analogy",data.analogy,"green"));',
        'if(data.system_role)el.appendChild(card("System Role",data.system_role,"blue"));',
        'if(data.key_takeaway)el.appendChild(card("Key Takeaway",data.key_takeaway,"acc"));',
        'if(data.patterns_used)el.appendChild(card("Patterns Used",data.patterns_used,"amber"));',
        'if(data.tradeoffs)el.appendChild(card("Tradeoffs",data.tradeoffs,"rose"));',
        'if(data.design_decisions&&data.design_decisions.length){var c=card("Design Decisions","","blue");c.querySelector(".nr-card-body").appendChild(listEl(data.design_decisions));c.querySelector(".nr-txt").remove();el.appendChild(c);}',
        'if(data.potential_issues&&data.potential_issues.length){var c2=card("Potential Issues","","rose");c2.querySelector(".nr-card-body").appendChild(listEl(data.potential_issues));c2.querySelector(".nr-txt").remove();el.appendChild(c2);}',
      '}',
      'function buildNarrative(text){',
        'var json;try{json=JSON.parse(text);}catch(e){return null;}',
        'if(!json||typeof json!=="object")return null;',
        'var levels=["beginner","intermediate","expert"];var hasLevel=false;',
        'for(var k=0;k<levels.length;k++){if(json[levels[k]]){hasLevel=true;break;}}',
        'if(!hasLevel)return null;',
        'var root=document.createElement("div");',
        'var hdr=document.createElement("div");hdr.className="nr-hdr";',
        'var hl=document.createElement("div");hl.className="nr-hdr-left";hl.innerHTML=\'<span class="nr-hdr-ic">&#x2728;</span><span class="nr-hdr-t">Generated Narrative</span>\';',
        'var ha=document.createElement("div");ha.className="nr-hdr-a";',
        'var eb=document.createElement("button");eb.className="nr-action";eb.textContent="Export MD";',
        'eb.addEventListener("click",function(){api.postMessage({type:"exportMarkdown",content:text});});',
        'ha.appendChild(eb);hdr.appendChild(hl);hdr.appendChild(ha);root.appendChild(hdr);',
        'var tabBar=document.createElement("div");tabBar.className="nr-tabs";var panelWrap=document.createElement("div");var firstT=true;',
        'levels.forEach(function(lv){',
          'if(!json[lv])return;',
          'var tab=document.createElement("button");tab.className="nr-tab"+(firstT?" active":"");tab.textContent=lv.charAt(0).toUpperCase()+lv.slice(1);',
          'var panel=document.createElement("div");panel.className="nr-panel"+(firstT?" active":"");',
          'renderLevelInto(panel,json[lv]);',
          'tab.addEventListener("click",function(){tabBar.querySelectorAll(".nr-tab").forEach(function(t){t.classList.remove("active");});tab.classList.add("active");panelWrap.querySelectorAll(".nr-panel").forEach(function(p){p.classList.remove("active");});panel.classList.add("active");});',
          'tabBar.appendChild(tab);panelWrap.appendChild(panel);firstT=false;',
        '});',
        'root.appendChild(tabBar);root.appendChild(panelWrap);return root;',
      '}',
      'function buildPlain(text){',
        'var wrap=document.createElement("div");wrap.className="nr-plain";',
        'var h=document.createElement("div");h.className="nr-plain-hdr";',
        'var t=document.createElement("span");t.className="nr-plain-t";t.textContent="Response";',
        'var cb=document.createElement("button");cb.className="nr-action";cb.textContent="Copy";cb.addEventListener("click",function(){copyText(text,cb);});',
        'var eb=document.createElement("button");eb.className="nr-action";eb.textContent="Export MD";eb.addEventListener("click",function(){api.postMessage({type:"exportMarkdown",content:text});});',
        'h.appendChild(t);h.appendChild(cb);h.appendChild(eb);wrap.appendChild(h);',
        'var body=document.createElement("div");body.innerHTML=fmt(text);wrap.appendChild(body);return wrap;',
      '}',
      'function renderResponse(text){var n=buildNarrative(text);return n||buildPlain(text);}',
      'function hideWlc(){if(wlcEl)wlcEl.style.display="none";}',
      'function addMsg(role,content,skipScroll){',
        'hideWlc();var w=document.createElement("div");w.className="mg";',
        'if(role==="user"){',
          'var r=document.createElement("div");r.className="mg-r";',
          'var av=document.createElement("div");av.className="mg-av mg-av-u";av.textContent="U";',
          'var b=document.createElement("div");b.className="mg-b";',
          'var mh=document.createElement("div");mh.className="mg-h";var mn=document.createElement("span");mn.className="mg-n";mn.textContent="You";mh.appendChild(mn);',
          'var mc=document.createElement("div");mc.className="mg-c";mc.innerHTML=esc(content);',
          'b.appendChild(mh);b.appendChild(mc);r.appendChild(av);r.appendChild(b);w.appendChild(r);',
        '}else{',
          'var r=document.createElement("div");r.className="mg-r";',
          'var av=document.createElement("div");av.className="mg-av mg-av-a";av.textContent="CN";',
          'var b=document.createElement("div");b.className="mg-b";',
          'var mh=document.createElement("div");mh.className="mg-h";var mn=document.createElement("span");mn.className="mg-n";mn.textContent="Code Narrative AI";var mb=document.createElement("span");mb.className="mg-badge";mb.textContent="Narrative";mh.appendChild(mn);mh.appendChild(mb);',
          'var mc=document.createElement("div");mc.className="mg-c";mc.appendChild(renderResponse(content));',
          'b.appendChild(mh);b.appendChild(mc);r.appendChild(av);r.appendChild(b);w.appendChild(r);',
        '}',
        'msgsEl.appendChild(w);if(!skipScroll)msgsEl.scrollTop=msgsEl.scrollHeight;',
      '}',
      'function setLd(v){if(v)ldEl.classList.add("vis");else ldEl.classList.remove("vis");snd.disabled=v;}',
      'function setErr(m){erEl.textContent=m;erEl.classList.add("vis");setTimeout(function(){erEl.classList.remove("vis");},6000);}',
      'function updateCtx(p){',
        'if(!p||!p.relativePath){ctxFile.textContent="No file open";ctxLang.textContent="";ctxPrev.style.display="none";rpEmpty.style.display="";rpCode.style.display="none";return;}',
        'ctxFile.textContent=p.relativePath;ctxLang.textContent=p.languageId||"";',
        'if(p.selectionPreview){ctxPrev.textContent=p.selectionPreview;ctxPrev.style.display="";}else{ctxPrev.style.display="none";}',
        'if(p.fullTextSnippet){rpEmpty.style.display="none";rpCode.style.display="";rpCode.textContent=p.fullTextSnippet;}else{rpEmpty.style.display="";rpCode.style.display="none";}',
      '}',
      'function updateSessions(sessions){',
        'if(!sessions||!sessions.length){sbSess.innerHTML=\'<div style="padding:6px 8px;font-size:10px;color:var(--t3)">No active sessions</div>\';return;}',
        'var h="";sessions.forEach(function(s){h+=\'<div class="sb-item"><div class="sb-dot \'+(s.isOnline?"sb-dot-on":"sb-dot-off")+\'"></div><span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:10px">\'+ esc(s.userName||"Session") +\'</span></div>\';});sbSess.innerHTML=h;',
      '}',
      'function detectCmd(raw){',
        'if(raw.charAt(0)!=="/")return{command:"",text:raw};',
        'var parts=raw.split(/\\s+/);var head=parts[0].toLowerCase();var body=parts.slice(1).join(" ").trim();',
        'if(head==="/explain")return{command:"explain",text:body};',
        'if(head==="/summarize")return{command:"summarize",text:body};',
        'if(head==="/review")return{command:"review",text:body};',
        'if(head==="/changelog")return{command:"changelog",text:body};',
        'if(head==="/pr"||head==="/pr-description")return{command:"pr",text:body};',
        'return{command:"",text:raw};',
      '}',
      'function send(){var raw=inp.value.trim();if(!raw)return;var r=detectCmd(raw);if(!r.command||r.command==="chat")addMsg("user",raw);api.postMessage({type:"sendPrompt",text:r.text||raw,command:r.command||"chat"});inp.value="";inp.style.height="auto";}',
      'snd.addEventListener("click",send);',
      'inp.addEventListener("keydown",function(e){if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}});',
      'inp.addEventListener("input",function(){inp.style.height="auto";inp.style.height=Math.min(inp.scrollHeight,90)+"px";});',
      'document.querySelectorAll(".nlv-opt").forEach(function(btn){btn.addEventListener("click",function(){document.querySelectorAll(".nlv-opt").forEach(function(b){b.classList.remove("active");});btn.classList.add("active");});});',
      'document.querySelectorAll(".wlc-c").forEach(function(b){b.addEventListener("click",function(){inp.value=b.getAttribute("data-cmd")||b.textContent;inp.focus();});});',
      'document.getElementById("clr").addEventListener("click",function(){msgsEl.innerHTML="";api.postMessage({type:"clearHistory"});});',
      'window.addEventListener("message",function(ev){',
        'var m=ev.data;if(!m||!m.type)return;',
        'if(m.type==="chatResponse"){',
          'var p=m.payload||{};',
          'if(p.user==="__history__"){',
            'try{var hist=JSON.parse(p.assistant);hist.forEach(function(e){addMsg(e.role,e.content,true);});msgsEl.scrollTop=msgsEl.scrollHeight;}catch(e){}',
          '}else{if(p.user)addMsg("user",p.user);if(p.assistant)addMsg("assistant",p.assistant);}',
        '}else if(m.type==="error"){setErr(String(m.payload||""));',
        '}else if(m.type==="editorContextChanged"){updateCtx(m.payload);',
        '}else if(m.type==="initState"){if(m.payload&&m.payload.sessions)updateSessions(m.payload.sessions);',
        '}else if(m.type==="sessionSnapshot"){if(m.payload&&m.payload.sessions)updateSessions(m.payload.sessions);}',
      '});',
      '})();'
    ].join('\n');

    return '<!DOCTYPE html>' +
      '<html lang="en"><head>' +
      '<meta charset="UTF-8"/>' +
      '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; img-src ' + cspSrc + ' https:; script-src \'nonce-' + nonce + '\'; style-src \'unsafe-inline\' ' + cspSrc + ';">' +
      '<meta name="viewport" content="width=device-width,initial-scale=1.0"/>' +
      '<title>Code Narrative Dashboard</title>' +
      '<style>' + css + '</style></head><body>' +
      '<div class="nav"><div class="nav-logo">CN</div><span class="nav-t">Dashboard</span><span class="nav-v">v0.1.0</span><div class="nav-sp"></div><button class="nav-btn" id="clr" title="Clear">&#x2715;</button></div>' +
      '<div class="main">' +
        '<div class="sb"><div class="sb-hdr">Sessions</div><div id="sb-sess" class="sb-list"></div>' +
          '<div class="sb-ctx"><div class="sb-ctx-title">Active File</div><div class="sb-ctx-file" id="ctx-file">No file open</div><div class="sb-ctx-lang" id="ctx-lang"></div><div class="sb-ctx-prev" id="ctx-prev" style="display:none"></div></div>' +
        '</div>' +
        '<div class="center">' +
          '<div id="msgs" class="msgs"><div id="wlc" class="wlc"><div class="wlc-ic">&#x2728;</div><h2>Code Narrative Dashboard</h2><p>AI-powered code narratives, reviews, and changelogs.</p><div class="wlc-cmds">' +
            '<button class="wlc-c" data-cmd="/explain">/explain</button>' +
            '<button class="wlc-c" data-cmd="/summarize">/summarize</button>' +
            '<button class="wlc-c" data-cmd="/review">/review</button>' +
            '<button class="wlc-c" data-cmd="/changelog">/changelog</button>' +
            '<button class="wlc-c" data-cmd="/pr">/pr-description</button>' +
          '</div></div></div>' +
          '<div id="ld" class="ld"><div class="mg-av mg-av-a" style="width:20px;height:20px;font-size:9px">CN</div><div class="ld-d"><div class="ld-dt"></div><div class="ld-dt"></div><div class="ld-dt"></div></div><span class="ld-lb">Generating...</span></div>' +
          '<div id="er" class="er"></div>' +
          '<div class="ia">' +
            '<div class="nlv-bar"><span class="nlv-lbl">Level</span><div class="nlv-opts"><button class="nlv-opt active" data-lv="beginner">Beginner</button><button class="nlv-opt" data-lv="intermediate">Intermediate</button><button class="nlv-opt" data-lv="expert">Expert</button></div></div>' +
            '<div class="iw"><textarea id="inp" class="it" rows="1" placeholder="Ask, /explain, /review, /changelog..."></textarea><button id="snd" class="sn" title="Send"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg></button></div>' +
            '<div class="sh"><kbd>Enter</kbd><span>send</span><span style="margin-left:4px;color:var(--acc)">/explain /review /changelog /pr</span></div>' +
          '</div>' +
        '</div>' +
        '<div class="rp"><div class="rp-hdr">Code Preview</div><div class="rp-body"><div class="rp-empty" id="rp-empty">Select code to preview</div><pre id="rp-code" style="display:none;margin:0;background:none;border:none;padding:0;font-size:9px;line-height:1.5"></pre></div></div>' +
      '</div>' +
      '<script nonce="' + nonce + '">' + js + '</script></body></html>';
  }
}

function getNonce() {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
