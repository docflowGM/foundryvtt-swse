/**
 * Droid component browser view model (Droid Systems tab) -- PRESENTATION ADAPTER ONLY.
 *
 * Maps what the existing Droid authorities already established into the shared browse/inspect model (templates/actors/shared/partials/
 * browse-inspect.hbs). It owns no rule and writes nothing:
 *   installed / enabled / source of each component   resolveInstalledDroidComponents()  (the installed-component read model; installedSystems ledger first)
 *   physical appendage identity + capabilities      projectActorDroidAppendages()       (instance / location / canHold / canWield / canManipulate)
 *   region contents, names, modifiers, weapon facts DroidSystemsResolver output (already on the sheet context)
 *   Garage entry                                    the existing `customize-droid` handler (focusCategory / focusSlot)
 *
 * Status vocabulary (presentation of the resolver's own source kinds, not a schema):
 *   Confirmed installed   primary source is the installation ledger and the component is installed
 *   Installed - disabled  ledger-confirmed but not enabled
 *   Configured (draft)    only a system.droidSystems record (Garage/builder state): present, NOT confirmed hardware
 *   Item present          only an embedded Item: present, NOT ledger-confirmed
 *   Not established       nothing in the evidence establishes it (never rendered as installed)
 * Unknown capabilities stay "Not established"; nothing here turns unknown into permission, invents positions, or assumes a number of arms.
 */
import { resolveInstalledDroidComponents, DROID_COMPONENT_SOURCE_KIND as KIND } from '/systems/foundryvtt-swse/scripts/domain/droids/droid-installed-component-resolver.js';
import { getDroidPartDefinition, normalizeDroidPartId } from '/systems/foundryvtt-swse/scripts/data/droid-part-schema.js';
import { authorizeDroidComponentOperation } from '/systems/foundryvtt-swse/scripts/domain/droids/droid-component-operation-gate.js';
import { projectActorDroidAppendages } from '/systems/foundryvtt-swse/scripts/engine/equipment/droid-appendage-projection.js';

export const DROID_COMPONENT_CATEGORIES = Object.freeze([
  { id: 'processor', label: 'Processor', glyph: 'fa-microchip' },
  { id: 'locomotion', label: 'Locomotion', glyph: 'fa-person-walking' },
  { id: 'appendage', label: 'Appendages', glyph: 'fa-hand' },
  { id: 'armor', label: 'Armor', glyph: 'fa-shield-halved' },
  { id: 'sensor', label: 'Sensors', glyph: 'fa-eye' },
  { id: 'weapon', label: 'Integrated weapons', glyph: 'fa-gun' },
  { id: 'equipment', label: 'Integrated equipment', glyph: 'fa-toolbox' },
]);
const CAT = Object.fromEntries(DROID_COMPONENT_CATEGORIES.map((c, i) => [c.id, { ...c, rank: i }]));
const REGION_CATEGORY = Object.freeze({ processor: 'processor', locomotion: 'locomotion', appendages: 'appendage', armor: 'armor', sensors: 'sensor', integratedWeapons: 'weapon', integratedEquipment: 'equipment' });

const STATUS = Object.freeze({
  confirmed: { key: 'confirmed', label: 'Confirmed installed', tone: 'ready' },
  disabled: { key: 'disabled', label: 'Installed · disabled', tone: 'warn' },
  draft: { key: 'draft', label: 'Configured (draft)', tone: 'held' },
  item: { key: 'item', label: 'Item present', tone: 'held' },
  unresolved: { key: 'unresolved', label: 'Not established', tone: 'warn' },
});
const slug = (v) => normalizeDroidPartId(v);
const humanize = (v) => String(v ?? '').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[-_:]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const capText = (v) => (v === true ? 'Yes' : v === false ? 'No' : 'Not established');

/** The resolver component (if any) that stands behind a region item: by physical instance first, else by canonical part id. */
function componentFor(item, components) {
  if (item?.instanceId) { const hit = components.find((c) => c.instanceId === item.instanceId); if (hit) return hit; }
  const id = slug(item?.ruleId ?? item?.id ?? '');
  return id ? components.find((c) => c.canonicalId === id && !c.instanceId) ?? components.find((c) => c.canonicalId === id) ?? null : null;
}

export function statusOf(item, component) {
  if (component) {
    const kind = component.primarySource?.kind;
    if (kind === KIND.INSTALLED_LEDGER && component.installed === true) return component.enabled === false ? STATUS.disabled : STATUS.confirmed;
    if (kind === KIND.EMBEDDED_ITEM) return STATUS.item;
    if (kind === KIND.DROID_SYSTEMS_RECORD) return STATUS.draft;
    return STATUS.unresolved;
  }
  if (item?.source === 'builder') return STATUS.draft;
  if (item?.source === 'item') return STATUS.item;
  return STATUS.unresolved;
}

