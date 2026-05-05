import { BLASTER_BOLT_COLORS, BLASTER_FX_TYPES, DEFAULT_BOLT_COLOR, DEFAULT_FX_TYPE } from "/systems/foundryvtt-swse/scripts/data/blaster-config.js";
import { BLADE_COLOR_MAP, DEFAULT_BLADE_COLOR, getBladeColorHex } from "/systems/foundryvtt-swse/scripts/data/blade-colors.js";
import { BEAM_STYLES, getBoltColor } from "/systems/foundryvtt-swse/scripts/constants/beam-styles.js";
import { getSwseFlag } from "/systems/foundryvtt-swse/scripts/utils/flags/swse-flags.js";

const CANONICAL_SCOPE = "foundryvtt-swse";
const LEGACY_SCOPE = "swse";
const DEFAULT_LIGHT = Object.freeze({
  dim: 20,
  bright: 10,
  alpha: 0.3,
  animation: {
    type: "pulse",
    speed: 3,
    intensity: 2
  }
});

function normalizeKey(value, fallback = "") {
  const key = String(value ?? fallback ?? "").trim().toLowerCase();
  return key || String(fallback ?? "").trim().toLowerCase();
}

function objectHasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object ?? {}, key);
}

function readFlag(doc, key, fallback = null) {
  if (!doc) return fallback;
  const value = getSwseFlag(doc, key, undefined);
  if (value !== undefined) return value;
  return fallback;
}

function readSystem(item, path, fallback = null) {
  const parts = String(path ?? "").split(".").filter(Boolean);
  let current = item?.system;
  for (const part of parts) {
    if (current == null) return fallback;
    current = current[part];
  }
  return current ?? fallback;
}

function firstValue(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return null;
}

/**
 * Canonical visual profile resolver for SWSE weapons.
 *
 * This is intentionally cosmetic-only. It resolves existing item/system/flag
 * state into one profile consumed by workbench previews, token light sync,
 * projectile FX, inventory state labels, and chat accents. It never mutates
 * actor or item data and never owns combat math.
 */
export class WeaponVisualProfileResolver {
  static isLightsaber(item) {
    if (!item) return false;
    const system = item.system ?? {};
    const subtype = normalizeKey(system.subtype ?? system.weaponSubtype ?? system.weaponType);
    const category = normalizeKey(system.weaponCategory ?? system.category);
    const name = normalizeKey(item.name);

    return item.type === "lightsaber"
      || (item.type === "weapon" && (
        subtype === "lightsaber"
        || category === "lightsaber"
        || system.isLightsaber === true
        || readFlag(item, "isLightsaber", false) === true
        || name.includes("lightsaber")
      ));
  }

  static isBlaster(item) {
    if (!item) return false;
    const system = item.system ?? {};
    const subtype = normalizeKey(system.subtype ?? system.weaponSubtype ?? system.weaponType);
    const category = normalizeKey(system.weaponCategory ?? system.category);
    const name = normalizeKey(item.name);

    return item.type === "blaster"
      || (item.type === "weapon" && (
        subtype.includes("blaster")
        || category.includes("blaster")
        || system.isBlaster === true
        || readFlag(item, "isBlaster", false) === true
        || name.includes("blaster")
      ));
  }

  static getKind(item) {
    if (this.isLightsaber(item)) return "lightsaber";
    if (this.isBlaster(item)) return "blaster";
    if (item?.type === "weapon") return "weapon";
    return item?.type ? String(item.type) : "unknown";
  }

  static getBladeColor(item, { actor = null, draft = null, lightsaberState = null } = {}) {
    const color = firstValue(
      draft?.bladeColor,
      draft?.selectedBladeColor,
      lightsaberState?.selectedBladeColor,
      lightsaberState?.bladeColor,
      readFlag(item, "bladeColor"),
      item?.flags?.[CANONICAL_SCOPE]?.lightsaberConfig?.bladeColor,
      item?.flags?.[LEGACY_SCOPE]?.lightsaberConfig?.bladeColor,
      readSystem(item, "lightsaber.bladeColor"),
      readSystem(item, "bladeColor"),
      actor?.getFlag?.("swse", "preferredLightsaberColor"),
      DEFAULT_BLADE_COLOR
    );
    const key = normalizeKey(color, DEFAULT_BLADE_COLOR);
    return objectHasOwn(BLADE_COLOR_MAP, key) ? key : DEFAULT_BLADE_COLOR;
  }

  static getBoltColor(item, { draft = null } = {}) {
    const color = firstValue(
      draft?.boltColor,
      readFlag(item, "boltColor"),
      readSystem(item, "visual.boltColor"),
      readSystem(item, "boltColor"),
      DEFAULT_BOLT_COLOR
    );
    const key = normalizeKey(color, DEFAULT_BOLT_COLOR);
    return objectHasOwn(BLASTER_BOLT_COLORS, key) ? key : DEFAULT_BOLT_COLOR;
  }

