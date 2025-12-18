/**
 * SWSE Houserule Configuration Menus (Upgraded)
 * Modernizes all FormApplication classes for Foundry VTT V13–V15 compatibility
 * Includes safety, sanitation, error handling, and maintainability improvements.
 */

const NAMESPACE = "foundryvtt-swse";

/* -------------------------------------------------------------------------- */
/*                              UTILITY HELPERS                               */
/* -------------------------------------------------------------------------- */

function safeGet(setting) {
  try {
    return game.settings.get(NAMESPACE, setting);
  } catch (err) {
    console.error(`SWSE Houserules | Failed to read setting "${setting}"`, err);
    return null;
  }
}

function safeSet(setting, value) {
  try {
    return game.settings.set(NAMESPACE, setting, value);
  } catch (err) {
    console.error(`SWSE Houserules | Failed to save setting "${setting}"`, err);
  }
}

function _bool(v) {
  return v === true || v === "true" || v === "on" || v === "1";
}

function _num(v) {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

/* ========================================================================== */
/*                         CHARACTER CREATION MENU                             */
/* ========================================================================== */

export class CharacterCreationMenu extends FormApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "swse-character-creation-menu",
      title: "Character Creation Rules",
      template: "systems/foundryvtt-swse/templates/apps/houserules/character-creation.hbs",
      width: 600,
      height: "auto",
      tabs: [{ navSelector: ".tabs", contentSelector: ".content", initial: "abilities" }]
    });
  }

  getData() {
    return {
      ...safeGet("characterCreation"),
      isGM: game.user.isGM
    };
  }

  async _updateObject(event, formData) {
    await safeSet("characterCreation", formData);
    ui.notifications.info("Character creation rules updated");
  }
}

/* ========================================================================== */
/*                              ADVANCEMENT MENU                               */
/* ========================================================================== */

export class AdvancementMenu extends FormApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "swse-advancement-menu",
      title: "Advancement Rules",
      template: "systems/foundryvtt-swse/templates/apps/houserules/advancement.hbs",
      width: 600,
      height: "auto",
      tabs: [{ navSelector: ".tabs", contentSelector: ".content", initial: "levelup" }]
    });
  }

  getData() {
    return {
      talentEveryLevel: safeGet("talentEveryLevel"),
      crossClassSkillTraining: safeGet("crossClassSkillTraining"),
      retrainingEnabled: safeGet("retrainingEnabled"),
      skillFocusRestriction: safeGet("skillFocusRestriction"),
      isGM: game.user.isGM
    };
  }

  async _updateObject(event, formData) {
    await safeSet("talentEveryLevel", _bool(formData.talentEveryLevel));
    await safeSet("crossClassSkillTraining", _bool(formData.crossClassSkillTraining));
    await safeSet("retrainingEnabled", _bool(formData.retrainingEnabled));

    const restriction = {
      useTheForce: _num(formData["skillFocusRestriction.useTheForce"]),
      scaling: formData["skillFocusRestriction.scaling"]
    };

    await safeSet("skillFocusRestriction", restriction);
    ui.notifications.info("Advancement rules updated");
  }
}

/* ========================================================================== */
/*                                COMBAT MENU                                 */
/* ========================================================================== */

