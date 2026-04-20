// scripts/sheets/v2/npc-sheet.js
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { AbilityEngine } from "/systems/foundryvtt-swse/scripts/engine/abilities/AbilityEngine.js";
import { RenderAssertions } from "/systems/foundryvtt-swse/scripts/core/render-assertions.js";
import { RollEngine } from "/systems/foundryvtt-swse/scripts/engine/roll-engine.js";
import { SWSEChat } from "/systems/foundryvtt-swse/scripts/chat/swse-chat.js";
import { ActionEconomyBindings } from "/systems/foundryvtt-swse/scripts/ui/combat/action-economy-bindings.js";
import { applyResourceBarAnimations } from "/systems/foundryvtt-swse/scripts/sheets/v2/shared/resource-bar-animations.js";
import { computeCenteredPosition, getApplicationTargetSize } from "/systems/foundryvtt-swse/scripts/utils/sheet-position.js";
import { PortraitUploadController } from "/systems/foundryvtt-swse/scripts/sheets/v2/shared/PortraitUploadController.js";
import { NpcProfileBuilder } from "/systems/foundryvtt-swse/scripts/actors/npc/npc-profile-builder.js";
import { HouseRuleService } from "/systems/foundryvtt-swse/scripts/engine/system/HouseRuleService.js";
import { launchProgression, launchFollowerProgression } from "/systems/foundryvtt-swse/scripts/apps/progression-framework/progression-entry.js";
import { SWSEStore } from "/systems/foundryvtt-swse/scripts/apps/store/store-main.js";

function markActiveConditionStep(root, actor) {
  // AppV2: root is HTMLElement, not jQuery
  if (!(root instanceof HTMLElement)) {return;}

  const current = Number(actor?.system?.derived?.damage?.conditionStep ?? actor?.system?.conditionTrack?.current ?? 0);
  for (const el of root.querySelectorAll('.swse-v2-condition-step')) {
    const s = Number(el.dataset?.step);
    if (Number.isFinite(s) && s === current) {el.classList.add('active');}
  }
}


/**
 * SWSEV2NpcSheet
 * v2 sheets are dumb views:
 * - Read actor.system.derived only
 * - Emit intent via Actor APIs (which route through ActorEngine)
 * - _updateObject routes through ActorEngine
 */
const { HandlebarsApplicationMixin } = foundry.applications.api;
export class SWSEV2NpcSheet extends HandlebarsApplicationMixin(foundry.applications.sheets.ActorSheetV2) {
  static PARTS = {
    ...super.PARTS,
    body: {
      template: 'systems/foundryvtt-swse/templates/actors/npc/v2/npc-sheet.hbs'
    }
  };


  static DEFAULT_OPTIONS = {
    ...super.DEFAULT_OPTIONS,
    classes: ['swse', 'sheet', 'actor', 'npc', 'swse-sheet', 'swse-npc-sheet', 'v2'],
    width: 820,
    height: 920
  };

  /**
   * Convenience getter for accessing the actor document
   * Used throughout the sheet as this.actor instead of this.document
   */
  get actor() {
    return this.document;
  }

