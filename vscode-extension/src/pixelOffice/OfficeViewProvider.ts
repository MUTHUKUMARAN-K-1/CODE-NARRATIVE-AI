import * as vscode from 'vscode';
import { LayoutStore } from './LayoutStore';
import { HostToWebviewMessage, WebviewToHostMessage } from './messages';
import {
  SessionTracker, SessionVisualState, OfficeStat,
  calcLevel, xpForCommand, detectActivity,
} from './SessionEvents';

const WS_KEY_SEATS    = 'codeNarrative.office.agentSeats';
const G_SOUND         = 'codeNarrative.office.soundEnabled';
const G_THEME         = 'codeNarrative.office.theme';
const G_SKIN          = 'codeNarrative.office.characterSkin';
const G_STATS         = 'codeNarrative.office.stats';

function defStats(): OfficeStat {
  return { totalXp: 0, level: 1, totalSessions: 0, streak: 0, lastActiveDay: '', achievements: [] };
}
function today(): string { return new Date().toISOString().slice(0, 10); }

function checkAchievements(s: OfficeStat): string | undefined {
  const checks: [string, string, () => boolean][] = [
    ['first-session', 'First Session! \uD83C\uDF89', () => s.totalSessions >= 1],
    ['session-10',    '10 Sessions! \uD83D\uDD25',   () => s.totalSessions >= 10],
    ['session-50',    '50 Sessions! \uD83D\uDE80',   () => s.totalSessions >= 50],
    ['level-5',       'Level 5! \u2B50',             () => s.level >= 5],
    ['level-10',      'Level 10 Master! \uD83C\uDFC6', () => s.level >= 10],
    ['streak-3',      '3-Day Streak! \uD83C\uDF1F',  () => s.streak >= 3],
    ['streak-7',      'Week Streak! \uD83D\uDCAA',   () => s.streak >= 7],
  ];
  for (const [id, label, test] of checks) {
    if (!s.achievements.includes(id) && test()) {
      s.achievements.push(id);
      return label;
    }
  }
  return undefined;
}

// ── Provider ─────────────────────────────────────────────────────────────────

