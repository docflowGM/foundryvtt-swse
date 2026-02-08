/**
 * scripts/apps/chargen/ability-rolling.js
 *
 * Unified ability rolling controller for Standard (4d6 drop lowest) and Organic (21d6 drop lowest 3).
 * Implements:
 *  - REROLL ALL (pool only)
 *  - UNDO stack
 *  - Drag & drop assignment, swap, return to pool
 *  - CONFIRM -> atomic actor.update of all ability values
 *
 * Defensive: uses Roll API (Foundry) if available.
 */
export class AbilityRollingController {
  constructor(actor, root, opts = {}) {
    this.actor = actor;
    this.root = root;
    this.method = opts.method || 'organic';
    this.pool = [];       // { id, value, tooltip, origin }
    this.assigned = { STR:null, DEX:null, CON:null, INT:null, WIS:null, CHA:null };
    this.history = [];
    this.confirmed = false;
    this._nextId = 1;
    this._init();
  }

  _init() {
    this._bindUI();
    this.render();
    if (this.method === 'organic' || this.method === 'standard') {this.rollInitial();}
  }

  async rollInitial() {
    if (this.method === 'standard') {
      await this._rollStandard();
    } else if (this.method === 'organic') {
      await this._rollOrganic();
    }
    this._pushHistory({ action:'initialRoll', pool: JSON.parse(JSON.stringify(this.pool)), assigned: JSON.parse(JSON.stringify(this.assigned)) });
    this.render();
  }

  async _rollStandard() {
    this.pool = [];
    for (let i=0;i<6;i++) {
      const r = await this._rollFormula('4d6');
      // Prefer dice terms when available
      const results = (r.dice && r.dice.length>0 && r.dice[0].results) ? r.dice[0].results.map(x => x.result) : (r.results || [r.total]);
      const sorted = results.slice().sort((a,b) => a-b);
      const drop = sorted.shift();
      const total = sorted.reduce((a,b) => a+b,0);
      this.pool.push(this._makeDie({ value: total, tooltip: `Rolled: ${results.join(', ')} (dropped ${drop})`, origin: 'standard' }));
    }
  }

  async _rollOrganic() {
    // Roll 21d6, drop lowest 3 overall, chunk into 6 groups of 3 and sum each
    const r = await this._rollFormula('21d6');
    const results = (r.dice && r.dice[0] && r.dice[0].results) ? r.dice[0].results.map(x => x.result) : (r.results || []);
    const filled = results.slice();
    while (filled.length < 21) {filled.push(Math.ceil(Math.random()*6));}
    const sortedAll = filled.slice().sort((a,b) => a-b);
    const dropped = sortedAll.splice(0,3);
    const remaining = sortedAll.slice(); // already sorted ascending -> we'll chunk descending for nicer distribution
    remaining.reverse();
    this.pool = [];
    for (let i=0;i<6;i++) {
      const chunk = remaining.splice(0,3);
      const sum = chunk.reduce((a,b) => a+b,0);
      this.pool.push(this._makeDie({ value: sum, tooltip: `Rolled group: ${chunk.join(', ')} (dropped global: ${dropped.join(', ')})`, origin: 'organic' }));
    }
  }

  _makeDie({ value, tooltip = '', origin = 'organic' }) {
    return { id: `d${this._nextId++}`, value, tooltip, origin, locked:false };
  }

    async _rollFormula(formula) {
    try {
      if (typeof Roll === 'function') {
        const roll = new Roll(formula);
        // Foundry V10+ prefers evaluate/evaluateSync over roll({async:false})
        if (typeof roll.evaluateSync === 'function') {
          roll.evaluateSync();
        } else if (typeof roll.evaluate === 'function') {
          await roll.evaluate({ async: true });
        } else if (typeof roll.roll === 'function') {
          await roll.roll();
        }
        return roll;
      }
    } catch (e) {
      console.warn('Roll API not available or failed:', e);
    }
    const results = [];
    const match = formula.match(/(\d+)d(\d+)/);
    if (match) {
      const n = parseInt(match[1], 10);
      const s = parseInt(match[2], 10);
      for (let i = 0; i < n; i++) {results.push(Math.ceil(Math.random() * s));}
      return {
        dice: [{ results: results.map(r => ({ result: r })) }],
        results,
        total: results.reduce((a, b) => a + b, 0)
      };
    }
    return { dice: [], results: [], total: 0 };
  }


