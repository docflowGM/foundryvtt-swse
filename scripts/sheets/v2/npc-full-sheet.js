// scripts/sheets/v2/npc-full-sheet.js

import { SWSEV2CharacterSheet } from "./character-sheet.js";

export class SWSEV2FullNpcSheet extends SWSEV2CharacterSheet {

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["swse", "swse-app", "swse-sheet", "swse-npc-sheet", "swse-npc-full-sheet", "v2"]
    });
  }

  async _prepareContext(options) {
    // Check actor type for NPCs
    const actor = this.document;
    if (actor.type !== "npc") {
      throw new Error(
        `SWSEV2FullNpcSheet requires actor type "npc", got "${actor.type}"`
      );
    }

    // Use character sheet context preparation
    return await super._prepareContext(options);
  }

  async _onRender(context, options) {
    // Call parent _onRender to set up all character sheet listeners
    await super._onRender(context, options);

    // Add NPC-specific button handler
    const root = this.element;
    if (!(root instanceof HTMLElement)) return;

    // Add switch-to-combat button to command bar if it exists
    const commandBar = root.querySelector('.datapad-command-bar');
    if (commandBar) {
      // Check if button already exists
      if (!commandBar.querySelector('[data-action="switch-combat-mode"]')) {
        const switchBtn = document.createElement('button');
        switchBtn.type = 'button';
        switchBtn.className = 'cmd-combat-mode';
        switchBtn.setAttribute('data-action', 'switch-combat-mode');
        switchBtn.setAttribute('title', 'Switch to Combat Mode');
        switchBtn.textContent = '⚔ Combat Mode';
        commandBar.appendChild(switchBtn);

        switchBtn.addEventListener('click', async (ev) => {
          ev.preventDefault();
          await this.actor.update({ "system.sheetMode": "combat" });
        });
      }
    }

    // Also listen for any existing switch button (for compatibility)
    const switchCombatBtn = root.querySelector('[data-action="switch-combat-mode"]');
    if (switchCombatBtn && !switchCombatBtn.hasListener) {
      switchCombatBtn.hasListener = true;
      switchCombatBtn.addEventListener("click", async (ev) => {
        ev.preventDefault();
        await this.actor.update({ "system.sheetMode": "combat" });
      });
    }
  }
}