/**
 * @param {object} actor
 * @param {object} resolvedSystems DroidSystemsResolver output (regions with `.items`)
 * @param {{canOpenGarage?:boolean}} [opts]
 * @returns {{id:string,title:string,hint:string,emptyText:string,categories:object[],statuses:object[],entries:object[]}}
 */
export function buildDroidComponentBrowser(actor, resolvedSystems, { canOpenGarage = false } = {}) {
  const resolution = resolveInstalledDroidComponents(actor, { normalizeId: normalizeDroidPartId, getDefinition: getDroidPartDefinition });
  const components = Array.isArray(resolution?.components) ? resolution.components : [];
  const projection = projectActorDroidAppendages(actor);
  const appendageByInstance = new Map((projection?.appendages ?? []).map((a) => [a.identity?.instance, a]));
  const entries = [];
  const seen = new Set();

  for (const [region, categoryId] of Object.entries(REGION_CATEGORY)) {
    const cat = CAT[categoryId];
    for (const item of (resolvedSystems?.[region]?.items ?? [])) {
      const component = componentFor(item, components);
      const instanceId = item.instanceId ?? component?.instanceId ?? null;
      const locationId = item.locationId ?? component?.locationId ?? null;
      const idPart = instanceId ? `inst:${instanceId}` : (slug(item.ruleId) || String(item.id ?? slug(item.name)));
      const key = `${categoryId}:${idPart}`;
      if (seen.has(key)) continue; seen.add(key);
      let status = statusOf(item, component);
      // an appendage is a physical manipulator only with an established instance AND location (Core: any number of appendages); a part-keyed
      // record that names the part without them is evidence of the part, not of a distinct appendage
      const appendageIdentityMissing = categoryId === 'appendage' && !(instanceId && locationId);
      if (appendageIdentityMissing && status.key === 'confirmed') status = STATUS.unresolved;
      const appendage = categoryId === 'appendage' ? appendageByInstance.get(instanceId) ?? null : null;
      const facts = [
        { label: 'Category', value: cat.label },
        ...(item.ruleId ? [{ label: 'Canonical part', value: item.ruleId }] : []),
        ...(instanceId ? [{ label: 'Instance', value: instanceId }] : []),
        ...(locationId ? [{ label: 'Location', value: humanize(locationId) }] : []),
        { label: 'Source', value: component ? humanize(component.primarySource?.kind ?? 'unknown') : (item.source === 'builder' ? 'Garage / builder record' : item.source === 'item' ? 'Embedded Item' : 'Not established') },
        ...(item.damage ? [{ label: 'Damage', value: String(item.damage) }] : []),
        ...(item.range ? [{ label: 'Range', value: String(item.range) }] : []),
        ...(Number.isFinite(Number(item.cost)) && Number(item.cost) > 0 ? [{ label: 'Quoted price', value: `${Number(item.cost).toLocaleString()} cr` }] : []),
      ];
      if (categoryId === 'appendage') {
        // identity + capability exactly as the appendage authority established them; unknown is shown as unknown
        const caps = appendage?.capabilities ?? component?.definition?.source ?? {};
        facts.push({ label: 'Identity', value: appendage ? 'Established (instance + location)' : 'Not established' });
        facts.push({ label: 'Can manipulate', value: capText(appendage ? caps.canManipulate : caps.canManipulate ?? null) });
        facts.push({ label: 'Can hold', value: capText(appendage ? caps.canHold : null) });
        facts.push({ label: 'Can wield', value: capText(appendage ? caps.canWield : null) });
        if (appendage?.functionalState) facts.push({ label: 'Functional state', value: humanize(appendage.functionalState) });
      }
      const notes = [];
      for (const mod of (item.modifiers ?? [])) { const t = typeof mod === 'string' ? mod : (mod?.label ?? mod?.description ?? ''); if (t) notes.push(t); }
      if (item.description) notes.unshift(String(item.description));
      if (status.key === 'draft' || status.key === 'item') notes.push('Present in the sheet record but not confirmed in the installation ledger: it is not treated as installed hardware.');
      if (status.key === 'unresolved') notes.push(appendageIdentityMissing ? 'The record names this part but does not establish a physical instance and location, so it is not counted as a distinct appendage.' : 'Nothing in the installation evidence establishes this component.');
      if (Number(item.cost) > 0) notes.push('A price quote does not establish installation eligibility; installation is decided in the Garage.');

      const operations = [];
      // Operations with a mechanical effect (an attack, a self-destruct) mirror the execution gate (the handlers enforce it independently): only
      // hardware the installation ledger confirms as installed and enabled can be operated. Inspecting and describing stay available.
      const mechanical = item.canRoll === true || categoryId === 'weapon' || Boolean(item.weaponProfile?.damage || item.weaponProfile?.damageBySize || item.weaponProfile?.selfDestruct);
      const gate = mechanical ? authorizeDroidComponentOperation(actor, { instanceId, ruleId: item.ruleId, partId: item.id, name: item.name }, { normalizeId: normalizeDroidPartId, getDefinition: getDroidPartDefinition }) : { ok: true, reason: null };
      if (item.source === 'item' && item.id) operations.push({ label: 'Open item', icon: 'fa-up-right-from-square', action: 'open-droid-system-item', attrs: [{ k: 'item-id', v: item.id }] });
      if (item.canRoll && item.id) operations.push({ label: 'Roll', icon: 'fa-dice-d20', action: 'roll-weapon', attrs: [{ k: 'item-id', v: item.id }], disabled: !gate.ok, reason: gate.reason ?? '' });
      operations.push({ label: mechanical ? 'Use' : 'Describe', icon: 'fa-bolt', action: 'use-droid-part', attrs: [{ k: 'part-id', v: item.id ?? item.ruleId ?? '' }, { k: 'part-name', v: item.name ?? '' }, { k: 'instance-id', v: instanceId ?? '' }], disabled: mechanical && !gate.ok, reason: mechanical ? (gate.reason ?? '') : '' });
      operations.push({
        label: 'Open Garage', icon: 'fa-screwdriver-wrench', action: 'customize-droid',
        attrs: [{ k: 'garage-region', v: categoryId }, { k: 'garage-slot', v: instanceId ?? slug(item.ruleId) ?? '' }],
        disabled: canOpenGarage !== true, reason: canOpenGarage === true ? '' : 'The Garage is not available for this actor.',
      });

      // host relationships: components the installation evidence says are hosted by THIS physical instance
      const hosted = instanceId ? components.filter((c) => c.hostInstanceId === instanceId) : null;
      entries.push({
        key,
        name: item.name || cat.label,
        art: { src: item.img && !/icons\/svg\//.test(item.img) ? item.img : null, glyph: cat.glyph },
        category: categoryId, categoryLabel: cat.label,
        status, summary: instanceId ? `Instance ${instanceId}` : (item.ruleId ? '' : 'No canonical identity'),
        searchText: `${item.name ?? ''} ${item.ruleId ?? ''} ${cat.label} ${status.label} ${instanceId ?? ''}`.toLowerCase(),
        order: cat.rank * 1000 + entries.length,
        facts, notes, operations,
        operationsHint: 'Paid installation, removal and modification happen in the Garage; this sheet only operates installed systems.',
        showMods: Array.isArray(hosted),
        modifications: (hosted ?? []).map((c) => ({ label: c.definition?.name ?? c.canonicalId, state: c.installed ? 'Installed' : 'Not installed', detail: c.instanceId ? `Instance ${c.instanceId}` : '' })),
        modificationsNote: hosted && !hosted.length ? 'No component is recorded as hosted by this instance.' : '',
      });
    }
  }
  // unresolved appendage evidence is shown, never promoted to an appendage
  for (const rec of (projection?.unresolvedRecords ?? [])) {
    const key = `appendage:unresolved:${rec.partId ?? 'unknown'}`;
    if (seen.has(key)) continue; seen.add(key);
    entries.push({
      key, name: humanize(rec.partId ?? 'Appendage'), art: { src: null, glyph: CAT.appendage.glyph }, category: 'appendage', categoryLabel: CAT.appendage.label,
      status: STATUS.unresolved, summary: 'Instance not established',
      searchText: `${rec.partId ?? ''} appendage unresolved`, order: CAT.appendage.rank * 1000 + 500 + entries.length,
      facts: [{ label: 'Identity', value: String(rec.identityStatus ?? 'unresolved') }, { label: 'Can manipulate', value: capText(rec.capabilities?.canManipulate ?? null) }, { label: 'Can hold', value: capText(rec.capabilities?.canHold ?? null) }, { label: 'Can wield', value: capText(rec.capabilities?.canWield ?? null) }],
      notes: ['The evidence names this appendage but does not establish a distinct physical instance and location, so it is not counted as a manipulator.'],
      operations: [{ label: 'Open Garage', icon: 'fa-screwdriver-wrench', action: 'customize-droid', attrs: [{ k: 'garage-region', v: 'appendage' }, { k: 'garage-slot', v: '' }], disabled: canOpenGarage !== true, reason: canOpenGarage === true ? '' : 'The Garage is not available for this actor.' }],
      operationsHint: '', showMods: false, modifications: [], modificationsNote: '',
    });
  }

  const present = new Set(entries.map((e) => e.category));
  const categories = DROID_COMPONENT_CATEGORIES.filter((c) => present.has(c.id)).map((c) => ({ id: c.id, label: c.label, count: entries.filter((e) => e.category === c.id).length }));
  const statuses = Object.values(STATUS).filter((s) => entries.some((e) => e.status.key === s.key)).map((s) => ({ id: s.key, label: s.label }));
  return {
    id: 'droid-components', title: 'Installed systems',
    hint: 'Hardware is shown by what the installation evidence establishes. Draft or item-only records are labelled, never presented as installed.',
    emptyText: 'No components are recorded for this droid.',
    categories, statuses, entries,
  };
}

export default { buildDroidComponentBrowser, statusOf, DROID_COMPONENT_CATEGORIES };
