import assert from 'node:assert/strict';
import { resolveInstalledDroidComponents } from '../scripts/domain/droids/droid-installed-component-resolver.js';

// Phase 1 — Droid Authority Consolidation. Before this resolver existed,
// system.installedSystems, system.droidSystems, embedded Items, and legacy
// system.droidSystems.mods were each read independently by different
// consumers (the sheet, ModifierEngine, the Garage), with no shared
// identity or precedence. These tests exercise the resolver directly with
// injected fakes for normalizeId/getDefinition so they can run under plain
// Node (the real canonical schema pulls in Foundry-only absolute-path
// imports and cannot be loaded outside a running Foundry instance).

const ALIASES = { heuristic: 'heuristic-processor', basic: 'basic-processor' };

function fakeNormalizeId(value) {
  const key = String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return ALIASES[key] ?? key;
}

const DEFINITIONS = {
  'heuristic-processor': { category: 'processor', slot: 'processor.primary', name: 'Heuristic Processor' },
  'basic-processor': { category: 'processor', slot: 'processor.primary', name: 'Basic Processor' },
  'magnetic-feet': { category: 'locomotionEnhancement', slot: 'locomotion.enhancement', name: 'Magnetic Feet' }
};

function fakeGetDefinition(id) {
  return DEFINITIONS[id] ?? null;
}

function resolve(actor) {
  return resolveInstalledDroidComponents(actor, { normalizeId: fakeNormalizeId, getDefinition: fakeGetDefinition });
}

function findComponent(result, canonicalId) {
  return result.components.find(c => c.canonicalId === canonicalId);
}

// 1. Same canonical component present in installedSystems and droidSystems resolves once.
{
  const actor = {
    system: {
      installedSystems: { 'heuristic-processor': { id: 'heuristic-processor', category: 'processor' } },
      droidSystems: { processor: { id: 'heuristic-processor' } }
    },
    items: []
  };
  const result = resolve(actor);
  const matches = result.components.filter(c => c.canonicalId === 'heuristic-processor');
  assert.equal(matches.length, 1, 'expected exactly one component for the shared canonical id');
  assert.equal(matches[0].sources.length, 2, 'expected both sources recorded for diagnostics');
}

// 2. Same canonical component present in installedSystems and as embedded Item resolves once.
{
  const actor = {
    system: { installedSystems: { 'heuristic-processor': true } },
    items: [{ id: 'itemDocId1', name: 'Heuristic Processor', system: { droidPartId: 'heuristic-processor', integrated: true } }]
  };
  const result = resolve(actor);
  const matches = result.components.filter(c => c.canonicalId === 'heuristic-processor');
  assert.equal(matches.length, 1);
  assert.equal(matches[0].sources.length, 2);
}

// 3. Same component present in all three representations resolves once.
{
  const actor = {
    system: {
      installedSystems: { 'heuristic-processor': { id: 'heuristic-processor' } },
      droidSystems: {
        processor: { id: 'heuristic-processor' },
        mods: [{ id: 'heuristic-processor', name: 'Heuristic Processor', enabled: true, modifiers: [] }]
      }
    },
    items: [{ id: 'itemDocId2', name: 'Heuristic Processor', system: { droidPartId: 'heuristic-processor', integrated: true } }]
  };
  const result = resolve(actor);
  const matches = result.components.filter(c => c.canonicalId === 'heuristic-processor');
  assert.equal(matches.length, 1, 'all four representations must collapse into one component');
  assert.equal(matches[0].sources.length, 4);
}

// 4. Aliased IDs normalize to one canonical ID.
{
  const actor = {
    system: {
      installedSystems: { heuristic: { id: 'heuristic' } },
      droidSystems: { processor: { id: 'heuristic-processor' } }
    },
    items: []
  };
  const result = resolve(actor);
  assert.equal(result.components.length, 1);
  assert.equal(result.components[0].canonicalId, 'heuristic-processor');
}