export class CombatMenu extends FormApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "swse-combat-menu",
      title: "Combat Rules",
      template: "systems/foundryvtt-swse/templates/apps/houserules/combat.hbs",
      width: 600,
      height: "auto",
      tabs: [{ navSelector: ".tabs", contentSelector: ".content", initial: "damage" }]
    });
  }

  getData() {
    return {
      deathSystem: safeGet("deathSystem"),
      secondWindImproved: safeGet("secondWindImproved"),
      armoredDefenseForAll: safeGet("armoredDefenseForAll"),
      weaponRangeMultiplier: safeGet("weaponRangeMultiplier"),
      diagonalMovement: safeGet("diagonalMovement"),
      conditionTrackCap: safeGet("conditionTrackCap"),
      criticalHitVariant: safeGet("criticalHitVariant"),
      isGM: game.user.isGM
    };
  }

  async _updateObject(event, formData) {
    const deathSystem = {
      system: formData["deathSystem.system"],
      strikesUntilDeath: _num(formData["deathSystem.strikesUntilDeath"]),
      returnToHP: _num(formData["deathSystem.returnToHP"]),
      strikeRemoval: formData["deathSystem.strikeRemoval"],
      displayStrikes: _bool(formData["deathSystem.displayStrikes"]),
      deathAtNegativeCon: _bool(formData["deathSystem.deathAtNegativeCon"]),
      massiveDamageThreshold: _num(formData["deathSystem.massiveDamageThreshold"])
    };

    await safeSet("deathSystem", deathSystem);
    await safeSet("secondWindImproved", _bool(formData.secondWindImproved));
    await safeSet("armoredDefenseForAll", _bool(formData.armoredDefenseForAll));
    await safeSet("weaponRangeMultiplier", _num(formData.weaponRangeMultiplier));
    await safeSet("diagonalMovement", formData.diagonalMovement);
    await safeSet("conditionTrackCap", _num(formData.conditionTrackCap));
    await safeSet("criticalHitVariant", formData.criticalHitVariant);

    ui.notifications.info("Combat rules updated");
  }
}

/* ========================================================================== */
/*                                FORCE MENU                                  */
/* ========================================================================== */

export class ForceMenu extends FormApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "swse-force-menu",
      title: "Force & Destiny Rules",
      template: "systems/foundryvtt-swse/templates/apps/houserules/force.hbs",
      width: 600,
      height: "auto"
    });
  }

  getData() {
    return {
      forcePointRecovery: safeGet("forcePointRecovery"),
      darkSideTemptation: safeGet("darkSideTemptation"),
      isGM: game.user.isGM
    };
  }

  async _updateObject(event, formData) {
    await safeSet("forcePointRecovery", formData.forcePointRecovery);
    await safeSet("darkSideTemptation", formData.darkSideTemptation);
    ui.notifications.info("Force & Destiny rules updated");
  }
}

/* ========================================================================== */
/*                               PRESETS MENU                                 */
/* ========================================================================== */

export class PresetsMenu extends FormApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "swse-presets-menu",
      title: "Houserule Presets",
      template: "systems/foundryvtt-swse/templates/apps/houserules/presets.hbs",
      width: 500,
      height: "auto"
    });
  }

  getData() {
    return {
      currentPreset: safeGet("houserulePreset"),
      isGM: game.user.isGM
    };
  }

  activateListeners(html) {
    super.activateListeners(html);

    html[0].querySelectorAll("[data-action='apply-preset']").forEach(btn =>
      btn.addEventListener("click", e => this._onApplyPreset(e))
    );

    html[0].querySelector("[data-action='export-settings']")?.addEventListener("click", e =>
      this._onExportSettings(e)
    );

    html[0].querySelector("[data-action='import-settings']")?.addEventListener("click", e =>
      this._onImportSettings(e)
    );
  }

  async _onApplyPreset(event) {
    const preset = event.currentTarget.dataset.preset;

    const confirmed = await Dialog.confirm({
      title: "Apply Preset?",
      content: `<p>Overwrite all current houserule settings with the <strong>${preset}</strong> preset?</p>`
    });
    if (!confirmed) return;

    const presets = await import("./houserule-presets.js");
    await presets.applyPreset(preset);

    await safeSet("houserulePreset", preset);
    ui.notifications.info(`Applied ${preset} preset`);

    this.render();
  }

  async _onExportSettings() {
    const settings = game.settings.storage
      .get("world")
      .filter(s => s.key.startsWith(NAMESPACE))
      .reduce((obj, s) => {
        obj[s.key.replace(`${NAMESPACE}.`, "")] = s.value;
        return obj;
      }, {});

    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "swse-houserules.json";
    a.click();

    URL.revokeObjectURL(url);
  }

  async _onImportSettings() {
    new Dialog({
      title: "Import Houserule Settings",
      content: `
        <form>
          <div class="form-group">
            <label>Select JSON file:</label>
            <input type="file" name="import-file" accept=".json"/>
          </div>
        </form>
      `,
      buttons: {
        import: {
          label: "Import",
          callback: async html => {
            const file = html[0].querySelector("[name='import-file']")?.files[0];
            if (!file) return;

            const text = await file.text();
            const json = JSON.parse(text);

            for (const [key, value] of Object.entries(json)) {
              await safeSet(key, value);
            }

            ui.notifications.info("Settings imported");
            this.render();
          }
        },
        cancel: { label: "Cancel" }
      }
    }).render(true);
  }
}