  async _prepareContext(options) {
    // Fail-fast: this sheet is for NPCs only
    if (this.document.type !== 'npc') {
      throw new Error(
        `SWSEV2NpcSheet requires actor type "npc", got "${this.document.type}"`
      );
    }

    RenderAssertions.assertActorValid(this.document, "SWSEV2NpcSheet");

    // AppV2 inheritance: Call super to get base context
    const baseContext = await super._prepareContext(options);

    // AppV2 Compatibility: Only pass serializable data
    // V13 AppV2 calls structuredClone() on render context - Document objects,
    // Collections, and User objects cannot be cloned. Extract only primitives and data.
    const actor = this.document;
    const context = {
      // Actor header data (serializable primitives only)
      actor: {
        id: actor.id,
        name: actor.name,
        type: actor.type,
        img: actor.img,
        _id: actor._id
      },
      system: actor.system,
      derived: actor.system?.derived ?? {},
      // Items: map to plain objects to avoid Collection serialization issues
      items: actor.items.map(item => ({
        id: item.id,
        name: item.name,
        type: item.type,
        img: item.img,
        system: item.system
      })),
      editable: this.isEditable,
      // User data (serializable primitives only)
      user: {
        id: game.user.id,
        name: game.user.name,
        role: game.user.role
      },
      config: CONFIG.SWSE,
      // Abilities panel data (Phase 3)
      feats: [],
      talents: [],
      racialAbilities: [],
      abilityPanel: {}
    };

    try {
      const abilityPanel = AbilityEngine.getCardPanelModelForActor(actor);
      context.abilityPanel = abilityPanel;
      context.talentAbilities = abilityPanel.all ?? [];
      context.feats = abilityPanel.all?.filter(a => a.type === "feat") ?? [];
      context.talents = abilityPanel.all?.filter(a => a.type === "talent") ?? [];
      context.racialAbilities = abilityPanel.all?.filter(a => a.type === "racialAbility") ?? [];
    } catch (err) {
      console.error('Error preparing abilities panel for NPC sheet:', err);
    }

    // NPC Profile Context (Phase 1: Contract Foundation)
    try {
      const npcProfile = NpcProfileBuilder.buildContext(actor);
      Object.assign(context, npcProfile);
    } catch (err) {
      console.error('Error building NPC profile context:', err);
    }

    // Action Economy Context (for combat tab)
    if (game.combat && game.combat.combatants.some(c => c.actor?.id === actor.id)) {
      // Only show action economy if actor is in active combat
      const combatId = game.combat.id;
      try {
        const { ActionEconomyPersistence } = await import("/systems/foundryvtt-swse/scripts/engine/combat/action/action-economy-persistence.js");
        const { ActionEngine } = await import("/systems/foundryvtt-swse/scripts/engine/combat/action/action-engine-v2.js");

        const turnState = ActionEconomyPersistence.getTurnState(actor, combatId);
        const state = ActionEngine.getVisualState(turnState);
        const breakdown = ActionEngine.getTooltipBreakdown(turnState);
        const enforcementMode = HouseRuleService.getString('actionEconomyMode', 'loose');

        context.actionEconomy = {
          state,
          breakdown,
          enforcementMode
        };
      } catch (err) {
        console.error("[SWSE] Error loading action economy context:", err);
      }
    }

    RenderAssertions.assertContextSerializable(context, "SWSEV2NpcSheet");

    this._talentAbilitiesCache = context.talentAbilities;
    // CRITICAL: Return context directly, do NOT use mergeObject with Documents
    // mergeObject tries to deeply clone all properties including Document references,
    // which have read-only 'id' properties. Context is already complete and serializable.
    return context;
  }

