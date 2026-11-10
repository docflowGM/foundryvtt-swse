/**
 * Droid construction quote authority (pure; no actor writes, no Foundry globals).
 *
 * ONE reconstruction of a droid build's price, weight and legitimate free grants from the build's SELECTED IDENTITIES,
 * shared by the progression Droid Builder (its running totals) and by Store commerce (the amount a GM approves and the
 * wallet is debited). Nothing the client holds is trusted: component costs, weights, `isGranted` / `isDefault` /
 * `isLocked` flags, `quoteStatus`, `totalCost` and `droidCredits` are all ignored. Every component is re-quoted from
 * the canonical DROID_SYSTEMS definition through `quoteDroidBuilderSelection`, and a grant is only recognised when it
 * can be derived from identities:
 *
 *   default locomotion  the chassis' size-default locomotion (droid-trait-rules) is part of the baseline frame -> free
 *   heuristic processor `heuristic` is the granted playable-droid processor                                       -> free
 *   free hands          the first two `hand` appendages (`hand-1` / `hand-2` are the two baseline hands)           -> free
 *   species bonus gear  the first N species-allowed accessories, ONLY when a trusted species constraint is passed
 *
 * Unknown components, unknown size, duplicates of singleton installs, unresolved source quotes: the quote is BLOCKED
 * (fail closed). A missing required component is INCOMPLETE (the builder may be mid-edit; commerce requires OK).
 *
 * A numeric quote is not permission to install or to charge: ownership, approval and payment remain the commerce layer's.
 */
import { DROID_SYSTEMS } from '../../data/droid-systems.js';
import { quoteDroidBuilderSelection } from './droid-builder-quote-consumer.js';
import { getDroidPriceFactor } from './droid-component-quote-authority.js';
import { getDroidSizeDefaultLocomotion } from '../../engine/progression/droids/droid-trait-rules.js';
import { isFollowerDroidChassisApplicable } from '../../apps/progression-framework/steps/follower-droid-chassis-applicability.js';

export const DROID_BUILD_QUOTE_SCHEMA = 'swse-droid-build-quote-v1';

const GROUPS = Object.freeze({
  locomotion: 'locomotion', processor: 'processor', appendage: 'appendage', accessory: 'accessory',
  locomotionEnhancement: 'locomotionEnhancement', appendageEnhancement: 'appendageEnhancement'
});
const DEFINITIONS = () => ({
  locomotion: DROID_SYSTEMS.locomotion, processor: DROID_SYSTEMS.processors, appendage: DROID_SYSTEMS.appendages,
  locomotionEnhancement: DROID_SYSTEMS.locomotionEnhancements, appendageEnhancement: DROID_SYSTEMS.appendageEnhancements
});

const str = v => (typeof v === 'string' ? v.trim() : '');
const normalizeAppendageId = id => (id === 'hand-1' || id === 'hand-2' ? 'hand' : id);

/**
 * Reduce any builder state / committed selection to its identities. Everything else is discarded.
 * @returns {{ok:boolean, snapshot?:object, reasons:string[]}}
 */
