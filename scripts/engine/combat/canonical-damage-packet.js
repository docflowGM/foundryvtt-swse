/**
 * Canonical Damage Packet
 *
 * Foundation plumbing (Phase 3): every damage-application path normalizes to a
 * single canonical shape before mitigation runs, so the resolver always receives
 * per-component damage type + tags rather than a bare number.
 *
 *   { components: [ { amount, type, tags[], source } ], amount, primaryType }
 *
 * Design constraints for this slice (see
 * docs/audits/phase-3-canonical-damage-packet-design.md):
 *  - SHAPE + normalization only. No immunity / DR / resistance behaviour changes.
 *  - Behaviour-preserving: a single-component packet still falls through
 *    resolveComponentMitigation() (which requires >1 component) to the unchanged
 *    single-total mitigation path, and the effective damageType each existing
 *    caller resolves with is not altered.
 *  - Compatibility wrappers stay: bare-number / {type} / {components} callers all
 *    normalize here; none are removed.
 *
 * Damage TYPE and weapon TAGS are orthogonal:
 *  - type  (energy/kinetic/ion/stun/force/normal…) drives immunity, resistance,
 *    and DR exceptions.
 *  - tags  (lightsaber, weapon, legacy…) carry weapon properties. "lightsaber"
 *    is what makes an attack ignore DR — separate from its energy damage type.
 * Tags are recorded here but not yet read by mitigation (that lands with D3).
 */

/** Light, dependency-free lightsaber detection for tagging. */
function isLightsaberish(weapon) {
  const s = weapon?.system ?? {};
  if (s.isLightsaber === true || s.lightsaber === true) return true;
  if (weapon?.flags?.swse?.lightsaber === true) return true;
  const hay = `${weapon?.name ?? ''} ${s.weaponType ?? ''} ${s.weaponGroup ?? ''} ${s.group ?? ''} ${s.subtype ?? ''} ${s.category ?? ''}`.toLowerCase();
  return /light\s*saber|lightfoil|light\s*foil/.test(hay);
}

function weaponTypeAndTags(weapon) {
  if (!weapon) return { type: null, tags: [] };
  const s = weapon?.system ?? {};
  const rawType = s.damageType ?? s.damage?.type ?? (Array.isArray(s.damageTypes) ? s.damageTypes.find(Boolean) : s.damageTypes);
  const type = String(rawType ?? '').trim() || null;
  const tags = ['weapon'];
  if (isLightsaberish(weapon)) tags.push('lightsaber');
  if (s.bypassDR === true) tags.push('bypass-dr');
  return { type, tags };
}

function normalizeComponent(component, fallbackType, fallbackSource) {
  const amount = Math.max(0, Number(component?.amount ?? component?.rawAmount ?? 0) || 0);
  const rawType = component?.type
    ?? component?.damageType
    ?? (Array.isArray(component?.damageTypes) ? component.damageTypes.find(Boolean) : component?.damageTypes)
    ?? fallbackType
    ?? 'normal';
  const type = String(rawType ?? 'normal').trim() || 'normal';
  const tags = Array.isArray(component?.tags) ? [...component.tags] : [];
  const source = component?.source ?? fallbackSource ?? null;
  return { amount, type, tags, source };
}

/**
 * Normalize any applyDamage input into a canonical damage packet.
 *
 * Accepts the ActorEngine.applyDamage packet shape:
 *   { amount, type?, source?, sourceActor?, options? }
 * where options may already carry damageComponents / damagePacket / weapon.
 *
 * @param {Object} damagePacket
 * @returns {{ components: Array<{amount:number,type:string,tags:string[],source:*}>, amount:number, primaryType:string }}
 */
export function buildCanonicalDamagePacket(damagePacket = {}) {
  const opts = damagePacket?.options ?? {};
  const amount = Math.max(0, Number(damagePacket?.amount) || 0);
  const source = damagePacket?.source ?? opts.source ?? null;

  // 1. Existing components (e.g. the chat workflow) — preserve, normalize shape only.
  const existing = opts.damageComponents ?? damagePacket?.components ?? opts.damagePacket?.components;
  if (Array.isArray(existing) && existing.length) {
    const components = existing
      .map(c => normalizeComponent(c, damagePacket?.type, source))
      .filter((c, _i, arr) => c.amount > 0 || arr.length === 1);
    if (components.length) {
      const total = components.reduce((sum, c) => sum + c.amount, 0);
      return { components, amount: total || amount, primaryType: components[0].type };
    }
  }

  const weapon = opts.weapon ?? damagePacket?.weapon ?? null;
  const { type: weaponType, tags: weaponTags } = weaponTypeAndTags(weapon);

  // 2. Explicit type on the packet/options — preserve it exactly (attach weapon tags if a weapon is present).
  const explicitType = damagePacket?.type ?? opts.damageType ?? opts.type;
  if (explicitType != null && String(explicitType).trim()) {
    const type = String(explicitType).trim();
    return {
      components: [{ amount, type, tags: weapon ? weaponTags : [], source }],
      amount,
      primaryType: type
    };
  }

  // 3. Weapon present but no explicit type — read weapon.system.damageType + tags.
  if (weaponType) {
    return {
      components: [{ amount, type: weaponType, tags: weaponTags, source: source ?? weapon?.id ?? weapon?._id ?? null }],
      amount,
      primaryType: weaponType
    };
  }

  // 4. Bare numeric damage — legacy compatibility.
  return {
    components: [{ amount, type: 'normal', tags: ['legacy'], source: 'legacy-number-damage' }],
    amount,
    primaryType: 'normal'
  };
}

export default buildCanonicalDamagePacket;