  _bindUI() {
    if (!this.root) {return;}
    const rerollBtn = this.root.querySelector('.btn-reroll-all');
    const undoBtn = this.root.querySelector('.btn-undo');
    const confirmBtn = this.root.querySelector('.btn-confirm');
    if (rerollBtn) {rerollBtn.addEventListener('click', () => this.handleRerollAll());}
    if (undoBtn) {undoBtn.addEventListener('click', () => this.undo());}
    if (confirmBtn) {confirmBtn.addEventListener('click', () => this.confirm());}

    this.root.addEventListener('click', (ev) => {
      const menu = ev.target.closest('.die-menu');
      if (menu) {
        const id = menu.dataset.dieId;
        this._openDieMenu(id, menu);
      }
    });

    this.root.addEventListener('dragstart', (ev) => {
      const card = ev.target.closest('.die-card');
      if (!card) {return;}
      const id = card.dataset.dieId;
      ev.dataTransfer.setData('text/swse-die', id);
      card.classList.add('dragging');
    });
    this.root.addEventListener('dragend', (ev) => {
      const card = ev.target.closest('.die-card');
      if (card) {card.classList.remove('dragging');}
    });

    this.root.querySelectorAll('.stat-box').forEach(box => {
      box.addEventListener('dragover', (ev) => { ev.preventDefault(); box.classList.add('dragover'); });
      box.addEventListener('dragleave', (ev) => { box.classList.remove('dragover'); });
      box.addEventListener('drop', (ev) => {
        ev.preventDefault();
        box.classList.remove('dragover');
        const dieId = ev.dataTransfer.getData('text/swse-die');
        const stat = box.dataset.stat;
        if (dieId && stat) {this.assignDieToStat(dieId, stat);}
      });
    });

    const pool = this.root.querySelector('.dice-pool');
    if (pool) {
      pool.addEventListener('dragover', (ev) => ev.preventDefault());
      pool.addEventListener('drop', (ev) => {
        ev.preventDefault();
        const id = ev.dataTransfer.getData('text/swse-die');
        if (id) {this.returnToPool(id);}
      });
    }
  }

  _openDieMenu(id, btn) {
    const die = this._findDie(id);
    if (!die) {return;}
    const menu = document.createElement('div');
    menu.className = 'swse-die-menu';
    menu.innerHTML = `<button data-action="return">Return to Pool</button>
                      <button data-action="toggleLock">${die.locked ? 'Unlock' : 'Lock'}</button>
                      <button data-action="reroll">Reroll Die</button>`;
    document.body.appendChild(menu);
    const onClick = async (ev) => {
      const action = ev.target.dataset.action;
      if (!action) {return;}
      if (action === 'return') {this.returnToPool(id);}
      if (action === 'toggleLock') { die.locked = !die.locked; this.render(); }
      if (action === 'reroll') { await this._rerollSingle(id); }
      menu.remove();
      document.removeEventListener('click', onClick);
    };
    setTimeout(() => document.addEventListener('click', onClick));
    const rect = btn.getBoundingClientRect();
    menu.style.position='fixed';
    menu.style.left = `${rect.left}px`;
    menu.style.top = `${rect.bottom + 8}px`;
  }

  _findDie(id) {
    // find in pool
    const d = this.pool.find(p => p.id === id);
    if (d) {return d;}
    // find if assigned
    const assignedEntry = Object.entries(this.assigned).find(([k,v]) => v === id);
    if (assignedEntry) {
      return this.pool.find(p => p.id === id);
    }
    return null;
  }