export function normalizeDroidBuildSnapshot(raw) {
  const reasons = [];
  // A stored identity snapshot (this module's own output) is read back as identities; a builder state is reduced to them.
  const isSnapshot = raw?.schema === DROID_BUILD_QUOTE_SCHEMA;
  const sys = isSnapshot ? {} : (raw?.droidSystems ?? raw ?? {});
  const size = str(isSnapshot ? raw.size : (raw?.droidSize ?? raw?.size)).toLowerCase();
  if (!size || getDroidPriceFactor(size) === null) reasons.push(`UNKNOWN_SIZE: ${size || '(none)'}`);
  const ids = list => (Array.isArray(list) ? list : []).map(e => str(isSnapshot ? e : e?.id));
  const one = v => (isSnapshot ? (typeof v === 'string' ? str(v) : null) : (v ? str(v.id) : null));
  const accessories = (isSnapshot ? raw.accessories : sys.accessories);
  const snapshot = {
    schema: DROID_BUILD_QUOTE_SCHEMA,
    size,
    degree: str(isSnapshot ? raw.degree : (raw?.droidDegree ?? raw?.degree)).toLowerCase(),
    locomotion: one(isSnapshot ? raw.locomotion : sys.locomotion),
    processor: one(isSnapshot ? raw.processor : sys.processor),
    appendages: ids(isSnapshot ? raw.appendages : sys.appendages),
    accessories: (Array.isArray(accessories) ? accessories : []).map(e => ({ id: str(e?.id), category: str(e?.category ?? e?.subcategory) })),
    locomotionEnhancements: ids(isSnapshot ? raw.locomotionEnhancements : sys.locomotionEnhancements),
    appendageEnhancements: ids(isSnapshot ? raw.appendageEnhancements : sys.appendageEnhancements)
  };
  const flat = [snapshot.locomotion, snapshot.processor, ...snapshot.appendages, ...snapshot.accessories.map(a => a.id),
    ...snapshot.locomotionEnhancements, ...snapshot.appendageEnhancements].filter(v => v !== null);
  if (flat.some(id => !id)) reasons.push('COMPONENT_WITHOUT_IDENTITY');
  const dupes = (items, key) => new Set(items.map(key)).size !== items.length;
  if (dupes(snapshot.accessories, a => `${a.category}:${a.id}`)) reasons.push('DUPLICATE_ACCESSORY');
  if (dupes(snapshot.locomotionEnhancements, id => id)) reasons.push('DUPLICATE_LOCOMOTION_ENHANCEMENT');
  if (dupes(snapshot.appendageEnhancements, id => id)) reasons.push('DUPLICATE_APPENDAGE_ENHANCEMENT');
  return { ok: reasons.length === 0, snapshot, reasons };
}

function stableHash(value) {
  const text = JSON.stringify(value);
  let h = 5381;
  for (let i = 0; i < text.length; i += 1) h = ((h * 33) ^ text.charCodeAt(i)) >>> 0;
  return h.toString(16).padStart(8, '0');
}

const blockedQuote = (snapshot, reasons) => ({ status: 'BLOCKED', totalCredits: null, totalWeight: null, lines: [], grants: [], reasons, snapshot, provenance: null });

/**
 * @param {object} rawBuild builder state / committed selection / stored snapshot (only identities are read)
 * @param {{speciesDroidBuilder?:object|null}} [context] TRUSTED species constraint (never taken from the build itself)
 * @returns {{status:'OK'|'INCOMPLETE'|'BLOCKED', totalCredits:number|null, totalWeight:number|null, lines:object[], grants:object[], reasons:string[], snapshot:object, provenance:object|null}}
 */
