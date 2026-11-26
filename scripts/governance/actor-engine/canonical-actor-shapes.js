/**
 * Canonical actor shape helpers (3N-AE.1, extracted verbatim from ActorEngine).
 *
 * Pure in-memory shape initialisers / readers used by ActorEngine's update pipeline BEFORE a merge. Nothing here persists or calls a
 * Foundry document API; ActorEngine keeps the same-named underscore methods as thin delegates and remains the only mutation gateway.
 * Behavior is identical to the former method bodies (characterized by tests/actor-engine-canonical-shapes.test.mjs).
 */

export function getCanonicalAbilityBase(actor, key, fallback = 10) {
    return Number(
      actor.system?.attributes?.[key]?.base ??
      actor.system?.abilities?.[key]?.base ??
      fallback
    );
  }

export function getCanonicalAbilityMod(actor, key) {
    const derivedMod = actor.system?.derived?.attributes?.[key]?.mod;
    if (derivedMod !== undefined) return Number(derivedMod);
    const src = actor.system?.attributes?.[key] ?? actor.system?.abilities?.[key] ?? {};
    const total = (Number(src.base ?? 10))
      + (Number(src.racial ?? 0))
      + (Number(src.enhancement ?? 0))
      + (Number(src.temp ?? 0));
    return Math.floor((total - 10) / 2);
  }

export function ensureCanonicalAbilityShapes(actor) {
    if (!actor.system) actor.system = {};

    const abilityKeys = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

    // 1. Canonical persisted storage: system.attributes
    //    Character-type actors own this namespace. Initialize it for newly-created or
    //    partially-migrated characters so ability edits and progression writes never
    //    fall back to the read-only system.abilities mirror.
    const shouldOwnAttributes = actor.type === 'character' || actor.system.attributes !== undefined;
    if (shouldOwnAttributes) {
      if (typeof actor.system.attributes !== 'object' || Array.isArray(actor.system.attributes)) {
        actor.system.attributes = {};
      }
      for (const key of abilityKeys) {
        if (!actor.system.attributes[key] || typeof actor.system.attributes[key] !== 'object') {
          actor.system.attributes[key] = { base: 10, racial: 0, enhancement: 0, temp: 0 };
        } else {
          actor.system.attributes[key].base        ??= 10;
          actor.system.attributes[key].racial      ??= 0;
          actor.system.attributes[key].enhancement ??= 0;
          actor.system.attributes[key].temp        ??= 0;
        }
      }
    }

    // 2. Compatibility mirror: system.abilities
    //    Phase 2 authority normalization correction: this function (called
    //    from ActorEngine's own update pipeline on every ActorEngine-mediated
    //    mutation that touches system.attributes/system.abilities — see
    //    _initializeCanonicalShapesForTouchedDomains above) is the ONLY code
    //    anywhere that populates/repairs system.abilities. DerivedCalculator
    //    does NOT rebuild it (verified: derived-calculator.js only ever
    //    *reads* `actor.system.attributes || actor.system.abilities`, it
    //    never writes system.abilities). This backfill only fills missing
    //    base/racial/temp shape defaults — it is not an independent value
    //    authority, and no live code writes real ability *values* here.
    //    Treat system.abilities strictly as a read-only compatibility mirror;
    //    system.attributes is canonical (system.derived.attributes is the
    //    canonical computed output — see DerivedCalculator.computeAll()).
    if (!actor.system.abilities) actor.system.abilities = {};
    for (const key of abilityKeys) {
      if (!actor.system.abilities[key]) {
        actor.system.abilities[key] = { base: 10, racial: 0, temp: 0, total: 10, mod: 0 };
      } else {
        if (actor.system.abilities[key].base === undefined) {
          actor.system.abilities[key].base = actor.system.abilities[key].value || 10;
        }
        actor.system.abilities[key].racial ??= 0;
        actor.system.abilities[key].temp   ??= 0;
      }
    }
  }

export function ensureCanonicalSkillShapes(actor, flatUpdateData) {
    if (!actor.system) actor.system = {};
    if (!actor.system.skills || typeof actor.system.skills !== 'object') actor.system.skills = {};

    const skillKeys = new Set();
    for (const key of Object.keys(flatUpdateData)) {
      const match = key.match(/^system\.skills\.([^.]+)\./);
      if (match) {
        skillKeys.add(match[1]);
      }
    }

    for (const skillKey of skillKeys) {
      const current = actor.system.skills[skillKey];
      if (current && typeof current === 'object' && !Array.isArray(current)) continue;

      actor.system.skills[skillKey] = {
        trained: false,
        miscMod: 0,
        focused: false,
        selectedAbility: '',
        favorite: false
      };
    }
  }

export function ensureCanonicalDefenseShapes(actor) {
    if (!actor.system) actor.system = {};
    if (!actor.system.defenses || typeof actor.system.defenses !== 'object') actor.system.defenses = {};

    const defaults = {
      reflex: { classBonus: 0, armor: 0, ability: 'dex', misc: { auto: {}, user: { extra: 0 } } },
      fortitude: { classBonus: 0, ability: (actor.type === 'droid' || actor.system?.isDroid === true) ? 'str' : 'con', misc: { auto: {}, user: { extra: 0 } } },
      will: { classBonus: 0, ability: 'wis', misc: { auto: {}, user: { extra: 0 } } }
    };

    for (const [key, seed] of Object.entries(defaults)) {
      if (!actor.system.defenses[key] || typeof actor.system.defenses[key] !== 'object') {
        actor.system.defenses[key] = foundry.utils.deepClone(seed);
        continue;
      }
      const defense = actor.system.defenses[key];
      defense.classBonus ??= Number(defense.class ?? seed.classBonus) || seed.classBonus;
      if (key === 'reflex') defense.armor ??= seed.armor;
      if (!defense.ability || typeof defense.ability !== 'string') defense.ability = seed.ability;

      const legacyMisc = (defense.misc !== undefined && (!defense.misc || typeof defense.misc !== 'object' || Array.isArray(defense.misc)))
        ? (Number(defense.misc) || 0)
        : null;
      if (!defense.misc || typeof defense.misc !== 'object' || Array.isArray(defense.misc)) defense.misc = {};
      if (!defense.misc.auto || typeof defense.misc.auto !== 'object' || Array.isArray(defense.misc.auto)) defense.misc.auto = {};
      if (!defense.misc.user || typeof defense.misc.user !== 'object' || Array.isArray(defense.misc.user)) defense.misc.user = {};
      defense.misc.user.extra ??= legacyMisc ?? 0;
    }
  }

export function ensureCanonicalXpShape(actor) {
    if (!actor.system) actor.system = {};
    if (!actor.system.xp) {
      actor.system.xp = { total: 0 };
    }
    if (actor.system.xp.total === undefined) {
      actor.system.xp.total = 0;
    }
  }

export function ensureCanonicalHpShape(actor) {
    if (!actor.system) actor.system = {};
    if (!actor.system.hp) {
      actor.system.hp = {
        value: 1,
        max: 1,
        temp: 0
      };
    }
    if (actor.system.hp.value === undefined) actor.system.hp.value = 1;
    if (actor.system.hp.max === undefined) actor.system.hp.max = 1;
  }