export class OfficeViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'codeNarrative.officeView';

  private view?: vscode.WebviewView;
  private nextAgentId = 1;
  private readonly s2a  = new Map<string, number>();   // sessionId → agentId
  private readonly last  = new Map<string, SessionVisualState>();
  private readonly disp: Array<() => void> = [];

  constructor(
    private readonly ctx:     vscode.ExtensionContext,
    private readonly layout:  LayoutStore,
    private readonly tracker: SessionTracker,
  ) {}

  async resolveWebviewView(wv: vscode.WebviewView): Promise<void> {
    this.view = wv;
    wv.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.ctx.extensionUri, 'media', 'pixel-office')],
    };
    wv.webview.html = this.getHtml(wv.webview);
    wv.webview.onDidReceiveMessage((m: unknown) => { void this.onMsg(m as WebviewToHostMessage); });

    this.disp.push(
      this.tracker.addListener(s => { this.syncAgents(s); }),
      this.tracker.addActivityListener(e => { void this.onActivity(e); }),
    );
  }

  public focus() {
    this.view
      ? this.view.show?.(true)
      : void vscode.commands.executeCommand('workbench.view.extension.codeNarrative');
  }

  // ── Phase 1 + 2 + 3: Activity / Session Event Handler ────────────────────

  private async onActivity(event: import('./SessionEvents').SessionEvent) {
    /* === PHASE 1: session-start ─ immediately mark agent ACTIVE === */
    if (event.type === 'session-start') {
      const id = this.ensureAgent(event.sessionId);

      const label = event.label
        ? event.label.charAt(0).toUpperCase() + event.label.slice(1) + 'ing...'
        : (event.source === 'explainSelection' ? 'Explaining code...'
         : event.source === 'summarizeFile'    ? 'Summarizing file...'
         : 'Generating narrative...');

      // Phase 1: register + activate in canvas immediately
      this.post({ type: 'agentCreated', id, label });
      this.post({ type: 'agentStatus',  id, status: 'active' });                  // stops Idle label

      // Phase 1: speech bubble on character
      this.post({ type: 'speechBubble', id, text: label, durationMs: 9000 });

      // Phase 3: theatre mode
      this.post({ type: 'theatreStart', id, label });
      return;
    }

    const id = this.s2a.get(event.sessionId);

    /* === PHASE 2: session-update ─ activity detection from AI output === */
    if (event.type === 'session-update' && id !== undefined) {
      const act = event.activity ?? detectActivity(event.snippet ?? '');

      // Phase 2: send detected activity to overlay
      this.post({ type: 'agentActivity', id, activity: act, snippet: event.snippet });

      // Phase 1: keep canvas ACTIVE during updates
      this.post({ type: 'agentStatus', id, status: 'active' });

      // Phase 3: stream snippet to theatre ticker
      if (event.snippet) {
        this.post({ type: 'theatreTick', text: event.snippet });
        // Phase 1: speak current activity as bubble
        this.post({ type: 'speechBubble', id, text: event.snippet, durationMs: 4000 });
      }
      return;
    }

    /* === PHASE 4: session-complete ─ XP + achievements === */
    if (event.type === 'session-complete' && id !== undefined) {
      const sess = this.last.get(event.sessionId);
      const xp   = xpForCommand(sess?.source ?? 'chat', sess?.label);
      const stats = await this.earnXp(xp, sess?.source ?? 'chat', sess?.label);
      const ach   = checkAchievements(stats);
      await this.ctx.globalState.update(G_STATS, stats);

      // Phase 4: push XP update + achievement toast to overlay
      this.post({ type: 'statsUpdate', stats, achievement: ach ?? undefined });

      // Phase 3: end theatre with confetti
      this.post({ type: 'theatreEnd', id, success: true });

      // Phase 1: speech bubble + canvas status → done → idle
      this.post({ type: 'speechBubble', id, text: 'Done! Narrative ready', durationMs: 4000 });
      this.post({ type: 'agentStatus',  id, status: 'done' });
      setTimeout(() => { this.post({ type: 'agentStatus', id: id!, status: 'idle' }); }, 3000);
      return;
    }

    /* === session-error === */
    if (event.type === 'session-error' && id !== undefined) {
      this.post({ type: 'theatreEnd',   id, success: false });
      this.post({ type: 'agentStatus',  id, status: 'error' });
      this.post({ type: 'speechBubble', id, text: 'Something went wrong', durationMs: 5000 });
      setTimeout(() => { this.post({ type: 'agentStatus', id: id!, status: 'idle' }); }, 5000);
    }
  }

  // ── Phase 4 helpers ───────────────────────────────────────────────────────

  private async earnXp(xp: number, _src: string, _lbl?: string): Promise<OfficeStat> {
    const s = this.ctx.globalState.get<OfficeStat>(G_STATS, defStats());
    const t = today();
    s.totalXp += xp;
    s.totalSessions++;
    s.level = calcLevel(s.totalXp);
    const yday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if (s.lastActiveDay === yday) { s.streak++; }
    else if (s.lastActiveDay !== t) { s.streak = 1; }
    s.lastActiveDay = t;
    return s;
  }

  // ── Message from Webview ──────────────────────────────────────────────────

  private async onMsg(m: WebviewToHostMessage) {
    switch (m.type) {
      case 'webviewReady': {
        this.sendSettings();
        this.sendFolders();
        await this.sendAgents();
        const saved = await this.layout.loadLayout();
        this.post({ type: 'layoutLoaded', layout: saved ?? null });
        const stats = this.ctx.globalState.get<OfficeStat>(G_STATS, defStats());
        this.post({ type: 'statsUpdate', stats });
        break;
      }
      case 'saveLayout':       await this.layout.saveLayout(m.payload.layout); break;
      case 'saveAgentSeats':   await this.ctx.workspaceState.update(WS_KEY_SEATS, m.seats); break;
      case 'setSoundEnabled':  await this.ctx.globalState.update(G_SOUND, m.enabled); break;
      case 'setTheme':         await this.ctx.globalState.update(G_THEME, m.theme); break;
      case 'setCharacterSkin': await this.ctx.globalState.update(G_SKIN, m.skin); break;
      case 'exportSession': {
        const text = m.text || '';
        if (text) {
          const uri = await vscode.window.showSaveDialog({
            defaultUri: vscode.Uri.file('narrative-session.md'),
            filters: { 'Markdown': ['md'] },
          });
          if (uri) {
            const content = '# Code Narrative Session\n\n' + text + '\n';
            await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf-8'));
            vscode.window.showInformationMessage('Session exported!');
          }
        }
        break;
      }
      case 'requestStats': {
        const stats = this.ctx.globalState.get<OfficeStat>(G_STATS, defStats());
        this.post({ type: 'statsUpdate', stats });
        break;
      }
    }
  }

  private post(m: HostToWebviewMessage) { this.view?.webview.postMessage(m); }

  private sendSettings() {
    const soundEnabled  = this.ctx.globalState.get<boolean>(G_SOUND, true);
    const theme         = this.ctx.globalState.get<string>(G_THEME, 'night') as 'night'|'sunrise'|'neon'|'forest';
    const characterSkin = this.ctx.globalState.get<number>(G_SKIN, 0);
    this.post({ type: 'settingsLoaded', soundEnabled, theme, characterSkin });
  }

  private sendFolders() {
    const f = vscode.workspace.workspaceFolders;
    if (!f || f.length <= 1) { return; }
    this.post({ type: 'workspaceFolders', folders: f.map(x => ({ name: x.name, path: x.uri.fsPath })) });
  }

  private async sendAgents() {
    const sessions = this.tracker.getSnapshot();
    const agents: number[] = [];
    const folderNames: Record<number, string> = {};
    for (const s of sessions) {
      const id = this.ensureAgent(s.sessionId);
      agents.push(id);
      if (s.workspaceFolder) { folderNames[id] = s.workspaceFolder; }
    }
    this.post({ type: 'existingAgents', agents, folderNames });
    for (const s of sessions) {
      const id = this.ensureAgent(s.sessionId);
      this.post({ type: 'agentStatus', id, status: agentStatus(s.state) });
      this.last.set(s.sessionId, s);
    }
  }

  private syncAgents(sessions: SessionVisualState[]) {
    const ids = new Set(sessions.map(s => s.sessionId));
    for (const [sid] of this.last.entries()) {
      if (!ids.has(sid)) {
        const aid = this.s2a.get(sid);
        if (aid !== undefined) { this.post({ type: 'agentClosed', id: aid }); this.s2a.delete(sid); }
        this.last.delete(sid);
      }
    }
    for (const s of sessions) {
      const existing = this.last.get(s.sessionId);
      const aid = this.ensureAgent(s.sessionId);
      if (!existing) { this.post({ type: 'agentCreated', id: aid, folderName: s.workspaceFolder, label: s.label }); }
      if (!existing || existing.state !== s.state) { this.post({ type: 'agentStatus', id: aid, status: agentStatus(s.state) }); }
      this.last.set(s.sessionId, s);
    }
  }

  private ensureAgent(sessionId: string): number {
    let id = this.s2a.get(sessionId);
    if (id === undefined) { id = this.nextAgentId++; this.s2a.set(sessionId, id); }
    return id;
  }

  // ── Phase 3 + 5: HTML with full overlay ──────────────────────────────────

  private getHtml(webview: vscode.Webview): string {
    const nonce = getNonce();
    const root  = vscode.Uri.joinPath(this.ctx.extensionUri, 'media', 'pixel-office');
    const js    = webview.asWebviewUri(vscode.Uri.joinPath(root, 'assets', 'index-CgVMlgSL.js'));
    const css   = webview.asWebviewUri(vscode.Uri.joinPath(root, 'assets', 'index-CDgABIYG.css'));
    const csp   = `default-src 'none'; img-src ${webview.cspSource} data:; script-src 'nonce-${nonce}'; style-src 'unsafe-inline' ${webview.cspSource};`;

    // ── Phase 5: Theme CSS variables ─────────────
    const styles = `
*{box-sizing:border-box;margin:0;padding:0}
:root{--acc:#e8650a;--glow:rgba(232,101,10,.35);--g2:rgba(232,101,10,.12);--f:Inter,system-ui,sans-serif}
body[data-theme=night]  {--acc:#e8650a;--glow:rgba(232,101,10,.35);--g2:rgba(232,101,10,.12)}
body[data-theme=sunrise] {--acc:#f59e0b;--glow:rgba(245,158,11,.4); --g2:rgba(245,158,11,.14)}
body[data-theme=neon]    {--acc:#a855f7;--glow:rgba(168,85,247,.5);  --g2:rgba(168,85,247,.18)}
body[data-theme=forest]  {--acc:#22c55e;--glow:rgba(34,197,94,.4);  --g2:rgba(34,197,94,.14)}

#cn-overlay{position:fixed;inset:0;pointer-events:none;z-index:9999;font-family:var(--f)}

/* Phase 5: Glowing canvas border */
#glow-border{position:absolute;inset:0;border:2px solid var(--acc);border-radius:4px;box-shadow:0 0 18px var(--glow),inset 0 0 18px var(--g2);animation:borderPulse 3s ease-in-out infinite;pointer-events:none}

/* Phase 5: Ambient particles */
#particles{position:absolute;inset:0;overflow:hidden;pointer-events:none}
.pt{position:absolute;border-radius:50%;background:var(--acc);animation:ptFloat linear infinite;opacity:0}

/* Phase 4: XP HUD */
#xp-hud{position:absolute;top:10px;left:10px;background:rgba(0,0,0,.88);backdrop-filter:blur(16px);border:1px solid var(--acc);border-radius:12px;padding:10px 14px;min-width:150px;pointer-events:all;box-shadow:0 4px 24px var(--g2);animation:hudIn .5s cubic-bezier(.34,1.56,.64,1)}
.xp-head{display:flex;align-items:center;gap:8px;margin-bottom:8px}
.xp-logo{width:24px;height:24px;background:linear-gradient(135deg,var(--acc),#ff9040);border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;color:#fff;box-shadow:0 0 10px var(--glow)}
.xp-brand{font-size:10px;font-weight:700;letter-spacing:.9px;text-transform:uppercase;color:#fff}
#xp-lvl{font-size:22px;font-weight:900;color:#fff;line-height:1;text-shadow:0 0 20px var(--acc)}
.xp-sub{font-size:9px;color:#52525b;margin-bottom:6px}
.xp-track{height:5px;background:rgba(255,255,255,.08);border-radius:3px;overflow:hidden;margin-bottom:6px}
#xp-fill{height:100%;background:linear-gradient(90deg,var(--acc),#ff9040);border-radius:3px;transition:width .9s cubic-bezier(.4,0,.2,1);box-shadow:0 0 8px var(--acc)}
.xp-row{display:flex;justify-content:space-between;font-size:9px;color:#3f3f46}
#xp-streak{color:#fbbf24;font-weight:700}
#activity-bar{margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,.06);font-size:9px;color:var(--acc);display:none;align-items:center;gap:5px}
#activity-bar.on{display:flex}
.act-dot{width:6px;height:6px;border-radius:50%;background:var(--acc);animation:actPulse 1s ease-in-out infinite;flex-shrink:0}

/* HUD buttons */
#hud-btns{position:absolute;top:10px;right:10px;display:flex;gap:6px;pointer-events:all}
.hbtn{padding:5px 11px;border-radius:9px;border:1px solid rgba(255,255,255,.12);background:rgba(0,0,0,.82);backdrop-filter:blur(10px);color:#a1a1aa;font-size:10px;font-weight:700;cursor:pointer;transition:all .18s;letter-spacing:.4px;font-family:var(--f)}
.hbtn:hover{border-color:var(--acc);color:var(--acc);box-shadow:0 0 10px var(--g2)}
.hbtn.on{border-color:var(--acc);color:var(--acc)}
#btn-demo{border-color:rgba(232,101,10,.35);color:var(--acc);background:rgba(232,101,10,.1)}
#btn-demo:hover{background:rgba(232,101,10,.22);box-shadow:0 0 14px var(--glow)}

/* Phase 5: Settings panel */
#sp{position:absolute;top:46px;right:10px;background:rgba(8,8,10,.96);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,.1);border-radius:14px;padding:14px;width:190px;display:none;pointer-events:all;z-index:10000;box-shadow:0 16px 48px rgba(0,0,0,.7)}
#sp.open{display:block;animation:hudIn .3s ease}
.sp-hd{font-size:9px;font-weight:700;letter-spacing:.7px;text-transform:uppercase;color:#52525b;margin-bottom:7px}
.sp-themes{display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-bottom:12px}
.spt{padding:6px 8px;border-radius:8px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03);color:#a1a1aa;font-size:10px;cursor:pointer;text-align:center;transition:all .18s;font-family:var(--f)}
.spt:hover,.spt.on{border-color:var(--acc);color:var(--acc)}
.sp-row{display:flex;align-items:center;justify-content:space-between;font-size:10px;color:#a1a1aa}
.tog{width:36px;height:20px;border-radius:10px;background:rgba(255,255,255,.1);border:none;cursor:pointer;position:relative;transition:background .2s}
.tog.on{background:var(--acc)}
.tog::after{content:"";position:absolute;width:16px;height:16px;border-radius:50%;background:#fff;top:2px;left:2px;transition:left .2s;box-shadow:0 1px 4px rgba(0,0,0,.4)}
.tog.on::after{left:18px}

/* Phase 3: Theatre overlay */
#theatre{position:absolute;inset:0;pointer-events:none;opacity:0;transition:opacity .5s}
#theatre.on{opacity:1}
#th-dim{position:absolute;inset:0;background:rgba(0,0,0,.4)}
#th-spot{position:absolute;top:35%;left:50%;transform:translate(-50%,-50%);width:380px;height:380px;background:radial-gradient(circle,rgba(255,255,255,.14) 0%,rgba(255,255,255,.04) 40%,transparent 70%);border-radius:50%;animation:spotPulse 2.2s ease-in-out infinite}
#th-ticker{position:absolute;bottom:0;left:0;right:0;background:rgba(0,0,0,.97);border-top:2px solid var(--acc);padding:12px 18px;box-shadow:0 -8px 32px var(--g2)}
#th-lbl{font-size:9px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:var(--acc);margin-bottom:5px;display:flex;align-items:center;gap:6px}
#th-lbl::before{content:"";width:6px;height:6px;border-radius:50%;background:var(--acc);display:inline-block;flex-shrink:0;animation:actPulse 1s ease-in-out infinite}
#th-txt{font-size:11px;color:#e4e4e7;line-height:1.6;max-height:64px;overflow:hidden;mask-image:linear-gradient(to bottom,#fff 50%,transparent)}

/* Phase 1: Speech bubbles */
#bubbles{position:absolute;inset:0}
.bubble{position:absolute;background:rgba(0,0,0,.92);border:1px solid var(--acc);border-radius:12px;padding:7px 11px;font-size:10px;color:#e4e4e7;max-width:170px;line-height:1.5;pointer-events:none;animation:bubIn .3s ease;box-shadow:0 4px 20px var(--g2)}
.bubble::after{content:"";position:absolute;bottom:-7px;left:14px;border:7px solid transparent;border-top-color:var(--acc)}

/* Phase 3: Timeline strip */
#timeline{position:absolute;bottom:38px;left:0;right:0;height:34px;background:rgba(0,0,0,.9);backdrop-filter:blur(12px);border-top:1px solid rgba(255,255,255,.06);display:flex;align-items:center;opacity:0;transition:opacity .3s;pointer-events:all}
#timeline.on{opacity:1}
#tl-hd{font-size:8px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:#3f3f46;padding:0 12px;flex-shrink:0}
#tl-track{flex:1;display:flex;align-items:center;gap:5px;overflow-x:auto;padding:0 10px}
#tl-track::-webkit-scrollbar{height:2px}
#tl-track::-webkit-scrollbar-thumb{background:rgba(255,255,255,.1);border-radius:2px}
.tl-tick{flex-shrink:0;display:flex;flex-direction:column;align-items:center;gap:3px}
.tl-dot{width:9px;height:9px;border-radius:50%}
.tl-dot.s{background:#60a5fa;box-shadow:0 0 6px #60a5fa}
.tl-dot.c{background:var(--acc);box-shadow:0 0 6px var(--acc)}
.tl-dot.e{background:#fb7185;box-shadow:0 0 6px #fb7185}
.tl-lbl{font-size:7px;color:#52525b;white-space:nowrap;max-width:52px;overflow:hidden;text-overflow:ellipsis}

/* Phase 4: Achievement toast */
#ach{position:absolute;top:12px;left:50%;transform:translateX(-50%) translateY(-90px);background:linear-gradient(135deg,rgba(16,16,18,.99),rgba(26,26,30,.99));border:1px solid var(--acc);border-radius:14px;padding:12px 18px;display:flex;align-items:center;gap:12px;pointer-events:none;opacity:0;transition:all .45s cubic-bezier(.34,1.56,.64,1);min-width:210px;box-shadow:0 8px 40px var(--g2)}
#ach.on{opacity:1;transform:translateX(-50%) translateY(0)}
#ach-ic{font-size:26px}
.ach-ttl{font-size:9px;font-weight:700;letter-spacing:.9px;text-transform:uppercase;color:var(--acc);margin-bottom:2px}
#ach-txt{font-size:12px;font-weight:700;color:#fff}

/* Confetti */
.cf{position:absolute;width:8px;height:8px;border-radius:2px;pointer-events:none;animation:cfFall linear forwards}

/* Keyframes */
@keyframes borderPulse{0%,100%{opacity:.5;box-shadow:0 0 10px var(--glow),inset 0 0 10px var(--g2)}50%{opacity:.9;box-shadow:0 0 26px var(--glow),inset 0 0 26px var(--g2)}}
@keyframes ptFloat{0%{transform:translateY(0) scale(0);opacity:0}10%{opacity:.5}90%{opacity:.2}100%{transform:translateY(-90px) scale(1.6);opacity:0}}
@keyframes actPulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.35;transform:scale(.65)}}
@keyframes spotPulse{0%,100%{transform:translate(-50%,-50%) scale(1)}50%{transform:translate(-50%,-50%) scale(1.18)}}
@keyframes bubIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
@keyframes cfFall{0%{opacity:1;transform:translateY(0) rotate(0deg)}100%{opacity:0;transform:translateY(140px) rotate(540deg)}}
@keyframes hudIn{from{opacity:0;transform:scale(.9) translateY(-8px)}to{opacity:1;transform:none}}

/* Feature 7: Onboarding overlay */
#onboarding{position:absolute;inset:0;background:rgba(0,0,0,.88);display:none;align-items:center;justify-content:center;z-index:20000;pointer-events:all}
#onboarding.on{display:flex}
.ob-card{background:rgba(16,16,20,.98);border:1px solid var(--acc);border-radius:18px;padding:30px 28px;max-width:340px;text-align:center;animation:hudIn .5s ease;box-shadow:0 16px 64px rgba(0,0,0,.7)}
.ob-logo{width:48px;height:48px;background:linear-gradient(135deg,var(--acc),#ff9040);border-radius:14px;display:inline-flex;align-items:center;justify-content:center;font-size:20px;font-weight:900;color:#fff;margin-bottom:14px;box-shadow:0 0 20px var(--glow)}
.ob-title{font-size:16px;font-weight:800;color:#fff;margin-bottom:16px}
.ob-steps{text-align:left;margin-bottom:18px}
.ob-step{display:flex;align-items:flex-start;gap:10px;margin-bottom:10px;font-size:11px;color:#a1a1aa;line-height:1.5}
.ob-num{width:22px;height:22px;border-radius:50%;background:var(--acc);color:#fff;font-size:10px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.ob-btn{padding:10px 28px;border-radius:10px;border:none;background:linear-gradient(135deg,var(--acc),#ff9040);color:#fff;font-size:12px;font-weight:700;cursor:pointer;transition:all .2s;font-family:var(--f);box-shadow:0 4px 16px var(--glow)}
.ob-btn:hover{transform:scale(1.04);box-shadow:0 6px 24px var(--glow)}

/* Feature 8: Skin selector in settings */
.sp-skins{display:flex;gap:4px;flex-wrap:wrap;margin-bottom:10px}
.sp-skin{width:32px;height:32px;border-radius:8px;border:2px solid rgba(255,255,255,.08);background:rgba(255,255,255,.04);cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;transition:all .18s;position:relative}
.sp-skin:hover,.sp-skin.on{border-color:var(--acc)}
.sp-skin.locked{opacity:.35;cursor:not-allowed}
.sp-skin.locked::after{content:'*';position:absolute;font-size:8px;bottom:1px;right:1px}
`;

    // ── Phase 1-5 Client-side JS ─────────────────────────────────────────
    const overlayJs = `
(function(){
/* All functions use window.__cnApi which is set BEFORE the Vite bundle loads */
var api = window.__cnApi;

// ── Feature 5: Sound Feedback via AudioContext ────────────────────────────
function playSound(freq,dur,vol){
  if(!sndOn)return;
  try{
    var ac=new(window.AudioContext||window.webkitAudioContext)();
    var osc=ac.createOscillator();var gn=ac.createGain();
    osc.connect(gn);gn.connect(ac.destination);
    osc.frequency.value=freq;osc.type='sine';
    gn.gain.value=vol||0.08;
    osc.start();osc.stop(ac.currentTime+(dur||0.12));
  }catch(e){}
}
function sndStart(){playSound(520,0.08,0.06);setTimeout(function(){playSound(680,0.1,0.06);},100);}
function sndDone(){playSound(880,0.1,0.07);setTimeout(function(){playSound(1100,0.15,0.07);},120);}
function sndAch(){playSound(660,0.08,0.06);setTimeout(function(){playSound(880,0.08,0.06);},80);setTimeout(function(){playSound(1320,0.2,0.08);},180);}
function sndErr(){playSound(300,0.2,0.08);}

// ── State ──────────────────────────────────────────────────────────────────
var stats = {totalXp:0,level:1,totalSessions:0,streak:0,achievements:[]};
var sndOn = true, spOpen = false;

// ── Element refs ──────────────────────────────────────────────────────────
var $ = function(id){ return document.getElementById(id); };
var xpFill=$('xp-fill'), xpLvl=$('xp-lvl'), xpSess=$('xp-sessions'), xpStrk=$('xp-streak');
var actBar=$('activity-bar'), actLbl=$('act-lbl');
var theatre=$('theatre'), thLbl=$('th-lbl'), thTxt=$('th-txt');
var timeline=$('timeline'), tlTrack=$('tl-track');
var achEl=$('ach'), achIc=$('ach-ic'), achTxt=$('ach-txt');
var bubbles=$('bubbles');
var sp=$('sp'), sndTog=$('snd-tog');

// ── Phase 5: Ambient particles ───────────────────────────────────────────
(function particles(){
  var wrap=$('particles'); if(!wrap) return;
  (function spawn(){
    var p=document.createElement('div'); p.className='pt';
    var sz=Math.random()*3+1.5;
    p.style.cssText='width:'+sz+'px;height:'+sz+'px;left:'+Math.random()*100+'%;bottom:0;animation-duration:'+(5+Math.random()*7)+'s;animation-delay:'+(Math.random()*3)+'s';
    wrap.appendChild(p);
    setTimeout(function(){p.parentNode&&p.parentNode.removeChild(p);},11000);
    setTimeout(spawn,700+Math.random()*1200);
  })();
})();

// ── Phase 4: XP rendering ────────────────────────────────────────────────
function pct(xp,lvl){var a=0;for(var l=1;l<lvl;l++)a+=100*l;return Math.min(100,((xp-a)/(100*lvl))*100);}
function renderXp(){
  if(xpFill)xpFill.style.width=pct(stats.totalXp,stats.level)+'%';
  if(xpLvl)xpLvl.textContent='Lvl '+stats.level;
  if(xpSess)xpSess.textContent=stats.totalSessions+' sessions · '+stats.totalXp+' XP';
  if(xpStrk)xpStrk.textContent=stats.streak>0?'\\uD83D\\uDD25 '+stats.streak+' day streak':'';
}

// ── Phase 3: Theatre ─────────────────────────────────────────────────────
function thStart(label){
  if(!theatre)return;
  if(thLbl)thLbl.textContent=label;
  if(thTxt)thTxt.textContent='';
  theatre.className='on';sndStart();
  setAct(label);
  tick('start', label);
}
function thTick(text){
  if(thTxt){thTxt.textContent+=text+' ';thTxt.scrollTop=thTxt.scrollHeight;}
}
function thEnd(ok){
  if(ok){confetti();sndDone();}else{sndErr();}
  setTimeout(function(){if(theatre)theatre.className='';setAct('');},ok?2000:500);
  tick(ok?'c':'e',ok?'Done':'Error');
}

// ── Phase 3: Confetti ────────────────────────────────────────────────────
function confetti(){
  var cols=['#e8650a','#fbbf24','#a78bfa','#4ade80','#60a5fa','#fb7185','#fff'];
  var wrap=$('cn-overlay'); if(!wrap)return;
  for(var i=0;i<42;i++){
    (function(i){
      var p=document.createElement('div');p.className='cf';
      p.style.cssText='left:'+Math.random()*100+'%;top:'+Math.random()*30+'%;background:'+cols[Math.floor(Math.random()*cols.length)]+';animation-delay:'+(i*0.045)+'s;animation-duration:'+(1.4+Math.random()*.8)+'s';
      wrap.appendChild(p);
      setTimeout(function(){p.parentNode&&p.parentNode.removeChild(p);},3000);
    })(i);
  }
}

// ── Phase 1: Speech bubbles ──────────────────────────────────────────────
var bubs={};
function bubble(id,text,dur){
  if(bubs[id]){var ob=bubs[id];if(ob.el&&ob.el.parentNode)ob.el.parentNode.removeChild(ob.el);clearTimeout(ob.t);}
  var el=document.createElement('div');el.className='bubble';el.textContent=text;
  el.style.cssText='bottom:'+(62+Math.random()*18)+'%;left:'+(22+Math.random()*38)+'%';
  if(bubbles)bubbles.appendChild(el);
  var t=setTimeout(function(){el.parentNode&&el.parentNode.removeChild(el);},dur||3500);
  bubs[id]={el,t};
}

// ── Phase 3: Timeline ───────────────────────────────────────────────────
function tick(status,label){
  if(!tlTrack)return;
  var d=document.createElement('div');d.className='tl-tick';
  var dot=document.createElement('div');dot.className='tl-dot '+status;
  var lbl=document.createElement('div');lbl.className='tl-lbl';lbl.textContent=label;lbl.title=label;
  d.appendChild(dot);d.appendChild(lbl);tlTrack.appendChild(d);
  tlTrack.scrollLeft=tlTrack.scrollWidth;
  if(timeline)timeline.classList.add('on');
  while(tlTrack.children.length>24)tlTrack.removeChild(tlTrack.firstChild);
}

// ── Phase 4: Achievement toast ──────────────────────────────────────────
function showAch(text){
  if(!achEl)return;
  var em=text.match(/[\\u{1F300}-\\u{1FFFE}\\u{2600}-\\u{27BF}]|[\\uD83C-\\uDBFF][\\uDC00-\\uDFFF]/gu)||[];
  if(achIc)achIc.textContent=em[0]||'\\uD83C\\uDFC6';
  var body=text.replace(/[\\u{1F300}-\\u{1FFFE}\\u{2600}-\\u{27BF}]|[\\uD83C-\\uDBFF][\\uDC00-\\uDFFF]/gu,'').trim();
  if(achTxt)achTxt.textContent=body;
  achEl.classList.add('on');sndAch();
  setTimeout(function(){achEl&&achEl.classList.remove('on');},4500);
}

// ── Phase 1: Activity bar on HUD ────────────────────────────────────────
function setAct(text){
  if(!actBar)return;
  if(!text){actBar.classList.remove('on');return;}
  actBar.classList.add('on');
  if(actLbl)actLbl.textContent=text;
}

// ── Phase 5: Theme ──────────────────────────────────────────────────────
function applyTheme(t){
  document.body.setAttribute('data-theme',t);
  document.querySelectorAll('.spt').forEach(function(b){b.classList.toggle('on',b.getAttribute('data-theme')===t);});
}

// ── Phase 3: Demo button — shows all features without AI ────────────────
var demoBtn=$('btn-demo');
if(demoBtn){
  demoBtn.addEventListener('click',function(){
    thStart('Explaining code...');
    setTimeout(function(){thTick('Reading selected code...');},400);
    setTimeout(function(){thTick('Analyzing patterns and flow...');},1200);
    setTimeout(function(){thTick('Building beginner-friendly narrative...');},2100);
    setTimeout(function(){thTick('Narrative ready!');},3000);
    setTimeout(function(){
      thEnd(true);
      stats.totalXp+=15;stats.totalSessions++;
      stats.level=Math.max(1,Math.floor(Math.sqrt(stats.totalXp/50))+1);
      renderXp();
      if(stats.totalSessions===1)setTimeout(function(){showAch('First Session! \\uD83C\\uDF89');},700);
    },3800);
  });
}

// ── Timeline toggle ──────────────────────────────────────────────────────
var tlBtn=$('btn-timeline');
if(tlBtn)tlBtn.addEventListener('click',function(){timeline&&timeline.classList.toggle('on');});

// ── Phase 5: Settings panel ──────────────────────────────────────────────
var spBtn=$('btn-sp');
if(spBtn){
  spBtn.addEventListener('click',function(){
    spOpen=!spOpen;
    if(sp)sp.classList.toggle('open',spOpen);
    spBtn.classList.toggle('on',spOpen);
  });
}
document.querySelectorAll('.spt').forEach(function(b){
  b.addEventListener('click',function(){
    var t=b.getAttribute('data-theme');
    applyTheme(t);
    if(api)api.postMessage({type:'setTheme',theme:t});
  });
});
// Feature 8: Skin selection
document.querySelectorAll('.sp-skin').forEach(function(b){
  b.addEventListener('click',function(){
    var sk=parseInt(b.getAttribute('data-skin')||'0');
    var lvlReq=[0,3,5,7];
    if(stats.level<lvlReq[sk]){return;}
    document.querySelectorAll('.sp-skin').forEach(function(x){x.classList.remove('on');});
    b.classList.add('on');
    if(api)api.postMessage({type:'setCharacterSkin',skin:sk});
  });
});
function updateSkinLocks(){
  document.querySelectorAll('.sp-skin').forEach(function(b){
    var sk=parseInt(b.getAttribute('data-skin')||'0');
    var lvlReq=[0,3,5,7];
    b.classList.toggle('locked',stats.level<lvlReq[sk]);
  });
}

if(sndTog){
  sndTog.addEventListener('click',function(){
    sndOn=!sndOn;
    sndTog.classList.toggle('on',sndOn);
    if(api)api.postMessage({type:'setSoundEnabled',enabled:sndOn});
  });
}

// ── Message bridge ───────────────────────────────────────────────────────
window.addEventListener('message',function(ev){
  var m=ev.data;if(!m||!m.type)return;
  switch(m.type){
    case 'statsUpdate':
      stats=m.stats;renderXp();updateSkinLocks();
      if(m.achievement)showAch(m.achievement);
      break;
    case 'theatreStart': thStart(m.label); break;
    case 'theatreTick':  thTick(m.text); break;
    case 'theatreEnd':   thEnd(m.success); break;
    case 'speechBubble': bubble(m.id,m.text,m.durationMs); break;
    case 'agentActivity':setAct(m.snippet||m.activity); break;
    case 'settingsLoaded':
      sndOn=!!m.soundEnabled;
      if(sndTog)sndTog.classList.toggle('on',sndOn);
      if(m.theme)applyTheme(m.theme);
      break;
    case 'setTheme': applyTheme(m.theme); break;
  }
});

// ask host for stats on load
if(api)api.postMessage({type:'requestStats'});
renderXp();

// ── Feature 7: Onboarding (first-time welcome) ──────────────────────────
var ob=$('onboarding');
if(ob && !localStorage.getItem('cn-onboarded')){
  ob.classList.add('on');
  var obBtn=$('ob-go');
  if(obBtn)obBtn.addEventListener('click',function(){
    ob.classList.remove('on');
    localStorage.setItem('cn-onboarded','1');
  });
}

// ── Feature 9: Export last session narrative ──────────────────────────────
var expBtn=$('btn-export');
if(expBtn)expBtn.addEventListener('click',function(){
  var txt=thTxt?thTxt.textContent:'';
  if(!txt||!txt.trim()){return;}
  if(api)api.postMessage({type:'exportSession',text:txt});
});
})();
`;

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta http-equiv="Content-Security-Policy" content="${csp}">
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>Code Narrative Office</title>
<link rel="stylesheet" href="${css}">
<style>${styles}</style>
</head>
<body>
<div id="root"></div>

<div id="cn-overlay">
  <div id="glow-border"></div>
  <div id="particles"></div>

  <!-- Phase 4: XP HUD -->
  <div id="xp-hud">
    <div class="xp-head"><div class="xp-logo">CN</div><span class="xp-brand">Narrative Office</span></div>
    <div id="xp-lvl">Lvl 1</div>
    <div class="xp-sub">Experience</div>
    <div class="xp-track"><div id="xp-fill" style="width:0%"></div></div>
    <div class="xp-row"><span id="xp-sessions">0 sessions</span><span id="xp-streak"></span></div>
    <div id="activity-bar"><div class="act-dot"></div><span id="act-lbl">Working...</span></div>
  </div>

  <!-- HUD Buttons -->
  <div id="hud-btns">
    <button class="hbtn" id="btn-demo">&#9654; Demo</button>
    <button class="hbtn" id="btn-export">&#128190; Export</button>
    <button class="hbtn" id="btn-timeline">Timeline</button>
    <button class="hbtn" id="btn-sp">&#9881; Theme</button>
  </div>

  <!-- Phase 5: Settings panel -->
  <div id="sp">
    <div class="sp-hd">Theme</div>
    <div class="sp-themes">
      <button class="spt on" data-theme="night">Night</button>
      <button class="spt" data-theme="sunrise">Sunrise</button>
      <button class="spt" data-theme="neon">Neon</button>
      <button class="spt" data-theme="forest">Forest</button>
    </div>
    <div class="sp-hd">Character</div>
    <div class="sp-skins">
      <button class="sp-skin on" data-skin="0" title="Default">&#128100;</button>
      <button class="sp-skin" data-skin="1" title="Hacker (Lvl 3)">&#128187;</button>
      <button class="sp-skin" data-skin="2" title="Wizard (Lvl 5)">&#129497;</button>
      <button class="sp-skin" data-skin="3" title="Robot (Lvl 7)">&#129302;</button>
    </div>
    <div class="sp-hd">Sound</div>
    <div class="sp-row">
      <span>Notifications</span>
      <button class="tog on" id="snd-tog"></button>
    </div>
  </div>

  <!-- Phase 3: Theatre overlay -->
  <div id="theatre">
    <div id="th-dim"></div>
    <div id="th-spot"></div>
    <div id="th-ticker">
      <div id="th-lbl">Generating narrative...</div>
      <div id="th-txt"></div>
    </div>
  </div>

  <!-- Phase 1: Speech bubbles -->
  <div id="bubbles"></div>

  <!-- Phase 4: Achievement toast -->
  <div id="ach">
    <div id="ach-ic">&#127942;</div>
    <div><div class="ach-ttl">Achievement Unlocked!</div><div id="ach-txt"></div></div>
  </div>

  <!-- Phase 3: Timeline strip -->
  <div id="timeline">
    <span id="tl-hd">History</span>
    <div id="tl-track"></div>
  </div>
  <!-- Feature 7: Onboarding overlay -->
  <div id="onboarding">
    <div class="ob-card">
      <div class="ob-logo">CN</div>
      <h2 class="ob-title">Welcome to Narrative Office!</h2>
      <div class="ob-steps">
        <div class="ob-step"><span class="ob-num">1</span><span>Your AI agents work here. Run <b>/explain</b> or <b>/review</b> in the chat panel.</span></div>
        <div class="ob-step"><span class="ob-num">2</span><span>Watch the characters come alive with speech bubbles and theatre mode.</span></div>
        <div class="ob-step"><span class="ob-num">3</span><span>Earn XP, unlock achievements, and change themes!</span></div>
      </div>
      <button class="ob-btn" id="ob-go">Get Started</button>
    </div>
  </div>

</div>

<!-- CRITICAL: Acquire API FIRST before Vite bundle, so both share the same instance -->
<script nonce="${nonce}">(function(){var o=window.acquireVsCodeApi;var c=null;window.acquireVsCodeApi=function(){if(!c){c=o();}return c;};window.__cnApi=window.acquireVsCodeApi();})();</script>
<script nonce="${nonce}" src="${js}"></script>
<script nonce="${nonce}">${overlayJs}</script>
</body>
</html>`;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function agentStatus(state: SessionVisualState['state']): string {
  switch (state) {
    case 'THINKING': case 'TYPING': return 'active';
    case 'WAITING_FOR_USER': return 'waiting';
    case 'IDLE':    return 'idle';
    case 'ERROR':   return 'error';
    case 'COMPLETE': return 'done';
    default: return 'active';
  }
}

function getNonce() {
  let t = '';
  const c = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) { t += c.charAt(Math.floor(Math.random() * c.length)); }
  return t;
}
