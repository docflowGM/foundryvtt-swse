// ============================================
// Ability scores and defenses for CharGen  
// ============================================

import { SWSELogger } from '../../utils/logger.js';



const _SPECIES_MOD_CLASSES = ["mod-positive", "mod-negative", "mod-neutral"];

function _formatSigned(n) {
  const v = Number(n || 0);
  return `${v > 0 ? "+" : ""}${v}`;
}

function _speciesModClass(n) {
  const v = Number(n || 0);
  if (v > 0) return "mod-positive";
  if (v < 0) return "mod-negative";
  return "mod-neutral";
}

function _applySpeciesModDisplay(speciesNumEl, mod) {
  if (!speciesNumEl) return;
  speciesNumEl.textContent = _formatSigned(mod);
  _SPECIES_MOD_CLASSES.forEach(c => speciesNumEl.classList.remove(c));
  speciesNumEl.classList.add(_speciesModClass(mod));
}

function _updateAbilityBreakdown(containerEl, { base, speciesMod, total, mod }) {
  if (!containerEl) return;

  const baseEl = containerEl.querySelector(".base-num");
  const speciesEl = containerEl.querySelector(".species-num");
  const totalEl = containerEl.querySelector(".total-num");
  const modEl = containerEl.querySelector(".mod-num");

  if (baseEl) baseEl.textContent = base ?? "--";
  _applySpeciesModDisplay(speciesEl, speciesMod);

  if (totalEl) totalEl.textContent = total ?? "--";
  if (modEl) modEl.textContent = typeof mod === "number" ? _formatSigned(mod) : "--";
}

/**
 * Recalculate all ability scores (total and modifier)
 */
export function _recalcAbilities() {
  for (const [k, v] of Object.entries(this.characterData.abilities)) {
    v.total = (Number(v.base || 10) + Number(v.racial || 0) + Number(v.temp || 0));
    v.mod = Math.floor((v.total - 10) / 2);
  }
}

/**
 * Recalculate defenses (Fortitude, Reflex, Will)
 */
export function _recalcDefenses() {
  // Ensure defenses are initialized
  if (!this.characterData.defenses) {
    this.characterData.defenses = {
      fort: { base: 10, armor: 0, ability: 0, classBonus: 0, misc: 0, total: 10 },
      reflex: { base: 10, armor: 0, ability: 0, classBonus: 0, misc: 0, total: 10 },
      will: { base: 10, armor: 0, ability: 0, classBonus: 0, misc: 0, total: 10 }
    };
  }

  // Ensure each defense type has classBonus
  if (!this.characterData.defenses.fort) {
    this.characterData.defenses.fort = { base: 10, armor: 0, ability: 0, classBonus: 0, misc: 0, total: 10, ability: 'con' };
  } else if (!this.characterData.defenses.fort.ability) {
    this.characterData.defenses.fort.ability = 'con';
  }
  if (!this.characterData.defenses.reflex) {
    this.characterData.defenses.reflex = { base: 10, armor: 0, ability: 0, classBonus: 0, misc: 0, total: 12, ability: 'dex' };
  } else if (!this.characterData.defenses.reflex.ability) {
    this.characterData.defenses.reflex.ability = 'dex';
  }
  if (!this.characterData.defenses.will) {
    this.characterData.defenses.will = { base: 10, armor: 0, ability: 0, classBonus: 0, misc: 0, total: 11, ability: 'wis' };
  } else if (!this.characterData.defenses.will.ability) {
    this.characterData.defenses.will.ability = 'wis';
  }

  const halfLevel = Math.floor(this.characterData.level / 2);

  // Fortitude: 10 + level/2 + CON or STR (whichever is higher) + class bonus + misc
  const fortAbility = Math.max(
    this.characterData.abilities.con.mod || 0,
    this.characterData.abilities.str.mod || 0
  );
  this.characterData.defenses.fort.total =
    10 + halfLevel + fortAbility +
    (this.characterData.defenses.fort.classBonus || 0) +
    (this.characterData.defenses.fort.misc || 0);

  // Reflex: 10 + level/2 + DEX + class bonus + misc
  this.characterData.defenses.reflex.total =
    10 + halfLevel + (this.characterData.abilities.dex.mod || 0) +
    (this.characterData.defenses.reflex.classBonus || 0) +
    (this.characterData.defenses.reflex.misc || 0);

  // Will: 10 + level/2 + WIS + class bonus + misc
  this.characterData.defenses.will.total =
    10 + halfLevel + (this.characterData.abilities.wis.mod || 0) +
    (this.characterData.defenses.will.classBonus || 0) +
    (this.characterData.defenses.will.misc || 0);
}

/**
 * Bind abilities UI with point buy, rolling, and organic systems
 */
