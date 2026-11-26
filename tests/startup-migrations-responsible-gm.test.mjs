import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { isResponsibleGM } from '../scripts/utils/responsible-gm.js';
// F-MIG-002: the ready-time world load + migrations run on the responsible GM only.
test('ready block gates world load and migrations on isResponsibleGM, not any GM', () => {
  const src = fs.readFileSync('index.js', 'utf8');
  const i = src.indexOf('await WorldDataLoader.autoLoad();');
  const before = src.slice(Math.max(0, i - 400), i);
  assert.match(before, /if \(isResponsibleGM\(\)\) \{\s*$/);
  assert.ok(!/if \(game\.user\.isGM\) \{\s*await WorldDataLoader/.test(src));
  assert.match(src, /import \{ isResponsibleGM \} from "\.\/scripts\/utils\/responsible-gm\.js"/);
});
test('with two GMs connected only the active GM is responsible', () => {
  globalThis.game = { user: { id: 'a', isGM: true }, users: { activeGM: { id: 'a' } } };
  assert.equal(isResponsibleGM(), true);
  globalThis.game = { user: { id: 'b', isGM: true }, users: { activeGM: { id: 'a' } } };
  assert.equal(isResponsibleGM(), false);
  globalThis.game = { user: { id: 'p', isGM: false }, users: { activeGM: { id: 'a' } } };
  assert.equal(isResponsibleGM(), false);
  delete globalThis.game;
});
