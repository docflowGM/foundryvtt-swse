/**
 * House Rule Feat/Talent Grants System
 *
 * Automatically grants feats and talents to characters when house rule settings
 * enable them. Handles duplicates by offering replacement feat selection.
 *
 * PHASE 7: All mutations routed through ActorEngine for atomic governance
 * PHASE 3A: Pilot family reads routed through FeatRulesAdapter
 */
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { SWSEDialogV2 } from "/systems/foundryvtt-swse/scripts/apps/dialogs/swse-dialog-v2.js";
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { FeatRegistry } from "/systems/foundryvtt-swse/scripts/registries/feat-registry.js";
import { TalentRegistry } from "/systems/foundryvtt-swse/scripts/registries/talent-registry.js";
import { FeatRulesAdapter } from "/systems/foundryvtt-swse/scripts/houserules/adapters/FeatRulesAdapter.js";
import { HouseRuleService } from "/systems/foundryvtt-swse/scripts/engine/system/HouseRuleService.js";
import { HOUSE_RULE_GRANTS, actorHasGrant, buildGrantAcquisition, canWriteGrants, deterministicGrantItemId, grantForSetting, isGrantEnabled } from "/systems/foundryvtt-swse/scripts/houserules/house-rule-grant-table.js";

/**
 * Mapping of house rule settings to feats/talents they grant
 */
// Derived from the ONE canonical table (house-rule-grant-table.js); shape kept for existing callers.
const GRANT_MAPPINGS = Object.fromEntries(HOUSE_RULE_GRANTS.map(g => [g.setting, [{ type: g.type, name: g.name, id: g.id }]]));

export class HouseRuleFeatGrants {
  /**
   * Initialize the feat grant system
   */
  static initialize() {
    SWSELogger.info('HouseRuleFeatGrants | Initializing…');

    // Monitor setting changes
    Hooks.on('updateSetting', (setting, value, options) => {
      // Only the ACTIVE GM client acts on a world-level setting change (isGM alone lets every GM client write).
      if (canWriteGrants() && setting.key.startsWith('foundryvtt-swse.')) {
        this._onSettingChanged(setting, value, options);
      }
    });

    // Grant feats to newly created actors
    Hooks.on('createActor', (actor, options, userId) => {
      if (game.user.id === userId) {
        this._grantFeatsToActor(actor, null, { offerReplacement: false });
      }
    });

    SWSELogger.info('HouseRuleFeatGrants | Ready.');
  }

  /**
   * Called when a house rule setting changes
   */
  static async _onSettingChanged(setting, value, options) {
    const settingName = setting.key.split('.').pop();

    // Only process if it's a setting that grants feats
    if (!GRANT_MAPPINGS[settingName]) {return;}

    // If setting is being disabled, don't process
    if (!value || value === false) {return;}

    // Grant to all actors
    for (const actor of game.actors) {
      await this._grantFeatsToActor(actor, settingName, { offerReplacement: true });
    }
  }

  /**
   * Grant applicable feats to an actor
   */
  static async _grantFeatsToActor(actor, specificSetting = null, { offerReplacement = false } = {}) {
    try {
      // Skip non-character actors
      if (!actor.isToken && actor.type !== 'character') {return;}

      const grantsToProcess = specificSetting
        ? { [specificSetting]: GRANT_MAPPINGS[specificSetting] }
        : GRANT_MAPPINGS;

      for (const [settingName, grants] of Object.entries(grantsToProcess)) {
        // Check if this setting is enabled (PHASE 3A: route pilot family through adapter)
        const isEnabled = this._isDefaultGrantEnabled(settingName);
        if (!isEnabled) {continue;}

        for (const grant of grants) {
          await this._grantFeatToActor(actor, grant, settingName, { offerReplacement });
        }
      }
    } catch (err) {
      SWSELogger.error(`Error granting feats to actor ${actor.name}`, err);
    }
  }

