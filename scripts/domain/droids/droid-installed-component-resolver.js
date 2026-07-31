/**
 * Droid Installed Component Resolver
 *
 * PHASE 1 — Droid Authority Consolidation
 *
 * Pure, dependency-free read model for "what is mechanically installed on
 * this droid right now". Before this module existed, three independent
 * consumers (the Droid Systems sheet tab, ModifierEngine, and the
 * prerequisite checker) each walked system.installedSystems,
 * system.droidSystems, and actor Items on their own, with their own
 * deduplication and their own (in)ability to notice a disabled/removed
 * entry. That let one physical component be read as two or three separate
 * logical components — the root cause of duplicate sheet rows and
 * duplicate/undying modifiers documented in
 * docs/audits/droid-static-audit.md.
 *
 * This module does not replace any of those consumers' rendering logic. It
 * only answers one question, once, the same way every time: for a given
 * droid actor, what are the distinct logical components, keyed by a stable
 * canonical part identity, and what is each one's effective installed /
 * enabled / active state given every source that mentions it.
 *
 * Contract:
 * - No actor mutation. No item mutation. No I/O.
 * - No import of any droid-part catalog. Callers inject `getDefinition` and
 *   `normalizeId` (see scripts/data/droid-part-schema.js's
 *   getDroidPartDefinition/normalizeDroidPartId for the canonical
 *   production wiring). This keeps the module free of Foundry-only
 *   absolute-path imports so it can be unit-tested under plain Node, and
 *   keeps this file from becoming a fourth place that knows what a droid
 *   part is.
 * - Deduplication key is always the canonical part id, never a document id,
 *   array index, or display name.
 * - A source that disagrees with the effective (precedence-selected) state
 *   is never discarded — it is recorded in `sources` and, if it disagrees
 *   on active state, surfaced in `conflicts`.
 *
 * SSOT POLICY (P1-9 — explicit, single statement; nothing outside this
 * module decides component identity/precedence):
 *   - system.installedSystems is the CANONICAL post-creation installed-
 *     component ledger. It is the only source a mutation authority
 *     (DroidCustomizationEngine, UpgradeService, the drift-repair/
 *     reconciliation services) writes to when installing or removing a
 *     component, and it is this resolver's highest-precedence source.
 *   - system.droidSystems is NOT a competing "canonical" store. It is the
 *     raw stock-import/chassis-build blob — the stock importer's own
 *     display snapshot (see scripts/domain/droids/stock-droid-normalizer.js)
 *     and, during in-progress chargen/follower-droid-building sessions, the
 *     WORKFLOW DRAFT state (an entirely different layer that only exists
 *     until finalization writes its result into installedSystems/embedded
 *     Items — never itself read back as installed-component authority by
 *     this resolver or by any governed mutation path). Any file whose own
 *     doc comment or code lists `droidSystems` as a "priority 1" READ
 *     source (e.g. scripts/sheets/v2/droid-sheet/droid-systems-resolver.js,
 *     for display-only regions like size/degree/locomotion that genuinely
 *     have no installedSystems equivalent) is describing a DISPLAY
 *     fallback, not asserting installed-component authority — component
 *     identity/dedup/precedence for those same files already delegates to
 *     resolveInstalledDroidComponents() below, per SOURCE_KIND's own
 *     DROID_SYSTEMS_RECORD entry sitting below INSTALLED_LEDGER and
 *     EMBEDDED_ITEM.
 *   - Embedded Items (weapons/equipment flagged integrated) and the legacy
 *     `mods` array are read-only compatibility sources, lower precedence
 *     still, exactly as SOURCE_KIND's declaration order states.
 */

const SOURCE_KIND = Object.freeze({
  INSTALLED_LEDGER: 'installedLedger',
  EMBEDDED_ITEM: 'embeddedItem',
  DROID_SYSTEMS_RECORD: 'droidSystemsRecord',
  LEGACY_MOD: 'legacyMod'
});