  static getFxType(item, { draft = null } = {}) {
    const fxType = normalizeKey(firstValue(
      draft?.fxType,
      readFlag(item, "fxType"),
      readSystem(item, "visual.fxType"),
      DEFAULT_FX_TYPE
    ), DEFAULT_FX_TYPE);
    return objectHasOwn(BLASTER_FX_TYPES, fxType) ? fxType : DEFAULT_FX_TYPE;
  }

  static getBeamStyle(item, { draft = null } = {}) {
    const fxType = this.getFxType(item, { draft });
    const explicit = normalizeKey(firstValue(
      draft?.beamStyle,
      readFlag(item, "beamStyle"),
      readSystem(item, "visual.beamStyle")
    ));
    if (objectHasOwn(BEAM_STYLES, explicit)) return explicit;
    const mapped = normalizeKey(BLASTER_FX_TYPES[fxType]?.beamStyle, "bolt");
    return objectHasOwn(BEAM_STYLES, mapped) ? mapped : "bolt";
  }

  static isActive(item) {
    return item?.system?.activated === true || item?.system?.active === true;
  }

  static isEquipped(item) {
    const system = item?.system ?? {};
    return system.equipped === true
      || system.equippable?.equipped === true
      || system.carried === true;
  }

  static emitsLight(item) {
    return readFlag(item, "emitLight", false) === true;
  }

  static resolve(item, options = {}) {
    const kind = this.getKind(item);
    const isLightsaber = kind === "lightsaber";
    const isBlaster = kind === "blaster";
    const active = this.isActive(item);
    const equipped = this.isEquipped(item);
    const emitLight = this.emitsLight(item);

    const bladeColor = this.getBladeColor(item, options);
    const bladeHex = getBladeColorHex(bladeColor);
    const boltColor = this.getBoltColor(item, options);
    const boltHex = BLASTER_BOLT_COLORS[boltColor] || getBoltColor(boltColor);
    const fxType = this.getFxType(item, options);
    const beamStyle = this.getBeamStyle(item, options);

    const tokenLightOn = isLightsaber && active && equipped && emitLight;
    const primaryColor = isLightsaber ? bladeColor : isBlaster ? boltColor : null;
    const primaryHex = isLightsaber ? bladeHex : isBlaster ? boltHex : null;

    return {
      sourceItemId: item?.id ?? item?._id ?? null,
      sourceItemName: item?.name ?? "",
      kind,
      isWeapon: kind === "weapon" || isLightsaber || isBlaster,
      isLightsaber,
      isBlaster,
      active,
      equipped,
      emitLight,
      tokenLightOn,
      bladeColor,
      bladeHex,
      boltColor,
      boltHex,
      fxType,
      fxName: BLASTER_FX_TYPES[fxType]?.name ?? fxType,
      beamStyle,
      beamName: BEAM_STYLES[beamStyle]?.name ?? beamStyle,
      primaryColor,
      primaryHex,
      projectile: {
        color: boltColor,
        colorHex: boltHex,
        fxType,
        beamStyle
      },
      tokenLight: tokenLightOn ? {
        dim: DEFAULT_LIGHT.dim,
        bright: DEFAULT_LIGHT.bright,
        color: bladeHex,
        alpha: DEFAULT_LIGHT.alpha,
        animation: { ...DEFAULT_LIGHT.animation }
      } : null,
      chatAccent: primaryHex,
      label: isLightsaber
        ? `${bladeColor} blade`
        : isBlaster
          ? `${boltColor} ${BLASTER_FX_TYPES[fxType]?.name ?? fxType} bolt`
          : "weapon"
    };
  }

  static resolveActiveLightsaber(actor) {
    const items = actor?.items?.contents
      ?? (typeof actor?.items?.filter === "function" ? actor.items.filter(() => true) : actor?.items)
      ?? [];
    for (const item of items) {
      if (!this.isLightsaber(item)) continue;
      const profile = this.resolve(item, { actor });
      if (profile.tokenLightOn) return { item, profile };
    }
    return { item: null, profile: null };
  }

  static toChatView(profile) {
    if (!profile?.chatAccent) return null;
    return {
      kind: profile.kind,
      label: profile.label,
      colorKey: profile.primaryColor,
      colorHex: profile.chatAccent,
      beamStyle: profile.beamStyle,
      fxType: profile.fxType,
      active: profile.active,
      equipped: profile.equipped
    };
  }
}

export default WeaponVisualProfileResolver;