// 5. Local embedded Item IDs do not affect logical identity.
{
  const actorA = {
    system: { installedSystems: { 'heuristic-processor': { id: 'heuristic-processor' } } },
    items: [{ id: 'zzz-random-doc-id-1', name: 'Heuristic Processor', system: { droidPartId: 'heuristic-processor', integrated: true } }]
  };
  const actorB = {
    system: { installedSystems: { 'heuristic-processor': { id: 'heuristic-processor' } } },
    items: [{ id: 'completely-different-doc-id-2', name: 'Heuristic Processor', system: { droidPartId: 'heuristic-processor', integrated: true } }]
  };
  const resultA = resolve(actorA);
  const resultB = resolve(actorB);
  assert.equal(resultA.components.length, 1);
  assert.equal(resultB.components.length, 1);
  assert.equal(resultA.components[0].canonicalId, resultB.components[0].canonicalId, 'identity must not depend on the embedded Item document id');
}

// 6. installedSystems[id] = false is not active.
{
  const actor = { system: { installedSystems: { 'basic-processor': false } }, items: [] };
  const result = resolve(actor);
  const component = findComponent(result, 'basic-processor');
  assert.ok(component, 'a false ledger entry is still a known component (installed=false), not silently dropped');
  assert.equal(component.active, false);
  assert.equal(component.installed, false);
}

// 7. { installed: false } is not active.
{
  const actor = { system: { installedSystems: { 'basic-processor': { id: 'basic-processor', installed: false } } }, items: [] };
  const result = resolve(actor);
  const component = findComponent(result, 'basic-processor');
  assert.equal(component.active, false);
}

// 8. { enabled: false } is not active.
{
  const actor = { system: { installedSystems: { 'basic-processor': { id: 'basic-processor', enabled: false } } }, items: [] };
  const result = resolve(actor);
  const component = findComponent(result, 'basic-processor');
  assert.equal(component.active, false);
  assert.equal(component.installed, true, 'installed !== enabled — the part is physically present, just switched off');
}

// 9, 10, 11: primary processor active, distinct backup processor inactive,
// and both remain individually visible.
{
  const actor = {
    system: {
      droidSystems: {
        processor: { id: 'heuristic-processor' },
        backupProcessor: { id: 'basic-processor', active: false }
      }
    },
    items: []
  };
  const result = resolve(actor);
  const primary = findComponent(result, 'heuristic-processor');
  const backup = findComponent(result, 'basic-processor');
  assert.ok(primary && backup, 'both processors must be distinguishable components');
  assert.equal(primary.active, true, 'the active primary processor grants modifiers');
  assert.equal(backup.active, false, 'the inactive backup processor is displayed but inactive');
  assert.equal(result.components.filter(c => c.canonicalId === 'heuristic-processor').length, 1, 'the active primary processor is not duplicated');
}

// 9b/11b: the single-active-processor safety net demotes a second
// simultaneously-"active" primary processor even if a malformed/ambiguous
// source claims it is active (defensive correction, not the common path).
{
  const actor = {
    system: {
      droidSystems: {
        processor: { id: 'heuristic-processor' }
      },
      installedSystems: {
        // Written directly (e.g. by a path that bypasses the Garage's
        // active:false convention), claiming a second primary processor
        // is simultaneously active.
        'basic-processor': { id: 'basic-processor', category: 'processor', active: true }
      }
    },
    items: []
  };
  const result = resolve(actor);
  const active = result.components.filter(c => c.category === 'processor' && c.active);
  assert.equal(active.length, 1, 'only one primary processor may remain active after the safety net runs');
  assert.ok(result.conflicts.some(c => /only one processor/i.test(c.message)));
}

// 12. A malformed unknown installed-system key fails safely.
{
  const actor = { system: { installedSystems: { '   ': { id: '   ' } } } };
  const result = resolve(actor);
  assert.equal(result.components.length, 0);
  assert.ok(result.warnings.length >= 1, 'a warning must be recorded instead of throwing or silently creating a blank component');
}

