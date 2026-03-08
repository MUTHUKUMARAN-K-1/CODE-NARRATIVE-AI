import * as vscode from 'vscode';
import type { OfficeLayout } from './messages';

const DEFAULT_WIDTH = 16;
const DEFAULT_HEIGHT = 16;

const LAYOUT_KEY = 'codeNarrative.office.layout';

export class LayoutStore {
  constructor(private readonly context: vscode.ExtensionContext) {}

  async loadLayout(): Promise<OfficeLayout> {
    const saved = this.context.workspaceState.get<OfficeLayout>(LAYOUT_KEY);
    if (saved && this.isValidLayout(saved)) {
      return saved;
    }

    return this.createDefaultLayout();
  }

  async saveLayout(layout: OfficeLayout): Promise<void> {
    if (!this.isValidLayout(layout)) {
      return;
    }
    await this.context.workspaceState.update(LAYOUT_KEY, layout);
  }

  private createDefaultLayout(): OfficeLayout {
    return {
      width: DEFAULT_WIDTH,
      height: DEFAULT_HEIGHT,
      tiles: [],
    };
  }

  private isValidLayout(layout: OfficeLayout): boolean {
    if (
      typeof layout.width !== 'number' ||
      typeof layout.height !== 'number' ||
      !Array.isArray(layout.tiles)
    ) {
      return false;
    }
    if (layout.width <= 0 || layout.height <= 0) {
      return false;
    }
    return true;
  }
}

