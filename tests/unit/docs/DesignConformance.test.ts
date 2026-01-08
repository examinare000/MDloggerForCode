import { describe, it } from 'mocha';
import { expect } from 'chai';
import * as fs from 'fs';
import * as path from 'path';

// This suite asserts that the public surface (commands, activation events,
// keybindings, configuration) conforms to the documented design.
// It acts as a living spec: if new public features are added, either update
// the design docs and these expectations, or the test will fail.

describe('Design Conformance (Public Surface)', () => {
  const pkgPath = path.resolve(process.cwd(), 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

  it('commands match the documented set', () => {
    const expected = [
      'mdlg.handleEnterKey',
      'mdlg.insertDate',
      'mdlg.insertTime',
      'mdlg.openDailyNote',
      'mdlg.openOrCreateWikiLink',
      'mdlg.openQuickCapture',
      'mdlg.preview',
    ].sort();

    const actual: string[] = (pkg.contributes?.commands || []).map((c: any) => c.command).sort();
    expect(actual).to.deep.equal(expected);
  });

  it('activationEvents match the documented set', () => {
    const expected = [
      'onLanguage:markdown',
      'onCommand:mdlg.openOrCreateWikiLink',
      'onCommand:mdlg.insertDate',
      'onCommand:mdlg.insertTime',
      'onCommand:mdlg.openQuickCapture',
      'onCommand:mdlg.preview',
      'onCommand:mdlg.openDailyNote',
      'onCommand:mdlg.handleEnterKey',
    ].sort();
    const actual: string[] = (pkg.activationEvents || []).slice().sort();
    expect(actual).to.deep.equal(expected);
  });

  it('keybindings only reference documented commands and have valid "when" clauses', () => {
    const allowed = new Set([
      'mdlg.openOrCreateWikiLink',
      'mdlg.insertDate',
      'mdlg.insertTime',
      'mdlg.handleEnterKey',
    ]);
    const bindings: any[] = pkg.contributes?.keybindings || [];
    // all commands are allowed
    for (const kb of bindings) {
      expect(allowed.has(kb.command), `Unexpected keybinding command: ${kb.command}`).to.be.true;
      expect(typeof kb.key).to.equal('string');
      if (kb.when) expect(typeof kb.when).to.equal('string');
    }
    // specific critical context checks per design
    const enterBinding = bindings.find(b => b.command === 'mdlg.handleEnterKey');
    expect(enterBinding?.when).to.equal("editorTextFocus && editorLangId == 'markdown'");

    const openBinding = bindings.find(b => b.command === 'mdlg.openOrCreateWikiLink');
    expect(openBinding?.when).to.equal("editorTextFocus && editorLangId == 'markdown'");
  });

  it('configuration keys match documented set and provide defaults', () => {
    const props = pkg.contributes?.configuration?.properties || {};
    const keys = Object.keys(props).sort();
    const expectedKeys = [
      'mdlg.vaultRoot',
      'mdlg.noteExtension',
      'mdlg.slugStrategy',
      'mdlg.dateFormat',
      'mdlg.timeFormat',
      'mdlg.template',
      'mdlg.dailyNoteTemplate',
      'mdlg.dailyNotePath',
      'mdlg.dailyNoteEnabled',
      'mdlg.notesFolder',
      'mdlg.dailyNoteFormat',
      'mdlg.captureSectionName',
      'mdlg.listContinuationEnabled',
      'mdlg.searchSubdirectories',
      'mdlg.dailyNoteKeybindingGuide',
    ].sort();
    expect(keys).to.deep.equal(expectedKeys);

    // Spot-check important defaults to align with docs
    expect(props['mdlg.noteExtension'].default).to.equal('.md');
    expect(props['mdlg.dateFormat'].default).to.be.a('string');
    expect(props['mdlg.timeFormat'].default).to.be.a('string');
    expect(props['mdlg.dailyNoteEnabled'].default).to.equal(true);
    expect(props['mdlg.dailyNotePath'].default).to.equal('dailynotes');
    expect(props['mdlg.notesFolder'].default).to.equal('dailynotes');
    expect(props['mdlg.dailyNoteFormat'].default).to.equal('YYYY-MM-DD.md');
    expect(props['mdlg.captureSectionName'].default).to.be.a('string');
  });

  it('views match the documented set', () => {
    // Quick Capture view is contributed to the Explorer view container
    const views = pkg.contributes?.views;
    expect(views).to.exist;
    expect(views?.explorer).to.be.an('array').with.lengthOf(1);
    expect(views.explorer[0].id).to.equal('mdlg.quickCapture');
    expect(views.explorer[0].name).to.equal('Quick Capture');
    expect(views.explorer[0].type).to.equal('webview');
  });
});
