import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { BackgroundRegistry } from "/systems/foundryvtt-swse/scripts/registries/background-registry.js";
import { LanguageRegistry } from "/systems/foundryvtt-swse/scripts/registries/language-registry.js";

const MIGRATION_VERSION = '2026-02-06-json-backed-ids-v1';

async function _deriveLanguageIds(names) {
  const ids = [];
  for (const name of (Array.isArray(names) ? names : [])) {
    const rec = await LanguageRegistry.getByName(name);
    if (rec?.internalId) {ids.push(rec.internalId);}
  }
  return ids;
}

async function _deriveLanguageUuids(names) {
  const uuids = [];
  for (const name of (Array.isArray(names) ? names : [])) {
    const rec = await LanguageRegistry.getByName(name);
    if (rec?.uuid) {uuids.push(rec.uuid);}
  }
  return uuids;
}


async function _deriveBackgroundUuid(backgroundSlugOrName) {
  if (!backgroundSlugOrName) {return '';}
  const rec = await BackgroundRegistry.getBySlug(String(backgroundSlugOrName));
  return rec?.uuid || '';
}

async function _deriveBackgroundId(backgroundSlugOrName) {
  if (!backgroundSlugOrName) {return '';}
  const rec = await BackgroundRegistry.getBySlug(String(backgroundSlugOrName));
  return rec?.internalId || '';
}

/**
 * Backfill deterministic IDs for JSON-backed content.
 *
 * - system.backgroundId (from system.progression.background)
 * - system.progression.backgroundInternalId
 * - system.languageIds (from system.languages)
 * - system.progression.languageIds (from system.languages)
 */
export async function runJsonBackedIdsMigration() {
  if (!game.user?.isGM) {return;}

  const current = game.settings.get('foundryvtt-swse', 'jsonBackedIdsMigration');
  if (current === MIGRATION_VERSION) {return;}

  SWSELogger.log(`[MIGRATION] JSON-backed IDs migration starting (${MIGRATION_VERSION})`);

  const actors = game.actors ? Array.from(game.actors) : [];
  let updatedCount = 0;

  for (const actor of actors) {
    const update = {};
    const sys = actor.system || {};
    const prog = sys.progression || {};

    // Background
    const bgSlug = prog.background || sys.background || '';
    if (!sys.backgroundId || !prog.backgroundInternalId) {
      const bgId = await _deriveBackgroundId(bgSlug);
      if (bgId) {
        if (!sys.backgroundId) {update['system.backgroundId'] = bgId;}
        if (!prog.backgroundInternalId) {update['system.progression.backgroundInternalId'] = bgId;}
      }
    }

    // Languages
    const names = sys.languages || [];
    if (!Array.isArray(sys.languageIds) || sys.languageIds.length !== (Array.isArray(names) ? names.length : 0)) {
      const ids = await _deriveLanguageIds(names);
      const uuids = await _deriveLanguageUuids(names);
      update['system.languageIds'] = ids;
      update['system.languageUuids'] = uuids;
      update['system.progression.languageIds'] = ids;
      update['system.progression.languageUuids'] = uuids;
    }

    if (Object.keys(update).length > 0) {
      try {
        await actor.update(update, {
          diff: true,
          meta: {
            origin: 'migration',
            version: MIGRATION_VERSION
          }
        });
        updatedCount += 1;
      } catch (e) {
        SWSELogger.warn(`[MIGRATION] Failed updating actor ${actor.id} (${actor.name})`, e);
      }
    }
  }

  SWSELogger.log(`[MIGRATION] JSON-backed IDs migration complete. Updated actors: ${updatedCount}/${actors.length}`);
  await game.settings.set('foundryvtt-swse', 'jsonBackedIdsMigration', MIGRATION_VERSION);
}

export { MIGRATION_VERSION };
