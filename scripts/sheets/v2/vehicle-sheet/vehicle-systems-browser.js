/**
 * Vehicle systems browser view model (Stats tab) -- PRESENTATION ADAPTER ONLY.
 *
 * Maps what the existing Vehicle authorities already established into the shared browse/inspect model
 * (templates/actors/shared/partials/browse-inspect.hbs). It owns no rule, computes no statistic and writes nothing:
 *   executable-weapon classification   resolveVehicleWeaponAuthority(item)   (null | {ok:true, origin:'stock'|'installed'} | {ok:false, reason})
 *   installations (sealed ledger)      schemaView.installed.entries           (certification, EP, price, mount, weapon authorization)
 *   EP                                 schemaView.ep + schemaView.shipyard    (total / used / remaining / reserved; unknown stays unknown)
 *   printed attack groups              publicationView.attackReference.groups (REFERENCE ONLY: never an executable mount)
 *   mount display facts + fire actions weaponMountPanel.mounts                (arc, attack, damage, range, ammunition, crew actions)
 *   GM-configured launcher state       weaponOps.ammoRows
 *
 * A printed weapon is not an executable weapon mount. Five classes are kept apart and none is hidden:
 *   Certified weapons              an Item the weapon authority certifies (stock source group, or a certified installed weapon)
 *   Blocked / unresolved           an Item the authority refuses or does not recognise, an installed weapon not authorized to fire, a legacy
 *                                  `system.weapons` record (never installation evidence)
 *   Published attack references    the printed armament; reference only, no control
 *   Installed systems              the sealed installation ledger (EP, price, certification, effect state; no operational state is invented)
 * GM-configured launcher capability is marked "GM-configured (not canonical)".
 */
import { resolveVehicleWeaponAuthority } from '/systems/foundryvtt-swse/scripts/domain/vehicles/vehicle-weapon-damage.js';

