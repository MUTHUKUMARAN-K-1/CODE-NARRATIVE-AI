import * as vscode from 'vscode';

const SECRET_KEY = 'codeNarrative.apiKey';

export class ApiKeyManager {
  constructor(private readonly context: vscode.ExtensionContext) {}

  async getApiKey(): Promise<string | undefined> {
    const stored = await this.context.secrets.get(SECRET_KEY);
    if (stored) {
      return stored;
    }

    const config = vscode.workspace.getConfiguration('codeNarrative');
    const fromConfig = config.get<string>('apiKey');
    return fromConfig || undefined;
  }

  async promptAndStoreApiKey(): Promise<string | undefined> {
    const value = await vscode.window.showInputBox({
      prompt: 'Enter your Code Narrative AI API key',
      ignoreFocusOut: true,
      password: true,
    });

    if (!value) {
      return;
    }

    await this.context.secrets.store(SECRET_KEY, value);
    return value;
  }
}

