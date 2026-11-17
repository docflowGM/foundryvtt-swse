/**
 * Galactic Profile resolvers — identity resolution against canonical V2 data.
 *
 * `createGalacticProfileResolvers(deps)` returns the `ctx.resolvers` object the compiler consumes. All logic is
 * IDENTITY resolution (which canonical document does an authored reference name?); every rule decision is
 * delegated to a dependency supplied by the caller:
 *
 *   deps.adapterRegistry      ProgressionSubtypeAdapterRegistry (strict resolver only)
 *   deps.classLookup(id)      -> model | null            (ClassesRegistry in Foundry)
 *   deps.speciesLookup(id)    -> Promise<{status, identity, pendingContext}>   (SpeciesRegistry + publication policy)
 *   deps.backgroundLookup(id) -> Promise<{status,id,name,pendingContext}>
 *   deps.skillExists(key)     -> boolean                 (SkillRegistry)
 *   deps.snapshot             { feats, talents, items, forcepowers: doc[] }   canonical documents
 *   deps.featChoice?(doc,label,ctx) -> Promise<{ok, system}>   (FeatChoiceResolver.validateSelectedChoice + buildChoicePatch)
 *   deps.forceEntitlement(args) -> {slots}               (FeatGrantEntitlementResolver)
 *   deps.talentAccessExtra?(classModel, talentDoc) -> {allowed, via}   (Force / droid-degree trees, if V2 grants them)
 *   deps.openSteps?(args)     -> Promise<{stepId, reason}[]>           (ActiveStepComputer)
 *
 * Nothing is fuzzy: an id match is exact; a name match is exact (case-insensitive) AND must be unique; a
 * parameterized "Base (Choice)" name is split only when the base document is unique. Multiple candidates are
 * `ambiguous`, never first-wins.
 */
import { getClassAutoGrants } from '../engine/autogrants/class-autogrants.js';
import { getNonheroicClassModel } from '../utils/nonheroic-class-model.js';

const lc = v => String(v ?? '').trim().toLowerCase();
const nameKey = v => lc(v).replace(/\*/g, '').replace(/[^a-z0-9]+/g, '');

const ids = e => (Array.isArray(e?.sourceIds) ? e.sourceIds : (e?.sourceId ? [e.sourceId] : [])).filter(Boolean).map(String);

function indexDocs(docs = []) {
  const byId = new Map(); const byName = new Map();
  for (const d of docs) {
    if (!byId.has(d._id)) byId.set(d._id, []);
    byId.get(d._id).push(d);
    const k = lc(d.name);
    if (!byName.has(k)) byName.set(k, []);
    byName.get(k).push(d);
  }
  return { byId, byName, all: docs };
}
/** Docs sharing one `_id` across packs are one logical document; distinct ids under one name are ambiguous. */
const distinct = list => [...new Map(list.map(d => [d._id, d])).values()];

function splitParameter(name) {
  const m = /^(.*\S)\s*\(([^()]+)\)\s*$/.exec(String(name ?? ''));
  return m ? { base: m[1].trim(), choice: m[2].trim() } : null;
}