export const VEHICLE_SYSTEM_CATEGORIES = Object.freeze([
  { id: 'weapon-certified', label: 'Certified weapons', glyph: 'fa-crosshairs' },
  { id: 'weapon-blocked', label: 'Blocked / unresolved weapons', glyph: 'fa-triangle-exclamation' },
  { id: 'weapon-reference', label: 'Published attack references', glyph: 'fa-book-open' },
  { id: 'installation', label: 'Installed systems', glyph: 'fa-microchip' },
]);
const CAT = Object.fromEntries(VEHICLE_SYSTEM_CATEGORIES.map((c, i) => [c.id, { ...c, rank: i }]));
const S = Object.freeze({
  stock: { key: 'stock', label: 'Certified · stock', tone: 'ready' },
  installed: { key: 'installed', label: 'Certified · installed', tone: 'ready' },
  gm: { key: 'gm', label: 'GM-configured (not canonical)', tone: 'warn' },
  blocked: { key: 'blocked', label: 'Blocked', tone: 'conflict' },
  legacy: { key: 'legacy', label: 'Legacy record (not canonical)', tone: 'warn' },
  notAuthorized: { key: 'not-authorized', label: 'Installed · not authorized to fire', tone: 'warn' },
  reference: { key: 'reference', label: 'Reference only', tone: 'held' },
  effectCertified: { key: 'effect-certified', label: 'Effect certified', tone: 'ready' },
  effectNotAutomated: { key: 'effect-not-automated', label: 'Effect not automated', tone: 'held' },
  weaponAuthorized: { key: 'weapon-authorized', label: 'Weapon authorized', tone: 'ready' },
});
const humanize = (v) => String(v ?? '').replace(/[-_:]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const known = (v) => (v === null || v === undefined || v === '' || Number.isNaN(v) ? 'Unresolved' : String(v));

function epSummary(schema) {
  const ep = schema?.ep;
  if (!ep) return [];
  const num = (v) => (Number.isFinite(v) ? String(v) : 'Unresolved');
  const out = [{ label: 'EP', value: ep.label && !Number.isFinite(ep.total) ? ep.label : `${num(ep.used)} used of ${num(ep.total)}` }];
  if (Number.isFinite(ep.remaining)) out.push({ label: 'Remaining EP', value: String(ep.remaining) });
  if (Number.isFinite(ep.shortfall) && ep.shortfall > 0) out.push({ label: 'EP shortfall', value: String(ep.shortfall) });
  if (Number.isFinite(schema?.shipyard?.reservedEp)) out.push({ label: 'Reserved EP', value: String(schema.shipyard.reservedEp) });
  if (Number.isFinite(ep.nonstandardCount) && ep.nonstandardCount > 0) out.push({ label: 'Nonstandard', value: String(ep.nonstandardCount) });
  return out;
}

/**
 * @param {{actor:object, schema?:object|null, publication?:object|null, mountPanel?:object|null, weaponOps?:object|null, canAct?:boolean}} input
 * @returns {object|null} browser model, or null when there is nothing to browse (source-invalid / no view model)
 */
export function buildVehicleSystemsBrowser({ actor, schema = null, publication = null, mountPanel = null, weaponOps = schema?.weaponOps ?? null, canAct = false } = {}) {
  if (!schema || schema.origin === 'PUBLISHED_SOURCE_INVALID') return null;
  const entries = [];
  const push = (e) => entries.push({ ...e, order: CAT[e.category].rank * 1000 + entries.length, art: { src: null, glyph: CAT[e.category].glyph }, categoryLabel: CAT[e.category].label, modifications: null, modificationsNote: '', operationsHint: e.operationsHint ?? '' });
  const mounts = new Map((mountPanel?.mounts ?? []).filter((m) => m?.source === 'item' && m.weaponId).map((m) => [m.weaponId, m]));
  const gmConfigured = new Set((weaponOps?.ammoRows ?? []).filter((r) => r?.isConfigured === true).map((r) => r.itemId ?? r.weaponId).filter(Boolean));
  const items = actor?.items?.contents ?? (actor?.items ? [...actor.items] : []);

  // 1. weapon Items: classified ONLY by the existing weapon authority
  for (const item of items) {
    if (item?.type !== 'weapon') continue;
    const auth = resolveVehicleWeaponAuthority(item);
    const mount = mounts.get(item.id) ?? null;
    const facts = [
      ...(mount?.arc && mount.arc !== 'unknown' ? [{ label: 'Arc', value: mount.arc }] : []),
      ...(mount?.attackSummary ? [{ label: 'Attack', value: mount.attackSummary }] : []),
      ...(mount?.damageSummary ? [{ label: 'Damage', value: mount.damageSummary }] : []),
      ...(mount?.rangeSummary ? [{ label: 'Range', value: mount.rangeSummary }] : []),
      ...(mount?.operatorStationKey ? [{ label: 'Operator station', value: humanize(mount.operatorStationKey) }] : []),
      ...(mount?.ammoOffer ? [{ label: 'Ammunition', value: mount.ammoOffer.stockLabel ?? '' }] : []),
    ];
    const operations = [];
    if (auth?.ok) {
      for (const a of (mount?.actions ?? [])) operations.push({ label: String(a.use ?? a.key ?? 'Use'), icon: 'fa-bullseye', action: 'vehicle-crew-skill', attrs: [{ k: 'station', v: a.stationKey ?? '' }, { k: 'skill', v: a.key ?? '' }, { k: 'weapon-id', v: item.id }, { k: 'use', v: a.use ?? '' }, { k: 'label', v: item.name ?? '' }] });
      if (mount?.ammoOffer) operations.push({ label: 'Buy ammunition', icon: 'fa-box-open', action: '', attrs: [{ k: 'weapon-action', v: 'buy-ammo' }, { k: 'item-id', v: item.id }], disabled: mount.ammoOffer.canBuy === false, reason: mount.ammoOffer.disabledReason ?? '' });
    }
    operations.push({ label: 'Open item', icon: 'fa-up-right-from-square', action: '', cls: 'swse-v2-open-item', attrs: [{ k: 'item-id', v: item.id }] });
    const base = { key: `weapon:${item.id}`, name: item.name || 'Weapon', facts, operations, searchText: `${item.name ?? ''} weapon ${auth?.origin ?? ''}`.toLowerCase() };
    if (auth?.ok) {
      const status = gmConfigured.has(item.id) ? S.gm : (auth.origin === 'installed' ? S.installed : S.stock);
      push({ ...base, category: 'weapon-certified', status, summary: auth.origin === 'installed' ? 'Installed aftermarket weapon' : 'Stock weapon',
        facts: [{ label: 'Provenance', value: auth.origin === 'installed' ? 'Certified installation' : 'Published source group' }, { label: 'Operator role', value: humanize(auth.operator) }, ...facts],
        notes: [...(status.key === 'gm' ? ['The GM configured the missing ammunition facts; this capability is not canonical.'] : []), ...(mount?.notes ?? [])] });
    } else {
      push({ ...base, category: 'weapon-blocked', status: S.blocked, summary: auth ? humanize(auth.reason) : 'Not a vehicle-managed weapon',
        notes: [auth ? `The weapon authority refuses this weapon: ${auth.reason}.` : 'This weapon Item is not claimed by any vehicle weapon authority, so it cannot fire as a vehicle weapon.', 'Nothing is generated from its displayed text.'], operations: [operations.at(-1)] });
    }
  }
  // 2. legacy system.weapons records are visible but never evidence
  for (const m of (mountPanel?.mounts ?? [])) {
    if (m?.source !== 'system') continue;
    push({ key: `legacy:${m.key}`, name: m.name, category: 'weapon-blocked', status: S.legacy, summary: 'system.weapons record', facts: [{ label: 'Source', value: 'Legacy system.weapons record' }], notes: ['A legacy record is not installation evidence and cannot fire; it is shown so it is not silently hidden.'], operations: [], searchText: `${m.name} legacy weapon` });
  }
  // 3. installation ledger (sealed records); authorized weapons are listed with their ledger facts, unauthorized ones are flagged
  for (const e of (schema.installed?.entries ?? [])) {
    const blocked = e.weapon === true && e.weaponStatus === 'NOT_AUTHORIZED';
    const status = blocked ? S.notAuthorized : (e.weapon && e.weaponStatus === 'AUTHORIZED' ? S.weaponAuthorized : (e.effectStatus === 'EFFECT_CERTIFIED' ? S.effectCertified : S.effectNotAutomated));
    push({
      key: `install:${e.installId}`, name: e.name, category: blocked ? 'weapon-blocked' : 'installation', status, summary: e.category ?? '',
      facts: [
        { label: 'Category', value: known(e.category) }, { label: 'EP cost', value: known(e.epCost) },
        { label: 'Price', value: Number.isFinite(e.priceCredits) ? `${e.priceCredits.toLocaleString()} cr` : 'Unresolved' }, { label: 'Standard', value: known(e.standard) },
        { label: 'Certification', value: humanize(e.certification) }, ...(e.source ? [{ label: 'Source', value: e.source }] : []),
        ...(e.weapon ? [{ label: 'Mount', value: known(e.mountLabel) }, { label: 'Weapon', value: known(e.weaponLabel) }] : []),
        { label: 'Effect', value: known(e.effectLabel) }, { label: 'Operational state', value: 'Not tracked by the installation record' },
      ],
      notes: [...(Number.isFinite(e.shortfall) && e.shortfall > 0 ? [`EP shortfall: ${e.shortfall}.`] : []), ...(blocked ? ['Installed, but not authorized to fire: no certified mount, so it is not an executable weapon.'] : [])],
      operations: [{ label: 'Open Shipyard', icon: 'fa-screwdriver-wrench', action: 'customize-vehicle', attrs: [], disabled: canAct !== true, reason: canAct === true ? '' : 'Only the owner or the GM can open the Shipyard.' }],
      operationsHint: 'Installation, removal and purchases are decided by the Shipyard authority; this view does not change them.',
      searchText: `${e.name} ${e.category ?? ''} installation ${status.label}`.toLowerCase(),
    });
  }
  // 4. printed armament: reference only, never a mount
  for (const g of (publication?.attackReference?.groups ?? [])) {
    push({
      key: `reference:${g.id ?? g.label}`, name: g.label, category: 'weapon-reference', status: S.reference, summary: g.attackLabel ? `Printed attack ${g.attackLabel}` : 'Printed armament',
      facts: [...(g.attackLabel ? [{ label: 'Printed attack', value: g.attackLabel }] : []), { label: 'Executable', value: 'No' }],
      notes: [...(g.notes ? [String(g.notes)] : []), publication?.attackReference?.note ?? 'Printed attack groups are reference only; no installed mount is certified.'],
      operations: [], operationsHint: 'A printed group has no Fire control: only a certified weapon Item can fire.', searchText: `${g.label} printed reference`.toLowerCase(),
    });
  }

  const present = new Set(entries.map((e) => e.category));
  const categories = VEHICLE_SYSTEM_CATEGORIES.filter((c) => present.has(c.id)).map((c) => ({ id: c.id, label: c.label, count: entries.filter((e) => e.category === c.id).length }));
  const statusSet = new Map(entries.map((e) => [e.status.key, e.status.label]));
  return {
    id: 'vehicle-systems', title: 'Weapons & installed systems',
    hint: 'Printed armament is reference only. Only weapons the weapon authority certifies can fire; blocked and unresolved entries are listed with their reason.',
    summary: epSummary(schema),
    emptyText: 'No weapons or installed systems are recorded for this vehicle.',
    categories, statuses: [...statusSet].map(([id, label]) => ({ id, label })), entries,
  };
}

export default { buildVehicleSystemsBrowser, VEHICLE_SYSTEM_CATEGORIES };