export function _bindAbilitiesUI(root) {
    // Capture the CharacterGenerator instance context
    const chargen = this;
    // Droids don't have CON ability
    const ablist = chargen.characterData.isDroid
        ? ["str", "dex", "int", "wis", "cha"]
        : ["str", "dex", "con", "int", "wis", "cha"];

    SWSELogger.log("SWSE | Binding abilities UI, root:", root);

    // Point buy system
    // Get the correct point buy pool from settings
    const pointBuyPool = chargen.characterData.isDroid
      ? (game.settings.get('foundryvtt-swse', "droidPointBuyPool") || 20)
      : (game.settings.get('foundryvtt-swse', "livingPointBuyPool") || 25);

    let pool = pointBuyPool;
    // Cumulative cost table: score -> total cost from 8
    const cumulativeCosts = {
      8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 6, 15: 8, 16: 10, 17: 13, 18: 16
    };
    const pointCosts = (from, to) => {
      // Calculate cost difference between two scores
      const fromCost = cumulativeCosts[from] || 0;
      const toCost = cumulativeCosts[to] || 0;
      return toCost - fromCost;
    };

    const updatePointRemaining = () => {
      const el = root.querySelector("#point-remaining");
      if (el) el.textContent = pool;
    };

    const initPointBuy = () => {
      pool = pointBuyPool;
      ablist.forEach(a => {
        const inp = root.querySelector(`[name="ability_${a}"]`);
        if (inp) inp.value = 8;
        const plus = root.querySelector(`[data-plus="${a}"]`);
        const minus = root.querySelector(`[data-minus="${a}"]`);
        if (plus) plus.onclick = () => adjustAttribute(a, +1);
        if (minus) minus.onclick = () => adjustAttribute(a, -1);
      });
      updatePointRemaining();
      recalcPreview();
    };

    const adjustAttribute = (ab, delta) => {
      const el = root.querySelector(`[name="ability_${ab}"]`);
      if (!el) return;
      
      let cur = Number(el.value || 8);
      const newVal = Math.max(8, Math.min(18, cur + delta));
      const costNow = pointCosts(8, cur);
      const costNew = pointCosts(8, newVal);
      const deltaCost = costNew - costNow;
      
      if (deltaCost > pool) {
        ui.notifications.warn("Not enough point-buy points remaining.");
        return;
      }
      
      pool -= deltaCost;
      el.value = newVal;
      chargen.characterData.abilities[ab].base = newVal;
      updatePointRemaining();
      recalcPreview();
    };

    // Standard array roll (4d6 drop lowest) - IMPROVED WITH DRAG & DROP
    const rollStandard = async () => {
      const results = [];
      for (let i = 0; i < 6; i++) {
        const r = await globalThis.SWSE.RollEngine.safeRoll("4d6kh3");
        if (!r || !r.dice || !r.dice[0] || !r.dice[0].results) {
          ui.notifications.error("Failed to roll dice. Please try again.");
          SWSELogger.error("SWSE | Standard roll failed:", r);
          return;
        }
        const dice = r.dice[0].results.map(d => ({value: d.result, discarded: d.discarded}));
        results.push({ total: r.total, dice });
      }

      const container = root.querySelector("#roll-results");
      if (!container) return;

      container.dataset.locked = "false";

      container.innerHTML = `
        <div class="roll-4d6-container">
          <h4>4d6 Drop Lowest Results</h4>
          <p class="hint">Drag the totals below to the ability scores</p>
          <div class="roll-results-grid" id="roll-pool"></div>
          <div class="ability-slots-grid">
            ${ablist.map(ab => {
              const abilityName = ab.charAt(0).toUpperCase() + ab.slice(1);
              const racial = chargen.characterData.abilities[ab].racial || 0;
              return `
                <div class="ability-slot" data-ability="${ab}">
                  <div class="ability-slot-header">
                    <span class="ability-name">${abilityName}</span>
                  </div>
                  <div class="ability-drop-zone" data-ability="${ab}">
                    <span class="drop-placeholder">Drop here</span>
                    <span class="dropped-value" style="display:none;"></span>
                  </div>
                  <div class="ability-breakdown">
                    <span class="base-value">Base: <span class="base-num">--</span></span>
                    <span class="species-value">Species: <span class="species-num ${_speciesModClass(racial)}">${_formatSigned(racial)}</span></span>
<span class="total-value">Total: <span class="total-num">--</span></span>
                    <span class="modifier-value">Mod: <span class="mod-num">--</span></span>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
          <div class="ability-actions">
            <button type="button" class="btn btn-primary" id="confirm-4d6">Confirm</button>
            <button type="button" class="btn btn-secondary" id="reset-4d6">Reset</button>
          </div>
        </div>
      `;

      // Add draggable roll results
      const pool = container.querySelector("#roll-pool");
      results.forEach((res, idx) => {
        const rollDiv = document.createElement("div");
        rollDiv.className = "draggable-roll";
        rollDiv.draggable = true;
        rollDiv.dataset.value = res.total;
        rollDiv.dataset.index = idx;

        const diceHtml = res.dice.map(d =>
          `<span class="die-result ${d.discarded ? 'discarded' : ''}">${d.value}</span>`
        ).join('');

        rollDiv.innerHTML = `
          <div class="dice-display">${diceHtml}</div>
          <div class="roll-total">${res.total}</div>
        `;

        rollDiv.addEventListener('dragstart', (e) => {
          e.dataTransfer.setData('text/plain', res.total);
          e.dataTransfer.setData('index', idx);
          rollDiv.classList.add('dragging');

          // If this item is already used, mark it for removal from current zone
          if (rollDiv.classList.contains('used')) {
            e.dataTransfer.setData('removing', 'true');
          }
        });

        rollDiv.addEventListener('dragend', () => {
          rollDiv.classList.remove('dragging');
        });

        pool.appendChild(rollDiv);
      });

      const assignedByAbility = new Map();
      const assignedByIndex = new Map();

      const _clearSlot = (ability) => {
        const z = container.querySelector(`.ability-drop-zone[data-ability="${ability}"]`);
        if (!z) return;
        z.querySelector('.drop-placeholder').style.display = 'block';
        const dv = z.querySelector('.dropped-value');
        if (dv) { dv.style.display = 'none'; dv.textContent = ''; }

        const slot = z.closest('.ability-slot');
        if (slot) {
          slot.querySelector('.base-num').textContent = '--';
          slot.querySelector('.total-num').textContent = '--';
          slot.querySelector('.mod-num').textContent = '--';
        }

        // Keep species modifier visible even when unassigned.
        const speciesMod = Number(chargen.characterData.abilities[ability].racial || 0);
        const total = 10 + speciesMod;
        chargen.characterData.abilities[ability].base = 10;
        chargen.characterData.abilities[ability].total = total;
        chargen.characterData.abilities[ability].mod = Math.floor((total - 10) / 2);
      };

      const _setSlot = (ability, base) => {
        const z = container.querySelector(`.ability-drop-zone[data-ability="${ability}"]`);
        if (!z) return;
        z.querySelector('.drop-placeholder').style.display = 'none';
        const dv = z.querySelector('.dropped-value');
        if (dv) { dv.style.display = 'block'; dv.textContent = String(base); }

        const slot = z.closest('.ability-slot');
        const speciesMod = Number(chargen.characterData.abilities[ability].racial || 0);
        const total = base + speciesMod;
        const mod = Math.floor((total - 10) / 2);

        if (slot) _updateAbilityBreakdown(slot, { base, speciesMod, total, mod });

        chargen.characterData.abilities[ability].base = base;
        chargen.characterData.abilities[ability].total = total;
        chargen.characterData.abilities[ability].mod = mod;
      };

      // Setup drop zones
      container.querySelectorAll('.ability-drop-zone').forEach(zone => {
        zone.addEventListener('dragover', (e) => {
          e.preventDefault();
          zone.classList.add('drag-over');
        });

        zone.addEventListener('dragleave', () => {
          zone.classList.remove('drag-over');
        });

        zone.addEventListener('drop', (e) => {
          e.preventDefault();
          zone.classList.remove('drag-over');

          if (container.dataset.locked === 'true') return;

          const value = parseInt(e.dataTransfer.getData('text/plain'), 10);
          const index = String(e.dataTransfer.getData('index'));
          const targetAbility = zone.dataset.ability;

          const dragged = pool.querySelector(`.draggable-roll[data-index="${index}"]`);
          if (!dragged || Number.isNaN(value)) return;

          const oldAbility = assignedByIndex.get(index);
          const prevIndex = assignedByAbility.get(targetAbility);

          // Swap if both sides are occupied and the dragged item is already assigned elsewhere.
          if (oldAbility && prevIndex && oldAbility !== targetAbility) {
            const prevDiv = pool.querySelector(`.draggable-roll[data-index="${prevIndex}"]`);
            const prevVal = parseInt(prevDiv?.dataset.value ?? "", 10);

            assignedByAbility.set(targetAbility, index);
            assignedByIndex.set(index, targetAbility);
            _setSlot(targetAbility, value);

            assignedByAbility.set(oldAbility, prevIndex);
            assignedByIndex.set(prevIndex, oldAbility);
            if (!Number.isNaN(prevVal)) _setSlot(oldAbility, prevVal);

            return;
          }

          // If dragged item was assigned to another ability, clear that ability.
          if (oldAbility && oldAbility !== targetAbility) {
            assignedByAbility.delete(oldAbility);
            assignedByIndex.delete(index);
            _clearSlot(oldAbility);
          }

          // If target already had a different score, free it.
          if (prevIndex && prevIndex !== index) {
            const prevDiv = pool.querySelector(`.draggable-roll[data-index="${prevIndex}"]`);
            if (prevDiv) prevDiv.classList.remove('used');
            assignedByIndex.delete(prevIndex);
            assignedByAbility.delete(targetAbility);
          }

          // Assign dragged to target.
          assignedByAbility.set(targetAbility, index);
          assignedByIndex.set(index, targetAbility);
          dragged.classList.add('used');
          _setSlot(targetAbility, value);
        });
      });

      // Confirm button
      container.querySelector('#confirm-4d6').onclick = () => {
        const allAssigned = ablist.every(ab => {
          const zone = container.querySelector(`.ability-drop-zone[data-ability="${ab}"]`);
          const droppedValue = zone?.querySelector('.dropped-value');
          return droppedValue?.textContent !== '';
        });

        if (!allAssigned) {
          ui.notifications.warn("Please assign all ability scores before confirming.");
          return;
        }

        recalcPreview();
        container.dataset.locked = "true";
        container.querySelectorAll(".draggable-roll").forEach(el => (el.draggable = false));
        ui.notifications.info("Ability scores confirmed and locked!");
      };

      // Reset button
      container.querySelector('#reset-4d6').onclick = () => {
        rollStandard();
      };
    };

    // Organic roll - IMPROVED WITH DRAG & DROP
    const rollOrganic = async () => {
      const r = await globalThis.SWSE.RollEngine.safeRoll("24d6");
      if (!r.dice || !r.dice[0] || !r.dice[0].results) {
        ui.notifications.error("Failed to roll dice. Please try again.");
        SWSELogger.error("SWSE | Roll failed:", r);
        return;
      }
      const allRolls = r.dice[0].results.map(x => x.result);
      const kept = allRolls.sort((a, b) => b - a).slice(0, 18);
      const discarded = allRolls.sort((a, b) => b - a).slice(18);

      const container = root.querySelector("#organic-groups");
      if (!container) return;

      container.dataset.locked = "false";

      container.innerHTML = `
        <div class="organic-roll-container">
          <h4>Organic Roll (24d6, keep 18 highest)</h4>
          <p class="hint">Drag individual dice to form 6 groups of 3, then assign to abilities</p>

          <div class="dice-pool-section">
            <h5>Available Dice</h5>
            <div class="organic-dice-pool" id="organic-dice-pool"></div>
          </div>

          <div class="groups-section">
            <h5>Form 6 Groups (3 dice each)</h5>
            <div class="organic-groups-grid">
              ${[0,1,2,3,4,5].map(i => `
                <div class="dice-group" data-group="${i}">
                  <div class="group-header">Group ${i+1}</div>
                  <div class="group-drop-zone" data-group="${i}">
                    <span class="group-placeholder">Drop 3 dice here</span>
                  </div>
                  <div class="group-total">Total: <span>--</span></div>
                </div>
              `).join('')}
            </div>
          </div>

          <div class="ability-assignment-section">
            <h5>Assign Groups to Abilities</h5>
            <div class="ability-slots-grid">
              ${ablist.map(ab => {
                const abilityName = ab.charAt(0).toUpperCase() + ab.slice(1);
                const racial = chargen.characterData.abilities[ab].racial || 0;
                return `
                  <div class="ability-slot" data-ability="${ab}">
                    <div class="ability-slot-header">
                      <span class="ability-name">${abilityName}</span>
                    </div>
                    <div class="ability-drop-zone" data-ability="${ab}">
                      <span class="drop-placeholder">Drop group</span>
                      <span class="dropped-value" style="display:none;"></span>
                    </div>
                    <div class="ability-breakdown">
                      <span class="base-value">Base: <span class="base-num">--</span></span>
                      <span class="species-value">Species: <span class="species-num ${_speciesModClass(racial)}">${_formatSigned(racial)}</span></span>
<span class="total-value">Total: <span class="total-num">--</span></span>
                      <span class="modifier-value">Mod: <span class="mod-num">--</span></span>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <div class="ability-actions">
            <button type="button" class="btn btn-primary" id="confirm-organic">Confirm</button>
            <button type="button" class="btn btn-secondary" id="reset-organic">Reset</button>
          </div>
        </div>
      `;

      // Add draggable dice
      const dicePool = container.querySelector("#organic-dice-pool");
      kept.forEach((val, idx) => {
        const die = document.createElement("div");
        die.className = "organic-die";
        die.draggable = true;
        die.dataset.value = val;
        die.dataset.index = idx;
        die.textContent = val;

        die.addEventListener('dragstart', (e) => {
          e.dataTransfer.setData('die-value', val);
          e.dataTransfer.setData('die-index', idx);
          die.classList.add('dragging');
        });

        die.addEventListener('dragend', () => {
          die.classList.remove('dragging');
        });

        dicePool.appendChild(die);
      });

      // Setup group drop zones
      container.querySelectorAll('.group-drop-zone').forEach(zone => {
        const groupIdx = zone.dataset.group;
        zone._dice = [];

        zone.addEventListener('dragover', (e) => {
          e.preventDefault();
          zone.classList.add('drag-over');
        });

        zone.addEventListener('dragleave', () => {
          zone.classList.remove('drag-over');
        });

        zone.addEventListener('drop', (e) => {
          e.preventDefault();
          zone.classList.remove('drag-over');

          const value = parseInt(e.dataTransfer.getData('die-value'), 10);
          const index = e.dataTransfer.getData('die-index');
          const die = dicePool.querySelector(`.organic-die[data-index="${index}"]`);

          if (die && !die.classList.contains('used') && zone._dice.length < 3) {
            die.classList.add('used');
            zone._dice.push(value);

            // Update display
            const placeholder = zone.querySelector('.group-placeholder');
            if (placeholder) {
              placeholder.style.display = zone._dice.length < 3 ? 'block' : 'none';
            }

            const diceDisplay = document.createElement('span');
            diceDisplay.className = 'grouped-die';
            diceDisplay.textContent = value;
            zone.appendChild(diceDisplay);

            // Update total
            if (zone._dice.length === 3) {
              const total = zone._dice.reduce((a, b) => a + b, 0);
              const groupDiv = zone.closest('.dice-group');
              if (groupDiv) {
                const totalSpan = groupDiv.querySelector('.group-total span');
                if (totalSpan) totalSpan.textContent = total;
                groupDiv.dataset.total = total;
                groupDiv.classList.add('complete');
                groupDiv.draggable = true;

                // Make complete group draggable
                groupDiv.addEventListener('dragstart', (e) => {
                  e.dataTransfer.setData('group-total', total);
                  e.dataTransfer.setData('group-index', groupIdx);
                  groupDiv.classList.add('dragging');
                });

                groupDiv.addEventListener('dragend', () => {
                  groupDiv.classList.remove('dragging');
                });
              }
            }
          }
        });
      });

      // Setup ability drop zones
      const assignedGroupByAbility = new Map();
      const assignedAbilityByGroup = new Map();

      const _clearOrganicSlot = (ability) => {
        const z = container.querySelector(`.ability-drop-zone[data-ability="${ability}"]`);
        if (!z) return;
        z.querySelector('.drop-placeholder').style.display = 'block';
        const dv = z.querySelector('.dropped-value');
        if (dv) { dv.style.display = 'none'; dv.textContent = ''; }

        const slot = z.closest('.ability-slot');
        if (slot) {
          slot.querySelector('.base-num').textContent = '--';
          slot.querySelector('.total-num').textContent = '--';
          slot.querySelector('.mod-num').textContent = '--';
        }

        const speciesMod = Number(chargen.characterData.abilities[ability].racial || 0);
        const total = 10 + speciesMod;
        chargen.characterData.abilities[ability].base = 10;
        chargen.characterData.abilities[ability].total = total;
        chargen.characterData.abilities[ability].mod = Math.floor((total - 10) / 2);
      };

      const _setOrganicSlot = (ability, base) => {
        const z = container.querySelector(`.ability-drop-zone[data-ability="${ability}"]`);
        if (!z) return;
        z.querySelector('.drop-placeholder').style.display = 'none';
        const dv = z.querySelector('.dropped-value');
        if (dv) { dv.style.display = 'block'; dv.textContent = String(base); }

        const slot = z.closest('.ability-slot');
        const speciesMod = Number(chargen.characterData.abilities[ability].racial || 0);
        const total = base + speciesMod;
        const mod = Math.floor((total - 10) / 2);

        if (slot) _updateAbilityBreakdown(slot, { base, speciesMod, total, mod });

        chargen.characterData.abilities[ability].base = base;
        chargen.characterData.abilities[ability].total = total;
        chargen.characterData.abilities[ability].mod = mod;
      };

      const _setGroupAssigned = (groupIdx, isAssigned) => {
        const g = container.querySelector(`.dice-group[data-group="${groupIdx}"]`);
        if (g) g.classList.toggle('assigned', isAssigned);
      };

      container.querySelectorAll('.ability-drop-zone').forEach(zone => {
        zone.addEventListener('dragover', (e) => {
          e.preventDefault();
          zone.classList.add('drag-over');
        });

        zone.addEventListener('dragleave', () => {
          zone.classList.remove('drag-over');
        });

        zone.addEventListener('drop', (e) => {
          e.preventDefault();
          zone.classList.remove('drag-over');

          if (container.dataset.locked === 'true') return;

          const value = parseInt(e.dataTransfer.getData('group-total'), 10);
          const groupIndex = String(e.dataTransfer.getData('group-index'));
          const targetAbility = zone.dataset.ability;

          const groupDiv = container.querySelector(`.dice-group[data-group="${groupIndex}"]`);
          if (!groupDiv || !groupDiv.classList.contains('complete') || Number.isNaN(value)) return;

          const oldAbility = assignedAbilityByGroup.get(groupIndex);
          const prevGroupIndex = assignedGroupByAbility.get(targetAbility);

          // Swap: group was assigned elsewhere AND target already has a group.
          if (oldAbility && prevGroupIndex && oldAbility !== targetAbility) {
            const prevGroupDiv = container.querySelector(`.dice-group[data-group="${prevGroupIndex}"]`);
            const prevTotal = parseInt(prevGroupDiv?.dataset.total ?? "", 10);

            assignedGroupByAbility.set(targetAbility, groupIndex);
            assignedAbilityByGroup.set(groupIndex, targetAbility);
            _setOrganicSlot(targetAbility, value);
            _setGroupAssigned(groupIndex, true);

            assignedGroupByAbility.set(oldAbility, prevGroupIndex);
            assignedAbilityByGroup.set(prevGroupIndex, oldAbility);
            if (!Number.isNaN(prevTotal)) _setOrganicSlot(oldAbility, prevTotal);
            _setGroupAssigned(prevGroupIndex, true);

            return;
          }

          // Move: group assigned elsewhere (target empty or replacement).
          if (oldAbility && oldAbility !== targetAbility) {
            assignedGroupByAbility.delete(oldAbility);
            assignedAbilityByGroup.delete(groupIndex);
            _clearOrganicSlot(oldAbility);
          }

          // Replace: target had a different group.
          if (prevGroupIndex && prevGroupIndex !== groupIndex) {
            assignedAbilityByGroup.delete(prevGroupIndex);
            assignedGroupByAbility.delete(targetAbility);
            _setGroupAssigned(prevGroupIndex, false);
          }

          // Assign group to target.
          assignedGroupByAbility.set(targetAbility, groupIndex);
          assignedAbilityByGroup.set(groupIndex, targetAbility);
          _setGroupAssigned(groupIndex, true);
          _setOrganicSlot(targetAbility, value);
        });
      });

      // Confirm button
      container.querySelector('#confirm-organic').onclick = () => {
        const allGroupsComplete = Array.from(container.querySelectorAll('.dice-group')).every(g => g.classList.contains('complete'));
        const allAssigned = ablist.every(ab => {
          const zone = container.querySelector(`.ability-drop-zone[data-ability="${ab}"]`);
          return zone.querySelector('.dropped-value').textContent !== '';
        });

        if (!allGroupsComplete) {
          ui.notifications.warn("Please complete all 6 dice groups first.");
          return;
        }

        if (!allAssigned) {
          ui.notifications.warn("Please assign all groups to ability scores.");
          return;
        }

        recalcPreview();
        container.dataset.locked = "true";
        container.querySelectorAll(".draggable-roll").forEach(el => (el.draggable = false));
        ui.notifications.info("Ability scores confirmed and locked!");
      };

      // Reset button
      container.querySelector('#reset-organic').onclick = () => {
        rollOrganic();
      };
    };

    // Array selection (High or Standard array)
    const rollArray = () => {
      const arrays = chargen.characterData.isDroid
        ? {
            high: { name: 'High Array', values: [16, 14, 12, 10, 8] },
            standard: { name: 'Standard Array', values: [15, 14, 13, 10, 8] }
          }
        : {
            high: { name: 'High Array', values: [16, 14, 12, 12, 10, 8] },
            standard: { name: 'Standard Array', values: [15, 14, 13, 12, 10, 8] }
          };

      const container = root.querySelector("#array-selection");
      if (!container) return;

      // Show array selection first
      container.innerHTML = `
        <div class="array-selection-container">
          <h4>Select an Ability Score Array</h4>
          <div class="array-options">
            <button type="button" class="array-option method-button" data-array="high">
              <div class="array-option-title">High Array</div>
              <div class="array-values">16, 14, 12, 12, 10, 8</div>
              <p class="array-description">Higher starting scores</p>
            </button>
            <button type="button" class="array-option method-button" data-array="standard">
              <div class="array-option-title">Standard Array</div>
              <div class="array-values">15, 14, 13, 12, 10, 8</div>
              <p class="array-description">Balanced array</p>
            </button>
          </div>
        </div>
      `;

      // Wire up array selection
      container.querySelectorAll('.array-option').forEach(option => {
        option.addEventListener('click', (e) => {
          e.preventDefault();
          const arrayType = option.dataset.array;
          const arrayData = arrays[arrayType];
          showArrayAssignment(arrayData);
        });
      });
    };

    // Show array assignment interface
    const showArrayAssignment = (arrayData) => {
      const container = root.querySelector("#array-selection");
      if (!container) return;

      container.dataset.locked = "false";

      container.innerHTML = `
        <div class="array-assignment-container">
          <h4>Assign ${arrayData.name} to Abilities</h4>
          <p class="hint">Drag the scores below to the ability scores</p>
          
          <div class="roll-results-grid" id="array-pool"></div>
          
          <div class="ability-slots-grid">
            ${ablist.map(ab => {
              const abilityName = ab.charAt(0).toUpperCase() + ab.slice(1);
              const racial = chargen.characterData.abilities[ab].racial || 0;
              return `
                <div class="ability-slot" data-ability="${ab}">
                  <div class="ability-slot-header">
                    <span class="ability-name">${abilityName}</span>
                  </div>
                  <div class="ability-drop-zone" data-ability="${ab}">
                    <span class="drop-placeholder">Drop here</span>
                    <span class="dropped-value" style="display:none;"></span>
                  </div>
                  <div class="ability-breakdown">
                    <span class="base-value">Base: <span class="base-num">--</span></span>
                    <span class="species-value">Species: <span class="species-num ${_speciesModClass(racial)}">${_formatSigned(racial)}</span></span>
<span class="total-value">Total: <span class="total-num">--</span></span>
                    <span class="modifier-value">Mod: <span class="mod-num">--</span></span>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
          
          <div class="ability-actions">
            <button type="button" class="btn btn-primary" id="confirm-array">Confirm</button>
            <button type="button" class="btn btn-secondary" id="reset-array">Reset</button>
            <button type="button" class="btn btn-secondary" id="back-array">Back</button>
          </div>
        </div>
      `;

      // Add draggable array values
      const pool = container.querySelector("#array-pool");
      arrayData.values.forEach((value, idx) => {
        const scoreDiv = document.createElement("div");
        scoreDiv.className = "draggable-roll";
        scoreDiv.draggable = true;
        scoreDiv.dataset.value = value;
        scoreDiv.dataset.index = idx;
        scoreDiv.innerHTML = `<div class="roll-total">${value}</div>`;

        scoreDiv.addEventListener('dragstart', (e) => {
          e.dataTransfer.setData('text/plain', value);
          e.dataTransfer.setData('index', idx);
          scoreDiv.classList.add('dragging');

          // If this item is already used, mark it for removal from current zone
          if (scoreDiv.classList.contains('used')) {
            e.dataTransfer.setData('removing', 'true');
          }
        });

        scoreDiv.addEventListener('dragend', () => {
          scoreDiv.classList.remove('dragging');
        });

        pool.appendChild(scoreDiv);
      });

      const assignedByAbility = new Map();
      const assignedByIndex = new Map();

      const _clearSlot = (ability) => {
        const z = container.querySelector(`.ability-drop-zone[data-ability="${ability}"]`);
        if (!z) return;
        z.querySelector('.drop-placeholder').style.display = 'block';
        const dv = z.querySelector('.dropped-value');
        if (dv) { dv.style.display = 'none'; dv.textContent = ''; }

        const slot = z.closest('.ability-slot');
        if (slot) {
          slot.querySelector('.base-num').textContent = '--';
          slot.querySelector('.total-num').textContent = '--';
          slot.querySelector('.mod-num').textContent = '--';
        }

        const speciesMod = Number(chargen.characterData.abilities[ability].racial || 0);
        const total = 10 + speciesMod;
        chargen.characterData.abilities[ability].base = 10;
        chargen.characterData.abilities[ability].total = total;
        chargen.characterData.abilities[ability].mod = Math.floor((total - 10) / 2);
      };

      const _setSlot = (ability, base) => {
        const z = container.querySelector(`.ability-drop-zone[data-ability="${ability}"]`);
        if (!z) return;
        z.querySelector('.drop-placeholder').style.display = 'none';
        const dv = z.querySelector('.dropped-value');
        if (dv) { dv.style.display = 'block'; dv.textContent = String(base); }

        const slot = z.closest('.ability-slot');
        const speciesMod = Number(chargen.characterData.abilities[ability].racial || 0);
        const total = base + speciesMod;
        const mod = Math.floor((total - 10) / 2);

        if (slot) _updateAbilityBreakdown(slot, { base, speciesMod, total, mod });

        chargen.characterData.abilities[ability].base = base;
        chargen.characterData.abilities[ability].total = total;
        chargen.characterData.abilities[ability].mod = mod;
      };

      // Setup drop zones
      container.querySelectorAll('.ability-drop-zone').forEach(zone => {
        zone.addEventListener('dragover', (e) => {
          e.preventDefault();
          zone.classList.add('drag-over');
        });

        zone.addEventListener('dragleave', () => {
          zone.classList.remove('drag-over');
        });

        zone.addEventListener('drop', (e) => {
          e.preventDefault();
          zone.classList.remove('drag-over');

          const value = parseInt(e.dataTransfer.getData('text/plain'), 10);
          const index = e.dataTransfer.getData('index');
          const isRemoving = e.dataTransfer.getData('removing') === 'true';
          const ability = zone.dataset.ability;
          const dragged = pool.querySelector(`.draggable-roll[data-index="${index}"]`);

          if (dragged) {
            // If removing (dragging from an already-placed value to swap it out)
            if (isRemoving) {
              // Find the zone that currently has this value and clear it
              container.querySelectorAll('.ability-drop-zone').forEach(checkZone => {
                const droppedVal = checkZone.querySelector('.dropped-value');
                if (droppedVal && droppedVal.textContent === String(value) && checkZone !== zone) {
                  // Clear the old zone
                  checkZone.querySelector('.drop-placeholder').style.display = 'block';
                  checkZone.querySelector('.dropped-value').style.display = 'none';
                  checkZone.querySelector('.dropped-value').textContent = '';

                  // Reset breakdown for old ability
                  const oldAbility = checkZone.dataset.ability;
                  const oldSlot = checkZone.closest('.ability-slot');
                  oldSlot.querySelector('.base-num').textContent = '--';
                  oldSlot.querySelector('.total-num').textContent = '--';
                  oldSlot.querySelector('.mod-num').textContent = '--';
                  chargen.characterData.abilities[oldAbility].base = 10;
                  chargen.characterData.abilities[oldAbility].total = chargen.characterData.abilities[oldAbility].racial || 10;
                  chargen.characterData.abilities[oldAbility].mod = Math.floor(((chargen.characterData.abilities[oldAbility].racial || 10) - 10) / 2);
                }
              });
            } else {
              // Normal placement - clear previous value in this slot
              const prevValue = zone.querySelector('.dropped-value');
              if (prevValue?.textContent) {
                const oldDragged = pool.querySelector(`.draggable-roll.used[data-value="${prevValue.textContent}"]`);
                if (oldDragged) oldDragged.classList.remove('used');
              }
            }

            // Set new value
            const placeholder = zone.querySelector('.drop-placeholder');
            const droppedValue = zone.querySelector('.dropped-value');
            if (placeholder) placeholder.style.display = 'none';
            if (droppedValue) {
              droppedValue.style.display = 'block';
              droppedValue.textContent = value;
            }
            dragged.classList.add('used');

            // Update breakdown
            const slot = zone.closest('.ability-slot');
            const racial = chargen.characterData.abilities[ability].racial || 0;
            const total = value + racial;
            const mod = Math.floor((total - 10) / 2);

            slot.querySelector('.base-num').textContent = value;
            slot.querySelector('.total-num').textContent = total;
            slot.querySelector('.mod-num').textContent = (mod >= 0 ? '+' : '') + mod;

            // Store value
            chargen.characterData.abilities[ability].base = value;
            chargen.characterData.abilities[ability].total = total;
            chargen.characterData.abilities[ability].mod = mod;
          }
        });
      });

      // Confirm button
      container.querySelector('#confirm-array').onclick = () => {
        const allAssigned = ablist.every(ab => {
          const zone = container.querySelector(`.ability-drop-zone[data-ability="${ab}"]`);
          return zone.querySelector('.dropped-value').textContent !== '';
        });

        if (!allAssigned) {
          ui.notifications.warn("Please assign all ability scores before confirming.");
          return;
        }

        recalcPreview();
        container.dataset.locked = "true";
        container.querySelectorAll(".draggable-roll").forEach(el => (el.draggable = false));
        ui.notifications.info("Ability scores confirmed and locked!");
      };

      // Reset button
      container.querySelector('#reset-array').onclick = () => {
        showArrayAssignment(arrayData);
      };

      // Back button
      container.querySelector('#back-array').onclick = () => {
        rollArray();
      };
    };


    const recalcPreview = () => {
      ablist.forEach(a => {
        const inp = root.querySelector(`[name="ability_${a}"]`);
        const base = Number(inp?.value || 10);
        const speciesMod = Number(chargen.characterData.abilities[a].racial || 0);
        const total = base + speciesMod + Number(chargen.characterData.abilities[a].temp || 0);
        const mod = Math.floor((total - 10) / 2);

        chargen.characterData.abilities[a].base = base;
        chargen.characterData.abilities[a].total = total;
        chargen.characterData.abilities[a].mod = mod;

        const card = root.querySelector(`.ability-card[data-ability="${a}"]`);
        _updateAbilityBreakdown(card, { base, speciesMod, total, mod });
      });

      // Update Second Wind preview
      const hpMax = Number(root.querySelector('[name="hp_max"]')?.value || 1);
      const conTotal = chargen.characterData.abilities.con.total || 10;
      const conMod = Math.floor((conTotal - 10) / 2);
      const misc = Number(root.querySelector('[name="sw_misc"]')?.value || 0);
      const heal = Math.max(Math.floor(hpMax / 4), conMod) + misc;
      chargen.characterData.secondWind.healing = heal;

      const swPreview = root.querySelector("#sw_heal_preview");
      if (swPreview) swPreview.textContent = heal;
    };

    // Mode switching function
    const switchMode = (modeName) => {
      // Hide all mode divs
      const modes = ['point-mode', 'standard-mode', 'organic-mode', 'array-mode', 'free-mode'];
      modes.forEach(mode => {
        const modeDiv = root.querySelector(`#${mode}`);
        if (modeDiv) modeDiv.style.display = 'none';
      });

      // Show selected mode
      const selectedMode = root.querySelector(`#${modeName}`);
      if (selectedMode) selectedMode.style.display = 'block';

      // Update button states
      const buttons = root.querySelectorAll('.method-button');
      buttons.forEach(btn => btn.classList.remove('active'));

      // Store the selected generation method
      chargen.characterData.abilityGenerationMethod = modeName;
    };

    // Wire buttons with mode switching
    const stdBtn = root.querySelector("#std-roll-btn");
    if (stdBtn) {
      SWSELogger.log("SWSE | Standard roll button found, attaching handler");
      stdBtn.onclick = () => {
        SWSELogger.log("SWSE | Standard roll button clicked");
        switchMode('standard-mode');
        stdBtn.classList.add('active');
        rollStandard();
      };
    } else {
      SWSELogger.warn("SWSE | Standard roll button not found in DOM");
    }

    const orgBtn = root.querySelector("#org-roll-btn");
    if (orgBtn) {
      SWSELogger.log("SWSE | Organic roll button found, attaching handler");
      orgBtn.onclick = () => {
        SWSELogger.log("SWSE | Organic roll button clicked");
        switchMode('organic-mode');
        orgBtn.classList.add('active');
        rollOrganic();
      };
    } else {
      SWSELogger.warn("SWSE | Organic roll button not found in DOM");
    }

    const arrayBtn = root.querySelector("#array-btn");
    if (arrayBtn) {
      SWSELogger.log("SWSE | Array button found, attaching handler");
      arrayBtn.onclick = () => {
        SWSELogger.log("SWSE | Array button clicked");
        switchMode('array-mode');
        arrayBtn.classList.add('active');
        rollArray();
      };
    } else {
      SWSELogger.warn("SWSE | Array button not found in DOM");
    }

    const pbInit = root.querySelector("#pb-init");
    if (pbInit) {
      SWSELogger.log("SWSE | Point buy button found, attaching handler");
      pbInit.onclick = () => {
        SWSELogger.log("SWSE | Point buy button clicked");
        switchMode('point-mode');
        pbInit.classList.add('active');
        initPointBuy();
      };
    } else {
      SWSELogger.warn("SWSE | Point buy button not found in DOM");
    }

    // Wire up free-mode inputs to recalc on change
    root.querySelectorAll('.free-input').forEach(inp => {
      inp.addEventListener('input', recalcPreview);
      inp.addEventListener('change', recalcPreview);
    });

    // Initialize
    switchMode('point-mode');
    if (pbInit) pbInit.classList.add('active');
    initPointBuy();
}
