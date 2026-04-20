/**
 * Combat UI event listener registration
 *
 * Handles all combat-related interactions:
 * - Combat action filtering and sorting
 * - Action economy reset
 * - Combat action execution
 * - Attack rolls
 * - Action breakdown toggles
 */

/**
 * Activate combat UI listeners
 * @param {SWSEV2CharacterSheet} sheet - The character sheet instance
 * @param {HTMLElement} html - The rendered sheet element
 * @param {AbortSignal} signal - Abort signal for cleanup
 */
export function activateCombatUI(sheet, html, { signal } = {}) {
  if (!sheet || !html) return;

  // Filter combat actions by search
  const combatSearchInput = html.querySelector('.combat-actions-search');
  if (combatSearchInput) {
    combatSearchInput.addEventListener('input', (event) => {
      const filterText = event.target.value.toLowerCase();
      const actionRows = html.querySelectorAll('.combat-action-row');

      actionRows.forEach(row => {
        const actionName = row.querySelector('.action-name')?.textContent.toLowerCase() ?? '';
        const actionNotes = row.querySelector('.action-notes')?.textContent.toLowerCase() ?? '';
        const matches = actionName.includes(filterText) || actionNotes.includes(filterText);
        row.style.display = matches ? '' : 'none';
      });
    }, { signal });
  }

  // Sort combat actions
  const combatSortSelect = html.querySelector('.combat-actions-sort');
  if (combatSortSelect) {
    combatSortSelect.addEventListener('change', (event) => {
      const sortMode = event.target.value;
      const actionContent = html.querySelector('.combat-actions-content');
      if (!actionContent) return;

      if (sortMode === 'name') {
        // Sort by name within each group
        const groups = actionContent.querySelectorAll('.combat-action-group');
        groups.forEach(group => {
          const rows = Array.from(group.querySelectorAll('.combat-action-row'));
          rows.sort((a, b) => {
            const nameA = a.querySelector('.action-name')?.textContent ?? '';
            const nameB = b.querySelector('.action-name')?.textContent ?? '';
            return nameA.localeCompare(nameB);
          });

          const list = group.querySelector('.combat-action-list');
          if (list) {
            rows.forEach(row => list.appendChild(row));
          }
        });
      }
      // 'economy' is default, groups are already organized by economy
    }, { signal });
  }

  // New Round / Manual Reset Button
  html.querySelectorAll('[data-action="new-round"]').forEach(button => {
    button.addEventListener('click', async (event) => {
      event.preventDefault();

      if (!game.combat) {
        ui?.notifications?.warn?.('No active combat');
        return;
      }

      const combatId = game.combat.id;
      const { ActionEconomyPersistence } = await import('/systems/foundryvtt-swse/scripts/engine/combat/action/action-economy-persistence.js');

      try {
        // Reset action economy for this actor
        await ActionEconomyPersistence.resetTurnState(sheet.actor, combatId);
        ui?.notifications?.info?.(`${sheet.actor.name} actions reset for new round`);

        // Trigger a re-render to update the action economy indicator
        sheet.render(false);
      } catch (err) {
        // console.error('Failed to reset turn state:', err);
        ui?.notifications?.error?.('Failed to reset actions');
      }
    }, { signal });
  });

  // Action click (cards and table rows)
  html.querySelectorAll(".swse-combat-action-card, .action-row").forEach(element => {
    element.addEventListener("click", async (event) => {
      if (event.target.classList.contains("hide-action")) return;
      const key = event.currentTarget.dataset.actionKey;
      if (!key) return;

      const combatActions = sheet.actor.getFlag(game.system.id, "combatActions") ?? {};
      const data = combatActions[key] ?? {};

      await sheet._runCanonicalCombatAction(key, data, {
        source: "combat-action-card"
      });
    }, { signal });
  });

  // Hide individual action
  html.querySelectorAll(".hide-action").forEach(button => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const el = event.currentTarget.closest(".swse-combat-action-card, .action-row");
      if (el) el.classList.add("collapsed");
    }, { signal });
  });

  // Collapse group (table mode)
  html.querySelectorAll(".collapse-group").forEach(button => {
    button.addEventListener("click", (event) => {
      const groupKey = event.currentTarget.dataset.group;
      if (groupKey) {
        const table = html.querySelector(`table[data-group='${groupKey}']`);
        if (table) table.classList.toggle("collapsed");
      }
    }, { signal });
  });

  // Use action button
  html.querySelectorAll('[data-action="swse-v2-use-action"]').forEach(button => {
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      const actionId = button.dataset.actionId;
      if (!actionId) return;

      const combatActions = sheet.actor.getFlag(game.system.id, "combatActions") ?? {};
      const data = combatActions[actionId] ?? {};

      await sheet._runCanonicalCombatAction(actionId, data, {
        source: "combat-action-button"
      });
    }, { signal });
  });

  // Weapon attack roll button (Combat Attacks simplified panel)
  html.querySelectorAll('[data-action="roll-attack"]').forEach(button => {
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      const weaponId = button.dataset.weaponId;
      if (!weaponId) return;

      const weapon = sheet.actor.items.get(weaponId);
      if (!weapon || weapon.type !== "weapon") return;

      await sheet._runCanonicalAttack(weapon, {
        source: "combat-tab"
      });
    }, { signal });
  });

  // Toggle attack breakdown details
  html.querySelectorAll('[data-action="toggle-attack-details"]').forEach(button => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      const attackBlock = button.closest('.swse-attack-block');
      if (!attackBlock) return;

      const breakdown = attackBlock.querySelector('.attack-breakdown');
      if (!breakdown) return;

      const isHidden = breakdown.style.display === 'none';
      breakdown.style.display = isHidden ? 'flex' : 'none';
      button.classList.toggle('active', isHidden);
      button.setAttribute('aria-expanded', isHidden);
    }, { signal });
  });
}