// Read precedence, highest authority first. A component's effective
// installed/enabled/active state is taken from the highest-precedence
// source that mentions it; every other source is preserved for diagnostics.
const SOURCE_PRECEDENCE = Object.freeze([
  SOURCE_KIND.INSTALLED_LEDGER,
  SOURCE_KIND.EMBEDDED_ITEM,
  SOURCE_KIND.DROID_SYSTEMS_RECORD,
  SOURCE_KIND.LEGACY_MOD
]);

const DROID_SYSTEMS_SINGLE_FIELDS = Object.freeze([
  { field: 'processor', backupLike: false },
  { field: 'locomotion', backupLike: false },
  { field: 'armor', backupLike: false }
]);

const DROID_SYSTEMS_ARRAY_FIELDS = Object.freeze([
  'appendages',
  'sensors',
  'weapons',
  'accessories',
  'integratedSystems',
  'processorEnhancements',
  'locomotionSystems',
  'secondaryLocomotion'
]);

const DROID_PART_ITEM_TYPES = new Set(['integratedSystem', 'droid-system', 'heuristicProcessor']);

function defaultSlug(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function asArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value.contents !== 'undefined') return value.contents ?? [];
  if (typeof value.values === 'function') return Array.from(value.values());
  return Array.from(value);
}

function hasOwnId(entry) {
  return Boolean(entry && typeof entry === 'object' && (entry.id || entry.name));
}

function itemHasCredibleDroidPartMetadata(item) {
  return Boolean(
    item?.system?.droidPartId ||
    item?.flags?.swse?.droidPartId ||
    item?.system?.droidPart?.id ||
    item?.system?.integrated === true ||
    item?.flags?.swse?.integrated === true ||
    DROID_PART_ITEM_TYPES.has(item?.type)
  );
}

function itemDroidPartRawId(item) {
  return item?.system?.droidPartId ?? item?.flags?.swse?.droidPartId ?? item?.system?.droidPart?.id ?? item?.name;
}

function itemIsEnabled(item) {
  return item?.system?.droidPart?.enabled !== false && item?.system?.disabled !== true;
}

/**
 * Collect raw candidate records from every currently-supported installation
 * representation. Each candidate is tagged with its source kind and its own
 * (not-yet-merged) installed/enabled/active reading. Nothing here decides
 * the effective state of a canonical component — that happens once the
 * candidates are grouped.
 */