/* ========================================================================== */
/*                        SKILLS & FEATS MENU                                 */
/* ========================================================================== */

export class SkillsFeatsMenu extends FormApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "swse-skills-feats-menu",
      title: "Skills & Feats Rules",
      template: "systems/foundryvtt-swse/templates/apps/houserules/skills-feats.hbs",
      width: 600,
      height: "auto",
      tabs: [{ navSelector: ".tabs", contentSelector: ".content", initial: "skills" }]
    });
  }

  getData() {
    return {
      feintSkill: safeGet("feintSkill"),
      skillFocusVariant: safeGet("skillFocusVariant"),
      skillFocusActivationLevel: safeGet("skillFocusActivationLevel"),
      isGM: game.user.isGM
    };
  }

  async _updateObject(event, formData) {
    await safeSet("feintSkill", formData.feintSkill);
    await safeSet("skillFocusVariant", formData.skillFocusVariant);
    await safeSet("skillFocusActivationLevel", _num(formData.skillFocusActivationLevel));

    ui.notifications.info("Skills & Feats rules updated");
  }
}

/* ========================================================================== */
/*                         SPACE COMBAT MENU                                  */
/* ========================================================================== */

export class SpaceCombatMenu extends FormApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "swse-space-combat-menu",
      title: "Space Combat Rules",
      template: "systems/foundryvtt-swse/templates/apps/houserules/space-combat.hbs",
      width: 600,
      height: "auto",
      tabs: [{ navSelector: ".tabs", contentSelector: ".content", initial: "initiative" }]
    });
  }

  getData() {
    return {
      spaceInitiativeSystem: safeGet("spaceInitiativeSystem"),
      initiativeRolePriority: safeGet("initiativeRolePriority"),
      weaponsOperatorsRollInit: safeGet("weaponsOperatorsRollInit"),
      isGM: game.user.isGM
    };
  }

  activateListeners(html) {
    super.activateListeners(html);

    const list = html[0].querySelector(".role-priority-list");
    if (!list) return;

    this._activateDragAndDrop(list);
  }

  _activateDragAndDrop(list) {
    let dragging = null;

    list.querySelectorAll("li").forEach(li => {
      li.draggable = true;

      li.addEventListener("dragstart", evt => {
        dragging = li;
        li.classList.add("dragging");
        evt.dataTransfer.effectAllowed = "move";
      });

      li.addEventListener("dragend", () => {
        li.classList.remove("dragging");
        dragging = null;
      });

      li.addEventListener("dragover", evt => {
        evt.preventDefault();

        const after = this._getDragAfter(list, evt.clientY);
        if (after) list.insertBefore(dragging, after);
        else list.appendChild(dragging);
      });
    });
  }

  _getDragAfter(container, y) {
    const items = [...container.querySelectorAll("li:not(.dragging)")];

    return items.reduce(
      (closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - (box.top + box.height / 2);
        return offset < 0 && offset > closest.offset
          ? { offset, element: child }
          : closest;
      },
      { offset: Number.NEGATIVE_INFINITY }
    ).element;
  }

  async _updateObject(event, formData) {
    await safeSet("spaceInitiativeSystem", formData.spaceInitiativeSystem);
    await safeSet("weaponsOperatorsRollInit", _bool(formData.weaponsOperatorsRollInit));

    // Save new role priority
    const list = this.element[0].querySelector(".role-priority-list");
    if (list) {
      const ordered = [...list.querySelectorAll("li")].map(li => li.dataset.role);
      await safeSet("initiativeRolePriority", ordered);
    }

    ui.notifications.info("Space Combat rules updated");
  }
}