  returnToPool(id) {
    for (const k of Object.keys(this.assigned)) {
      if (this.assigned[k] === id) {
        this._pushHistory({ action:'unassign', stat:k, dieId:id });
        this.assigned[k] = null;
        break;
      }
    }
    this.render();
  }

  assignDieToStat(dieId, stat) {
    if (this.confirmed) {return;}
    const die = this.pool.find(d => d.id===dieId);
    if (!die) {return;}

    // Find where this die is currently assigned (if anywhere)
    const oldStat = Object.keys(this.assigned).find(k => this.assigned[k] === dieId);
    const current = this.assigned[stat];

    // If assigning a die that's already assigned elsewhere
    if (oldStat && oldStat !== stat) {
      if (current) {
        // Target slot has a die too - swap them
        this._pushHistory({
          action: 'swap',
          stat1: oldStat,
          stat2: stat,
          dieId1: dieId,
          dieId2: current
        });
        this.assigned[oldStat] = current;
        this.assigned[stat] = dieId;
      } else {
        // Target slot is empty - just move the die
        this._pushHistory({
          action: 'move',
          fromStat: oldStat,
          toStat: stat,
          dieId
        });
        this.assigned[oldStat] = null;
        this.assigned[stat] = dieId;
      }
    } else {
      // Normal assignment (die is in pool or same stat)
      this._pushHistory({ action:'assign', stat, dieId, prev: current });
      this.assigned[stat] = dieId;
    }
    this.render();
  }

  async handleRerollAll() {
    if (this.confirmed) {return;}
    const hasAssigned = Object.values(this.assigned).some(Boolean);
    if (hasAssigned) {
      if (!confirm('Rerolling will clear your current assignments. Continue?')) {return;}
      this._pushHistory({ action:'rerollAll', prevPool: JSON.parse(JSON.stringify(this.pool)), prevAssigned: JSON.parse(JSON.stringify(this.assigned)) });
      for (const k of Object.keys(this.assigned)) {this.assigned[k] = null;}
    } else {
      this._pushHistory({ action:'rerollAll', prevPool: JSON.parse(JSON.stringify(this.pool)), prevAssigned: {} });
    }
    if (this.method === 'standard') {
      await this._rollStandard();
    } else if (this.method === 'organic') {
      await this._rollOrganic();
    }
    this.render();
  }

  async _rerollSingle(dieId) {
    if (this.confirmed) {return;}
    const die = this.pool.find(d => d.id===dieId);
    if (!die) {return;}
    this._pushHistory({ action:'rerollSingle', dieId, prev: JSON.parse(JSON.stringify(die)) });
    if (this.method === 'standard') {
      const r = await this._rollFormula('4d6');
      const results = (r.dice && r.dice[0] && r.dice[0].results) ? r.dice[0].results.map(x => x.result) : [];
      const sorted = results.slice().sort((a,b) => a-b);
      const drop = sorted.shift();
      const total = sorted.reduce((a,b) => a+b,0);
      die.value = total;
      die.tooltip = `Rolled: ${results.join(', ')} (dropped ${drop})`;
    } else {
      const r = await this._rollFormula('3d6');
      const results = (r.dice && r.dice[0] && r.dice[0].results) ? r.dice[0].results.map(x => x.result) : [];
      die.value = results.reduce((a,b) => a+b,0);
      die.tooltip = `Rolled group: ${results.join(', ')}`;
    }
    this.render();
  }

  _pushHistory(entry) {
    this.history.push(entry);
    const undoBtn = this.root.querySelector('.btn-undo');
    if (undoBtn) {undoBtn.disabled = false;}
  }