export function quoteDroidBuild(rawBuild, { speciesDroidBuilder = null } = {}) {
  const norm = normalizeDroidBuildSnapshot(rawBuild);
  const snapshot = norm.snapshot;
  if (!norm.ok) return blockedQuote(snapshot, norm.reasons);

  const defs = DEFINITIONS();
  const size = snapshot.size;
  const reasons = [];
  const lines = [];
  const speedOf = def => {
    const printed = def?.speeds?.[size] ?? def?.baseSpeed?.[size];
    return Number.isFinite(printed) && printed >= 0 ? printed : null;
  };

  // The installed view the component quoters read (identities + derived locomotion speed only).
  const locoDef = snapshot.locomotion ? defs.locomotion?.find(d => d.id === snapshot.locomotion) : null;
  const installed = {
    locomotion: snapshot.locomotion ? { id: snapshot.locomotion, speed: speedOf(locoDef) } : null,
    processor: snapshot.processor ? { id: snapshot.processor } : null,
    appendages: snapshot.appendages.map(id => ({ id })),
    accessories: snapshot.accessories.map(a => ({ id: a.id, category: a.category })),
    locomotionEnhancements: snapshot.locomotionEnhancements.map(id => ({ id })),
    appendageEnhancements: snapshot.appendageEnhancements.map(id => ({ id }))
  };

  let freeHands = 2;
  let speciesChoicesLeft = Number(speciesDroidBuilder?.bonusEquipmentChoices || 0);

  const push = ({ group, index, id, definition, subcategory = null, grant = null, speed = null }) => {
    if (!definition) {
      reasons.push(`UNKNOWN_COMPONENT: ${group}:${id}`);
      lines.push({ group, index, id, name: null, subcategory, credits: null, sourceCredits: null, weight: null, grant: null, quoteStatus: 'BLOCKED', blockingReason: 'Source definition not found' });
      return;
    }
    const quote = quoteDroidBuilderSelection({ definition, category: group, subcategory, size, droidSystems: installed, speed });
    const ok = quote.status === 'OK';
    if (!ok) reasons.push(`QUOTE_UNRESOLVED: ${group}:${id}`);
    lines.push({
      group, index, id, name: definition.name ?? id, subcategory, definition: group === 'accessory' ? definition : undefined,
      credits: ok ? (grant ? 0 : quote.credits) : null, sourceCredits: ok ? quote.credits : null, weight: quote.kg ?? null,
      grant, quoteStatus: quote.status, blockingReason: quote.blockingReason ?? null, ...(speed === null ? {} : { speed })
    });
  };

  if (!snapshot.locomotion) reasons.push('MISSING_REQUIRED: locomotion');
  else push({ group: 'locomotion', index: 0, id: snapshot.locomotion, definition: locoDef, speed: speedOf(locoDef),
    grant: snapshot.locomotion === getDroidSizeDefaultLocomotion(size) ? 'default-locomotion' : null });

  if (!snapshot.processor) reasons.push('MISSING_REQUIRED: processor');
  else push({ group: 'processor', index: 0, id: snapshot.processor, definition: defs.processor?.find(d => d.id === snapshot.processor),
    grant: snapshot.processor === 'heuristic' ? 'heuristic-processor' : null });

  if (!snapshot.appendages.length) reasons.push('MISSING_REQUIRED: appendage');
  snapshot.appendages.forEach((rawId, index) => {
    const id = normalizeAppendageId(rawId);
    const isHand = id === 'hand';
    const grant = isHand && freeHands > 0 ? 'free-hand' : null;
    if (grant) freeHands -= 1;
    push({ group: 'appendage', index, id: rawId, definition: defs.appendage?.find(d => d.id === id), grant });
  });

  snapshot.accessories.forEach((acc, index) => {
    const definition = DROID_SYSTEMS.accessories?.[acc.category]?.find(d => d.id === acc.id);
    let grant = null;
    if (speciesChoicesLeft > 0 && isFollowerDroidChassisApplicable(speciesDroidBuilder, { category: 'accessory', id: acc.id, subcategory: acc.category })) {
      grant = 'species-bonus-equipment'; speciesChoicesLeft -= 1;
    }
    push({ group: 'accessory', index, id: acc.id, subcategory: acc.category, definition, grant });
  });
  snapshot.locomotionEnhancements.forEach((id, index) => push({ group: 'locomotionEnhancement', index, id, definition: defs.locomotionEnhancement?.find(d => d.id === id) }));
  snapshot.appendageEnhancements.forEach((id, index) => push({ group: 'appendageEnhancement', index, id, definition: defs.appendageEnhancement?.find(d => d.id === id) }));

  const blocked = reasons.some(r => !r.startsWith('MISSING_REQUIRED'));
  const status = blocked ? 'BLOCKED' : reasons.length ? 'INCOMPLETE' : 'OK';
  const allNumbers = lines.length > 0 && lines.every(l => Number.isFinite(l.credits) && Number.isFinite(l.weight));
  const totalCredits = status === 'OK' && allNumbers ? lines.reduce((s, l) => s + l.credits, 0) : null;
  const totalWeight = status === 'OK' && allNumbers ? lines.reduce((s, l) => s + l.weight, 0) : null;
  const grants = lines.filter(l => l.grant).map(l => ({ group: l.group, id: l.id, grant: l.grant, waivedCredits: l.sourceCredits }));
  return {
    status, totalCredits, totalWeight, lines, grants, reasons, snapshot,
    provenance: status === 'OK' ? { schema: DROID_BUILD_QUOTE_SCHEMA, snapshotHash: stableHash(snapshot), totalCredits,
      components: lines.map(l => `${l.group}:${l.id}`) } : null
  };
}
