// scripts/engine/npc-levelup.js
import { SWSELogger } from '../utils/logger.js';
import { FeatRegistry } from '../progression/feats/feat-registry.js';
import { FeatEngine } from '../progression/feats/feat-engine.js';
import { ensureNpcStatblockSnapshot, rollbackNpcToStatblockSnapshot } from '../utils/hardening.js';

const FLAG_MODE = 'npcLevelUp.mode';
const FLAG_TRACK = 'npcLevelUp.track';
const FLAG_STARTED_AT = 'npcLevelUp.startedAt';
const FLAG_SNAPSHOT = 'npcLevelUp.snapshot';

/**
 * Snapshot NPC + flip into progression mode.
 * Stored in flags to avoid data-model schema conflicts.
 *
 * @param {Actor} actor
 * @param {{track?: "heroic"|"nonheroic"}} [opts]
 */
export async function ensureNpcProgressionMode(actor, opts = {}) {
  if (!actor) {return;}

  const mode = actor.getFlag('swse', FLAG_MODE) ?? 'statblock';
  const snapshot = actor.getFlag('swse', FLAG_SNAPSHOT);

  if (!snapshot) {
    await ensureNpcStatblockSnapshot(actor);
  }

  if (mode !== 'progression') {
    await actor.setFlag('swse', FLAG_MODE, 'progression');
    await actor.setFlag('swse', FLAG_STARTED_AT, game.time?.worldTime ?? Date.now());
  }

  if (opts.track) {
    await actor.setFlag('swse', FLAG_TRACK, opts.track);
  }
}

/**
 * Revert actor to pre-progression snapshot (system + embedded items).
 * Keeps snapshot for repeated revert unless you choose to unset it.
 *
 * @param {Actor} actor
 */
export async function revertNpcToStatblock(actor) {
  try {
    await rollbackNpcToStatblockSnapshot(actor);
  } catch (err) {
    console.warn('SWSE | NPC revert failed:', err);
    throw err;
  }
}