  /**
   * Grant a specific feat/talent to an actor
   */
  static async _grantFeatToActor(actor, grant, settingName, { offerReplacement = false } = {}) {
    try {
      const { type, name, id } = grant;

      // Check if actor already has this feat/talent (canonical id or normalized name)
      if (actorHasGrant(actor, grant)) {
        // Replacement is offered ONLY when a rule is switched on (never at world load / new actor), and only once per
        // actor + setting: an already-granted replacement means the opportunity was taken.
        const replacementId = buildGrantAcquisition({ settingKey: settingName, grantKind: 'replacement', replacesName: name }).grantId;
        const alreadyReplaced = actor.items.some((i) => (i.system?.acquisition?.grantId === replacementId));
        if (offerReplacement && !alreadyReplaced) await this._offerReplacement(actor, type, name, settingName);
        return;
      }

      // Grant the feat/talent
      await this._createFeatItem(actor, grant, settingName);

      SWSELogger.info(
        `Granted ${type} "${name}" to ${actor.name} (${settingName})`
      );
    } catch (err) {
      SWSELogger.error(
        `Error granting ${grant.type} to ${actor.name}`,
        err
      );
    }
  }

  /**
   * Create a feat/talent item on the actor
   */
  static async _createFeatItem(actor, grant, settingName = null) {
    const { type, name, id } = grant;
    const settingKey = settingName || HOUSE_RULE_GRANTS.find(g => g.id === id)?.setting || null;

    // Try to load from compendium for complete data
    let itemData = {
      name,
      type,
      img: 'icons/svg/upgrade.svg'
    };

    try {
      const doc = type === 'feat'
        ? await FeatRegistry.getDocumentById?.(id)
        : await TalentRegistry.getDocumentById?.(id);

      if (doc) {
        itemData = doc.toObject();
      }
    } catch (err) {
      SWSELogger.warn(`Could not load ${type} from compendium, using basic data`);
    }

    // Durable provenance for NEW grants: which setting caused it, automatic vs replacement, and that it consumes
    // no ordinary progression selection. (Existing items are never rewritten.)
    itemData = this._withGrantProvenance(itemData, actor, { settingKey, grantKind: 'automatic', canonicalId: id, canonicalName: name });

    return this._createGrantItem(actor, itemData, settingKey, 'automatic', { type, name, id });
  }

  /**
   * Create a grant item with a deterministic `_id` + keepId. If a concurrent writer (second GM client, overlapping
   * world-load / setting-change / Resolve) created the same grant first, Foundry rejects the duplicate key; that is
   * treated as "already granted", never as a failure and never as a second item.
   */
  static async _createGrantItem(actor, itemData, settingKey, grantKind, grant = null) {
    const data = { ...itemData, _id: deterministicGrantItemId(actor?.id, settingKey, grantKind) };
    try {
      // PHASE 7: Create through ActorEngine
      await ActorEngine.createEmbeddedDocuments(actor, 'Item', [data], { keepId: true });
      return { created: true };
    } catch (err) {
      const raced = grant ? actorHasGrant(actor, grant) : actor?.items?.some?.((i) => i.id === data._id || i._id === data._id);
      if (raced) return { created: false, reason: 'already-owned' };
      throw err;
    }
  }

  static _withGrantProvenance(itemData, actor, { settingKey, grantKind, canonicalId = null, canonicalName = null, replacesName = null }) {
    const acquisition = buildGrantAcquisition({ settingKey, grantKind, replacesName, actorId: actor?.id ?? null });
    const swseFlags = { ...(itemData.flags?.swse || {}), houseRuleGranted: true, houseRuleSetting: settingKey, ...(canonicalId ? { canonicalGrantId: canonicalId } : {}) };
    return {
      ...itemData,
      system: {
        ...(itemData.system || {}),
        sourceType: 'house-rule',
        grantedBy: 'house-rule',
        houseRuleGranted: true,
        houseRuleSetting: settingKey,
        ...(canonicalId ? { canonicalGrantId: canonicalId, canonicalGrantName: canonicalName } : {}),
        acquisition: { ...(itemData.system?.acquisition || {}), ...acquisition },
      },
      flags: { ...(itemData.flags || {}), swse: swseFlags },
    };
  }