  undo() {
    if (!this.history.length) {return;}
    const last = this.history.pop();
    if (!last) {return;}
    if (last.action === 'assign') {
      this.assigned[last.stat] = last.prev || null;
    } else if (last.action === 'unassign') {
      this.assigned[last.stat] = last.dieId;
    } else if (last.action === 'swap') {
      // Swap back: restore original dice to their original stats
      this.assigned[last.stat1] = last.dieId1;
      this.assigned[last.stat2] = last.dieId2;
    } else if (last.action === 'move') {
      // Move back: restore die to original stat
      this.assigned[last.fromStat] = last.dieId;
      this.assigned[last.toStat] = null;
    } else if (last.action === 'rerollAll') {
      this.pool = last.prevPool || this.pool;
      this.assigned = last.prevAssigned || { STR:null, DEX:null, CON:null, INT:null, WIS:null, CHA:null };
    } else if (last.action === 'rerollSingle') {
      const die = this.pool.find(d => d.id===last.dieId);
      if (die) {Object.assign(die, last.prev);}
    } else if (last.action === 'initialRoll') {
      this.pool = last.pool || this.pool;
      this.assigned = last.assigned || this.assigned;
    }
    this.render();
  }

  render() {
    if (!this.root) {return;}
    const poolEl = this.root.querySelector('.dice-pool');
    const statsEls = {};
    for (const s of this.root.querySelectorAll('.stat-box')) {statsEls[s.dataset.stat] = s;}
    if (poolEl) {poolEl.innerHTML = '';}
    for (const die of this.pool) {
      const assignedTo = Object.keys(this.assigned).find(k => this.assigned[k] === die.id);
      const el = document.createElement('div');
      el.className = 'die-card';
      el.dataset.dieId = die.id;
      el.draggable = true;
      const v = document.createElement('div'); v.className = 'die-value'; v.innerText = die.value;
      el.appendChild(v);
      const meta = document.createElement('div'); meta.className='die-meta'; meta.innerText = die.origin;
      el.appendChild(meta);
      const menu = document.createElement('button'); menu.className='die-menu'; menu.dataset.dieId = die.id; menu.innerText='⋮';
      el.appendChild(menu);
      if (assignedTo) {
        el.classList.add('assigned');
        el.title = `Assigned to ${assignedTo}`;
      } else {
        el.title = die.tooltip || '';
      }
      poolEl?.appendChild(el);
    }

    for (const stat of Object.keys(this.assigned)) {
      const slot = statsEls[stat]?.querySelector('.assigned-slot');
      if (!slot) {continue;}
      slot.innerHTML = '';
      const dieId = this.assigned[stat];
      if (dieId) {
        const die = this.pool.find(d => d.id===dieId);
        if (die) {
          const el = document.createElement('div');
          el.className='assigned-die';
          el.innerText = die.value;
          slot.appendChild(el);
        }
      } else {
        slot.innerHTML = '<span class="placeholder">drop die</span>';
      }
    }

    const confirmBtn = this.root.querySelector('.btn-confirm');
    if (confirmBtn) {
      const allAssigned = Object.values(this.assigned).every(Boolean);
      confirmBtn.disabled = !allAssigned || this.confirmed;
    }

    const undoBtn = this.root.querySelector('.btn-undo');
    if (undoBtn) {undoBtn.disabled = this.history.length === 0;}
  }

  async confirm() {
    if (this.confirmed) {return;}
    if (!Object.values(this.assigned).every(Boolean)) {
      ui.notifications?.warn('Please assign all ability scores before confirming.');
      return;
    }
    const mapping = {};
    const keys = ['STR','DEX','CON','INT','WIS','CHA'];
    for (const k of keys) {
      const dieId = this.assigned[k];
      const die = this.pool.find(d => d.id===dieId);
      const val = die ? die.value : 0;
      mapping[`system.attributes.${k.toLowerCase()}.value`] = val;
    }
    try {
      await this.actor.update(mapping);
      this.confirmed = true;
      this.root.querySelectorAll('.die-card').forEach(c => c.draggable=false);
      ui.notifications?.info('Abilities confirmed and saved.');
      Hooks.call('swse:abilities:confirmed', { actor: this.actor, assigned: this.assigned, method: this.method });
    } catch (e) {
      console.error('Failed to save abilities:', e);
      ui.notifications?.error('Failed to save ability scores. See console.');
    }
  }
}
