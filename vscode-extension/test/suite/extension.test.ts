import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Extension basic activation', () => {
  test('Extension activates and registers commands', async () => {
    const ext = vscode.extensions.getExtension('your-publisher-id.code-narrative-ai');
    assert.ok(ext, 'Extension should be found');

    if (!ext!.isActive) {
      await ext!.activate();
    }

    const explain = await vscode.commands.getCommands(true);
    assert.ok(
      explain.includes('codeNarrative.explainSelection'),
      'Explain selection command should be registered'
    );
    assert.ok(
      explain.includes('codeNarrative.office.open'),
      'Office open command should be registered'
    );

    const views = vscode.workspace.getConfiguration('view');
    assert.ok(views, 'Views configuration should be accessible');
  });
});