export function createGalacticProfileResolvers(deps) {
  const idx = {
    feats: indexDocs(deps.snapshot?.feats),
    talents: indexDocs(deps.snapshot?.talents),
    items: indexDocs(deps.snapshot?.items),
    forcepowers: indexDocs(deps.snapshot?.forcepowers)
  };

  /** exact id(s) first, then unique exact name; returns {status, doc?, matchedBy} */
  const resolveDoc = (index, entry) => {
    for (const id of ids(entry)) {
      const hit = distinct(index.byId.get(id) || []);
      if (hit.length === 1) return { status: 'resolved', doc: hit[0], matchedBy: 'id' };
    }
    const exact = distinct(index.byName.get(lc(entry.name)) || []);
    if (exact.length === 1) return { status: 'resolved', doc: exact[0], matchedBy: 'name' };
    if (exact.length > 1) return { status: 'ambiguous', candidates: exact.map(d => d._id) };
    // V2's own registries index names by a punctuation-insensitive key ("Point Blank Shot" == "Point-Blank Shot").
    const nk = nameKey(entry.name);
    const normalized = distinct(index.all.filter(d => nameKey(d.name) === nk));
    if (normalized.length === 1) return { status: 'resolved', doc: normalized[0], matchedBy: 'normalizedName' };
    if (normalized.length > 1) return { status: 'ambiguous', candidates: normalized.map(d => d._id) };
    const split = splitParameter(entry.name);
    if (split) {
      const base = distinct(index.byName.get(lc(split.base)) || []);
      if (base.length === 1) return { status: 'resolved', doc: base[0], matchedBy: 'base+choice', choice: split.choice };
      if (base.length > 1) return { status: 'ambiguous', candidates: base.map(d => d._id) };
    }
    return { status: 'unresolved' };
  };

  return {
    subtypeAdapter: subtype => deps.adapterRegistry.resolveAdapterStrict(subtype),

    async class(id) {
      if (id === 'nonheroic') return getNonheroicClassModel();
      return deps.classLookup(id) ?? null;
    },
    classAutoGrantNames: model => getClassAutoGrants(model?.name),

    species: ref => deps.speciesLookup(ref),
    speciesAbilityMods: speciesCtx => {
      const m = speciesCtx?.identity?.doc?.abilityMods ?? speciesCtx?.identity?.doc?.system?.abilityMods ?? speciesCtx?.identity?.abilityMods ?? null;
      return m && typeof m === 'object' ? m : null;
    },
    background: ref => deps.backgroundLookup(ref),
    backgroundEnabled: () => deps.backgroundsEnabled?.() !== false,
    skill: key => !!deps.skillExists(key),

    async feat(entry) {
      const r = resolveDoc(idx.feats, entry);
      if (r.status !== 'resolved') return { status: r.status, candidates: r.candidates };
      const choice = r.choice ?? (r.doc.name !== entry.name ? splitParameter(entry.name)?.choice : undefined);
      const matchedBy = r.matchedBy;
      if (!choice) return { status: 'resolved', id: r.doc._id, doc: r.doc, system: {}, choiceVerified: true, matchedBy };
      if (deps.featChoice) {
        const v = await deps.featChoice(r.doc, choice, entry);
        if (!v?.ok) return { status: 'unresolved', doc: r.doc, detail: v?.errors };
        return { status: 'resolved', id: r.doc._id, doc: r.doc, system: v.system ?? { selectedChoice: choice }, choiceVerified: true };
      }
      return { status: 'resolved', id: r.doc._id, doc: r.doc, system: { selectedChoice: choice }, choiceVerified: false };
    },

    async talent(entry, classModel) {
      const r = resolveDoc(idx.talents, entry);
      if (r.status !== 'resolved') return { status: r.status, candidates: r.candidates };
      const doc = r.doc;
      const treeId = doc.system?.treeId ?? doc.system?.talent_tree ?? null;
      const classTrees = new Set([...(classModel?.system?.talent_trees || []), ...(classModel?.system?.talentTreeIds || []), ...(classModel?.talentTreeIds || [])]);
      let access = { allowed: !!treeId && classTrees.has(treeId), via: 'class', tree: treeId };
      if (!access.allowed && deps.talentAccessExtra) access = { ...(await deps.talentAccessExtra(classModel, doc)), tree: treeId };
      const label = entry.parameters?.weaponGroupLabel ?? r.choice ?? null;
      return { status: 'resolved', id: doc._id, name: label ? `${doc.name} (${label})` : doc.name, treeId, access, system: label ? { selectedChoice: label } : {} };
    },

    async forcePower(fp) {
      const r = resolveDoc(idx.forcepowers, { name: fp.name, sourceIds: [fp.sourceId] });
      return r.status === 'resolved' ? { status: 'resolved', id: r.doc._id } : { status: r.status };
    },

    async item(e) {
      const hit = distinct(idx.items.byId.get(e.sourceId) || []);
      if (hit.length === 1) return { status: 'resolved', id: hit[0]._id, pack: e.pack };
      if (hit.length > 1) return { status: 'ambiguous' };
      return { status: 'unresolved' };
    },

    automaticLanguages(speciesCtx, backgroundCtx) {
      const automatic = new Set(['basic']);
      const add = v => { const k = nameKey(v?.name || v?.label || v?.id || v); if (k) automatic.add(k); };
      const sp = speciesCtx?.pendingContext;
      (sp?.entitlements?.languages || sp?.identity?.doc?.languages || sp?.identity?.baseDoc?.languages || sp?.identity?.doc?.canonicalStats?.languages || speciesCtx?.identity?.doc?.languages || []).forEach?.(add);
      (backgroundCtx?.pendingContext?.languages?.fixed || []).forEach(add);
      (backgroundCtx?.pendingContext?.languages?.entitlements || []).forEach(add);
      return new Set([...automatic].map(nameKey));
    },

    forceEntitlement: args => deps.forceEntitlement(args),
    openSteps: deps.openSteps ? args => deps.openSteps(args) : undefined
  };
}
