// scripts/sheets/v2/npc-sheet.js
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { TalentEffectEngine } from "/systems/foundryvtt-swse/scripts/engine/talent/talent-effect-engine.js";
import { AbilityEngine } from "/systems/foundryvtt-swse/scripts/engine/abilities/AbilityEngine.js";
import { RenderAssertions } from "/systems/foundryvtt-swse/scripts/core/render-assertions.js";
import { RollEngine } from "/systems/foundryvtt-swse/scripts/engine/roll-engine.js";

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


  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ['swse', 'swse-sheet', 'swse-npc-sheet', 'v2'],
      width: 820,
      height: 920,
      tabs: [{ navSelector: '.sheet-tabs', contentSelector: '.sheet-body', initial: 'summary' }],
      scrollY: ['.sheet-body']
    });
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
      talentAbilities: TalentEffectEngine.toSerializable(TalentEffectEngine.getAbilitiesForActor(actor)),
      // Abilities panel data (Phase 3)
      feats: [],
      talents: [],
      racialAbilities: [],
      abilityPanel: {}
    };

    try {
      const abilityPanel = AbilityEngine.getCardPanelModelForActor(actor);
      context.abilityPanel = abilityPanel;
      context.feats = abilityPanel.all?.filter(a => a.type === "feat") ?? [];
      context.talents = abilityPanel.all?.filter(a => a.type === "talent") ?? [];
      context.racialAbilities = abilityPanel.all?.filter(a => a.type === "racialAbility") ?? [];
    } catch (err) {
      console.error('Error preparing abilities panel for NPC sheet:', err);
    }

    RenderAssertions.assertContextSerializable(context, "SWSEV2NpcSheet");

    this._talentAbilitiesCache = context.talentAbilities;
    return foundry.utils.mergeObject(baseContext, context);
  }

  async _onRender(context, options) {
    // AppV2 invariant: all DOM access must use this.element
    const root = this.element;
    if (!(root instanceof HTMLElement)) {
      throw new Error("NpcSheet: element not HTMLElement");
    }

    RenderAssertions.assertDOMElements(
      root,
      [".sheet-tabs", ".sheet-body"],
      "SWSEV2NpcSheet"
    );

    // Highlight the current condition step
    markActiveConditionStep(root, this.actor);

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
      });
    }

    // Condition track improvements
    const improveBtn = root.querySelector('.swse-v2-condition-improve');
    if (improveBtn) {
      improveBtn.addEventListener('click', async (ev) => {
        ev.preventDefault();
        if (typeof this.actor.improveConditionTrack === 'function') {
          await this.actor.improveConditionTrack();
        }
      });
    }

    // Condition track worsening
    const worsenBtn = root.querySelector('.swse-v2-condition-worsen');
    if (worsenBtn) {
      worsenBtn.addEventListener('click', async (ev) => {
        ev.preventDefault();
        if (typeof this.actor.worsenConditionTrack === 'function') {
          await this.actor.worsenConditionTrack();
        }
      });
    }

    // Talent Abilities panel (multi-option actions, filtering)
    this._bindTalentAbilitiesPanel(root);

    // Abilities tab handlers (Phase 3)
    this._bindAbilityCardHandlers(root);

    // Condition track persistence toggle
    const persistentCheckbox = root.querySelector('.swse-v2-condition-persistent');
    if (persistentCheckbox) {
      persistentCheckbox.addEventListener('change', async (ev) => {
        const flag = ev.currentTarget?.checked === true;
        if (typeof this.actor.setConditionTrackPersistent === 'function') {
          await this.actor.setConditionTrackPersistent(flag);
        }
      });
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
      });
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
      });
    }

    RenderAssertions.assertRenderComplete(
      this,
      "SWSEV2NpcSheet"
    );
  }

  _bindTalentAbilitiesPanel(root) {
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

            await roll.toMessage({ speaker, flavor: flavorParts.join(' ') });
            return;
          }

          const content = `
            <div class="swse-ability-chat-card">
              <h3>${foundry.utils.escapeHTML(subAbility.name || '')}</h3>
              ${subAbility.typeLabel ? `<p><strong>Action:</strong> ${foundry.utils.escapeHTML(subAbility.typeLabel)}</p>` : ''}
              ${subAbility.description ? `<p>${foundry.utils.escapeHTML(subAbility.description)}</p>` : ''}
            </div>
          `;

          await ChatMessage.create({ speaker, content });
        }
      });

      applyFilter('all');
    }
  }

  /* -------- ABILITIES TAB HANDLERS (Phase 3) -------- */

  _bindAbilityCardHandlers(root) {
    // Ability card chat button
    root.querySelectorAll('.ability-chat-btn').forEach((btn) => {
      btn.addEventListener('click', async (ev) => {
        ev.preventDefault();
        const abilityId = ev.currentTarget?.dataset?.abilityId;
        if (!abilityId) return;

        try {
          const { ActionChatEngine } = await import('../../chat/action-chat-engine.js');
          await ActionChatEngine.emote(this.actor, `uses ability: ${abilityId}`);
        } catch (err) {
          console.error('Error posting ability chat:', err);
        }
      });
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
            const { rollAttack } = await import('../../combat/rolls/attacks.js');
            await rollAttack(this.actor, ability);
          }
        } catch (err) {
          console.error('Error rolling ability:', err);
        }
      });
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
            const { AbilityUsage } = await import('../../engine/abilities/ability-usage.js');
            await AbilityUsage.markUsed(this.actor, abilityId);
            this.render();
          }
        } catch (err) {
          console.error('Error using ability:', err);
        }
      });
    });
  }

  async _updateObject(event, formData) {
    const expanded = foundry.utils.expandObject(formData);
    if (!expanded?.system) {return;}
    await ActorEngine.updateActor(this.actor, { system: expanded.system });
  }
}