function collectCandidates(actor, { normalizeId, getDefinition, warnings }) {
  const candidates = [];
  const legacyModifications = [];

  // 1. system.installedSystems — explicit installation ledger. Values may be
  //    a boolean (legacy Upgrade Workshop writer) or an object (Garage
  //    writer). Either shape can mark the entry inactive; both must be
  //    respected, not just the object shape.
  const installedSystems = actor?.system?.installedSystems;
  if (installedSystems && typeof installedSystems === 'object') {
    for (const [key, value] of Object.entries(installedSystems)) {
      const canonicalId = normalizeId(key);
      if (!canonicalId) {
        warnings.push(`Skipped installedSystems entry with unresolvable key "${key}".`);
        continue;
      }
      if (value === false || value === null || value === undefined) {
        candidates.push({ kind: SOURCE_KIND.INSTALLED_LEDGER, rawId: key, canonicalId, key, installed: false, enabled: false, active: false, raw: value });
        continue;
      }
      if (value === true) {
        candidates.push({ kind: SOURCE_KIND.INSTALLED_LEDGER, rawId: key, canonicalId, key, installed: true, enabled: true, active: true, raw: value });
        continue;
      }
      if (typeof value === 'object') {
        const installed = value.installed !== false;
        const enabled = value.enabled !== false;
        const active = value.active !== false;
        candidates.push({
          kind: SOURCE_KIND.INSTALLED_LEDGER,
          rawId: value.id ?? key,
          canonicalId,
          key,
          installed,
          enabled,
          active: installed && enabled && active,
          category: value.category ?? null,
          slot: value.slot ?? null,
          // PHASE 4 — Converted-System Reconciliation: explicit provenance/
          // mechanicalState carried by the ledger entry itself (written by
          // DroidCustomizationEngine for post-import installs and by
          // DroidConvertedSystemReconciliationService for reconciled stock
          // components — see docs/audits/droid-converted-system-reconciliation-phase-4.md).
          // Only the installedLedger source carries this — it is the only
          // source precedence tier this phase treats as authoritative for it.
          provenance: (value.provenance && typeof value.provenance === 'object') ? value.provenance : null,
          mechanicalState: (value.mechanicalState && typeof value.mechanicalState === 'object') ? value.mechanicalState : null,
          raw: value
        });
        continue;
      }
      warnings.push(`Ignored installedSystems entry "${key}" with unrecognized value type "${typeof value}".`);
    }
  }

  // 2. Embedded actor Items carrying credible droid-part metadata. Items
  //    whose name merely resembles a catalog part are not eligible — a
  //    generic weapon named "Vibroblade" must never become "installed
  //    hardware" just because some catalog entry shares part of its name.
  for (const item of asArray(actor?.items)) {
    if (!itemHasCredibleDroidPartMetadata(item)) continue;
    const rawId = itemDroidPartRawId(item);
    const canonicalId = normalizeId(rawId);
    if (!canonicalId) {
      warnings.push(`Embedded item "${item?.name ?? item?.id}" has droid-part metadata but no resolvable id/name; skipped.`);
      continue;
    }
    const enabled = itemIsEnabled(item);
    candidates.push({
      kind: SOURCE_KIND.EMBEDDED_ITEM,
      rawId,
      canonicalId,
      itemId: item.id ?? item._id ?? null,
      installed: true,
      enabled,
      active: enabled,
      raw: item
    });
  }

  // 3. system.droidSystems structured records (Garage-authored builder
  //    state). Single-value slots (processor/locomotion/armor) plus the
  //    backup-processor mirror, then the array-shaped slots.
  const ds = actor?.system?.droidSystems ?? {};

  for (const { field } of DROID_SYSTEMS_SINGLE_FIELDS) {
    const entry = ds[field];
    if (!hasOwnId(entry)) continue;
    const canonicalId = normalizeId(entry.id ?? entry.name);
    if (!canonicalId) continue;
    const enabled = entry.enabled !== false;
    candidates.push({
      kind: SOURCE_KIND.DROID_SYSTEMS_RECORD,
      rawId: entry.id ?? entry.name,
      canonicalId,
      field,
      installed: true,
      enabled,
      active: enabled && entry.active !== false,
      category: entry.category ?? null,
      slot: entry.slot ?? null,
      raw: entry
    });
  }

  // Backup/reserve processor mirror. By construction (see
  // DroidCustomizationEngine#applyAdditionToDroidSystems) this slot holds an
  // installed-but-inactive reserve unit — only one processor is ever active
  // at a time. Honor an explicit active:true only as a data anomaly to be
  // caught by the single-active-processor safety net below, not as intent.
  const backupProcessor = ds.backupProcessor ?? ds.processorSlots?.backup;
  if (hasOwnId(backupProcessor)) {
    const canonicalId = normalizeId(backupProcessor.id ?? backupProcessor.name);
    if (canonicalId) {
      const enabled = backupProcessor.enabled !== false;
      candidates.push({
        kind: SOURCE_KIND.DROID_SYSTEMS_RECORD,
        rawId: backupProcessor.id ?? backupProcessor.name,
        canonicalId,
        field: 'backupProcessor',
        installed: true,
        enabled,
        active: false,
        category: backupProcessor.category ?? null,
        slot: backupProcessor.slot ?? null,
        raw: backupProcessor
      });
    }
  }

  for (const field of DROID_SYSTEMS_ARRAY_FIELDS) {
    for (const entry of asArray(ds[field])) {
      if (!hasOwnId(entry)) continue;
      const canonicalId = normalizeId(entry.id ?? entry.name);
      if (!canonicalId) continue;
      const enabled = entry.enabled !== false;
      candidates.push({
        kind: SOURCE_KIND.DROID_SYSTEMS_RECORD,
        rawId: entry.id ?? entry.name,
        canonicalId,
        field,
        installed: true,
        enabled,
        active: enabled && entry.active !== false,
        category: entry.category ?? null,
        slot: entry.slot ?? null,
        raw: entry
      });
    }
  }

  // 4. Legacy freeform droidSystems.mods. A mod that resolves to a known
  //    catalog part is folded in as a (lowest-precedence) source for that
  //    canonical component so it cannot double up against a Garage/Item
  //    representation of the same part. A mod with no catalog identity has
  //    nothing to dedupe against and is returned separately so its
  //    modifiers can still be applied.
  for (const mod of asArray(ds.mods)) {
    if (!mod || typeof mod !== 'object') continue;
    const rawId = mod.id ?? mod.name;
    const canonicalId = rawId ? normalizeId(rawId) : '';
    const enabled = mod.enabled !== false;
    // A mod only counts as "the same canonical part" when it actually
    // resolves against the canonical registry — every legacy mod id
    // normalizes to *some* non-empty slug, so checking canonicalId alone
    // (without confirming getDefinition recognizes it) would wrongly fold
    // every freeform mod into a phantom "component" with no definition.
    const resolvesToCanonical = Boolean(canonicalId) && typeof getDefinition === 'function' && Boolean(getDefinition(canonicalId));
    if (resolvesToCanonical) {
      candidates.push({
        kind: SOURCE_KIND.LEGACY_MOD,
        rawId,
        canonicalId,
        installed: true,
        enabled,
        active: enabled,
        raw: mod,
        resolvesToCanonical: true
      });
    } else {
      legacyModifications.push({
        id: mod.id ?? null,
        name: mod.name || `Legacy Modification ${mod.id ?? ''}`.trim(),
        enabled,
        modifiers: Array.isArray(mod.modifiers) ? mod.modifiers : [],
        raw: mod
      });
    }
  }

  return { candidates, legacyModifications };
}

