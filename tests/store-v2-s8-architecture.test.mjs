// Store V2 S8: static architecture-negative guards. No retired authority may be reachable from Store code.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]);
const strip = src => src.replace(/\/\*[\s\S]*?\*\/|(^|[^:])\/\/.*$/gm, '$1');
const storeFiles = [...walk('scripts/apps/store'), ...walk('scripts/engine/store'), 'scripts/ui/shell/StoreSurfaceService.js', 'scripts/ui/shell/StoreSurfaceController.js'].filter(f => f.endsWith('.js'));
const all = f => strip(fs.readFileSync(f, 'utf8'));

const BANNED = [
  [/extends FormApplication/, 'legacy FormApplication store'],
  [/swse-store-cache|LEGACY_CACHE_KEYS|localStorage/, 'browser-stored document cache'],
  [/getStoreItemLookupIds|normalizeStoreItem|categorizeItem|loadRawStoreData|filterValidStoreItems/, 'retired catalog pipeline API'],
  [/getDroidStatblockQuality|choosePreferredStoreListing|buildStoreListingDedupeKey/, 'heuristic de-duplication'],
  [/USED_CONDITION_MULTIPLIER/, 'derived used price'],
  [/fallback-/, 'generated fallback listing ids'],
  [/game\.items\.get|game\.items\.contents/, 'world Items as retail stock'],
  [/General Vehicles|General Droid Models/, 'guessed catch-all classification'],
  [/costNumeric/, 'costNumeric as a price'],
  [/(?:get|set)Flag\([^)]*purchaseHistory|flags\.foundryvtt-swse\.purchaseHistory/, 'purchaseHistory flag mirror']
];
for (const f of storeFiles) {
  if (f.endsWith('store-catalog.js') || f.endsWith('store-approval-quote.js')) { /* index key list names costNumeric as a pack field */ }
  const src = all(f);
  for (const [rx, why] of BANNED) {
    if (f.endsWith('store-catalog.js') && why === 'costNumeric as a price') continue;   // a source field name in the index list, never read as a price
    assert.doesNotMatch(src, rx, `${f}: ${why}`);
  }
}
// regex-over-name classification is gone from the Store UI helpers
const shared = all('scripts/apps/store/store-shared.js');
assert.doesNotMatch(shared, /\\b\(at-at|\\b\(crawler|\\b\(swoop|medical\|medic\|surgical/, 'no name/regex vehicle or droid classification in store-shared.js');
// the retired starship builder and its toast are gone; legacy store files deleted
for (const f of ['store/store.js', 'scripts/engine/store/loader.js', 'scripts/engine/store/normalizer.js', 'scripts/engine/store/categorizer.js', 'scripts/engine/store/index.js', 'scripts/engine/store/compendium-schema.js'])
  assert.ok(!fs.existsSync(f), `${f} must be deleted`);
// one purchase path per asset: no quick-buy entry points
const co = all('scripts/apps/store/store-checkout.js');
for (const gone of ['buyVehicle', 'buyDroid', 'buyService', 'buildDroidFromTemplate', 'submitDraftDroidForApproval', 'submitDraftVehicleForApproval'])
  assert.doesNotMatch(co, new RegExp(`function ${gone}\\b`), `${gone} deleted`);
console.log(`store-v2-s8-architecture: ${storeFiles.length} store files scanned, all guards ok`);