  async _onRender(context, options) {
    // ═══ FIX: Center on initial render (first time ever or after close/reopen) ═══
    // Use dynamic dimensions instead of hardcoding 820x920
    const isFirstRenderEver = !this.rendered;
    if (isFirstRenderEver) {
      this._hasBeenRendered = true;
      this._shouldCenterOnRender = true;
    }

    const shouldCenter = this._shouldCenterOnRender;
    if (shouldCenter) {
      const { width: targetWidth, height: targetHeight } = getApplicationTargetSize(this);
      const pos = computeCenteredPosition(targetWidth, targetHeight);
      this.setPosition({ left: pos.left, top: pos.top });
      this._shouldCenterOnRender = false;
    }

    // Phase 3: Enforce super._onRender call (AppV2 contract)
    await super._onRender(context, options);

    // Abort previous render's listeners to prevent duplicate event handlers
    this._renderAbort?.abort();
    this._renderAbort = new AbortController();
    const { signal } = this._renderAbort;

    // AppV2 invariant: all DOM access must use this.element
    const root = this.element;
    if (!(root instanceof HTMLElement)) {
      throw new Error("NpcSheet: element not HTMLElement");
    }

    // Wire action economy bindings for combat tab
    ActionEconomyBindings.setupAttackButtons(root, this.document);

    RenderAssertions.assertDOMElements(
      root,
      [".sheet-tabs", ".sheet-body"],
      "SWSEV2NpcSheet"
    );

    // Highlight the current condition step
    markActiveConditionStep(root, this.actor);
    applyResourceBarAnimations(this, root);

    // Portrait upload + auto-apply (click via data-edit="img", drag/drop here)
    PortraitUploadController.bind(root, { actor: this.actor, signal });

    // Condition step clicking
    for (const el of root.querySelectorAll('.swse-v2-condition-step')) {
      el.addEventListener('click', async (ev) => {
        ev.preventDefault();
        const step = Number(ev.currentTarget?.dataset?.step);
        if (!Number.isFinite(step)) {return;}
        if (typeof this.actor.setConditionTrackStep === 'function') {
          await this.actor.setConditionTrackStep(step);
        } else {
          await ActorEngine.updateActor(this.actor, { 'system.conditionTrack.current': step });
        }
      }, { signal });
    }

    // Condition track improvements
    const improveBtn = root.querySelector('.swse-v2-condition-improve');
    if (improveBtn) {
      improveBtn.addEventListener('click', async (ev) => {
        ev.preventDefault();
        if (typeof this.actor.improveConditionTrack === 'function') {
          await this.actor.improveConditionTrack();
        }
      }, { signal });
    }

    // Condition track worsening
    const worsenBtn = root.querySelector('.swse-v2-condition-worsen');
    if (worsenBtn) {
      worsenBtn.addEventListener('click', async (ev) => {
        ev.preventDefault();
        if (typeof this.actor.worsenConditionTrack === 'function') {
          await this.actor.worsenConditionTrack();
        }
      }, { signal });
    }

    // Talent Abilities panel (multi-option actions, filtering)
    this._bindTalentAbilitiesPanel(root, { signal });

    // Abilities tab handlers (Phase 3)
    this._bindAbilityCardHandlers(root, { signal });

    // Condition track persistence toggle
    const persistentCheckbox = root.querySelector('.swse-v2-condition-persistent');
    if (persistentCheckbox) {
      persistentCheckbox.addEventListener('change', async (ev) => {
        const flag = ev.currentTarget?.checked === true;
        if (typeof this.actor.setConditionTrackPersistent === 'function') {
          await this.actor.setConditionTrackPersistent(flag);
        }
      }, { signal });
    }

    /* ---- PROGRESSION FRAMEWORK BUTTONS (Chargen/Store/Mentor) ---- */

    root.querySelector('[data-action="cmd-chargen"]')?.addEventListener("click", async (ev) => {
      ev.preventDefault();
      await launchProgression(this.actor);
    }, { signal });

    root.querySelector('[data-action="cmd-store"]')?.addEventListener("click", async (ev) => {
      ev.preventDefault();
      new SWSEStore(this.actor).render(true);
    }, { signal });

    root.querySelector('[data-action="open-mentor"]')?.addEventListener("click", async (ev) => {
      ev.preventDefault();
      ui.notifications.info("Mentor interactions are not yet available on NPC sheets.");
    }, { signal });

    /* ---- PHASE 5: NPC PROGRESSION PANEL ACTIONS ---- */

    root.querySelector('[data-action="open-npc-levelup"]')?.addEventListener("click", async (ev) => {
      ev.preventDefault();
      const { SWSENpcLevelUpEntry } = await import("/systems/foundryvtt-swse/scripts/apps/levelup/npc-levelup-entry.js");
      new SWSENpcLevelUpEntry(this.actor).render(true);
    }, { signal });

    root.querySelector('[data-action="revert-npc-progression"]')?.addEventListener("click", async (ev) => {
      ev.preventDefault();
      const { NpcProgressionEngine } = await import("/systems/foundryvtt-swse/scripts/engine/progression/npc-progression-engine.js");

      const snapshotInfo = NpcProgressionEngine.getSnapshotInfo?.(this.actor);
      if (!snapshotInfo) {
        ui.notifications.warn('No snapshot available to revert to.');
        return;
      }

      const { SWSEDialogV2 } = await import("/systems/foundryvtt-swse/scripts/apps/dialogs/swse-dialog-v2.js");
      const ok = await SWSEDialogV2.confirm({
        title: 'Revert NPC to Statblock Snapshot',
        content: `<p>This restores the NPC to: <strong>${snapshotInfo.label}</strong> (${snapshotInfo.date})</p><p>Items, effects, and all attributes will be restored exactly.</p>`
      });
      if (!ok) {return;}

      try {
        await NpcProgressionEngine.revertToSnapshot(this.actor);
        ui.notifications.info('NPC reverted to snapshot.');
        this.render(false);
      } catch (err) {
        console.error('Snapshot revert failed:', err);
        ui.notifications.error('Failed to revert NPC to snapshot.');
      }
    }, { signal });

    // Open follower advancement flow (from follower NPC sheet → owner's FollowerShell)
    root.querySelector('[data-action="open-follower-advancement"]')?.addEventListener('click', async (ev) => {
      ev.preventDefault();
      const ownerActorId = this.actor.system?.npcProfile?.owner?.actorId
        || this.actor.flags?.swse?.follower?.ownerId
        || null;
      if (!ownerActorId) {
        ui.notifications?.warn('No owner is linked to this follower.');
        return;
      }
      const ownerActor = game.actors?.get(ownerActorId);
      if (!ownerActor) {
        ui.notifications?.warn('Owner actor could not be found in this world.');
        return;
      }
      await launchFollowerProgression(ownerActor, { existingFollowerId: this.actor.id });
    }, { signal });

    // Open related actor sheet (linked relationship cards)
    const _openRelatedActor = (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      const actorId = ev.currentTarget?.dataset?.actorId;
      if (!actorId) return;
      const relatedActor = game.actors?.get(actorId);
      if (!relatedActor?.sheet) {
        ui.notifications?.warn('Related actor could not be found.');
        return;
      }
      relatedActor.sheet.render(true);
    };
    for (const el of root.querySelectorAll('[data-action="open-related-actor"]')) {
      el.addEventListener('click', _openRelatedActor, { signal });
      if (el.tagName !== 'BUTTON') {
        el.addEventListener('keydown', (ev) => {
          if (ev.key === 'Enter' || ev.key === ' ') _openRelatedActor(ev);
        }, { signal });
      }
    }

    // Item sheet opening
    for (const el of root.querySelectorAll('.swse-v2-open-item')) {
      el.addEventListener('click', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const itemId = ev.currentTarget?.dataset?.itemId;
        if (!itemId) {return;}
        const item = this.actor?.items?.get(itemId);
        item?.sheet?.render(true);
      }, { signal });
    }