/**
 * Enforce "only one processor is active at a time" as a defensive safety
 * net over whatever the individual sources claimed. This only demotes
 * components whose definition identifies them as a primary processor slot
 * (definition.slot === 'processor.primary'); enhancement/accessory
 * processor parts (Restraining Bolt, Specialized Subprocessor, etc.) are
 * untouched. Falls back to category/slot metadata carried on the component
 * itself when no definition was resolved, so this still behaves under
 * test doubles that don't supply a full definition.
 */
function enforceSingleActiveProcessor(components, conflicts) {
  const isPrimaryProcessorSlot = (component) => {
    const slot = component.definition?.slot ?? component.slot;
    if (slot) return slot === 'processor.primary';
    return component.category === 'processor';
  };

  const primaryProcessors = components
    .filter(c => c.active && isPrimaryProcessorSlot(c))
    .sort((a, b) => a.canonicalId.localeCompare(b.canonicalId));

  if (primaryProcessors.length <= 1) return;

  const [keep, ...rest] = primaryProcessors;
  for (const component of rest) {
    component.active = false;
    const conflict = {
      canonicalId: component.canonicalId,
      message: `${component.canonicalId}: demoted to inactive — only one processor (${keep.canonicalId}) may be mechanically active at a time.`,
      sources: [keep.canonicalId, component.canonicalId]
    };
    component.conflicts.push(conflict);
    conflicts.push(conflict);
  }
}

/**
 * Resolve every distinct logical droid component installed on `actor`,
 * deduplicated by canonical part identity across system.installedSystems,
 * system.droidSystems, embedded Items, and legacy system.droidSystems.mods.
 *
 * @param {object} actor - Actor-like object exposing `system` and `items`.
 * @param {object} [options]
 * @param {(value: unknown) => string} [options.normalizeId] - Canonical id
 *   normalizer. Production callers must pass
 *   normalizeDroidPartId from scripts/data/droid-part-schema.js so
 *   identities agree with the canonical registry's aliasing.
 * @param {(canonicalId: string) => object|null} [options.getDefinition] -
 *   Canonical part definition lookup (category/slot/etc). Production
 *   callers must pass a wrapper around getDroidPartDefinition from
 *   scripts/data/droid-part-schema.js.
 * @returns {{ components: object[], legacyModifications: object[], conflicts: object[], warnings: string[] }}
 */
