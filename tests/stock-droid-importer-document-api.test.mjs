import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// P2-2 — stock-droid importer used a raw Actor.create() call instead of the
// established scripts/core/document-api-v13.js wrapper every other actor-
// creation call site in this branch (minion-creator.js, follower-creator.js)
// already routes through, for consistent error handling/logging and a
// single point of control over actor-creation semantics.
//
// Coverage tier: (c) structural/source-inspection only. The module loads
// through the Foundry-shim harness, but exercising importDroidTemplate()
// end-to-end would require faking DroidTemplateDataLoader's real compendium
// read (a static import, not an injectable seam) and Actor.createDocuments —
// out of scope for this narrow fix; the change itself (swap one call site
// for an already-proven wrapper) is verified by source inspection instead.

const source = await readFile(new URL('../scripts/engine/import/stock-droid-importer-engine.js', import.meta.url), 'utf8');

assert.doesNotMatch(source, /await Actor\.create\(/, 'stock-droid-importer-engine.js must not call Actor.create() directly');
assert.match(source, /import \{ createActor \} from "\/systems\/foundryvtt-swse\/scripts\/core\/document-api-v13\.js";/);
assert.match(source, /const actor = await createActor\(newActorData\);/);
assert.match(source, /if \(!actor\) \{/, 'a null return from createActor() must be handled explicitly, not dereferenced');

console.log('Stock-droid importer document-api-v13 wrapper structural guard passed.');