    // Action execution
    for (const el of root.querySelectorAll('.swse-v2-use-action')) {
      el.addEventListener('click', async (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const actionId = ev.currentTarget?.dataset?.actionId;
        if (!actionId) {return;}
        if (typeof this.actor.useAction === 'function') {
          await this.actor.useAction(actionId);
        }
      }, { signal });
    }

    RenderAssertions.assertRenderComplete(
      this,
      "SWSEV2NpcSheet"
    );
  }

  async _onClose(options) {
    // Cleanup all event listeners on close
    this._renderAbort?.abort();
    return super._onClose(options);
  }

  _bindTalentAbilitiesPanel(root, { signal } = {}) {
    for (const container of root.querySelectorAll('.swse-talent-abilities-container')) {
      if (container.dataset.abilityBound === 'true') continue;
      container.dataset.abilityBound = 'true';

      const applyFilter = (filter) => {
        for (const btn of container.querySelectorAll('.ability-filter-btn')) {
          btn.classList.toggle('active', btn.dataset.filter === filter);
        }

        for (const card of container.querySelectorAll('.ability-card')) {
          const type = card.dataset.actionType;
          const show = filter === 'all' || type === filter;
          card.style.display = show ? '' : 'none';
        }
      };

      container.addEventListener('click', async (ev) => {
        const filterBtn = ev.target.closest('.ability-filter-btn');
        if (filterBtn?.dataset?.filter) {
          ev.preventDefault();
          applyFilter(filterBtn.dataset.filter);
          return;
        }

        const actionEl = ev.target.closest('[data-action]');
        if (!actionEl) return;

        const action = actionEl.dataset.action;

        if (action === 'expandAbility' || action === 'showMultiOptions') {
          ev.preventDefault();
          const card = actionEl.closest('.ability-card');
          if (!card) return;

          const isExpanded = card.classList.toggle('expanded');

          if (action === 'showMultiOptions') {
            const list = card.querySelector('.multi-option-sub-abilities');
            if (list) {
              list.style.display = isExpanded ? '' : 'none';
            }
          }

          return;
        }

        if (action === 'useSubAbility') {
          ev.preventDefault();

          const subId = actionEl.dataset.subAbilityId;
          if (!subId) return;

          const cache = this._talentAbilitiesCache;
          const subAbility =
            cache?.all?.flatMap(a => a.subAbilities || []).find(a => a.id === subId);

          if (!subAbility) return;

          if (subAbility.usesData?.isLimited && subAbility.usesData?.canUse === false) {
            ui.notifications?.warn?.('No uses remaining.');
            return;
          }

          const speaker = ChatMessage.getSpeaker({ actor: this.actor });

          if (subAbility.rollData?.canRoll && subAbility.rollData?.formula) {
            const rollData = this.actor?.getRollData?.() ?? {};
            const roll = await RollEngine.safeRoll(subAbility.rollData.formula, rollData);

            if (!roll) return; // Roll failed

            const flavorParts = [
              `<strong>${subAbility.name}</strong>`,
              subAbility.typeLabel ? `(${subAbility.typeLabel})` : '',
              subAbility.rollData.vsLabel ? `${subAbility.rollData.vsLabel}` : '',
              subAbility.rollData.dcLabel ? `${subAbility.rollData.dcLabel}` : ''
            ].filter(Boolean);

            await SWSEChat.postRoll({
              roll,
              actor: this.actor,
              flavor: flavorParts.join(' ')
            });
            return;
          }

          const content = `
            <div class="swse-ability-chat-card">
              <h3>${foundry.utils.escapeHTML(subAbility.name || '')}</h3>
              ${subAbility.typeLabel ? `<p><strong>Action:</strong> ${foundry.utils.escapeHTML(subAbility.typeLabel)}</p>` : ''}
              ${subAbility.description ? `<p>${foundry.utils.escapeHTML(subAbility.description)}</p>` : ''}
            </div>
          `;

          await SWSEChat.postHTML({
            content,
            actor: this.actor
          });
        }
      }, { signal });

      applyFilter('all');
    }
  }

  /* -------- ABILITIES TAB HANDLERS (Phase 3) -------- */

  _bindAbilityCardHandlers(root, { signal } = {}) {
    // Ability card chat button
    root.querySelectorAll('.ability-chat-btn').forEach((btn) => {
      btn.addEventListener('click', async (ev) => {
        ev.preventDefault();
        const abilityId = ev.currentTarget?.dataset?.abilityId;
        if (!abilityId) return;

        try {
          const { ActionChatEngine } = await import("/systems/foundryvtt-swse/scripts/chat/action-chat-engine.js");
          await ActionChatEngine.emote(this.actor, `uses ability: ${abilityId}`);
        } catch (err) {
          console.error('Error posting ability chat:', err);
        }
      }, { signal });
    });

    // Ability card roll button
    root.querySelectorAll('.ability-roll-btn').forEach((btn) => {
      btn.addEventListener('click', async (ev) => {
        ev.preventDefault();
        const abilityId = ev.currentTarget?.dataset?.abilityId;
        if (!abilityId) return;

        try {
          const ability = this.actor.items?.get(abilityId);
          if (ability && typeof rollAttack === 'function') {
            const { rollAttack } = await import("/systems/foundryvtt-swse/scripts/combat/rolls/attacks.js");
            await rollAttack(this.actor, ability);
          }
        } catch (err) {
          console.error('Error rolling ability:', err);
        }
      }, { signal });
    });

    // Ability card use button
    root.querySelectorAll('.ability-use-btn').forEach((btn) => {
      btn.addEventListener('click', async (ev) => {
        ev.preventDefault();
        const abilityId = ev.currentTarget?.dataset?.abilityId;
        if (!abilityId) return;

        try {
          const ability = this.actor.items?.get(abilityId);
          if (ability) {
            // Mark as used
            const { AbilityUsage } = await import("/systems/foundryvtt-swse/scripts/engine/abilities/ability-usage.js");
            await AbilityUsage.markUsed(this.actor, abilityId);
            this.render();
          }
        } catch (err) {
          console.error('Error using ability:', err);
        }
      }, { signal });
    });
  }

  async _onSubmitForm(event) {
    event.preventDefault();

    const form = event.target;
    const formData = new FormData(form);
    const formDataObj = Object.fromEntries(formData.entries());
    const expanded = foundry.utils.expandObject(formDataObj);

    if (!expanded) {return;}

    try {
      // CRITICAL: Include ALL fields (name, system, etc.) not just system.
      // Route directly through governance layer to bypass Foundry's actor.update()
      await ActorEngine.updateActor(this.actor, expanded);
    } catch (err) {
      console.error('Sheet submission failed:', err);
      ui.notifications.error(`Failed to update actor: ${err.message}`);
    }
  }
}