export function resolveInstalledDroidComponents(actor, options = {}) {
  const normalizeId = typeof options.normalizeId === 'function' ? options.normalizeId : defaultSlug;
  const getDefinition = typeof options.getDefinition === 'function' ? options.getDefinition : () => null;
  const warnings = [];

  const { candidates, legacyModifications } = collectCandidates(actor, { normalizeId, getDefinition, warnings });

  const groups = new Map();
  for (const candidate of candidates) {
    if (!groups.has(candidate.canonicalId)) groups.set(candidate.canonicalId, []);
    groups.get(candidate.canonicalId).push(candidate);
  }

  const tierOf = (candidate) => SOURCE_PRECEDENCE.indexOf(candidate.kind);
  const conflicts = [];
  const components = [];

  for (const [canonicalId, group] of groups) {
    const sorted = [...group].sort((a, b) => tierOf(a) - tierOf(b));
    const primary = sorted[0];

    const componentConflicts = [];
    for (const other of sorted.slice(1)) {
      if (Boolean(other.active) !== Boolean(primary.active)) {
        const conflict = {
          canonicalId,
          message: `${canonicalId}: ${primary.kind} reports active=${Boolean(primary.active)} but ${other.kind} reports active=${Boolean(other.active)}.`,
          sources: [primary.kind, other.kind]
        };
        componentConflicts.push(conflict);
        conflicts.push(conflict);
      }
    }

    const definition = getDefinition(canonicalId) ?? null;
    const category = definition?.category ?? sorted.find(s => s.category)?.category ?? null;
    const slot = definition?.slot ?? sorted.find(s => s.slot)?.slot ?? null;
    const legacy = sorted.every(s => s.kind === SOURCE_KIND.LEGACY_MOD);
    // PHASE 4 — Converted-System Reconciliation: provenance/mechanicalState
    // only ever come from the installedLedger source (the only tier this
    // phase writes them to) — never invented for embedded-Item/droidSystems/
    // legacy-mod-only components, which predate this concept entirely.
    const ledgerSource = sorted.find(s => s.kind === SOURCE_KIND.INSTALLED_LEDGER);
    const provenance = ledgerSource?.provenance ?? null;
    const mechanicalState = ledgerSource?.mechanicalState ?? null;

    components.push({
      canonicalId,
      definition,
      installed: Boolean(primary.installed),
      enabled: Boolean(primary.enabled),
      active: Boolean(primary.installed && primary.enabled && primary.active),
      category,
      slot,
      provenance,
      mechanicalState,
      sources: sorted.map(s => ({
        kind: s.kind,
        rawId: s.rawId ?? null,
        itemId: s.itemId ?? null,
        key: s.key ?? null,
        field: s.field ?? null,
        installed: Boolean(s.installed),
        enabled: Boolean(s.enabled),
        active: Boolean(s.active)
      })),
      primarySource: { kind: primary.kind, rawId: primary.rawId ?? null },
      conflicts: componentConflicts,
      legacy
    });
  }

  enforceSingleActiveProcessor(components, conflicts);

  return { components, legacyModifications, conflicts, warnings };
}

export const DROID_COMPONENT_SOURCE_KIND = SOURCE_KIND;

// PHASE 4 — Converted-System Reconciliation: exported so
// droid-converted-system-reconciliation-service.js can enumerate every
// system.droidSystems source record using the exact same field list this
// resolver already reads, instead of maintaining a second, driftable copy
// of "which droidSystems fields hold installable records".
export const DROID_SYSTEMS_SOURCE_FIELDS = Object.freeze({
  single: DROID_SYSTEMS_SINGLE_FIELDS.map(f => f.field),
  array: DROID_SYSTEMS_ARRAY_FIELDS
});
