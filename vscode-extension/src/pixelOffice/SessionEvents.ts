// ── Activity Types ────────────────────────────────────────────────────────────
export type AgentActivity =
  | 'writing-file'
  | 'reading-file'
  | 'running-command'
  | 'calling-api'
  | 'thinking'
  | 'waiting-input'
  | 'reviewing'
  | 'done';

export type SessionState =
  | 'THINKING'
  | 'TYPING'
  | 'IDLE'
  | 'WAITING_FOR_USER'
  | 'ERROR'
  | 'COMPLETE';

// ── Events ────────────────────────────────────────────────────────────────────
export interface BaseSessionEvent {
  sessionId: string;
  timestamp: number;
}

export interface SessionStartEvent extends BaseSessionEvent {
  type: 'session-start';
  source: 'explainSelection' | 'summarizeFile' | 'chat';
  fileUri?: string;
  workspaceFolder?: string;
  label?: string; // e.g. "/review", "/changelog"
}

export interface SessionUpdateEvent extends BaseSessionEvent {
  type: 'session-update';
  phase: 'generating' | 'processing';
  activity?: AgentActivity;
  snippet?: string; // short text for ticker / speech bubble
}

export interface SessionIdleEvent extends BaseSessionEvent {
  type: 'session-idle';
}

export interface SessionErrorEvent extends BaseSessionEvent {
  type: 'session-error';
  message: string;
}

export interface SessionCompleteEvent extends BaseSessionEvent {
  type: 'session-complete';
  xpGained?: number;
}

export type SessionEvent =
  | SessionStartEvent
  | SessionUpdateEvent
  | SessionIdleEvent
  | SessionErrorEvent
  | SessionCompleteEvent;

// ── Visual State ──────────────────────────────────────────────────────────────
export interface SessionVisualState {
  sessionId: string;
  state: SessionState;
  activity: AgentActivity;
  lastActivity: number;
  fileUri?: string;
  workspaceFolder?: string;
  source: SessionStartEvent['source'];
  label?: string;
  snippet?: string;
}

export type SessionStateListener = (sessions: SessionVisualState[]) => void;

// ── XP / Gamification state ───────────────────────────────────────────────────
export interface OfficeStat {
  totalXp: number;
  level: number;
  totalSessions: number;
  streak: number;         // consecutive days active
  lastActiveDay: string;  // YYYY-MM-DD
  achievements: string[];
}

export function calcLevel(xp: number): number {
  // Level 1-10: each level needs 100 * level XP
  let lvl = 1;
  let threshold = 100;
  while (xp >= threshold && lvl < 10) {
    xp -= threshold;
    lvl++;
    threshold = 100 * lvl;
  }
  return lvl;
}

export function xpForCommand(source: SessionStartEvent['source'], label?: string): number {
  if (label === 'review') { return 25; }
  if (label === 'changelog' || label === 'pr') { return 20; }
  if (source === 'explainSelection') { return 15; }
  if (source === 'summarizeFile') { return 10; }
  return 5;
}

// ── Activity Detection ────────────────────────────────────────────────────────
export function detectActivity(text: string): AgentActivity {
  const t = text.toLowerCase();
  if (/writing|creating file|saved|wrote/.test(t)) { return 'writing-file'; }
  if (/reading|opening|loading file|fetching/.test(t)) { return 'reading-file'; }
  if (/running|executing|command|terminal|shell/.test(t)) { return 'running-command'; }
  if (/calling|request|api|fetch|post|get/.test(t)) { return 'calling-api'; }
  if (/reviewing|critique|issue|problem/.test(t)) { return 'reviewing'; }
  return 'thinking';
}

// ── Tracker ───────────────────────────────────────────────────────────────────
export class SessionTracker {
  private sessions = new Map<string, SessionVisualState>();
  private listeners = new Set<SessionStateListener>();
  private activityListeners = new Set<(event: SessionEvent) => void>();

  addListener(listener: SessionStateListener): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => { this.listeners.delete(listener); };
  }

  addActivityListener(listener: (event: SessionEvent) => void): () => void {
    this.activityListeners.add(listener);
    return () => { this.activityListeners.delete(listener); };
  }

  handleEvent(event: SessionEvent) {
    const now = event.timestamp;
    const existing = this.sessions.get(event.sessionId);

    switch (event.type) {
      case 'session-start': {
        this.sessions.set(event.sessionId, {
          sessionId: event.sessionId,
          state: 'THINKING',
          activity: 'thinking',
          lastActivity: now,
          fileUri: event.fileUri,
          workspaceFolder: event.workspaceFolder,
          source: event.source,
          label: event.label,
        });
        break;
      }
      case 'session-update': {
        if (!existing) { break; }
        existing.state = event.phase === 'generating' ? 'TYPING' : 'THINKING';
        existing.activity = event.activity ?? (event.phase === 'generating' ? 'writing-file' : 'thinking');
        existing.snippet = event.snippet;
        existing.lastActivity = now;
        break;
      }
      case 'session-idle': {
        if (!existing) { break; }
        existing.state = 'IDLE';
        existing.activity = 'done';
        existing.lastActivity = now;
        break;
      }
      case 'session-error': {
        if (!existing) { break; }
        existing.state = 'ERROR';
        existing.activity = 'done';
        existing.lastActivity = now;
        break;
      }
      case 'session-complete': {
        if (!existing) { break; }
        existing.state = 'COMPLETE';
        existing.activity = 'done';
        existing.lastActivity = now;
        break;
      }
    }

    // Broadcast to activity listeners (for overlay)
    for (const listener of this.activityListeners) {
      listener(event);
    }

    this.emit();
  }

  pruneStaleSessions(maxIdleMs: number) {
    const now = Date.now();
    let changed = false;
    for (const [id, session] of this.sessions.entries()) {
      if (now - session.lastActivity > maxIdleMs) {
        this.sessions.delete(id);
        changed = true;
      }
    }
    if (changed) { this.emit(); }
  }

  getSnapshot(): SessionVisualState[] {
    return Array.from(this.sessions.values()).sort(
      (a, b) => a.lastActivity - b.lastActivity
    );
  }

  private emit() {
    const snapshot = this.getSnapshot();
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }
}
