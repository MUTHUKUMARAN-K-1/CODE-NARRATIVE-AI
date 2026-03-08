import type { SessionVisualState } from '../pixelOffice/SessionEvents';

// Messages from extension host to dashboard webview
export type HostToDashboardMessage =
  | {
      type: 'initState';
      payload: {
        sessions: SessionVisualState[];
      };
    }
  | {
      type: 'sessionSnapshot';
      payload: {
        sessions: SessionVisualState[];
      };
    }
  | {
      type: 'editorContextChanged';
      payload: {
        fileUri?: string;
        languageId?: string;
        relativePath?: string;
        selectionPreview?: string;
        fullTextSnippet?: string;
      };
    }
  | {
      type: 'chatResponse';
      payload: {
        user: string;
        assistant: string;
      };
    }
  | {
      type: 'error';
      payload: string;
    };

// Messages from dashboard webview to extension host
export interface DashboardToHostMessage {
  type: 'webviewReady' | 'sendPrompt' | 'exportMarkdown' | 'clearHistory';
  text?: string;
  content?: string;
  command?: 'chat' | 'explain' | 'summarize' | 'review' | 'changelog' | 'pr';
}


