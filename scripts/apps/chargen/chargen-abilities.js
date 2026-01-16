// ============================================
// Ability scores and defenses for CharGen  
// ============================================

import { SWSELogger } from '../../utils/logger.js';

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
    this.characterData.defenses.fort = { base: 10, armor: 0, ability: 0, classBonus: 0, misc: 0, total: 10 };
  }
  if (!this.characterData.defenses.reflex) {
    this.characterData.defenses.reflex = { base: 10, armor: 0, ability: 0, classBonus: 0, misc: 0, total: 10 };
  }
  if (!this.characterData.defenses.will) {
    this.characterData.defenses.will = { base: 10, armor: 0, ability: 0, classBonus: 0, misc: 0, total: 10 };
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
    const ablist = ["str", "dex", "con", "int", "wis", "cha"];

    SWSELogger.log("SWSE | Binding abilities UI, root:", root);

    // Point buy system
    // Get the correct point buy pool from settings
    const pointBuyPool = chargen.characterData.isDroid
      ? (game.settings.get('foundryvtt-swse', "droidPointBuyPool") || 20)
      : (game.settings.get('foundryvtt-swse', "livingPointBuyPool") || 25);

    let pool = pointBuyPool;
    const pointCosts = (from, to) => {
      const costForIncrement = (v) => {
        if (v < 12) return 1;
        if (v < 14) return 2;
        return 3;
      };
      let cost = 0;
      for (let v = from; v < to; v++) cost += costForIncrement(v);
      return cost;
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
                    ${racial !== 0 ? `<span class="racial-value">Racial: ${racial >= 0 ? '+' : ''}${racial}</span>` : ''}
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
        });

        rollDiv.addEventListener('dragend', () => {
          rollDiv.classList.remove('dragging');
        });

        pool.appendChild(rollDiv);
      });

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
          const ability = zone.dataset.ability;
          const dragged = pool.querySelector(`.draggable-roll[data-index="${index}"]`);

          if (dragged && !dragged.classList.contains('used')) {
            // Clear previous value in this slot
            const prevValue = zone.querySelector('.dropped-value');
            if (prevValue.textContent) {
              const oldDragged = pool.querySelector(`.draggable-roll.used[data-value="${prevValue.textContent}"]`);
              if (oldDragged) oldDragged.classList.remove('used');
            }

            // Set new value
            zone.querySelector('.drop-placeholder').style.display = 'none';
            zone.querySelector('.dropped-value').style.display = 'block';
            zone.querySelector('.dropped-value').textContent = value;
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
      container.querySelector('#confirm-4d6').onclick = () => {
        const allAssigned = ablist.every(ab => {
          const zone = container.querySelector(`.ability-drop-zone[data-ability="${ab}"]`);
          return zone.querySelector('.dropped-value').textContent !== '';
        });

        if (!allAssigned) {
          ui.notifications.warn("Please assign all ability scores before confirming.");
          return;
        }

        recalcPreview();
        ui.notifications.info("Ability scores confirmed!");
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
                      ${racial !== 0 ? `<span class="racial-value">Racial: ${racial >= 0 ? '+' : ''}${racial}</span>` : ''}
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
            zone.querySelector('.group-placeholder').style.display = zone._dice.length < 3 ? 'block' : 'none';

            const diceDisplay = document.createElement('span');
            diceDisplay.className = 'grouped-die';
            diceDisplay.textContent = value;
            zone.appendChild(diceDisplay);

            // Update total
            if (zone._dice.length === 3) {
              const total = zone._dice.reduce((a, b) => a + b, 0);
              zone.closest('.dice-group').querySelector('.group-total span').textContent = total;
              zone.closest('.dice-group').dataset.total = total;
              zone.closest('.dice-group').classList.add('complete');
              zone.closest('.dice-group').draggable = true;

              // Make complete group draggable
              const groupDiv = zone.closest('.dice-group');
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
        });
      });

      // Setup ability drop zones
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

          const value = parseInt(e.dataTransfer.getData('group-total'), 10);
          const groupIndex = e.dataTransfer.getData('group-index');
          const ability = zone.dataset.ability;
          const groupDiv = container.querySelector(`.dice-group[data-group="${groupIndex}"]`);

          if (groupDiv && groupDiv.classList.contains('complete') && !groupDiv.classList.contains('assigned')) {
            // Clear previous value
            const prevValue = zone.querySelector('.dropped-value');
            if (prevValue.textContent) {
              const oldGroup = container.querySelector(`.dice-group.assigned[data-total="${prevValue.textContent}"]`);
              if (oldGroup) oldGroup.classList.remove('assigned');
            }

            // Set new value
            zone.querySelector('.drop-placeholder').style.display = 'none';
            zone.querySelector('.dropped-value').style.display = 'block';
            zone.querySelector('.dropped-value').textContent = value;
            groupDiv.classList.add('assigned');

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
        ui.notifications.info("Ability scores confirmed!");
      };

      // Reset button
      container.querySelector('#reset-organic').onclick = () => {
        rollOrganic();
      };
    };

    const recalcPreview = () => {
      ablist.forEach(a => {
        const inp = root.querySelector(`[name="ability_${a}"]`);
        const display = root.querySelector(`#display_${a}`);
        const base = Number(inp?.value || 10);
        const racial = Number(chargen.characterData.abilities[a].racial || 0);
        const total = base + racial + Number(chargen.characterData.abilities[a].temp || 0);
        const mod = Math.floor((total - 10) / 2);

        chargen.characterData.abilities[a].base = base;
        chargen.characterData.abilities[a].total = total;
        chargen.characterData.abilities[a].mod = mod;

        // Build display text with Base, Racial (if non-zero), Total, and Mod
        let displayText = `Base: ${base}`;
        if (racial !== 0) {
          displayText += `, Racial: ${racial >= 0 ? '+' : ''}${racial}`;
        }
        displayText += `, Total: ${total} (Mod: ${mod >= 0 ? "+" : ""}${mod})`;

        if (display) display.textContent = displayText;
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
      const modes = ['point-mode', 'standard-mode', 'organic-mode', 'free-mode'];
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
