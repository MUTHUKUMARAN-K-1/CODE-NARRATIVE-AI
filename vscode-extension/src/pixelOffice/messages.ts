import type { AgentActivity, OfficeStat } from './SessionEvents';

// ── Host → Webview ────────────────────────────────────────────────────────────
export type HostToWebviewMessage =
  | {
      type: 'existingAgents';
      agents: number[];
      agentMeta?: Record<number, { palette?: number; hueShift?: number; seatId?: string | null }>;
      folderNames?: Record<number, string>;
    }
  | {
      type: 'agentCreated';
      id: number;
      folderName?: string;
      label?: string;
    }
  | {
      type: 'agentClosed';
      id: number;
    }
  | {
      type: 'agentStatus';
      id: number;
      status: string;
    }
  | {
      // Rich activity event for overlay animations
      type: 'agentActivity';
      id: number;
      activity: AgentActivity;
      snippet?: string;
    }
  | {
      // Show a speech bubble on an agent
      type: 'speechBubble';
      id: number;
      text: string;
      durationMs?: number;
    }
  | {
      // Trigger narrative theatre mode
      type: 'theatreStart';
      id: number;
      label: string;    // e.g. "Explaining code…"
    }
  | {
      // Send a ticker line while in theatre mode
      type: 'theatreTick';
      text: string;
    }
  | {
      // End theatre mode (show confetti on id)
      type: 'theatreEnd';
      id: number;
      success: boolean;
    }
  | {
      // Timeline event entry
      type: 'timelineEvent';
      sessionId: string;
      label: string;
      status: 'start' | 'complete' | 'error';
      agentId: number;
      ts: number;
    }
  | {
      // XP / gamification update
      type: 'statsUpdate';
      stats: OfficeStat;
      achievement?: string; // name of unlocked achievement if any
    }
  | {
      // Apply an office theme
      type: 'setTheme';
      theme: 'night' | 'sunrise' | 'neon' | 'forest';
    }
  | {
      type: 'layoutLoaded';
      layout: unknown;
    }
  | {
      type: 'workspaceFolders';
      folders: Array<{ name: string; path: string }>;
    }
  | {
      type: 'settingsLoaded';
      soundEnabled: boolean;
      theme?: string;
      characterSkin?: number;
    };

// ── Webview → Host ────────────────────────────────────────────────────────────
export type WebviewToHostMessage =
  | {
      type: 'saveAgentSeats';
      seats: Record<number, { palette: number; hueShift: number; seatId: string | null }>;
    }
  | {
      type: 'saveLayout';
      payload: { layout: OfficeLayout; };
    }
  | { type: 'webviewReady'; }
  | { type: 'requestLayout'; }
  | {
      type: 'openSession';
      payload: { sessionId: string; };
    }
  | { type: 'toggleLayoutEditor'; }
  | {
      type: 'setSoundEnabled';
      enabled: boolean;
    }
  | {
      type: 'setTheme';
      theme: string;
    }
  | {
      type: 'setCharacterSkin';
      skin: number;
    }
   | {
      type: 'requestStats';
    }
  | {
      type: 'exportSession';
      text: string;
    };

// ── Layout Types ──────────────────────────────────────────────────────────────
export interface OfficeLayout {
  width: number;
  height: number;
  tiles: OfficeTile[];
}

export type OfficeTileType = 'empty' | 'floor' | 'wall' | 'desk';

export interface OfficeTile {
  x: number;
  y: number;
  type: OfficeTileType;
}
