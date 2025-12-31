import { SWSECharacterSheet } from "../character/swse-character-sheet.js";
import { SWSELogger } from "../../utils/logger.js";
import { SWSEVehicleHandler } from "./swse-vehicle-handler.js";
import { SWSEVehicleCore } from "./swse-vehicle-core.js";
import { CombatActionsMapper } from "../../combat/utils/combat-actions-mapper.js";

export class SWSEVehicleSheet extends SWSECharacterSheet {

  // =========================================================================
  // DEFAULT OPTIONS (FVTT v13+ Safe)
  // =========================================================================
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["swse", "sheet", "actor", "vehicle", "swse-app"],
      template: "systems/foundryvtt-swse/templates/actors/vehicle/vehicle-sheet.hbs",
      width: 750,
      height: 700,
      resizable: true,
      scrollY: [".sheet-body"],
      tabs: [
        {
          navSelector: ".sheet-tabs",
          contentSelector: ".sheet-body",
          initial: "main"
        }
      ],
      dragDrop: [
        {
          dragSelector: ".item-list .item",
          dropSelector: null
        }
      ]
    });
  }

  // =========================================================================
  // DATA PREPARATION (Must be async for future-proofing)
  // =========================================================================
  async getData(options = {}) {
    const context = await super.getData(options);

    // Ensure system object exists
    context.system ??= {};

    // Ensure weapons exist
    context.system.weapons ??= [];

    // Ensure crew positions exist & normalize legacy formats
    context.system.crewPositions ??= {
      pilot: null, copilot: null, gunner: null,
      engineer: null, shields: null, commander: null
    };

    for (const pos of Object.keys(context.system.crewPositions)) {
      const data = context.system.crewPositions[pos];
      if (typeof data === "string") {
        context.system.crewPositions[pos] = { name: data, uuid: null };
      }
    }

    context.system.shields ??= { value: 0, max: 0 };
    context.system.hull ??= { value: 0, max: 0 };
    context.system.tags ??= [];

    // Ensure attributes exist in total-safe format
    context.system.attributes ??= this.constructor.defaultAttributeBlock();

    // Add ship combat actions
    context.shipActions = CombatActionsMapper.getAllShipActionsByPosition();

    return context;
  }

  // Default attribute format usable everywhere
  static defaultAttributeBlock() {
    const blank = () => ({
      base: 10, racial: 0, temp: 0, total: 10, mod: 0
    });
    return {
      str: blank(), dex: blank(), con: blank(),
      int: blank(), wis: blank(), cha: blank()
    };
  }

  // =========================================================================
  // ACTIVATE UI LISTENERS
  // =========================================================================
  activateListeners(html) {
    super.activateListeners(html);

    if (!this.isEditable) return;

    html.find(".weapon-add").click(this._onAddWeapon.bind(this));
    html.find(".weapon-remove").click(this._onRemoveWeapon.bind(this));
    html.find(".weapon-roll").click(this._onRollWeapon.bind(this));

    html.find(".crew-slot")
      .on("drop", this._onCrewDrop.bind(this))
      .on("click", this._onCrewClick.bind(this));

    html.find(".crew-skill-roll").click(this._onCrewSkillRoll.bind(this));
    html.find(".crew-actions-toggle").click(this._onCrewActionsToggle.bind(this));
  }

  // =========================================================================
  // CREW ACTIONS PANEL TOGGLE
  // =========================================================================
  _onCrewActionsToggle(event) {
    const button = event.currentTarget;
    const container = button.closest(".crew-position");
    const panel = container?.querySelector(".crew-actions-panel");
    const icon = button.querySelector("i");

    if (!panel) return;

    const hidden = panel.style.display === "none";
    panel.style.display = hidden ? "block" : "none";

    if (icon) {
      icon.classList.toggle("fa-chevron-down", !hidden);
      icon.classList.toggle("fa-chevron-up", hidden);
    }
  }

  // =========================================================================
  // DROP HANDLING
  // =========================================================================
  async _onDrop(event) {
    const TextEditorImpl =
      foundry.applications?.ux?.TextEditor?.implementation || TextEditor;

    const data = TextEditorImpl.getDragEventData(event);

    if (!data) {
      SWSELogger.warn("SWSE | No drag-drop data received.");
      return false;
    }

    if (data.type === "Item") {
      const item = await fromUuid(data.uuid);
      if (!item) return false;

      // Weapon → ship weapon conversion
      if (item.type === "weapon") {
        return await this._handleWeaponDrop(item);
      }

      // Ship template
      if (SWSEVehicleHandler.isVehicleTemplate(item)) {
        const confirmed = await Dialog.confirm({
          title: "Apply Vehicle Template",
          content: `<p>Apply <strong>${item.name}</strong> template?</p>`
        });

        if (confirmed) {
          await SWSEVehicleHandler.applyVehicleTemplate(this.actor, item);
        }
        return true;
      }
    }

    return super._onDrop(event);
  }

  // =========================================================================
  // HANDLE WEAPON DROP
  // =========================================================================
  async _handleWeaponDrop(item) {
    const list = [...(this.actor.system.weapons ?? [])];

    const converted = {
      name: item.name,
      arc: "Forward",
      bonus: this._formatAttackBonus(item.system.attackBonus ?? 0),
      damage: item.system.damage ?? "0d0",
      range: item.system.range ?? "Close"
    };

    list.push(converted);

    await this.actor.update({ "system.weapons": list });

    ui.notifications.info(`${item.name} added to vehicle weapons.`);
    return true;
  }

  _formatAttackBonus(b) {
    const num = Number(b) || 0;
    return num >= 0 ? `+${num}` : `${num}`;
  }

  // =========================================================================
  // ADD / REMOVE WEAPONS
  // =========================================================================
  async _onAddWeapon(event) {
    const list = [...(this.actor.system.weapons ?? [])];

    list.push({
      name: "New Weapon",
      arc: "Forward",
      bonus: "+0",
      damage: "0d0",
      range: "Close"
    });

    await this.actor.update({ "system.weapons": list });
  }

  async _onRemoveWeapon(event) {
    const index = Number(event.currentTarget.dataset.index);

    // Validate index
    if (Number.isNaN(index) || index < 0) {
      SWSELogger.warn('SWSE | Invalid weapon index for removal');
      return;
    }

    const list = [...(this.actor.system.weapons ?? [])];

    if (index < list.length) {
      list.splice(index, 1);
      await this.actor.update({ "system.weapons": list });
    }
  }

  // =========================================================================
  // VEHICLE WEAPON ROLLS
  // =========================================================================
  async _onRollWeapon(event) {
    try {
      const index = Number(event.currentTarget.dataset.index);

      // Validate index
      if (Number.isNaN(index) || index < 0) {
        SWSELogger.warn('SWSE | Invalid weapon index for roll');
        return;
      }

      const weapon = this.actor.system.weapons?.[index];

      if (!weapon) {
        ui.notifications.warn('Weapon not found');
        return;
      }

      // Validate roll engine exists
      if (!game?.swse?.RollEngine?.safeRoll) {
        ui.notifications.error('Roll engine not available');
        SWSELogger.error('SWSE | RollEngine not found');
        return;
      }

      const rollData = this.actor.getRollData();
      const rollMode = game.settings?.get("core", "rollMode") ?? "public";

      // Attack roll
      const attack = await game.swse.RollEngine.safeRoll(
        `1d20${weapon.bonus}`,
        rollData
      );

      await attack.toMessage({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        flavor: `<strong>${weapon.name}</strong> Attack Roll`,
        rollMode
      });

      // Confirm hit → damage roll
      const hit = await Dialog.confirm({
        title: "Roll Damage?",
        content: "<p>Did the attack hit?</p>"
      });

      if (hit) {
        const damage = await game.swse.RollEngine.safeRoll(
          weapon.damage || "1d6",
          rollData
        );

        await damage.toMessage({
          speaker: ChatMessage.getSpeaker({ actor: this.actor }),
          flavor: `<strong>${weapon.name}</strong> Damage`,
          rollMode
        });
      }
    } catch (error) {
      SWSELogger.error('SWSE | Error rolling weapon:', error);
      ui.notifications.error('Failed to roll weapon');
    }
  }

  // =========================================================================
  // CREW ASSIGNMENT
  // =========================================================================
  static VALID_CREW_POSITIONS = ['pilot', 'copilot', 'gunner', 'engineer', 'shields', 'commander'];

  async _onCrewDrop(event) {
    const slot = event.currentTarget.dataset.slot;

    // Validate crew position
    if (!this.constructor.VALID_CREW_POSITIONS.includes(slot)) {
      SWSELogger.warn(`SWSE | Invalid crew position: ${slot}`);
      return;
    }

    const TextEditorImpl =
      foundry.applications?.ux?.TextEditor?.implementation || TextEditor;
    const data = TextEditorImpl.getDragEventData(event);

    if (!data || data.type !== "Actor") return;

    const actor = await fromUuid(data.uuid);
    if (!actor) {
      ui.notifications.warn('Actor not found');
      return;
    }

    await this.actor.update({
      [`system.crewPositions.${slot}`]: {
        name: actor.name,
        uuid: actor.uuid
      }
    });

    ui.notifications.info(`${actor.name} assigned to ${slot}.`);
  }

  async _onCrewClick(event) {
    const slot = event.currentTarget.dataset.slot;
    const crew = this.actor.system.crewPositions?.[slot];

    if (!crew) return;

    const name = typeof crew === "string" ? crew : crew.name;

    const confirmed = await Dialog.confirm({
      title: "Remove Crew Member",
      content: `<p>Remove <strong>${name}</strong> from ${slot}?</p>`
    });

    if (confirmed) {
      await this.actor.update({ [`system.crewPositions.${slot}`]: null });
      ui.notifications.info(`Removed ${name} from ${slot}.`);
    }
  }

  // =========================================================================
  // CREW SKILL ROLLS
  // =========================================================================
  _mapSkillNameToKey(skill) {
    const map = {
      "Pilot": "pilot",
      "Mechanics": "mechanics",
      "Use Computer": "use_computer",
      "Perception": "perception",
      "Persuasion": "persuasion",
      "Knowledge (Tactics)": "knowledge_tactics"
    };
    return (
      map[skill] ||
      skill.toLowerCase().replace(/\s+/g, "_")
    );
  }

  async _onCrewSkillRoll(event) {
    try {
      const btn = event.currentTarget;
      const position = btn.dataset.position;
      const skillName = btn.dataset.skill;
      const actionName = btn.dataset.actionName;
      const dc = btn.dataset.dc ? Number(btn.dataset.dc) : null;

      // Validate position
      if (!this.constructor.VALID_CREW_POSITIONS.includes(position)) {
        ui.notifications.warn(`Invalid crew position: ${position}`);
        return;
      }

      const skillKey = this._mapSkillNameToKey(skillName);
      const crew = this.actor.system.crewPositions?.[position];

      if (!crew) {
        ui.notifications.warn(`No crew assigned to ${position}.`);
        return;
      }

      const uuid = crew.uuid;
      if (!uuid) {
        ui.notifications.error(
          `Crew member data outdated. Please reassign crew to ${position}.`
        );
        return;
      }

      const crewActor = await fromUuid(uuid);
      if (!crewActor) {
        ui.notifications.error(`Crew actor not found.`);
        return;
      }

      const { SWSERoll } = await import("../../combat/rolls/enhanced-rolls.js");

      await SWSERoll.rollSkillCheck(crewActor, skillKey, {
        dc,
        actionName,
        vehicleName: this.actor.name,
        positionName: position
      });
    } catch (error) {
      SWSELogger.error('SWSE | Error rolling crew skill:', error);
      ui.notifications.error('Failed to roll crew skill');
    }
  }

  // =========================================================================
  // SAFETY STUBS (parent calls these)
  // =========================================================================
  _onAddFeat() {}
  _onRemoveFeat() {}
  _onAddTalent() {}
  _onRemoveTalent() {}
  _onAddForcePower() {}
  _onRemoveForcePower() {}
  _onRollForcePower() {}
  _onRefreshForcePowers() {}
  _onReloadForcePower() {}
  _onAddSkill() {}
  _onRemoveSkill() {}
  _onLevelUp() {}
  _onSecondWind() {}
  _onOpenStore() {}
}
