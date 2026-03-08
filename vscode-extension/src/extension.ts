import * as vscode from 'vscode';
import { createCodeNarrativeClient } from './client/CodeNarrativeClient';
import { SidePanelProvider } from './views/SidePanelProvider';
import { DashboardViewProvider } from './views/DashboardViewProvider';
import { ApiKeyManager } from './config/ApiKeyManager';
import { SessionTracker } from './pixelOffice/SessionEvents';
import { LayoutStore } from './pixelOffice/LayoutStore';
import { OfficeViewProvider } from './pixelOffice/OfficeViewProvider';

export async function activate(
  context: vscode.ExtensionContext
): Promise<void> {
  const outputChannel = vscode.window.createOutputChannel('Code Narrative AI');
  const apiKeyManager = new ApiKeyManager(context);
  const client = createCodeNarrativeClient(outputChannel);

  outputChannel.appendLine('Code Narrative AI extension activated.');

  const sessionTracker = new SessionTracker();
  const layoutStore = new LayoutStore(context);

  const sidePanelProvider = new SidePanelProvider(
    context.extensionUri,
    client,
    context,
    sessionTracker
  );

  const officeViewProvider = new OfficeViewProvider(
    context,
    layoutStore,
    sessionTracker
  );

  const dashboardViewProvider = new DashboardViewProvider(
    context,
    sessionTracker
  );

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      SidePanelProvider.viewType,
      sidePanelProvider
    ),
    vscode.window.registerWebviewViewProvider(
      DashboardViewProvider.viewType,
      dashboardViewProvider
    ),
    vscode.window.registerWebviewViewProvider(
      OfficeViewProvider.viewType,
      officeViewProvider
    )
  );

  // ── Explain Selection ────────────────────────────────────────────────────
  const explainSelection = vscode.commands.registerCommand(
    'codeNarrative.explainSelection',
    async () => {
      const apiKey = await apiKeyManager.getApiKey();
      if (!apiKey) {
        const choice = await vscode.window.showInformationMessage(
          'Code Narrative AI: No API key configured. Add one now?',
          'Add API Key',
          'Cancel'
        );
        if (choice === 'Add API Key') {
          await apiKeyManager.promptAndStoreApiKey();
        }
        return;
      }
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showWarningMessage('No active editor for Code Narrative AI.');
        return;
      }

      const selection = editor.selection;
      const selectedText = editor.document.getText(selection);

      if (!selectedText.trim()) {
        vscode.window.showWarningMessage(
          'Select some code to explain with Code Narrative AI.'
        );
        return;
      }

      sidePanelProvider.focus();
      // Delegate to the side panel which has full SessionTracker wiring
      setTimeout(() => {
        const fakeMsg = { type: 'sendPrompt', text: selectedText, command: 'explain' };
        // trigger via webview message routing
        void vscode.commands.executeCommand('codeNarrative.openChat');
      }, 200);
    }
  );

  // ── Summarize File ───────────────────────────────────────────────────────
  const summarizeFile = vscode.commands.registerCommand(
    'codeNarrative.summarizeFile',
    async () => {
      const apiKey = await apiKeyManager.getApiKey();
      if (!apiKey) {
        const choice = await vscode.window.showInformationMessage(
          'Code Narrative AI: No API key configured. Add one now?',
          'Add API Key',
          'Cancel'
        );
        if (choice === 'Add API Key') {
          await apiKeyManager.promptAndStoreApiKey();
        }
        return;
      }
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showWarningMessage('No active editor for Code Narrative AI.');
        return;
      }
      sidePanelProvider.focus();
    }
  );

  // ── Open Chat ────────────────────────────────────────────────────────────
  const openChat = vscode.commands.registerCommand(
    'codeNarrative.openChat',
    async () => {
      sidePanelProvider.focus();
    }
  );

  // ── Open Dashboard ───────────────────────────────────────────────────────
  const openDashboard = vscode.commands.registerCommand(
    'codeNarrative.openDashboard',
    async () => {
      dashboardViewProvider.focus();
    }
  );

  // ── Review Code ──────────────────────────────────────────────────────────
  const reviewCode = vscode.commands.registerCommand(
    'codeNarrative.reviewCode',
    async () => {
      sidePanelProvider.focus();
      // Small delay to ensure view is open before posting
      await new Promise((r) => setTimeout(r, 300));
      sidePanelProvider.triggerCommand('/review');
    }
  );

  // ── Changelog ────────────────────────────────────────────────────────────
  const changelogCmd = vscode.commands.registerCommand(
    'codeNarrative.changelog',
    async () => {
      sidePanelProvider.focus();
      await new Promise((r) => setTimeout(r, 300));
      sidePanelProvider.triggerCommand('/changelog');
    }
  );

  // ── PR Description ───────────────────────────────────────────────────────
  const prCmd = vscode.commands.registerCommand(
    'codeNarrative.prDescription',
    async () => {
      sidePanelProvider.focus();
      await new Promise((r) => setTimeout(r, 300));
      sidePanelProvider.triggerCommand('/pr');
    }
  );

  // ── Annotate File ────────────────────────────────────────────────────────
  const annotateDecorationType = vscode.window.createTextEditorDecorationType({
    after: {
      color: new vscode.ThemeColor('editorCodeLens.foreground'),
      fontStyle: 'italic',
    },
  });

  const annotateFile = vscode.commands.registerCommand(
    'codeNarrative.annotateFile',
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showInformationMessage('Code Narrative AI: Open a file to annotate.');
        return;
      }

      const document = editor.document;
      const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
        'vscode.executeDocumentSymbolProvider',
        document.uri
      );

      if (!symbols || symbols.length === 0) {
        vscode.window.showInformationMessage('Code Narrative AI: No symbols found in this file.');
        return;
      }

      vscode.window.setStatusBarMessage('Code Narrative AI: Annotating file...', 5000);

      const decorations: vscode.DecorationOptions[] = [];
      // Process top-level symbols only (functions, classes, methods)
      const topLevel = symbols.slice(0, 8); // limit to 8 to avoid rate limiting

      for (const symbol of topLevel) {
        try {
          const code = document.getText(symbol.range);
          if (!code.trim() || code.length < 10) { continue; }

          const response = await client.chat({
            messages: [
              {
                role: 'user',
                content: `Summarize this ${symbol.kind === vscode.SymbolKind.Function ? 'function' : 'symbol'} in one concise sentence (max 80 chars): "${symbol.name}"\n\n${code.slice(0, 500)}`,
              },
            ],
            languageId: document.languageId,
            fileUri: document.uri.toString(),
          });

          const summary = response.text.replace(/[\n\r]/g, ' ').trim().slice(0, 100);
          const line = symbol.range.start.line;
          const range = new vscode.Range(line, 0, line, 0);

          decorations.push({
            range,
            renderOptions: {
              before: {
                contentText: `  ∘ ${summary}`,
                color: new vscode.ThemeColor('editorCodeLens.foreground'),
                fontStyle: 'italic',
                margin: '0 0 2px 0',
              },
            },
          });
        } catch (_e) {
          // skip this symbol silently
        }
      }

      editor.setDecorations(annotateDecorationType, decorations);
      vscode.window.setStatusBarMessage(`Code Narrative AI: Annotated ${decorations.length} symbols.`, 3000);
    }
  );

  // ── Open Office ──────────────────────────────────────────────────────────
  const openOffice = vscode.commands.registerCommand(
    'codeNarrative.office.open',
    async () => {
      const config = vscode.workspace.getConfiguration('codeNarrative');
      const enabled = config.get<boolean>('office.enabled', false);
      if (!enabled) {
        vscode.window.showInformationMessage(
          'Code Narrative Office is disabled. Enable it in Settings under "Code Narrative AI".'
        );
        return;
      }
      officeViewProvider.focus();
    }
  );

  context.subscriptions.push(
    explainSelection,
    summarizeFile,
    openChat,
    openOffice,
    openDashboard,
    reviewCode,
    changelogCmd,
    prCmd,
    annotateFile,
    annotateDecorationType,
    outputChannel
  );
}

export function deactivate() {
  // Nothing to clean up yet.
}
