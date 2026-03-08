import * as vscode from 'vscode';

export type BackendType = 'local' | 'remote';

export interface ExplainSelectionRequest {
  code: string;
  languageId: string;
  fileUri: string;
  workspaceFolder?: string;
  narrativeLevel: 'short' | 'detailed';
}

export interface SummarizeFileRequest {
  code: string;
  languageId: string;
  fileUri: string;
  workspaceFolder?: string;
  narrativeLevel: 'short' | 'detailed';
}

export interface ReviewCodeRequest {
  code: string;
  languageId: string;
  fileUri: string;
  workspaceFolder?: string;
}

export interface ChangelogRequest {
  gitLog: string;
  workspaceFolder?: string;
}

export interface PrDescriptionRequest {
  diff: string;
  workspaceFolder?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  languageId?: string;
  fileUri?: string;
  workspaceFolder?: string;
}

export interface CodeNarrativeResponse {
  text: string;
}

export interface CodeNarrativeClient {
  explainSelection(request: ExplainSelectionRequest): Promise<CodeNarrativeResponse>;
  summarizeFile(request: SummarizeFileRequest): Promise<CodeNarrativeResponse>;
  reviewCode(request: ReviewCodeRequest): Promise<CodeNarrativeResponse>;
  changelog(request: ChangelogRequest): Promise<CodeNarrativeResponse>;
  prDescription(request: PrDescriptionRequest): Promise<CodeNarrativeResponse>;
  chat(request: ChatRequest): Promise<CodeNarrativeResponse>;
}

interface ClientConfig {
  backendType: BackendType;
  baseUrl: string;
  apiKey?: string;
  outputChannel: vscode.OutputChannel;
}

class RemoteBackendClient implements CodeNarrativeClient {
  private readonly baseUrl: string;
  private readonly apiKey?: string;
  private readonly output: vscode.OutputChannel;

  constructor(config: ClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, '');
    this.apiKey = config.apiKey;
    this.output = config.outputChannel;
  }

  async explainSelection(
    request: ExplainSelectionRequest
  ): Promise<CodeNarrativeResponse> {
    const repoId = request.workspaceFolder || 'demo-repo';
    const filePath = vscode.Uri.parse(request.fileUri).path || request.fileUri;

    return this.post('/explain', {
      repo_id: repoId,
      file_path: filePath,
      code_snippet: request.code,
    });
  }

  async summarizeFile(
    request: SummarizeFileRequest
  ): Promise<CodeNarrativeResponse> {
    const repoId = request.workspaceFolder || 'demo-repo';
    const filePath = vscode.Uri.parse(request.fileUri).path || request.fileUri;

    return this.post('/explain', {
      repo_id: repoId,
      file_path: filePath,
      code_snippet: request.code,
    });
  }

  async reviewCode(
    request: ReviewCodeRequest
  ): Promise<CodeNarrativeResponse> {
    const repoId = request.workspaceFolder || 'demo-repo';
    const filePath = vscode.Uri.parse(request.fileUri).path || request.fileUri;

    return this.post('/review', {
      repo_id: repoId,
      file_path: filePath,
      code_snippet: request.code,
      language: request.languageId,
    });
  }

  async changelog(request: ChangelogRequest): Promise<CodeNarrativeResponse> {
    return this.post('/qa', {
      question: `Generate a human-readable changelog from this git log. Group by type (features, fixes, refactors). Use narrative style:\n\n${request.gitLog}`,
      repo_id: request.workspaceFolder ?? 'vscode',
    });
  }

  async prDescription(request: PrDescriptionRequest): Promise<CodeNarrativeResponse> {
    return this.post('/qa', {
      question: `Generate a clear, professional PR description from this git diff. Include: title, summary, changes list, and testing notes:\n\n${request.diff}`,
      repo_id: request.workspaceFolder ?? 'vscode',
    });
  }

  async chat(request: ChatRequest): Promise<CodeNarrativeResponse> {
    const question = request.messages
      .filter((m) => m.role === 'user')
      .map((m) => m.content)
      .join('\n\n');

    return this.post('/qa', {
      question,
      repo_id: request.workspaceFolder ?? request.fileUri ?? 'vscode',
    });
  }

  private async post(path: string, body: unknown): Promise<CodeNarrativeResponse> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.apiKey) {
      headers.Authorization = `Bearer ${this.apiKey}`;
    }

    const started = Date.now();
    this.output.appendLine(`[Code Narrative AI] POST ${url}`);

    try {
      const response = await (globalThis as any).fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      const text = await response.text();

      if (!response.ok) {
        this.output.appendLine(
          `[Code Narrative AI] Error ${response.status}: ${text}`
        );
        throw new Error(
          `Code Narrative AI request failed with status ${response.status}`
        );
      }

      const data = JSON.parse(text) as { text?: string };
      const result: CodeNarrativeResponse = {
        text: data.text ?? text,
      };

      const elapsed = Date.now() - started;
      this.output.appendLine(
        `[Code Narrative AI] Success (${elapsed}ms)`
      );

      return result;
    } catch (error) {
      const elapsed = Date.now() - started;
      this.output.appendLine(
        `[Code Narrative AI] Request failed after ${elapsed}ms: ${String(error)}`
      );
      throw error;
    }
  }
}

class LocalBackendClient extends RemoteBackendClient {
  // For now this behaves like the remote client but typically points to
  // http://localhost:PORT. We keep it separate in case local-only features
  // are added later.
}

export function createCodeNarrativeClient(
  outputChannel: vscode.OutputChannel
): CodeNarrativeClient {
  const config = vscode.workspace.getConfiguration('codeNarrative');

  const backendType = (config.get<string>('backendType', 'remote') ??
    'remote') as BackendType;
  const baseUrl = config.get<string>('baseUrl', '') || '';
  const apiKey = config.get<string>('apiKey') || undefined;

  const clientConfig: ClientConfig = {
    backendType,
    baseUrl,
    apiKey,
    outputChannel,
  };

  if (!baseUrl) {
    outputChannel.appendLine(
      '[Code Narrative AI] Warning: baseUrl is not configured. Requests will fail until it is set.'
    );
  }

  if (backendType === 'local') {
    return new LocalBackendClient(clientConfig);
  }

  return new RemoteBackendClient(clientConfig);
}
