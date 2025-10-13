// ============================================
// FILE: scripts/chargen/chargen.js
// Upgraded by swse_chargen_updater.py
// ============================================
/* global Roll, ui, Actor, game, Dialog, renderTemplate, Application */
export default class CharacterGenerator extends Application {
  constructor(actor = null, options = {}) {
    super(options);
    this.actor = actor;
    this.characterData = {
      name: "",
      species: "",
      classes: [],
      abilities: {
        str: { base: 10, racial: 0, temp: 0, total: 10, mod: 0 },
        dex: { base: 10, racial: 0, temp: 0, total: 10, mod: 0 },
        con: { base: 10, racial: 0, temp: 0, total: 10, mod: 0 },
        int: { base: 10, racial: 0, temp: 0, total: 10, mod: 0 },
        wis: { base: 10, racial: 0, temp: 0, total: 10, mod: 0 },
        cha: { base: 10, racial: 0, temp: 0, total: 10, mod: 0 }
      },
      skills: {},
      feats: [],
      talents: [],
      powers: [],
      level: 1,
      hp: { current: 1, max: 1, temp: 0 },
      forcePoints: { current: 0, max: 0, die: "1d6" },
      destiny: 0,
      secondWind: { uses: 1, max: 1, misc: 0, healing: 0 }
    };
    this.currentStep = "name";

    // caches for compendia/documents loaded once
    this._packs = {
      species: null,
      feats: null,
      talents: null,
      classes: null
    };
    this._skillsJson = null;
  }

  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["swse", "chargen"],
      template: "systems/swse/templates/chargen/chargen.html",
      width: 900,
      height: 700,
      title: "Character Generator",
      resizable: true
    });
  }

  // Load compendia and skills.json for display
  async _loadData() {
    // Load packs
    const packNames = {
      species: "swse.species",
      feats: "swse.feats",
      talents: "swse.talents",
      classes: "swse.classes"
    };
    for (const [k, packName] of Object.entries(packNames)) {
      try {
        const pack = game.packs.get(packName);
        if (!pack) {
          this._packs[k] = [];
          continue;
        }
        const docs = await pack.getDocuments();
        this._packs[k] = docs.map(d => d.toObject());
      } catch (err) {
        console.warn("chargen: failed to load pack", packName, err);
        this._packs[k] = [];
      }
    }

    // Load skills.json
    try {
      const resp = await fetch("systems/swse/data/skills.json");
      if (resp.ok) this._skillsJson = await resp.json();
      else this._skillsJson = [];
    } catch (e) {
      console.warn("chargen: failed to load skills.json", e);
      this._skillsJson = [];
    }
  }

  async getData() {
    const context = super.getData();
    // ensure compendia loaded
    if (!this._packs.species) await this._loadData();
    context.characterData = this.characterData;
    context.currentStep = this.currentStep;
    context.isLevelUp = !!this.actor;
    context.packs = this._packs;
    context.skillsJson = this._skillsJson || [];
    return context;
  }

  activateListeners(html) {
    super.activateListeners(html);
    // generic nav
    html.find('.next-step').click(this._onNextStep.bind(this));
    html.find('.prev-step').click(this._onPrevStep.bind(this));
    html.find('.finish').click(this._onFinish.bind(this));

    // species/class/feat/talent selections
    html.find('.select-species').click(this._onSelectSpecies.bind(this));
    html.find('.select-class').click(this._onSelectClass.bind(this));
    html.find('.select-feat').click(this._onSelectFeat.bind(this));
    html.find('.select-talent').click(this._onSelectTalent.bind(this));

    // ability UI wiring only when on abilities step
    if (this.currentStep === "abilities") {
      this._bindAbilitiesUI(html[0]);
    }

    // when class changes, repopulate skills allowed
    html.find('[name="class_select"]').change(async (ev) => {
      await this._onClassChanged(ev, html[0]);
    });

    // on finish - summary screen triggers creation handled in _onFinish
  }

  _getSteps() {
    if (this.actor) {
      return ["class", "feats", "talents", "skills", "summary"];
    } else {
      return ["name", "species", "abilities", "class", "feats", "talents", "skills", "summary"];
    }
  }

  async _onNextStep(event) {
    event.preventDefault();
    const steps = this._getSteps();
    const idx = steps.indexOf(this.currentStep);
    if (idx < 0) return;
    if (idx < steps.length - 1) {
      this.currentStep = steps[idx + 1];
      await this.render();
    }
  }

  async _onPrevStep(event) {
    event.preventDefault();
    const steps = this._getSteps();
    const idx = steps.indexOf(this.currentStep);
    if (idx > 0) {
      this.currentStep = steps[idx - 1];
      await this.render();
    }
  }

  // -----------------------------
  // Selection handlers
  // -----------------------------
  async _onSelectSpecies(event) {
    event.preventDefault();
    const speciesKey = event.currentTarget.dataset.species;
    this.characterData.species = speciesKey;
    // apply racial bonuses from pack entry if present
    const bonuses = await this._getRacialBonuses(speciesKey);
    for (const [k, v] of Object.entries(bonuses || {})) {
      if (this.characterData.abilities[k]) this.characterData.abilities[k].racial = Number(v || 0);
    }
    // recalc totals
    this._recalcAbilities();
    await this._onNextStep(event);
  }

  async _getRacialBonuses(speciesName) {
    if (!this._packs.species) await this._loadData();
    const found = this._packs.species.find(s => s.name === speciesName || s._id === speciesName);
    return (found && found.system && found.system.bonuses) ? found.system.bonuses : {};
  }

  async _onSelectClass(event) {
    event.preventDefault();
    const className = event.currentTarget.dataset.class;
    // default to level 1 class entry
    this.characterData.classes.push({ name: className, level: 1 });
    // determine trained skills from class doc if available
    await this._onClassChanged(event, this.element[0], true);
    // next: present feats for this class
    await this._showFeatSelection(className, this.characterData.level || 1);
  }

  async _onClassChanged(event, htmlRoot, initial=false) {
    // find selected class from element if possible
    await this._loadData();
    const classNode = (htmlRoot || this.element[0]).querySelector('[name="class_select"]');
    if (!classNode) return;
    const cls = classNode.value;
    const classDoc = this._packs.classes.find(c => c.name === cls || c._id === cls);
    const trained = classDoc && classDoc.system ? Number(classDoc.system.trainedSkills || 0) : 0;
    this.characterData.trainedSkillsAllowed = trained;
    if (!initial) await this.render();
  }

  async _showFeatSelection(className, level) {
    const feats = await this._getAvailableFeats(className, level);
    if (!feats || feats.length === 0) {
      // nothing to pick - go next
      await this._onNextStep(new Event('click'));
      return;
    }
    this.availableFeats = feats;
    this.currentStep = "feats";
    await this.render();
  }

  async _getAvailableFeats(className, level) {
    if (!this._packs.feats) await this._loadData();
    const all = this._packs.feats || [];
    const chosenNames = new Set(this.characterData.feats.map(f => f.name));
    return all.filter(f => {
      const prereqs = (f.system && f.system.prereqs) ? f.system.prereqs : {};
      if (prereqs.level && Number(prereqs.level) > Number(level)) return false;
      if (prereqs.class && prereqs.class !== className) return false;
      if (prereqs.race && prereqs.race !== this.characterData.species) return false;
      if (chosenNames.has(f.name)) return false;
      return true;
    });
  }

  async _onSelectFeat(event) {
    event.preventDefault();
    const id = event.currentTarget.dataset.featid;
    const feat = this._packs.feats.find(f => f._id === id || f.name === id);
    if (feat) this.characterData.feats.push(feat);
    // if still more feat picks required, remain; otherwise next step
    const needed = this._getFeatsNeeded();
    if (this.characterData.feats.length >= needed) {
      await this._showTalentSelection();
    } else {
      await this.render();
    }
  }

  async _showTalentSelection() {
    const cls = this.characterData.classes[this.characterData.classes.length - 1]?.name;
    const level = this.characterData.level || 1;
    const talents = await this._getAvailableTalents(cls, level);
    if (!talents || talents.length === 0) {
      await this._onNextStep(new Event('click'));
      return;
    }
    this.availableTalents = talents;
    this.currentStep = "talents";
    await this.render();
  }

  async _getAvailableTalents(className, level) {
    if (!this._packs.talents) await this._loadData();
    const all = this._packs.talents || [];
    const chosenNames = new Set(this.characterData.talents.map(t => t.name));
    return all.filter(t => {
      const prereqs = (t.system && t.system.prereqs) ? t.system.prereqs : {};
      if (prereqs.class && prereqs.class !== className) return false;
      if (prereqs.level && Number(prereqs.level) > Number(level)) return false;
      if (chosenNames.has(t.name)) return false;
      return true;
    });
  }

  async _onSelectTalent(event) {
    event.preventDefault();
    const id = event.currentTarget.dataset.talentid;
    const tal = this._packs.talents.find(t => t._id === id || t.name === id);
    if (tal) this.characterData.talents.push(tal);
    await this._onNextStep(event);
  }

  _getFeatsNeeded() {
    const lvl = this.characterData.level || 1;
    // basic: 1st level + every odd level (this is a simplification)
    return Math.ceil(lvl / 2);
  }

  // -----------------------------
  // Abilities generation UI + helpers
  // -----------------------------
  _bindAbilitiesUI(root) {
    const doc = root || this.element[0];
    const ablist = ["str","dex","con","int","wis","cha"];
    // point buy UI
    let pool = 32;
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
    function updatePointRemaining() {
      const el = doc.querySelector("#point-remaining");
      if (el) el.textContent = pool;
    }
    function initPointBuy() {
      pool = 32;
      ablist.forEach(a => {
        const inp = doc.querySelector(`[name="ability_${a}"]`);
        if (inp) inp.value = 8;
        const plus = doc.querySelector(`[data-plus="${a}"]`);
        const minus = doc.querySelector(`[data-minus="${a}"]`);
        if (plus) plus.onclick = () => adjustAttribute(a, +1);
        if (minus) minus.onclick = () => adjustAttribute(a, -1);
      });
      updatePointRemaining();
      recalcPreview();
    }
    function adjustAttribute(ab, delta) {
      const el = doc.querySelector(`[name="ability_${ab}"]`);
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
      updatePointRemaining();
      recalcPreview();
    }

    // standard roll
    function rollStandard() {
      const results = [];
      for (let i=0;i<6;i++) {
        const r = new Roll("4d6").evaluate({async:false});
        const rolls = r.terms[0].results.map(x=>x.result).sort((a,b)=>a-b);
        const sum = rolls.slice(1).reduce((s,v)=>s+v,0);
        results.push({rolls, total: sum});
      }
      const container = doc.querySelector("#roll-results");
      if (container) {
        container.innerHTML = "";
        results.forEach(res => {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "assign-roll";
          btn.textContent = `${res.total} [${res.rolls.join(",")}]`;
          btn.dataset.value = res.total;
          btn.onclick = () => assignRollToNext(res.total);
          container.appendChild(btn);
        });
        ui.notifications.info("Standard rolls generated — click a result then click an ability to assign.");
      }
    }
    function assignRollToNext(val) {
      // target the focused ability input or the lowest one
      let target = doc.querySelector(".ability-input:focus");
      if (!target) {
        const inputs = ablist.map(a=>doc.querySelector(`[name="ability_${a}"]`)).filter(Boolean);
        inputs.sort((x,y)=>Number(x.value)-Number(y.value));
        target = inputs[0];
      }
      if (target) {
        target.value = val;
        recalcPreview();
      }
    }

    // organic roll
    function rollOrganic() {
      const r = new Roll("24d6").evaluate({async:false});
      const rolls = r.terms[0].results.map(x=>x.result).sort((a,b)=>b-a);
      const kept = rolls.slice(0, 18); // top 18
      // default groups of 3 -> 6 groups
      const groups = [];
      for (let i=0;i<6;i++) groups.push(kept.slice(i*3,(i+1)*3));
      const container = doc.querySelector("#organic-groups");
      if (container) {
        container.innerHTML = "";
        groups.forEach((g, idx) => {
          const div = document.createElement("div");
          div.className = "organic-group";
          const s = g.reduce((a,b)=>a+b,0);
          div.textContent = `${g.join(",")} = ${s}`;
          div.dataset.sum = s;
          div.onclick = () => selectOrganicGroup(div);
          container.appendChild(div);
        });
        ui.notifications.info("Organic roll completed — click a group, then click an ability to assign.");
      }
      doc._selectedOrganic = null;
    }
    function selectOrganicGroup(div) {
      doc.querySelectorAll(".organic-group").forEach(d=>d.classList.remove("selected-group"));
      div.classList.add("selected-group");
      doc._selectedOrganic = Number(div.dataset.sum);
      // assign on ability click
      ablist.forEach(a => {
        const input = doc.querySelector(`[name="ability_${a}"]`);
        if (input) {
          input.onclick = () => {
            if (doc._selectedOrganic == null) return;
            input.value = doc._selectedOrganic;
            recalcPreview();
            doc.querySelectorAll(".organic-group").forEach(d=>d.classList.remove("selected-group"));
            doc._selectedOrganic = null;
          };
        }
      });
    }

    // recalc preview and totals including racial
    const recalcPreview = () => {
      ablist.forEach(a => {
        const inp = doc.querySelector(`[name="ability_${a}"]`);
        const display = doc.querySelector(`#display_${a}`);
        const base = Number(inp?.value || 10);
        const racial = Number(this.characterData.abilities[a].racial || 0);
        const total = base + racial + Number(this.characterData.abilities[a].temp || 0);
        const mod = Math.floor((total - 10)/2);
        // update local characterData preview fields
        this.characterData.abilities[a].base = base;
        this.characterData.abilities[a].total = total;
        this.characterData.abilities[a].mod = mod;
        if (display) display.textContent = `Tot ${total} (Mod ${mod>=0? "+"+mod:mod})`;
      });
      // update second wind preview
      const hpMax = Number(doc.querySelector('[name="hp_max"]')?.value || 1);
      const con = this.characterData.abilities.con.total || 10;
      const misc = Number(doc.querySelector('[name="sw_misc"]')?.value || 0);
      const heal = Math.max(Math.floor(hpMax/4), Math.floor(con)) + misc;
      this.characterData.secondWind.healing = heal;
      const swPreview = doc.querySelector("#sw_heal_preview");
      if (swPreview) swPreview.textContent = heal;
    };

    // wire roll buttons and default point buy
    const stdBtn = doc.querySelector("#std-roll-btn");
    if (stdBtn) stdBtn.onclick = rollStandard;
    const orgBtn = doc.querySelector("#org-roll-btn");
    if (orgBtn) orgBtn.onclick = rollOrganic;
    const pbInit = doc.querySelector("#pb-init");
    if (pbInit) pbInit.onclick = initPointBuy;

    // initial state
    initPointBuy();
    recalcPreview();
  }

  _recalcAbilities() {
    for (const [k, v] of Object.entries(this.characterData.abilities)) {
      v.total = (Number(v.base || 10) + Number(v.racial || 0) + Number(v.temp || 0));
      v.mod = Math.floor((v.total - 10) / 2);
    }
  }

  // -----------------------------
  // Finish / create or update actor
  // -----------------------------
  async _onFinish(event) {
    event.preventDefault();
    // If summary step exists, we assume characterData is final
    // Create or update actor
    if (this.actor) {
      await this._updateActor();
    } else {
      await this._createActor();
    }
    this.close();
  }

  async _createActor() {
    // finalize abilities and derived values
    this._recalcAbilities();
    // build actorData.system per previous patterns
    const system = {
      level: this.characterData.level || 1,
      abilities: this.characterData.abilities,
      skills: this.characterData.skills || {},
      hp: this.characterData.hp || { current:1, max:1, temp:0 },
      forcePoints: this.characterData.forcePoints || { current:0, max:0, die:"1d6" },
      destinyPoints: { value: this.characterData.destiny || 0 },
      secondWind: this.characterData.secondWind || { uses:1, max:1, misc:0, healing:0 },
      classes: this.characterData.classes || []
    };
    const actorData = {
      name: this.characterData.name || "Unnamed",
      type: "character",
      system: system,
      prototypeToken: { name: this.characterData.name || "Unnamed" }
    };
    try {
      const created = await Actor.create(actorData);
      // create embedded items (feats/talents/powers)
      const items = [];
      for (const f of (this.characterData.feats || [])) items.push(f);
      for (const t of (this.characterData.talents || [])) items.push(t);
      for (const p of (this.characterData.powers || [])) items.push(p);
      if (items.length>0) await created.createEmbeddedDocuments("Item", items);
      // persist snapshot to flags
      await created.setFlag("swse", "chargenData", this.characterData);
      // open sheet
      created.sheet.render(true);
      ui.notifications.info("Character created and sheet opened.");
    } catch (err) {
      console.error("chargen: actor creation failed", err);
      ui.notifications.error("Failed to create actor. See console for details.");
    }
  }

  async _updateActor() {
    // simple level-up: increment level and add items
    const newLevel = (this.actor.system.level || 1) + 1;
    await this.actor.update({ "system.level": newLevel });
    const items = [];
    for (const f of (this.characterData.feats || [])) items.push(f);
    for (const t of (this.characterData.talents || [])) items.push(t);
    for (const p of (this.characterData.powers || [])) items.push(p);
    if (items.length>0) await this.actor.createEmbeddedDocuments("Item", items);
    ui.notifications.info("Actor updated (level up).");
  }
}