  /**
   * Silent, idempotent grant of ONE rule's item if the character does not already own it. No dialogs, no
   * replacement offer. Used by the world-load pass and by the reconciliation "Add" action.
   * @returns {Promise<{created:boolean, reason?:string}>}
   */
  static async grantMissing(actor, settingName) {
    const entry = grantForSetting(settingName);
    if (!entry || actor?.type !== 'character') return { created: false, reason: 'not-applicable' };
    if (!isGrantEnabled(settingName)) return { created: false, reason: 'rule-disabled' };
    if (actorHasGrant(actor, entry)) return { created: false, reason: 'already-owned' };
    // Overlapping callers in THIS client (setting change + world-load pass + a Resolve click) share one operation.
    const key = `${actor.id}:${settingName}`;
    if (!this._inFlight) this._inFlight = new Map();
    if (this._inFlight.has(key)) return this._inFlight.get(key);
    const op = (async () => {
      try {
        const result = await this._createFeatItem(actor, entry, settingName);
        return result?.created ? { created: true } : { created: false, reason: 'already-owned' };
      } finally {
        this._inFlight.delete(key);
      }
    })();
    this._inFlight.set(key, op);
    return op;
  }

  /** World-load pass (GM client): grant any enabled rule's item a character lacks. Silent; never offers replacements. */
  static async reconcileActorGrants(actor) {
    for (const entry of HOUSE_RULE_GRANTS) {
      if (isGrantEnabled(entry.setting)) await this.grantMissing(actor, entry.setting);
    }
  }

  /**
   * Offer player a replacement feat/talent for one they already have
   */
  static async _offerReplacement(actor, type, name, settingName) {
    return new Promise((resolve) => {
      const typeLabel = type === 'feat' ? 'feat' : 'talent';
      const dialog = new SWSEDialogV2(
        {
          title: `${settingName} Granted: ${name}`,
          content: `
            <div style="padding: 1rem;">
              <p>
                Your Game Master has granted you the <strong>${typeLabel}</strong>
                <em>${name}</em> through a house rule change, but you already possess it.
              </p>
              <p style="margin-top: 1rem; margin-bottom: 1rem;">
                Would you like to select a replacement ${typeLabel} instead?
              </p>
              <div style="background: rgba(0,0,0,0.2); padding: 0.75rem; border-radius: 4px; font-size: 0.9em; color: #aaa;">
                Your GM has made this ${typeLabel} available to all characters. Since you already have it,
                you can choose a different ${typeLabel} to add to your character.
              </div>
            </div>
          `,
          buttons: {
            yes: {
              label: 'Yes, Choose Replacement',
              callback: () => {
                this._openReplacementDialog(actor, type, name, settingName);
                resolve();
              }
            },
            no: {
              label: 'No, Keep My Choices',
              callback: () => {
                SWSELogger.info(
                  `${actor.name} declined replacement for ${name}`
                );
                resolve();
              }
            }
          },
          default: 'yes'
        },
        { top: 400, left: 400 }
      );

      dialog.render(true);
    });
  }

  /**
   * Open a dialog for selecting a replacement feat/talent
   */
  static async _openReplacementDialog(actor, type, rejectedName, settingName = null) {
    try {
      const entries = type === 'feat' ? (FeatRegistry.getAll?.() || []) : (TalentRegistry.getAll?.() || []);
      const available = entries.filter(
        (item) =>
          // Exclude the feat that was already offered
          item.name.toLowerCase() !== rejectedName.toLowerCase() &&
          !actor.items.some(
            (i) =>
              i.type === type &&
              i.name.toLowerCase() === item.name.toLowerCase()
          )
      ).map((item) => ({ ...item, _id: item.id || item._id }));

      // Create dialog for selection
      this._showReplacementSelectionDialog(
        actor,
        type,
        available,
        rejectedName,
        settingName
      );
    } catch (err) {
      SWSELogger.error(`Error opening replacement dialog`, err);
      ui.notifications.error(
        `Could not open ${type} selection dialog`
      );
    }
  }