// 13. A generic Item with a coincidentally similar name is not
// automatically treated as installed hardware without supported metadata.
{
  const actor = {
    system: {},
    items: [{ id: 'genericItem1', name: 'Heuristic Processor', type: 'weapon', system: {} }]
  };
  const result = resolve(actor);
  assert.equal(result.components.length, 0, 'a name match alone must not create a component');
}

// 14. Legacy droidSystems.mods continues to work where not duplicated.
{
  const actor = {
    system: {
      droidSystems: {
        mods: [{ id: 'custom-vendor-mod', name: 'Vendor Custom Mod', enabled: true, modifiers: [{ target: 'skill.perception', type: 'equipment', value: 2 }] }]
      }
    },
    items: []
  };
  const result = resolve(actor);
  assert.equal(result.components.length, 0, 'a mod with no canonical catalog identity does not become a component');
  assert.equal(result.legacyModifications.length, 1);
  assert.equal(result.legacyModifications[0].modifiers.length, 1);
}

// 15. A catalog-backed legacy mod does not double-apply with the canonical component.
{
  const actor = {
    system: {
      droidSystems: {
        processor: { id: 'heuristic-processor' },
        mods: [{ id: 'heuristic-processor', name: 'Heuristic Processor', enabled: true, modifiers: [] }]
      }
    },
    items: []
  };
  const result = resolve(actor);
  assert.equal(result.legacyModifications.length, 0, 'a mod resolving to a known part must not also appear as a freeform legacy modification');
  const matches = result.components.filter(c => c.canonicalId === 'heuristic-processor');
  assert.equal(matches.length, 1);
  assert.ok(matches[0].sources.some(s => s.kind === 'legacyMod'));
}

// 19. Processor droidSystems record and processor embedded Item merge into
// one logical component (restated explicitly for the processor case).
{
  const actor = {
    system: { droidSystems: { processor: { id: 'heuristic-processor' } } },
    items: [{ id: 'procItem1', name: 'Heuristic Processor', system: { droidPartId: 'heuristic-processor', integrated: true } }]
  };
  const result = resolve(actor);
  assert.equal(result.components.length, 1);
  assert.equal(result.components[0].sources.length, 2);
}

// 20. Modifier source identity remains stable across repeated resolution
// (no timestamps, random ids, or hidden state).
{
  const actor = {
    system: {
      installedSystems: { 'heuristic-processor': { id: 'heuristic-processor' } },
      droidSystems: { locomotion: { id: 'walking' } }
    },
    items: [{ id: 'itemX', name: 'Magnetic Feet', system: { droidPartId: 'magnetic-feet', integrated: true } }]
  };
  const first = resolve(actor);
  const second = resolve(actor);
  assert.deepEqual(first, second);
}

// 21. Reordering embedded Items does not change resolution.
{
  const itemA = { id: 'itemA', name: 'Heuristic Processor', system: { droidPartId: 'heuristic-processor', integrated: true } };
  const itemB = { id: 'itemB', name: 'Magnetic Feet', system: { droidPartId: 'magnetic-feet', integrated: true } };
  const forward = resolve({ system: {}, items: [itemA, itemB] });
  const reversed = resolve({ system: {}, items: [itemB, itemA] });
  const sortByCanonicalId = (result) => [...result.components].sort((a, b) => a.canonicalId.localeCompare(b.canonicalId));
  assert.deepEqual(sortByCanonicalId(forward), sortByCanonicalId(reversed));
}

// 22. Resolver performs no Actor or Item mutation.
{
  const actor = {
    system: {
      installedSystems: { 'heuristic-processor': { id: 'heuristic-processor' } },
      droidSystems: { processor: { id: 'heuristic-processor' }, mods: [{ id: 'custom', name: 'Custom', enabled: true, modifiers: [] }] }
    },
    items: [{ id: 'itemY', name: 'Magnetic Feet', system: { droidPartId: 'magnetic-feet', integrated: true } }]
  };
  const before = JSON.parse(JSON.stringify(actor));
  resolve(actor);
  assert.deepEqual(actor, before, 'resolveInstalledDroidComponents must not mutate the actor it reads');
}

console.log('Droid installed-component resolver dedup/precedence/state guards passed.');