export async function levelUpNpcNonheroic(actor) {
  if (!actor) {return;}

  const hpMode = await promptHpMode();
  if (!hpMode) {return;}

  const classItems = actor.items?.filter((i) => i.type === 'class') ?? [];
  const heroicLevels = classItems
    .filter((i) => !i.system?.isNonheroic)
    .reduce((sum, i) => sum + (Number(i.system?.level) || 0), 0);

  let nonheroicClass = classItems.find((i) => i.system?.isNonheroic) ?? null;
  if (!nonheroicClass) {
    const created = await ensureNonheroicClass(actor);
    nonheroicClass = created;
  }

  const oldTotal = Number(actor.system?.level) || 1;
  const newTotal = oldTotal + 1;

  const oldNH = Number(nonheroicClass.system?.level) || 0;
  await nonheroicClass.update({ 'system.level': oldNH + 1 });
  await actor.update({ 'system.level': newTotal });

  // HP gain
  const conMod = Number(actor.system?.attributes?.con?.mod) || 0;
  const hpGain = await computeNonheroicHpGain(hpMode, conMod);
  await applyHpGain(actor, hpGain);

  // Feat cadence (normal): every 3 levels
  if (newTotal % 3 === 0) {
    const ok = await promptAndGrantFeat(actor);
    if (!ok) {SWSELogger.debug('Nonheroic feat step skipped or failed');}
  }

  // Ability increase: every 4 levels, ONE ability, only if no heroic levels
  if (heroicLevels === 0 && newTotal % 4 === 0) {
    await promptAndApplyAbilityIncrease(actor, 1);
  }

  ui.notifications.info(`Nonheroic level up complete (Level ${newTotal}).`);
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

async function ensureNonheroicClass(actor) {
  // Try to clone from compendium for correct progression data
  try {
    const pack = game.packs.get('foundryvtt-swse.classes');
    if (pack) {
      const idx = await pack.getIndex();
      const entry = idx.find((e) => String(e.name).toLowerCase() === 'nonheroic');
      if (entry) {
        const doc = await pack.getDocument(entry._id);
        const data = doc.toObject();
        data.flags ??= {};
        data.flags.core ??= {};
        data.flags.core.sourceId = doc.uuid;
        delete data._id;
        data.system.level = Math.max(1, Number(actor.system?.level) || 1);
        data.system.isNonheroic = true;
        const [created] = await actor.createEmbeddedDocuments('Item', [data]);
        return created;
      }
    }
  } catch (err) {
    SWSELogger.warn('Failed to clone Nonheroic class from compendium; falling back to minimal item.', err);
  }

  // Minimal fallback
  const data = {
    name: 'Nonheroic',
    type: 'class',
    img: 'icons/svg/book.svg',
    system: {
      level: Math.max(1, Number(actor.system?.level) || 1),
      hitDie: '1d4',
      babProgression: 'medium',
      fortSave: 'slow',
      refSave: 'slow',
      willSave: 'slow',
      classSkills: [],
      defenseBonus: 0,
      reputation: 0,
      isNonheroic: true,
      baseClass: false,
      forceSensitive: false,
      defenses: { fortitude: 0, reflex: 0, will: 0 },
      talentTrees: [],
      levelProgression: []
    }
  };

  const [created] = await actor.createEmbeddedDocuments('Item', [data]);
  return created;
}

async function promptHpMode() {
  return new Promise((resolve) => {
    new SWSEDialogV2({
      title: 'Nonheroic HP Gain',
      content: '<p>Choose how to add HP for this nonheroic level.</p>',
      buttons: {
        roll: { label: 'Roll (1d4+CON)', callback: () => resolve('roll') },
        avg: { label: 'Average (2+CON)', callback: () => resolve('avg') },
        cancel: { label: 'Cancel', callback: () => resolve(null) }
      },
      default: 'roll',
      close: () => resolve(null)
    }).render(true);
  });
}

async function computeNonheroicHpGain(mode, conMod) {
  if (mode === 'avg') {return 2 + conMod;}
  const roll = await new Roll('1d4 + @con', { con: conMod }).evaluate({ async: true });
  return Number(roll.total) || 0;
}

async function applyHpGain(actor, hpGain) {
  const max = Number(actor.system?.hp?.max) || 0;
  const value = Number(actor.system?.hp?.value) || 0;

  await actor.update({
    'system.hp.max': max + hpGain,
    'system.hp.value': value + hpGain
  });
}

async function promptAndGrantFeat(actor) {
  if (!FeatRegistry.isBuilt) {
    await FeatRegistry.build();
  }

  const available = FeatEngine.getAvailableFeats(actor) ?? [];
  if (!available.length) {
    ui.notifications.warn('No available feats found.');
    return false;
  }

  // Sort by name for sanity
  available.sort((a, b) => String(a.name).localeCompare(String(b.name)));

  const options = available
    .map((f) => `<option value="${escapeHtml(f.name)}">${escapeHtml(f.name)}</option>`)
    .join('');

  const selected = await new Promise((resolve) => {
    new SWSEDialogV2({
      title: 'Select a Feat',
      content: `
        <form>
          <div class="form-group">
            <label>Feat</label>
            <select name="feat">${options}</select>
          </div>
        </form>
      `,
      buttons: {
        ok: {
          label: 'Grant Feat',
          callback: (html) => {
            const root = html instanceof HTMLElement ? html : html?.[0];
            resolve(root?.querySelector?.('[name="feat"]')?.value || null);
          }
        },
        cancel: { label: 'Skip', callback: () => resolve(null) }
      },
      default: 'ok',
      close: () => resolve(null)
    }).render(true);
  });

  if (!selected) {return false;}

  const res = await FeatEngine.learn(actor, selected);
  if (!res?.success) {
    ui.notifications.warn(res?.reason || 'Failed to grant feat.');
    return false;
  }
  return true;
}

async function promptAndApplyAbilityIncrease(actor, count) {
  const abilities = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
  const options = abilities
    .map((a) => `<option value="${a}">${a.toUpperCase()}</option>`)
    .join('');

  for (let i = 0; i < count; i++) {
    const chosen = await new Promise((resolve) => {
      new SWSEDialogV2({
        title: 'Ability Increase',
        content: `
          <form>
            <div class="form-group">
              <label>Increase one ability by +1</label>
              <select name="ability">${options}</select>
            </div>
          </form>
        `,
        buttons: {
          ok: { label: 'Apply', callback: (html) => {
              const root = html instanceof HTMLElement ? html : html?.[0];
              resolve(root?.querySelector?.('[name="ability"]')?.value || null);
            } },
          cancel: { label: 'Cancel', callback: () => resolve(null) }
        },
        default: 'ok',
        close: () => resolve(null)
      }).render(true);
    });

    if (!chosen) {return;}

    const base = Number(actor.system?.attributes?.[chosen]?.base) || 0;
    await actor.update({ [`system.attributes.${chosen}.base`]: base + 1 });
  }
}

function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