  /**
   * Show the actual replacement selection dialog with list of feats
   */
  static _showReplacementSelectionDialog(actor, type, availableItems, rejectedName, settingName = null) {
    const typeLabel = type === 'feat' ? 'Feat' : 'Talent';

    // Create HTML for selection
    let content = `
      <div style="padding: 1rem;">
        <p style="margin-bottom: 1rem;">
          Select a replacement ${type} to add to your character:
        </p>
        <div style="max-height: 400px; overflow-y: auto;">
    `;

    availableItems.slice(0, 50).forEach((item) => {
      content += `
        <div class="form-group" style="margin-bottom: 0.5rem;">
          <label style="display: flex; align-items: center; cursor: pointer; padding: 0.5rem; border-radius: 4px; background: rgba(0,0,0,0.1);">
            <input type="radio" name="replacement-feat" value="${item._id}" style="margin-right: 0.5rem;"/>
            <span>${item.name}</span>
          </label>
        </div>
      `;
    });

    if (availableItems.length > 50) {
      content += `<p style="color: #888; font-size: 0.9em;">And ${availableItems.length - 50} more...</p>`;
    }

    content += `
        </div>
      </div>
    `;

    const dialog = new SWSEDialogV2(
      {
        title: `Select Replacement ${typeLabel}`,
        content,
        buttons: {
          apply: {
            label: `Apply Replacement`,
            callback: (html) => {
              const selectedId = html.querySelector("input[name='replacement-feat']:checked")?.value;

              if (!selectedId) {
                ui.notifications.warn('Please select a replacement');
                return;
              }

              // Grant the replacement
              this._grantReplacementFeat(actor, type, selectedId, settingName, rejectedName);
            }
          },
          cancel: {
            label: 'Cancel',
            callback: () => {
              SWSELogger.info(
                `${actor.name} cancelled replacement selection`
              );
            }
          }
        },
        default: 'apply'
      },
      { width: 500, height: 600, top: 300, left: 400 }
    );

    dialog.render(true);
  }

  /**
   * Grant the replacement feat/talent to the actor
   */
  static async _grantReplacementFeat(actor, type, itemId, settingName = null, replacesName = null) {
    try {
      const item = type === 'feat'
        ? await FeatRegistry.getDocumentById?.(itemId)
        : await TalentRegistry.getDocumentById?.(itemId);
      if (!item) {
        ui.notifications.error(`Could not find ${type}`);
        return;
      }

      // Distinct house-rule entitlement identity: a replacement consumes NO ordinary progression slot.
      const itemData = this._withGrantProvenance(item.toObject(), actor, { settingKey: settingName, grantKind: 'replacement', replacesName });
      // Deterministic id: one replacement per actor + setting, duplicate-safe across clients.
      const result = await this._createGrantItem(actor, itemData, settingName, 'replacement');
      if (!result.created) {
        ui.notifications.info(`${actor.name} already has a replacement for this house rule.`);
        return;
      }

      ui.notifications.info(
        `Granted ${type} "${item.name}" to ${actor.name}`
      );
      SWSELogger.info(
        `Granted replacement ${type} "${item.name}" to ${actor.name}`
      );
    } catch (err) {
      SWSELogger.error(`Error granting replacement ${type}`, err);
      ui.notifications.error(`Could not grant replacement ${type}`);
    }
  }

  /**
   * Check if a default grant rule is enabled
   * PHASE 3A: Pilot family rules routed through FeatRulesAdapter
   * Out-of-scope rules (armoredDefenseForAll) use direct read
   */
  static _isDefaultGrantEnabled(settingName) {
    return isGrantEnabled(settingName);
  }
}
