import * as vscode from 'vscode';
import {
  ChatMessage,
  CodeNarrativeClient,
  CodeNarrativeResponse,
} from '../client/CodeNarrativeClient';
import { SessionTracker } from '../pixelOffice/SessionEvents';

type ViewMessageType = 'addMessage' | 'setLoading' | 'setError' | 'clear' | 'initHistory';

interface ViewMessage {
  type: ViewMessageType;
  payload?: unknown;
}

interface ChatHistoryEntry {
  role: 'user' | 'assistant';
  content: string;
  ts: number;
}

export class SidePanelProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'codeNarrative.chatView';

  private view?: vscode.WebviewView;
  private pendingMessages: ViewMessage[] = [];

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly client: CodeNarrativeClient,
    private readonly context: vscode.ExtensionContext,
    private readonly sessionTracker: SessionTracker
  ) {}

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void | Thenable<void> {
    this.view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri],
    };

    webviewView.webview.html = this.getHtml(webviewView.webview);

    // Restore chat history
    const history = this.context.workspaceState.get<ChatHistoryEntry[]>('chatHistory', []);
    if (history.length > 0) {
      this.postToView({ type: 'initHistory', payload: history });
    }

    webviewView.webview.onDidReceiveMessage((message) => {
      if (!message?.type) { return; }

      if (message.type === 'sendPrompt') {
        const text = String(message.text ?? '').trim();
        if (!text) { return; }
        const command = String(message.command ?? '').trim();
        void this.routeCommand(text, command);
      } else if (message.type === 'exportMarkdown') {
        void this.handleExportMarkdown(message.content as string);
      } else if (message.type === 'clearHistory') {
        void this.context.workspaceState.update('chatHistory', []);
      }
    });

    this.flushPendingMessages();
  }

  public focus() {
    if (this.view) {
      this.view.show?.(true);
    } else {
      void vscode.commands.executeCommand('workbench.view.extension.codeNarrative');
    }
  }

  public triggerCommand(command: string) {
    // Parse the slash command and route it directly
    const cmd = command.replace(/^\//, '').split(/\s+/)[0];
    void this.routeCommand('', cmd);
  }

  public showResponse(userPrompt: string, response: CodeNarrativeResponse): void {
    this.postToView({
      type: 'addMessage',
      payload: { user: userPrompt, assistant: response.text },
    });
    this.saveHistory(userPrompt, response.text);
  }

  // ── Command Router ────────────────────────────────────────────────────────

  private async routeCommand(text: string, command: string) {
    if (command === 'explain' || command === 'explain-selection') {
      await this.handleExplainSelection(text);
    } else if (command === 'summarize' || command === 'summarize-file') {
      await this.handleSummarizeFile(text);
    } else if (command === 'review') {
      await this.handleReview();
    } else if (command === 'changelog') {
      await this.handleChangelog();
    } else if (command === 'pr') {
      await this.handlePrDescription();
    } else {
      await this.handleUserPrompt(text);
    }
  }

  // ── AI Handlers ───────────────────────────────────────────────────────────

  private async handleUserPrompt(text: string) {
    const editor = vscode.window.activeTextEditor;
    const languageId = editor?.document.languageId;
    const fileUri = editor?.document.uri.toString();
    const workspaceFolder = editor
      ? vscode.workspace.getWorkspaceFolder(editor.document.uri)?.name
      : undefined;

    const messages: ChatMessage[] = [{ role: 'user', content: text }];
    const sessionId = `chat-${Date.now()}`;

    this.sessionTracker.handleEvent({ type: 'session-start', sessionId, timestamp: Date.now(), source: 'chat', fileUri, workspaceFolder, label: 'chat' });
    this.sessionTracker.handleEvent({ type: 'session-update', sessionId, timestamp: Date.now(), phase: 'processing', activity: 'thinking', snippet: 'Thinking about your question…' });
    this.postToView({ type: 'setLoading', payload: true });

    try {
      this.sessionTracker.handleEvent({ type: 'session-update', sessionId, timestamp: Date.now(), phase: 'generating', activity: 'writing-file', snippet: 'Generating narrative response…' });
      const response = await this.client.chat({ messages, languageId, fileUri, workspaceFolder });
      this.showResponse(text, response);
      this.sessionTracker.handleEvent({ type: 'session-complete', sessionId, timestamp: Date.now() });
    } catch (error) {
      this.postToView({ type: 'setError', payload: String(error) });
      this.sessionTracker.handleEvent({ type: 'session-error', sessionId, timestamp: Date.now(), message: String(error) });
    } finally {
      this.postToView({ type: 'setLoading', payload: false });
    }
  }

  private async handleExplainSelection(userLabel?: string) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) { vscode.window.showInformationMessage('Code Narrative AI: Open a file and select some code to explain.'); return; }
    const selection = editor.selection;
    const selectedText = editor.document.getText(selection);
    if (!selectedText.trim()) { vscode.window.showInformationMessage('Code Narrative AI: Select some code first, then use /explain.'); return; }

    const languageId = editor.document.languageId;
    const fileUri = editor.document.uri.toString();
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(editor.document.uri)?.name;
    const narrativeLevel = this.getNarrativeLevel();
    const prompt = userLabel || '/explain (current selection)';
    const sessionId = `explain-${Date.now()}`;

    this.postToView({ type: 'addMessage', payload: { user: prompt } });
    this.sessionTracker.handleEvent({ type: 'session-start', sessionId, timestamp: Date.now(), source: 'explainSelection', fileUri, workspaceFolder, label: 'explain' });
    this.sessionTracker.handleEvent({ type: 'session-update', sessionId, timestamp: Date.now(), phase: 'processing', activity: 'reading-file', snippet: 'Reading selected code…' });
    this.postToView({ type: 'setLoading', payload: true });

    try {
      this.sessionTracker.handleEvent({ type: 'session-update', sessionId, timestamp: Date.now(), phase: 'generating', activity: 'writing-file', snippet: 'Writing explanation narrative…' });
      const response = await this.client.explainSelection({ code: selectedText, languageId, fileUri, workspaceFolder, narrativeLevel });
      this.postToView({ type: 'addMessage', payload: { assistant: response.text } });
      this.saveHistory(prompt, response.text);
      this.sessionTracker.handleEvent({ type: 'session-complete', sessionId, timestamp: Date.now() });
    } catch (error) {
      this.postToView({ type: 'setError', payload: String(error) });
      this.sessionTracker.handleEvent({ type: 'session-error', sessionId, timestamp: Date.now(), message: String(error) });
    } finally {
      this.postToView({ type: 'setLoading', payload: false });
    }
  }

  private async handleSummarizeFile(userLabel?: string) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) { vscode.window.showInformationMessage('Code Narrative AI: Open a file to summarize.'); return; }
    const fullText = editor.document.getText();
    if (!fullText.trim()) { vscode.window.showInformationMessage('Code Narrative AI: Current file is empty.'); return; }

    const languageId = editor.document.languageId;
    const fileUri = editor.document.uri.toString();
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(editor.document.uri)?.name;
    const narrativeLevel = this.getNarrativeLevel();
    const prompt = userLabel || '/summarize (current file)';
    const sessionId = `summarize-${Date.now()}`;

    this.postToView({ type: 'addMessage', payload: { user: prompt } });
    this.sessionTracker.handleEvent({ type: 'session-start', sessionId, timestamp: Date.now(), source: 'summarizeFile', fileUri, workspaceFolder, label: 'summarize' });
    this.sessionTracker.handleEvent({ type: 'session-update', sessionId, timestamp: Date.now(), phase: 'processing', activity: 'reading-file', snippet: 'Reading file contents…' });
    this.postToView({ type: 'setLoading', payload: true });

    try {
      this.sessionTracker.handleEvent({ type: 'session-update', sessionId, timestamp: Date.now(), phase: 'generating', activity: 'writing-file', snippet: 'Generating file summary…' });
      const response = await this.client.summarizeFile({ code: fullText, languageId, fileUri, workspaceFolder, narrativeLevel });
      this.postToView({ type: 'addMessage', payload: { assistant: response.text } });
      this.saveHistory(prompt, response.text);
      this.sessionTracker.handleEvent({ type: 'session-complete', sessionId, timestamp: Date.now() });
    } catch (error) {
      this.postToView({ type: 'setError', payload: String(error) });
      this.sessionTracker.handleEvent({ type: 'session-error', sessionId, timestamp: Date.now(), message: String(error) });
    } finally {
      this.postToView({ type: 'setLoading', payload: false });
    }
  }

  private async handleReview() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) { vscode.window.showInformationMessage('Code Narrative AI: Open a file to review.'); return; }
    const code = editor.document.getText();
    if (!code.trim()) { vscode.window.showInformationMessage('Code Narrative AI: Current file is empty.'); return; }

    const languageId = editor.document.languageId;
    const fileUri = editor.document.uri.toString();
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(editor.document.uri)?.name;
    const sessionId = `review-${Date.now()}`;
    const prompt = '/review (current file)';

    this.postToView({ type: 'addMessage', payload: { user: prompt } });
    this.sessionTracker.handleEvent({ type: 'session-start', sessionId, timestamp: Date.now(), source: 'chat', fileUri, workspaceFolder, label: 'review' });
    this.sessionTracker.handleEvent({ type: 'session-update', sessionId, timestamp: Date.now(), phase: 'processing', activity: 'reviewing', snippet: 'Reviewing code quality…' });
    this.postToView({ type: 'setLoading', payload: true });

    try {
      this.sessionTracker.handleEvent({ type: 'session-update', sessionId, timestamp: Date.now(), phase: 'generating', activity: 'writing-file', snippet: 'Writing review findings…' });
      const response = await this.client.reviewCode({ code, languageId, fileUri, workspaceFolder });
      this.postToView({ type: 'addMessage', payload: { assistant: response.text } });
      this.saveHistory(prompt, response.text);
      this.sessionTracker.handleEvent({ type: 'session-complete', sessionId, timestamp: Date.now() });
    } catch (error) {
      this.postToView({ type: 'setError', payload: String(error) });
      this.sessionTracker.handleEvent({ type: 'session-error', sessionId, timestamp: Date.now(), message: String(error) });
    } finally {
      this.postToView({ type: 'setLoading', payload: false });
    }
  }

  private async handleChangelog() {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) { vscode.window.showInformationMessage('Code Narrative AI: Open a workspace to generate a changelog.'); return; }

    const sessionId = `changelog-${Date.now()}`;
    const prompt = '/changelog (last 30 commits)';

    this.postToView({ type: 'addMessage', payload: { user: prompt } });
    this.sessionTracker.handleEvent({ type: 'session-start', sessionId, timestamp: Date.now(), source: 'chat', workspaceFolder: workspaceFolder.name, label: 'changelog' });
    this.sessionTracker.handleEvent({ type: 'session-update', sessionId, timestamp: Date.now(), phase: 'processing', activity: 'running-command', snippet: 'Running git log…' });
    this.postToView({ type: 'setLoading', payload: true });

    try {
      const gitLog = await this.runGit(['log', '--oneline', '-30'], workspaceFolder.uri.fsPath);
      const response = await this.client.changelog({ gitLog, workspaceFolder: workspaceFolder.name });
      this.postToView({ type: 'addMessage', payload: { assistant: response.text } });
      this.saveHistory(prompt, response.text);
      this.sessionTracker.handleEvent({ type: 'session-complete', sessionId, timestamp: Date.now() });
    } catch (error) {
      this.postToView({ type: 'setError', payload: String(error) });
      this.sessionTracker.handleEvent({ type: 'session-error', sessionId, timestamp: Date.now(), message: String(error) });
    } finally {
      this.postToView({ type: 'setLoading', payload: false });
    }
  }

  private async handlePrDescription() {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) { vscode.window.showInformationMessage('Code Narrative AI: Open a workspace first.'); return; }

    const sessionId = `pr-${Date.now()}`;
    const prompt = '/pr-description (staged diff)';

    this.postToView({ type: 'addMessage', payload: { user: prompt } });
    this.sessionTracker.handleEvent({ type: 'session-start', sessionId, timestamp: Date.now(), source: 'chat', workspaceFolder: workspaceFolder.name, label: 'pr' });
    this.sessionTracker.handleEvent({ type: 'session-update', sessionId, timestamp: Date.now(), phase: 'processing', activity: 'running-command', snippet: 'Reading staged diff…' });
    this.postToView({ type: 'setLoading', payload: true });

    try {
      let diff = await this.runGit(['diff', '--staged'], workspaceFolder.uri.fsPath);
      if (!diff.trim()) {
        diff = await this.runGit(['diff', 'HEAD~1'], workspaceFolder.uri.fsPath);
      }
      if (!diff.trim()) { this.postToView({ type: 'setError', payload: 'No staged changes or recent diff found.' }); return; }

      const MAX = 12000;
      if (diff.length > MAX) { diff = diff.slice(0, MAX) + '\n\n// ... truncated'; }

      const response = await this.client.prDescription({ diff, workspaceFolder: workspaceFolder.name });
      this.postToView({ type: 'addMessage', payload: { assistant: response.text } });
      this.saveHistory(prompt, response.text);
      this.sessionTracker.handleEvent({ type: 'session-complete', sessionId, timestamp: Date.now() });
    } catch (error) {
      this.postToView({ type: 'setError', payload: String(error) });
      this.sessionTracker.handleEvent({ type: 'session-error', sessionId, timestamp: Date.now(), message: String(error) });
    } finally {
      this.postToView({ type: 'setLoading', payload: false });
    }
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
    const history = this.context.workspaceState.get<ChatHistoryEntry[]>('chatHistory', []);
    const now = Date.now();
    history.push({ role: 'user', content: userMsg, ts: now });
    history.push({ role: 'assistant', content: assistantMsg, ts: now });
    // Keep last 50 entries
    const trimmed = history.slice(-50);
    void this.context.workspaceState.update('chatHistory', trimmed);
  }

  private async handleExportMarkdown(content: string) {
    const doc = await vscode.workspace.openTextDocument({
      content,
      language: 'markdown',
    });
    await vscode.window.showTextDocument(doc, { preview: false });
  }

  private postToView(message: ViewMessage) {
    if (this.view && this.view.webview) {
      this.view.webview.postMessage(message);
    } else {
      this.pendingMessages.push(message);
    }
  }

  private flushPendingMessages() {
    if (!this.view) { return; }
    for (const message of this.pendingMessages) {
      this.view.webview.postMessage(message);
    }
    this.pendingMessages = [];
  }

  // ── HTML ──────────────────────────────────────────────────────────────────

  private getHtml(webview: vscode.Webview): string {
    const nonce = getNonce();
    const cspSrc = webview.cspSource;

    const css = [
      ':root{',
      '--bg:#0a0a0b;--bg2:#111113;--bg3:#18181b;--bg4:#1e1e22;',
      '--glass:rgba(24,24,27,.75);',
      '--brd:rgba(255,255,255,.06);--brd-a:rgba(232,101,10,.4);',
      '--acc:#e8650a;--acc-h:#ff7a1a;--glow:rgba(232,101,10,.15);--sub:rgba(232,101,10,.08);',
      '--t1:#e4e4e7;--t2:#a1a1aa;--t3:#63636e;--ta:#f0a060;',
      '--purple:#a78bfa;--blue:#60a5fa;--green:#4ade80;--amber:#fbbf24;--rose:#fb7185;',
      '--r1:6px;--r2:10px;--r3:14px;',
      '--f:Inter,-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;',
      '--fm:Fira Code,Consolas,monospace;',
      '--tr:180ms cubic-bezier(.4,0,.2,1)',
      '}',
      '*{box-sizing:border-box;margin:0;padding:0}',
      'body{font-family:var(--f);color:var(--t1);background:var(--bg);display:flex;flex-direction:column;height:100vh;overflow:hidden;-webkit-font-smoothing:antialiased}',
      // Header
      '.hd{display:flex;align-items:center;gap:8px;padding:10px 12px;background:var(--bg2);border-bottom:1px solid var(--brd);flex-shrink:0}',
      '.hd-logo{width:26px;height:26px;background:linear-gradient(135deg,var(--acc),#ff9040);border-radius:var(--r1);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;color:#fff;flex-shrink:0;box-shadow:0 0 12px var(--glow)}',
      '.hd-t{font-size:12px;font-weight:600}',
      '.hd-v{font-size:9px;font-weight:600;color:var(--acc);background:var(--sub);padding:2px 6px;border-radius:20px}',
      '.hd-sp{flex:1}',
      '.hd-btn{width:26px;height:26px;border-radius:var(--r1);border:1px solid var(--brd);background:0 0;color:var(--t2);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:12px;transition:all var(--tr)}',
      '.hd-btn:hover{background:var(--bg4);color:var(--t1);border-color:var(--brd-a)}',
      // Messages
      '.msgs{flex:1;padding:10px;overflow-y:auto;scroll-behavior:smooth}',
      '.msgs::-webkit-scrollbar{width:3px}.msgs::-webkit-scrollbar-track{background:0 0}.msgs::-webkit-scrollbar-thumb{background:rgba(255,255,255,.08);border-radius:3px}',
      // Welcome
      '.wlc{text-align:center;padding:24px 14px}',
      '.wlc-ic{width:44px;height:44px;margin:0 auto 14px;background:linear-gradient(135deg,var(--acc),#ff9040);border-radius:var(--r2);display:flex;align-items:center;justify-content:center;font-size:20px;box-shadow:0 8px 32px var(--glow)}',
      '.wlc h2{font-size:14px;font-weight:600;margin-bottom:8px}',
      '.wlc p{font-size:11px;color:var(--t2);line-height:1.5;max-width:240px;margin:0 auto}',
      '.wlc-cmds{display:flex;flex-wrap:wrap;gap:5px;justify-content:center;margin-top:14px}',
      '.wlc-c{font-size:10px;font-family:var(--fm);color:var(--acc);background:var(--sub);border:1px solid rgba(232,101,10,.15);padding:3px 9px;border-radius:20px;cursor:pointer;transition:all var(--tr)}',
      '.wlc-c:hover{background:rgba(232,101,10,.18);transform:translateY(-1px)}',
      // Messages layout
      '.mg{margin-bottom:14px;animation:fu .3s ease}',
      '.mg-r{display:flex;gap:8px;align-items:flex-start}',
      '.mg-av{width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0;margin-top:2px}',
      '.mg-av-u{background:var(--bg4);color:var(--t2);border:1px solid var(--brd)}',
      '.mg-av-a{background:linear-gradient(135deg,var(--acc),#ff9040);color:#fff;box-shadow:0 2px 10px var(--glow)}',
      '.mg-b{flex:1;min-width:0}',
      '.mg-h{display:flex;align-items:center;gap:8px;margin-bottom:5px}',
      '.mg-n{font-size:11px;font-weight:600}',
      '.mg-badge{font-size:8px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:var(--acc);background:var(--sub);padding:2px 7px;border-radius:20px}',
      '.mg-c{font-size:12px;line-height:1.6;word-wrap:break-word;color:var(--t1)}',
      // Narrative header
      '.nr-hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid var(--brd)}',
      '.nr-hdr-left{display:flex;align-items:center;gap:6px}',
      '.nr-hdr-ic{font-size:14px}',
      '.nr-hdr-t{font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--purple)}',
      '.nr-hdr-actions{display:flex;gap:4px}',
      '.nr-action-btn{padding:2px 8px;border-radius:4px;border:1px solid var(--brd);background:0 0;color:var(--t3);font-size:9px;cursor:pointer;transition:all var(--tr);font-family:var(--f)}',
      '.nr-action-btn:hover{background:var(--bg4);color:var(--t2);border-color:var(--brd-a)}',
      // Level tabs
      '.nr-tabs{display:flex;gap:4px;margin-bottom:10px}',
      '.nr-tab{padding:3px 9px;border-radius:20px;border:1px solid var(--brd);background:0 0;color:var(--t3);font-size:9px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;cursor:pointer;transition:all var(--tr);font-family:var(--f)}',
      '.nr-tab.active{border-color:var(--acc);color:var(--acc);background:var(--sub)}',
      '.nr-tab:hover:not(.active){border-color:rgba(255,255,255,.1);color:var(--t2)}',
      // Narrative cards
      '.nr-card{background:var(--bg3);border:1px solid var(--brd);border-radius:var(--r2);padding:10px 12px;margin-bottom:8px;border-left:3px solid var(--purple);animation:fu .3s ease;transition:border-color var(--tr)}',
      '.nr-card.green{border-left-color:var(--green)}',
      '.nr-card.blue{border-left-color:var(--blue)}',
      '.nr-card.amber{border-left-color:var(--amber)}',
      '.nr-card.rose{border-left-color:var(--rose)}',
      '.nr-card.acc{border-left-color:var(--acc)}',
      // Card header (collapsible)
      '.nr-card-hdr{display:flex;align-items:center;gap:6px;cursor:pointer;user-select:none;margin-bottom:6px}',
      '.nr-card-hdr:hover .nr-lbl{color:var(--t2)}',
      '.nr-arrow{font-size:9px;color:var(--t3);transition:transform var(--tr);display:inline-block}',
      '.nr-card.collapsed .nr-arrow{transform:rotate(-90deg)}',
      '.nr-card.collapsed .nr-card-body{display:none}',
      '.nr-lbl{font-size:9px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:var(--t3);display:flex;align-items:center;gap:5px;transition:color var(--tr)}',
      '.nr-lbl-dot{width:4px;height:4px;border-radius:50%;flex-shrink:0}',
      '.nr-lbl-dot.purple{background:var(--purple)}.nr-lbl-dot.green{background:var(--green)}.nr-lbl-dot.blue{background:var(--blue)}.nr-lbl-dot.amber{background:var(--amber)}.nr-lbl-dot.rose{background:var(--rose)}.nr-lbl-dot.acc{background:var(--acc)}',
      '.nr-card-copy{margin-left:auto;width:20px;height:16px;border-radius:3px;border:1px solid var(--brd);background:0 0;color:var(--t3);font-size:9px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all var(--tr);opacity:0}',
      '.nr-card:hover .nr-card-copy{opacity:1}',
      '.nr-card-copy:hover{background:var(--bg4);color:var(--t1)}',
      '.nr-card-copy.copied{color:var(--green)}',
      '.nr-txt{font-size:11px;line-height:1.7;color:var(--t1)}',
      '.nr-txt code{font-family:var(--fm);font-size:10px;background:var(--bg4);padding:1px 5px;border-radius:3px;color:var(--ta);border:1px solid var(--brd)}',
      '.nr-tags{display:flex;flex-wrap:wrap;gap:3px;margin-top:7px}',
      '.nr-tag{font-size:9px;font-family:var(--fm);color:var(--blue);background:rgba(96,165,250,.08);border:1px solid rgba(96,165,250,.15);padding:2px 7px;border-radius:10px}',
      '.nr-list{list-style:none;padding:0;margin:4px 0 0}',
      '.nr-list li{font-size:11px;line-height:1.6;color:var(--t2);padding:2px 0 2px 14px;position:relative}',
      '.nr-list li::before{content:"";position:absolute;left:3px;top:9px;width:4px;height:4px;border-radius:50%;background:var(--acc)}',
      // Panel visibility
      '.nr-panel{display:none}',
      '.nr-panel.active{display:block}',
      // Plain fallback
      '.nr-plain{background:var(--bg2);border:1px solid var(--brd);border-radius:var(--r2);padding:12px}',
      '.nr-plain-hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}',
      '.nr-plain-t{font-size:9px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:var(--t3)}',
      '.nr-plain p{font-size:12px;line-height:1.7;color:var(--t1)}',
      '.nr-plain code{font-family:var(--fm);font-size:11px;background:var(--bg4);padding:2px 5px;border-radius:3px;color:var(--ta)}',
      '.nr-plain pre{background:var(--bg);border:1px solid var(--brd);border-radius:var(--r1);padding:10px;margin:6px 0;overflow-x:auto;font-family:var(--fm);font-size:11px;line-height:1.5}',
      '.nr-plain pre code{background:none;padding:0;border:none}',
      '.nr-plain strong{color:#fff;font-weight:600}',
      '.nr-plain ul,.nr-plain ol{margin:6px 0;padding-left:16px}',
      '.nr-plain li{margin:2px 0;font-size:12px;line-height:1.6}',
      // Loading
      '.ld{display:none;align-items:center;gap:8px;padding:10px;margin-bottom:10px}',
      '.ld.vis{display:flex}',
      '.ld-d{display:flex;gap:3px}',
      '.ld-dt{width:5px;height:5px;border-radius:50%;background:var(--acc);animation:dp 1.4s ease-in-out infinite}',
      '.ld-dt:nth-child(2){animation-delay:.2s}.ld-dt:nth-child(3){animation-delay:.4s}',
      '.ld-lb{font-size:11px;color:var(--t3);font-style:italic}',
      // Error
      '.er{display:none;margin:0 10px 8px;padding:8px 12px;background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.25);border-radius:var(--r1);color:#fca5a5;font-size:11px}',
      '.er.vis{display:block}',
      // Input area
      '.ia{flex-shrink:0;border-top:1px solid var(--brd);background:var(--bg2)}',
      // Narrative level bar
      '.nlv-bar{display:flex;align-items:center;gap:6px;padding:6px 12px;border-bottom:1px solid var(--brd)}',
      '.nlv-lbl{font-size:9px;font-weight:600;letter-spacing:.5px;text-transform:uppercase;color:var(--t3)}',
      '.nlv-opts{display:flex;gap:3px}',
      '.nlv-opt{padding:2px 8px;border-radius:12px;border:1px solid var(--brd);background:0 0;color:var(--t3);font-size:9px;font-weight:600;cursor:pointer;transition:all var(--tr);font-family:var(--f)}',
      '.nlv-opt.active{background:var(--sub);border-color:var(--brd-a);color:var(--acc)}',
      '.nlv-opt:hover:not(.active){color:var(--t2);border-color:rgba(255,255,255,.1)}',
      '.nlv-sp{flex:1}',
      // Input wrapper
      '.iw{display:flex;align-items:flex-end;gap:6px;background:var(--glass);border:1px solid var(--brd);border-radius:var(--r3);padding:5px 5px 5px 12px;margin:8px 10px 6px;transition:all var(--tr);backdrop-filter:blur(12px)}',
      '.iw:focus-within{border-color:var(--brd-a);box-shadow:0 0 0 3px var(--glow)}',
      '.it{flex:1;background:0 0;border:none;outline:none;color:var(--t1);font-family:var(--f);font-size:12px;line-height:1.5;resize:none;min-height:18px;max-height:100px;padding:3px 0}',
      '.it::placeholder{color:var(--t3)}',
      '.sn{width:30px;height:30px;border-radius:50%;border:none;background:var(--acc);color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all var(--tr);box-shadow:0 2px 8px var(--glow)}',
      '.sn:hover:not(:disabled){background:var(--acc-h);transform:scale(1.05)}',
      '.sn:disabled{opacity:.4;cursor:default}',
      '.sn svg{width:13px;height:13px}',
      '.sh{display:flex;align-items:center;flex-wrap:wrap;gap:4px;padding:0 12px 8px;font-size:10px;color:var(--t3)}',
      '.sh kbd{font-family:var(--fm);font-size:9px;background:var(--bg4);border:1px solid var(--brd);padding:1px 4px;border-radius:3px;color:var(--t2)}',
      // Animations
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
      // Narrative level state
      'var currentLevel="beginner";',
      // Escape HTML
      'function esc(t){var d=document.createElement("div");d.textContent=t;return d.innerHTML;}',
      // Format inline: **bold**, `code`, newlines
      'function fmt(t){',
        'var h=esc(t);',
        'h=h.replace(/\\n/g,"<br>");',
        'h=h.replace(/\\*\\*(.+?)\\*\\*/g,"<strong>$1</strong>");',
        'return h;',
      '}',
      // Copy to clipboard
      'function copyText(text,btn){',
        'navigator.clipboard.writeText(text).then(function(){',
          'btn.textContent="Copied";btn.classList.add("copied");',
          'setTimeout(function(){btn.textContent="Copy";btn.classList.remove("copied");},1500);',
        '}).catch(function(){btn.textContent="!";});',
      '}',
      // Build a collapsible card
      'function card(label,text,color,extraClass){',
        'var id="c"+Math.random().toString(36).slice(2);',
        'var c=document.createElement("div");',
        'c.className="nr-card"+(color?" "+color:"")+(extraClass?" "+extraClass:"");',
        'c.innerHTML=',
          '\'<div class="nr-card-hdr">\'+',
          '\'<span class="nr-arrow">&#9660;</span>\'+',
          '\'<div class="nr-lbl"><span class="nr-lbl-dot \'+(color||"purple")+\'"></span>\'+ esc(label) +\'</div>\'+',
          '\'<button class="nr-card-copy">Copy</button>\'+',
          '\'</div>\'+',
          '\'<div class="nr-card-body"><div class="nr-txt">\'+fmt(text)+\'</div></div>\';',
        'var hdr=c.querySelector(".nr-card-hdr");',
        'var copyBtn=c.querySelector(".nr-card-copy");',
        'hdr.addEventListener("click",function(e){if(e.target===copyBtn)return;c.classList.toggle("collapsed");});',
        'copyBtn.addEventListener("click",function(e){e.stopPropagation();copyText(text,copyBtn);});',
        'return c;',
      '}',
      // Tags
      'function tags(arr){if(!arr||!arr.length)return document.createDocumentFragment();var w=document.createElement("div");w.className="nr-tags";arr.forEach(function(t){var s=document.createElement("span");s.className="nr-tag";s.textContent=t;w.appendChild(s);});return w;}',
      // List
      'function listEl(arr){if(!arr||!arr.length)return document.createDocumentFragment();var ul=document.createElement("ul");ul.className="nr-list";arr.forEach(function(t){var li=document.createElement("li");li.textContent=t;ul.appendChild(li);});return ul;}',
      // Render a level panel into a div
      'function renderLevelInto(el,data){',
        'if(!data)return;',
        'if(data.explanation)el.appendChild(card("Explanation",data.explanation,"purple"));',
        'if(data.analogy)el.appendChild(card("Analogy",data.analogy,"green"));',
        'if(data.system_role)el.appendChild(card("System Role",data.system_role,"blue"));',
        'if(data.key_takeaway)el.appendChild(card("Key Takeaway",data.key_takeaway,"acc"));',
        'if(data.patterns_used)el.appendChild(card("Patterns Used",data.patterns_used,"amber"));',
        'if(data.tradeoffs)el.appendChild(card("Tradeoffs",data.tradeoffs,"rose"));',
        'if(data.design_decisions&&data.design_decisions.length){',
          'var c=card("Design Decisions","","blue");',
          'c.querySelector(".nr-card-body").appendChild(listEl(data.design_decisions));',
          'c.querySelector(".nr-txt").remove();',
          'el.appendChild(c);',
        '}',
        'if(data.potential_issues&&data.potential_issues.length){',
          'var c2=card("Potential Issues","","rose");',
          'c2.querySelector(".nr-card-body").appendChild(listEl(data.potential_issues));',
          'c2.querySelector(".nr-txt").remove();',
          'el.appendChild(c2);',
        '}',
      '}',
      // Try to produce narrative DOM from JSON
      'function buildNarrative(text){',
        'var json;try{json=JSON.parse(text);}catch(e){return null;}',
        'if(!json||typeof json!=="object")return null;',
        'var levels=["beginner","intermediate","expert"];',
        'var hasLevel=false;for(var k=0;k<levels.length;k++){if(json[levels[k]]){hasLevel=true;break;}}',
        'if(!hasLevel)return null;',
        'var root=document.createElement("div");',
        // Header with export button
        'var hdr=document.createElement("div");hdr.className="nr-hdr";',
        'var hdrL=document.createElement("div");hdrL.className="nr-hdr-left";',
        'hdrL.innerHTML=\'<span class="nr-hdr-ic">&#x2728;</span><span class="nr-hdr-t">Generated Narrative</span>\';',
        'var hdrA=document.createElement("div");hdrA.className="nr-hdr-actions";',
        'var expBtn=document.createElement("button");expBtn.className="nr-action-btn";expBtn.textContent="Export MD";',
        'expBtn.addEventListener("click",function(){api.postMessage({type:"exportMarkdown",content:text});});',
        'hdrA.appendChild(expBtn);',
        'hdr.appendChild(hdrL);hdr.appendChild(hdrA);root.appendChild(hdr);',
        // Tabs
        'var tabBar=document.createElement("div");tabBar.className="nr-tabs";',
        'var panelWrap=document.createElement("div");',
        'var firstTab=true;',
        'levels.forEach(function(lv){',
          'if(!json[lv])return;',
          'var tab=document.createElement("button");tab.className="nr-tab"+(firstTab?" active":"");',
          'tab.textContent=lv.charAt(0).toUpperCase()+lv.slice(1);',
          'var panel=document.createElement("div");panel.className="nr-panel"+(firstTab?" active":"");',
          'panel.setAttribute("data-lv",lv);',
          'renderLevelInto(panel,json[lv]);',
          'tab.addEventListener("click",function(){',
            'tabBar.querySelectorAll(".nr-tab").forEach(function(t){t.classList.remove("active");});',
            'tab.classList.add("active");',
            'panelWrap.querySelectorAll(".nr-panel").forEach(function(p){p.classList.remove("active");});',
            'panel.classList.add("active");',
            'currentLevel=lv;',
          '});',
          'tabBar.appendChild(tab);panelWrap.appendChild(panel);firstTab=false;',
        '});',
        'root.appendChild(tabBar);root.appendChild(panelWrap);',
        'return root;',
      '}',
      // Build plain text response
      'function buildPlain(text){',
        'var wrap=document.createElement("div");wrap.className="nr-plain";',
        'var h=document.createElement("div");h.className="nr-plain-hdr";',
        'var t=document.createElement("span");t.className="nr-plain-t";t.textContent="Response";',
        'var c=document.createElement("button");c.className="nr-action-btn";c.textContent="Copy";',
        'c.addEventListener("click",function(){copyText(text,c);});',
        'var e=document.createElement("button");e.className="nr-action-btn";e.textContent="Export MD";',
        'e.addEventListener("click",function(){api.postMessage({type:"exportMarkdown",content:text});});',
        'h.appendChild(t);h.appendChild(c);h.appendChild(e);wrap.appendChild(h);',
        'var body=document.createElement("div");',
        'body.innerHTML=fmt(text);',
        'wrap.appendChild(body);',
        'return wrap;',
      '}',
      'function renderResponse(text){',
        'var n=buildNarrative(text);',
        'return n||buildPlain(text);',
      '}',
      'function hideWlc(){if(wlcEl)wlcEl.style.display="none";}',
      'function addMsg(role,content,skipScroll){',
        'hideWlc();',
        'var w=document.createElement("div");w.className="mg";',
        'if(role==="user"){',
          'var r=document.createElement("div");r.className="mg-r";',
          'var av=document.createElement("div");av.className="mg-av mg-av-u";av.textContent="U";',
          'var b=document.createElement("div");b.className="mg-b";',
          'var mh=document.createElement("div");mh.className="mg-h";',
          'var mn=document.createElement("span");mn.className="mg-n";mn.textContent="You";',
          'mh.appendChild(mn);',
          'var mc=document.createElement("div");mc.className="mg-c";mc.innerHTML=esc(content);',
          'b.appendChild(mh);b.appendChild(mc);r.appendChild(av);r.appendChild(b);w.appendChild(r);',
        '}else{',
          'var r=document.createElement("div");r.className="mg-r";',
          'var av=document.createElement("div");av.className="mg-av mg-av-a";av.textContent="CN";',
          'var b=document.createElement("div");b.className="mg-b";',
          'var mh=document.createElement("div");mh.className="mg-h";',
          'var mn=document.createElement("span");mn.className="mg-n";mn.textContent="Code Narrative AI";',
          'var mb=document.createElement("span");mb.className="mg-badge";mb.textContent="Narrative Mode";',
          'mh.appendChild(mn);mh.appendChild(mb);',
          'var mc=document.createElement("div");mc.className="mg-c";',
          'mc.appendChild(renderResponse(content));',
          'b.appendChild(mh);b.appendChild(mc);r.appendChild(av);r.appendChild(b);w.appendChild(r);',
        '}',
        'msgsEl.appendChild(w);',
        'if(!skipScroll)msgsEl.scrollTop=msgsEl.scrollHeight;',
      '}',
      'function setLd(v){if(v){ldEl.classList.add("vis");}else{ldEl.classList.remove("vis");}snd.disabled=v;}',
      'function setErr(m){erEl.textContent=m;erEl.classList.add("vis");setTimeout(function(){erEl.classList.remove("vis");},6000);}',
      // Command detection
      'function detectCmd(raw){',
        'if(raw.charAt(0)!=="/")return{command:"",text:raw};',
        'var parts=raw.split(/\\s+/);var head=parts[0].toLowerCase();var body=parts.slice(1).join(" ").trim();',
        'if(head==="/explain")return{command:"explain",text:body};',
        'if(head==="/summarize")return{command:"summarize",text:body};',
        'if(head==="/review")return{command:"review",text:body};',
        'if(head==="/changelog")return{command:"changelog",text:body};',
        'if(head==="/pr"||head==="/pr-description")return{command:"pr",text:body};',
        'if(head==="/ask"||head==="/chat")return{command:"chat",text:body||""};',
        'return{command:"",text:raw};',
      '}',
      'function send(){',
        'var raw=inp.value.trim();if(!raw)return;',
        'var r=detectCmd(raw);',
        'if(!r.command||r.command==="chat")addMsg("user",raw);',
        'api.postMessage({type:"sendPrompt",text:r.text||raw,command:r.command});',
        'inp.value="";inp.style.height="auto";',
      '}',
      'snd.addEventListener("click",send);',
      'inp.addEventListener("keydown",function(e){if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}});',
      'inp.addEventListener("input",function(){inp.style.height="auto";inp.style.height=Math.min(inp.scrollHeight,100)+"px";});',
      // Narrative level toggle
      'document.querySelectorAll(".nlv-opt").forEach(function(btn){',
        'btn.addEventListener("click",function(){',
          'document.querySelectorAll(".nlv-opt").forEach(function(b){b.classList.remove("active");});',
          'btn.classList.add("active");',
          'currentLevel=btn.getAttribute("data-lv");',
        '});',
      '});',
      // Welcome command chips
      'document.querySelectorAll(".wlc-c").forEach(function(b){',
        'b.addEventListener("click",function(){inp.value=b.getAttribute("data-cmd")||b.textContent;inp.focus();});',
      '});',
      // Clear
      'document.getElementById("clr").addEventListener("click",function(){',
        'msgsEl.innerHTML="";',
        'api.postMessage({type:"clearHistory"});',
      '});',
      // Messages from host
      'window.addEventListener("message",function(ev){',
        'var m=ev.data;if(!m||!m.type)return;',
        'if(m.type==="addMessage"){',
          'var p=m.payload||{};',
          'if(p.user)addMsg("user",p.user);',
          'if(p.assistant)addMsg("assistant",p.assistant);',
        '}else if(m.type==="initHistory"){',
          'var hist=m.payload||[];',
          'for(var i=0;i<hist.length;i++){addMsg(hist[i].role,hist[i].content,true);}',
          'msgsEl.scrollTop=msgsEl.scrollHeight;',
        '}else if(m.type==="setLoading"){setLd(!!m.payload);',
        '}else if(m.type==="setError"){setErr(String(m.payload||"Unexpected error"));',
        '}else if(m.type==="clear"){msgsEl.innerHTML="";}',
      '});',
      '})();'
    ].join('\n');

    return '<!DOCTYPE html>' +
      '<html lang="en"><head>' +
      '<meta charset="UTF-8"/>' +
      '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; img-src ' + cspSrc + ' https:; script-src \'nonce-' + nonce + '\'; style-src \'unsafe-inline\' ' + cspSrc + ';">' +
      '<meta name="viewport" content="width=device-width,initial-scale=1.0"/>' +
      '<title>Code Narrative AI</title>' +
      '<style>' + css + '</style></head><body>' +
      '<div class="hd"><div class="hd-logo">CN</div><span class="hd-t">Code Narrative</span><span class="hd-v">v0.1.0</span><div class="hd-sp"></div><button class="hd-btn" id="clr" title="Clear chat">&#x2715;</button></div>' +
      '<div id="msgs" class="msgs"><div id="wlc" class="wlc">' +
        '<div class="wlc-ic">&#x2728;</div>' +
        '<h2>Code Narrative AI</h2>' +
        '<p>Narrative explanations, code review, changelogs and more.</p>' +
        '<div class="wlc-cmds">' +
          '<button class="wlc-c" data-cmd="/explain">/explain</button>' +
          '<button class="wlc-c" data-cmd="/summarize">/summarize</button>' +
          '<button class="wlc-c" data-cmd="/review">/review</button>' +
          '<button class="wlc-c" data-cmd="/changelog">/changelog</button>' +
          '<button class="wlc-c" data-cmd="/pr">/pr-description</button>' +
        '</div>' +
      '</div></div>' +
      '<div id="ld" class="ld"><div class="mg-av mg-av-a" style="width:22px;height:22px;font-size:9px">CN</div><div class="ld-d"><div class="ld-dt"></div><div class="ld-dt"></div><div class="ld-dt"></div></div><span class="ld-lb">Generating narrative...</span></div>' +
      '<div id="er" class="er"></div>' +
      '<div class="ia">' +
        '<div class="nlv-bar">' +
          '<span class="nlv-lbl">Level</span>' +
          '<div class="nlv-opts">' +
            '<button class="nlv-opt active" data-lv="beginner">Beginner</button>' +
            '<button class="nlv-opt" data-lv="intermediate">Intermediate</button>' +
            '<button class="nlv-opt" data-lv="expert">Expert</button>' +
          '</div>' +
        '</div>' +
        '<div class="iw"><textarea id="inp" class="it" rows="1" placeholder="Ask, explain, review, or type /..."></textarea><button id="snd" class="sn" title="Send"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg></button></div>' +
        '<div class="sh"><kbd>Enter</kbd><span>send</span><kbd>Shift+Enter</kbd><span>newline</span><span style="margin-left:4px;color:var(--acc)">/explain /review /changelog /pr</span></div>' +
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
