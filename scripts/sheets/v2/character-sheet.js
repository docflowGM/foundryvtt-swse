// scripts/sheets/v2/character-sheet.js

const { HandlebarsApplicationMixin, DocumentSheetV2 } = foundry.applications.api;

import { ActorEngine } from "../../actors/engine/actor-engine.js";
import { RenderAssertions } from "../../core/render-assertions.js";
import { initiateItemSale } from "../../apps/item-selling-system.js";
import { RollEngine } from "../../engine/roll-engine.js";
import { SWSELevelUp } from "../../apps/swse-levelup.js";
import { rollSkill } from "../../rolls/skills.js";
import { rollAttack } from "../../combat/rolls/attacks.js";
import { DropService } from "../../services/drop-service.js";
import { isXPEnabled } from "../../engine/progression/xp-engine.js";
import { InventoryEngine } from "../../engine/inventory/InventoryEngine.js";
import { PrerequisiteEngine } from "../../engine/prerequisites/PrerequisiteEngine.js";
import { ModifierEngine } from "../../engine/modifiers/ModifierEngine.js";
import { ModifierBreakdownDialog } from "../../apps/dialogs/modifier-breakdown-dialog.js";
import { AbilityEngine } from "../../engine/abilities/AbilityEngine.js";

/* ========================================================================== */
/* SWSEV2CharacterSheet                                                       */
/* V13 DocumentSheetV2 implementation                                         */
/* ========================================================================== */

export class SWSEV2CharacterSheet extends
  HandlebarsApplicationMixin(DocumentSheetV2) {


  /* ------------------------------------------------------------------------ */
  /* PARTS                                                                    */
  /* ------------------------------------------------------------------------ */

  static PARTS = {
    ...super.PARTS,
    body: {
      template: "systems/foundryvtt-swse/templates/actors/character/v2/character-sheet.hbs"
    }
  };

  /* ------------------------------------------------------------------------ */
  /* DEFAULT OPTIONS                                                          */
  /* ------------------------------------------------------------------------ */

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["swse", "swse-app", "swse-sheet", "swse-character-sheet", "v2"],
      width: 820,
      height: 920,
      resizable: true,
      minimizable: true,
      window: {
        resizable: true,
        minimizable: true
      },
      dragDrop: [
        { dropSelector: ".sheet-body" },
        { dropSelector: "[data-drop-zone]" }
      ],
      form: {
        closeOnSubmit: false,
        submitOnChange: false
      }
    });
  }

  /* ------------------------------------------------------------------------ */
  /* CONSTRUCTOR                                                              */
  /* ------------------------------------------------------------------------ */

  constructor(document, options = {}) {
    super(document, options);
    this._inventorySearch = ""; // Inventory search filter state
    this._expandedItemIds = new Set(); // Expanded item cards for stack splitting
    this._boundElements = new WeakSet(); // Track which elements have listeners attached
  }

  /* ------------------------------------------------------------------------ */
  /* CONTEXT PREPARATION                                                      */
  /* ------------------------------------------------------------------------ */

  async _prepareContext(options) {

    const actor = this.document;

    if (actor.type !== "character") {
      throw new Error(
        `SWSEV2CharacterSheet requires actor type "character", got "${actor.type}"`
      );
    }

    RenderAssertions.assertActorValid(actor, "SWSEV2CharacterSheet");

    const baseContext = await super._prepareContext(options);

    /* ========== PHASE 1: EXPLICIT SUMMARY VIEW MODEL ========== */

    // Extract ability scores explicitly (ensure all are present)
    const abilities = {
      str: { value: actor.system?.abilities?.str?.value ?? 10, total: actor.system?.abilities?.str?.total ?? 10 },
      dex: { value: actor.system?.abilities?.dex?.value ?? 10, total: actor.system?.abilities?.dex?.total ?? 10 },
      con: { value: actor.system?.abilities?.con?.value ?? 10, total: actor.system?.abilities?.con?.total ?? 10 },
      int: { value: actor.system?.abilities?.int?.value ?? 10, total: actor.system?.abilities?.int?.total ?? 10 },
      wis: { value: actor.system?.abilities?.wis?.value ?? 10, total: actor.system?.abilities?.wis?.total ?? 10 },
      cha: { value: actor.system?.abilities?.cha?.value ?? 10, total: actor.system?.abilities?.cha?.total ?? 10 }
    };

    // Extract defenses explicitly
    const defenses = {
      fort: { value: actor.system?.defenses?.fort?.value ?? 10, total: actor.system?.defenses?.fort?.total ?? 10 },
      ref: { value: actor.system?.defenses?.reflex?.value ?? 10, total: actor.system?.defenses?.reflex?.total ?? 10 },
      will: { value: actor.system?.defenses?.will?.value ?? 10, total: actor.system?.defenses?.will?.total ?? 10 },
      flatFoot: { value: actor.system?.defenses?.flatFoot?.value ?? 10, total: actor.system?.defenses?.flatFoot?.total ?? 10 }
    };

    // Header defenses (for quick access)
    const headerDefenses = {
      fort: defenses.fort.total,
      ref: defenses.ref.total,
      will: defenses.will.total,
      dt: actor.system?.derived?.damageThreshold ?? 0
    };

    // Extract skills explicitly (filter from items)
    const allSkills = actor.items
      .filter(i => i.type === "skill")
      .map(skill => ({
        id: skill.id,
        name: skill.name,
        type: skill.type,
        system: skill.system
      }));

    // XP and progression data
    const level = actor.system?.level ?? 0;
    const currentXP = actor.system?.xp?.total ?? 0;
    const xpData = actor.system?.derived?.xp ?? null;
    const nextLevelXP = xpData?.nextLevelAt ?? Infinity;
    const xpEnabled = isXPEnabled();
    const xpPercent = xpData?.progressPercent ?? 0;
    const xpLevelReady = currentXP >= nextLevelXP && nextLevelXP !== Infinity;

    // HP and condition state
    const currentHp = actor.system?.hp?.value ?? 0;
    const maxHp = actor.system?.hp?.max ?? 1;
    const hpPercent = Math.max(0, Math.min(100, (currentHp / maxHp) * 100));
    const hpWarning = hpPercent <= 50 && hpPercent > 25;
    const hpCritical = hpPercent <= 25;

    // Condition track
    const conditionStep = actor.system?.conditionTrack?.current ?? 0;
    const conditionPersistent = actor.system?.conditionTrack?.persistent ?? false;
    const ctWarning = conditionStep > 0;

    // Force Points
    const forcePoints = actor.system?.forcePoints?.value ?? 0;
    const forceSensitive = actor.system?.forceSensitive ?? false;
    const fpAvailable = forcePoints > 0;

    // Dark Side scoring
    const wisScore = abilities.wis.total;
    const darkSideMultiplier = game.settings?.get('foundryvtt-swse', 'darkSideMaxMultiplier') ?? 1;
    const darkSideMax = Math.floor(wisScore * darkSideMultiplier);
    const currentDarkSideScore = actor.system?.darkSideScore ?? 0;

    // Generate dark side spectrum
    const darkSideSegments = [];
    for (let i = 0; i < darkSideMax; i++) {
      const ratio = darkSideMax > 0 ? i / darkSideMax : 0;
      const blueR = 74, blueG = 144, blueB = 226;
      const redR = 231, redG = 76, redB = 60;
      const r = Math.round(blueR + (redR - blueR) * ratio);
      const g = Math.round(blueG + (redG - blueG) * ratio);
      const b = Math.round(blueB + (redB - blueB) * ratio);
      darkSideSegments.push({
        index: i,
        filled: i < currentDarkSideScore,
        color: `rgb(${r}, ${g}, ${b})`
      });
    }

    // Combat readiness
    const initiativeTotal = actor.system?.skills?.initiative?.total ?? 0;

    // Credits (ensure integer)
    const credits = Math.floor(actor.system?.credits ?? 0);

    /* ========== PHASE 2: BUILD ITEM COLLECTIONS ========== */

    // Equipment, armor, weapons
    let equipment = actor.items.filter(item => item.type === "equipment").map(item => ({
      id: item.id,
      name: item.name,
      type: item.type,
      img: item.img,
      system: item.system,
      _expanded: this._expandedItemIds.has(item.id)
    }));

    let armor = actor.items.filter(item => item.type === "armor").map(item => ({
      id: item.id,
      name: item.name,
      type: item.type,
      img: item.img,
      system: item.system,
      _expanded: this._expandedItemIds.has(item.id)
    }));

    let weapons = actor.items.filter(item => item.type === "weapon").map(item => ({
      id: item.id,
      name: item.name,
      type: item.type,
      img: item.img,
      system: item.system,
      _expanded: this._expandedItemIds.has(item.id)
    }));

    // Apply search filter if active
    if (this._inventorySearch && this._inventorySearch.trim() !== '') {
      equipment = InventoryEngine.filterBySearch(equipment, this._inventorySearch);
      armor = InventoryEngine.filterBySearch(armor, this._inventorySearch);
      weapons = InventoryEngine.filterBySearch(weapons, this._inventorySearch);
    }

    // Encumbrance calculation
    const allInventory = InventoryEngine.getAllInventory(actor);
    const totalWeight = InventoryEngine.calculateTotalWeight(allInventory);
    const strScore = abilities.str.total;
    const encumbranceInfo = InventoryEngine.calculateEncumbranceState(totalWeight, strScore, 1);

    const encumbranceStateCss = (() => {
      switch (encumbranceInfo.state) {
        case "normal": return "background: #e8f5e9; color: #2e7d32;";
        case "encumbered": return "background: #fff3e0; color: #e65100;";
        case "heavy": return "background: #ffe0e0; color: #c62828;";
        default: return "background: #ffebee; color: #b71c1c;";
      }
    })();

    // All items mapped
    const allItems = actor.items.map(item => ({
      id: item.id,
      name: item.name,
      type: item.type,
      img: item.img,
      system: item.system
    }));

    // Force items
    const forcePowers = allItems
      .filter(i => i.type === "forcePower")
      .map(i => ({
        ...i,
        cardStyle: (() => {
          const desc = (i.system.descriptor || "").toLowerCase();
          if (desc === "light") return "border-left: 4px solid #66ccff;";
          if (desc === "dark") return "border-left: 4px solid #ff4444;";
          return "border-left: 4px solid #888;";
        })()
      }));

    const forceTechniques = allItems.filter(i => i.type === "forceTechnique");
    const forceSecrets = allItems.filter(i => i.type === "forceSecret");

    // Abilities panel data (Phase 3)
    const abilityPanel = AbilityEngine.getCardPanelModelForActor(actor);
    const feats = abilityPanel.all?.filter(a => a.type === "feat") ?? [];
    const talents = abilityPanel.all?.filter(a => a.type === "talent") ?? [];
    const racialAbilities = abilityPanel.all?.filter(a => a.type === "racialAbility") ?? [];

    // Owned actors
    const ownedActorMap = {};
    for (const entry of actor.system.ownedActors || []) {
      const ownedActor = game.actors.get(entry.id);
      if (ownedActor) {
        ownedActorMap[entry.id] = ownedActor;
      }
    }


// Follower slots (granted by follower talents)
const rawFollowerSlots = actor.getFlag('foundryvtt-swse', 'followerSlots') || [];

// Per-talent badge counts
const followerTalentCountMap = {};
for (const s of rawFollowerSlots) {
  followerTalentCountMap[s.talentName] = (followerTalentCountMap[s.talentName] || 0) + (s.createdActorId ? 1 : 0);
}

const followerTalentBadges = Object.entries(
  rawFollowerSlots.reduce((acc, s) => {
    acc[s.talentName] = acc[s.talentName] || true;
    return acc;
  }, {})
).map(([talentName]) => {
  const cfg = getFollowerTalentConfig(talentName);
  const max = cfg?.maxCount ?? null;
  return {
    talentName,
    current: followerTalentCountMap[talentName] || 0,
    max: max ?? '—'
  };
});

const followerSlots = rawFollowerSlots.map((slot) => {
  const follower = slot.createdActorId ? game.actors.get(slot.createdActorId) : null;
  const cfg = getFollowerTalentConfig(slot.talentName);
  const max = cfg?.maxCount ?? 0;
  const current = followerTalentCountMap[slot.talentName] || 0;

  const hpValue = follower?.system?.hp?.value ?? follower?.system?.hitPoints?.value ?? 0;
  const hpMax = follower?.system?.hp?.max ?? follower?.system?.hitPoints?.max ?? 0;
  const level = follower?.system?.level ?? 1;

  const tokenImg = follower?.prototypeToken?.texture?.src ?? follower?.img ?? null;

  const role = follower?.system?.followerType
    ?? follower?.getFlag?.('swse', 'followerRole')
    ?? slot.templateType
    ?? null;

  const roleLabel = role ? String(role).charAt(0).toUpperCase() + String(role).slice(1) : 'Follower';

  const tags = [];
  if (role) tags.push(roleLabel);
  tags.push('Follower');
  if (follower?.type) tags.push(follower.type);

  return {
    ...slot,
    actor: follower,
    tokenImg,
    hp: { value: hpValue, max: hpMax },
    level,
    roleLabel,
    isLocked: !slot.createdActorId && max > 0 && current >= max,
    tags
  };
});

    /* ========== PHASE 3: BUILD MODE & LANGUAGES ========== */

    const buildMode = actor.system?.buildMode ?? 'validated';
    const buildAudit = PrerequisiteEngine.auditBuild(actor);
    const languages = actor.system?.languages ?? [];
    const isLevel0 = level === 0;
    const isGM = game.user?.isGM === true;

    /* ========== FINAL CONTEXT ASSEMBLY ========== */

    const overrides = {
      // Core actor data
      actor,
      system: actor.system,
      derived: actor.system?.derived ?? {},

      // Explicit ability scores
      abilities,
      defenses,
      headerDefenses,

      // Skills
      allSkills,

      // Progression
      level,
      currentXP,
      nextLevelXP,
      xpEnabled,
      xpPercent,
      xpLevelReady,
      xpData,

      // HP & Conditions
      currentHp,
      maxHp,
      hpPercent,
      hpWarning,
      hpCritical,
      conditionStep,
      conditionPersistent,
      ctWarning,

      // Force
      forcePoints,
      forceSensitive,
      fpAvailable,
      forcePowers,
      forceTechniques,
      forceSecrets,

      // Abilities (Phase 3)
      feats,
      talents,
      racialAbilities,
      abilityPanel,

      // Dark Side
      darkSideMax,
      currentDarkSideScore,
      darkSideSegments,

      // Combat
      initiativeTotal,

      // Inventory
      equipment,
      armor,
      weapons,
      allItems,
      totalWeight: Math.round(totalWeight * 100) / 100,
      encumbranceState: encumbranceInfo.state,
      encumbranceLabel: encumbranceInfo.label,
      encumbranceStateCss,
      encumbranceThresholds: {
        light: encumbranceInfo.light,
        medium: encumbranceInfo.medium,
        heavy: encumbranceInfo.heavy
      },
      inventorySearch: this._inventorySearch,

      // Economy
      credits,

      // Characters & NPCs
      languages,
      ownedActorMap,

      // Build validation
      buildMode,
      buildValid: buildAudit.valid,
      buildViolations: buildAudit.violations,

      // Combat actions
      attacks: actor.system?.derived?.attacks ?? { list: [] },

      // UI state
      isLevel0,
      isGM,
      editable: this.isEditable,
      user: {
        id: game.user.id,
        name: game.user.name,
        role: game.user.role
      },
      config: CONFIG.SWSE
    };

    RenderAssertions.assertContextSerializable(
      overrides,
      "SWSEV2CharacterSheet"
    );

    return { ...baseContext, ...overrides };
  }
/* ------------------------------------------------------------------------ */
/* INLINE MODAL HOST (IN-SHEET)                                             */
/* ------------------------------------------------------------------------ */

_getInlineModalHost() {
  return this.element?.querySelector?.('[data-inline-modal]') ?? null;
}

_openInlineModal({ title, bodyHtml, footerButtons = [] }) {
  const host = this._getInlineModalHost();
  if (!host) return;

  host.hidden = false;
  host.style.position = 'relative';

  host.querySelector('[data-inline-title]').textContent = title ?? '';

  const body = host.querySelector('[data-inline-body]');
  const footer = host.querySelector('[data-inline-footer]');

  body.innerHTML = bodyHtml ?? '';
  footer.innerHTML = '';

  for (const btn of footerButtons) {
    const el = document.createElement('button');
    el.type = 'button';
    el.innerHTML = btn.iconHtml ? `${btn.iconHtml} ${btn.label ?? ''}` : (btn.label ?? 'OK');
    if (btn.disabled) el.disabled = true;
    el.addEventListener('click', btn.onClick);
    footer.appendChild(el);
  }
}

_closeInlineModal() {
  const host = this._getInlineModalHost();
  if (!host) return;
  host.hidden = true;
  host.querySelector('[data-inline-body]').innerHTML = '';
  host.querySelector('[data-inline-footer]').innerHTML = '';
  this._embeddedFollowerActorIds = [];
  this._embeddedFollowerIndex = 0;
  this._embeddedFollowerActorId = null;
}

_getFollowerActorIdsForModal() {
  const slots = this.actor.getFlag('foundryvtt-swse', 'followerSlots') || [];
  const ids = slots.map(s => s.createdActorId).filter(Boolean);
  return Array.from(new Set(ids));
}

async _renderFollowerSheetIntoModal(actorId) {
  const host = this._getInlineModalHost();
  if (!host) return;

  const follower = game.actors.get(actorId);
  if (!follower) return;

  this._embeddedFollowerActorId = actorId;

  const body = host.querySelector('[data-inline-body]');
  body.innerHTML = '<div class="swse-embed-loading" style="opacity:0.8;">Loading follower sheet…</div>';

  // Render follower sheet into an isolated container inside the modal
  const container = document.createElement('div');
  container.classList.add('swse-embedded-follower-sheet');
  body.innerHTML = '';
  body.appendChild(container);

  // AppV2-safe: render into explicit target (no new window)
  const sheet = follower.sheet;
  if (!sheet) return;

  // Ensure this doesn't persist options.target (we only pass render options)
  await sheet.render({
    force: true,
    target: container,
    // keep it frameless inside host
    classes: ['swse-embedded'],
    popOut: false
  });

  // Set modal title
  host.querySelector('[data-inline-title]').textContent = follower.name;
}

async _openFollowerEditorModal(actorId) {
  this._embeddedFollowerActorIds = this._getFollowerActorIdsForModal();
  this._embeddedFollowerIndex = Math.max(0, this._embeddedFollowerActorIds.indexOf(actorId));
  if (this._embeddedFollowerIndex < 0) this._embeddedFollowerIndex = 0;

  const host = this._getInlineModalHost();
  if (!host) return;

  this._openInlineModal({
    title: 'Follower',
    bodyHtml: '',
    footerButtons: [
      {
        label: 'Close',
        iconHtml: '<i class="fa-solid fa-xmark"></i>',
        onClick: () => this._closeInlineModal()
      }
    ]
  });

  await this._renderFollowerSheetIntoModal(this._embeddedFollowerActorIds[this._embeddedFollowerIndex]);
  this._updateFollowerNavButtons();
}

_updateFollowerNavButtons() {
  const host = this._getInlineModalHost();
  if (!host) return;

  const prevBtn = host.querySelector('[data-action="follower-prev"]');
  const nextBtn = host.querySelector('[data-action="follower-next"]');

  const n = this._embeddedFollowerActorIds?.length ?? 0;
  if (!prevBtn || !nextBtn) return;

  prevBtn.disabled = n <= 1;
  nextBtn.disabled = n <= 1;
}

async _cycleFollowerInModal(delta) {
  const ids = this._embeddedFollowerActorIds ?? [];
  if (ids.length <= 1) return;

  this._embeddedFollowerIndex = (this._embeddedFollowerIndex + delta + ids.length) % ids.length;
  const id = ids[this._embeddedFollowerIndex];
  await this._renderFollowerSheetIntoModal(id);
  this._updateFollowerNavButtons();
}


  /* ------------------------------------------------------------------------ */
  /* POST-RENDER EVENT BINDING                                                */
  /* ------------------------------------------------------------------------ */

  async _onRender(context, options) {

    const root = this.element;
    // Inline modal host bindings
    this._bindFollowerInlineModal(root);

    if (!(root instanceof HTMLElement)) {
      throw new Error("CharacterSheet: element not HTMLElement");
    }

    // Ensure actor reference is valid
    if (!this.document) {
      console.error("CharacterSheet: actor document is undefined");
      return;
    }

    RenderAssertions.assertDOMElements(
      root,
      [".sheet-tabs", ".sheet-body"],
      "SWSEV2CharacterSheet"
    );

    /* ============ PHASE 2: TAB HANDLING (APPV2 SAFE) ============ */

    // Only bind tab listener once per element instance (use WeakSet to track)
    if (!this._boundElements.has(root)) {
      this._boundElements.add(root);

      root.addEventListener("click", (ev) => {
        const tabBtn = ev.target.closest(".sheet-tabs .item[data-tab]");
        if (!tabBtn) return;

        const tabName = tabBtn.dataset.tab;
        if (!tabName) return;

        ev.preventDefault();

        // Deactivate all tabs and tab content
        root.querySelectorAll(".sheet-tabs .item")
          .forEach(b => b.classList.remove("active"));

        root.querySelectorAll(".sheet-body .tab")
          .forEach(t => t.classList.remove("active"));

        // Activate selected tab
        tabBtn.classList.add("active");

        const targetTab = root.querySelector(`.sheet-body .tab[data-tab="${tabName}"]`);
        if (targetTab) {
          targetTab.classList.add("active");
        }
      });
    }

    /* ---------------- CONDITION STEP HANDLING ---------------- */

    for (const el of root.querySelectorAll(".swse-v2-condition-step")) {
      el.addEventListener("click", async (ev) => {
        try {
          ev.preventDefault();
          const step = Number(ev.currentTarget?.dataset?.step);
          if (!Number.isFinite(step)) return;
          const actor = this.document;
          if (!actor) return;
          if (typeof actor.setConditionTrackStep === "function") {
            await actor.setConditionTrackStep(step);
          } else {
            await ActorEngine.updateActor(actor, { 'system.conditionTrack.current': step });
          }
        } catch (err) {
          console.error("Error setting condition track step:", err);
        }
      });
    }

    const improveBtn = root.querySelector(".swse-v2-condition-improve");
    if (improveBtn) {
      improveBtn.addEventListener("click", async (ev) => {
        try {
          ev.preventDefault();
          const actor = this.document;
          if (!actor || typeof actor.improveConditionTrack !== "function") return;
          await actor.improveConditionTrack();
        } catch (err) {
          console.error("Error improving condition track:", err);
        }
      });
    }

    const worsenBtn = root.querySelector(".swse-v2-condition-worsen");
    if (worsenBtn) {
      worsenBtn.addEventListener("click", async (ev) => {
        try {
          ev.preventDefault();
          const actor = this.document;
          if (!actor || typeof actor.worsenConditionTrack !== "function") return;
          await actor.worsenConditionTrack();
        } catch (err) {
          console.error("Error worsening condition track:", err);
        }
      });
    }

    const persistentCheckbox = root.querySelector(".swse-v2-condition-persistent");
    if (persistentCheckbox) {
      persistentCheckbox.addEventListener("change", async (ev) => {
        try {
          const flag = ev.currentTarget?.checked === true;
          const actor = this.document;
          if (!actor || typeof actor.setConditionTrackPersistent !== "function") return;
          await actor.setConditionTrackPersistent(flag);
        } catch (err) {
          console.error("Error setting condition persistent flag:", err);
        }
      });
    }

    /* ---------------- ITEM OPEN ---------------- */

    for (const el of root.querySelectorAll(".swse-v2-open-item")) {
      el.addEventListener("click", (ev) => {
        try {
          ev.preventDefault();
          const itemId = ev.currentTarget?.dataset?.itemId;
          if (!itemId) return;
          const actor = this.document;
          if (!actor) return;
          const item = actor.items?.get(itemId);
          if (item?.sheet) {
            item.sheet.render(true);
          }
        } catch (err) {
          console.error("Error opening item sheet:", err);
        }
      });
    }

    /* ---------------- ITEM SELL ---------------- */

    for (const el of root.querySelectorAll('[data-action="sell"]')) {
      el.addEventListener("click", async (ev) => {
        ev.preventDefault();
        const row = ev.currentTarget.closest(".item-row");
        const itemId = row?.dataset?.itemId;
        const item = this.actor?.items?.get(itemId);
        if (item && this.actor) {
          await initiateItemSale(item, this.actor);
        }
      });
    }

    /* ---------------- ACTION USE ---------------- */

    for (const el of root.querySelectorAll(".swse-v2-use-action")) {
      el.addEventListener("click", async (ev) => {
        try {
          ev.preventDefault();
          const actionId = ev.currentTarget?.dataset?.actionId;
          if (!actionId) return;
          const actor = this.document;
          if (!actor || typeof actor.useAction !== "function") return;
          await actor.useAction(actionId);
        } catch (err) {
          console.error("Error using action:", err);
        }
      });
    }

    /* ---- PHASE 1: COMMAND BAR BUTTONS ---- */

    const chargenBtn = root.querySelector('[data-action="cmd-chargen"]');
    if (chargenBtn) {
      chargenBtn.addEventListener("click", async (ev) => {
        try {
          ev.preventDefault();
          const actor = this.document;
          if (!actor) return;
          await SWSELevelUp.openEnhanced(actor);
        } catch (err) {
          console.error("Error opening character generator:", err);
        }
      });
    }

    const levelupBtn = root.querySelector('[data-action="cmd-levelup"]');
    if (levelupBtn) {
      levelupBtn.addEventListener("click", async (ev) => {
        try {
          ev.preventDefault();
          const actor = this.document;
          if (!actor) return;
          await SWSELevelUp.openEnhanced(actor);
        } catch (err) {
          console.error("Error opening level up dialog:", err);
        }
      });
    }

    const storeBtn = root.querySelector('[data-action="cmd-store"]');
    if (storeBtn) {
      storeBtn.addEventListener("click", async (ev) => {
        ev.preventDefault();
        const actor = this.object;
        if (!actor) {
          ui.notifications.warn('No character selected to open store.');
          return;
        }
        try {
          const { SWSEStore } = await import('../../apps/store/store-main.js');
          const store = new SWSEStore(actor);
          await store.render(true);
        } catch (err) {
          console.error("Error opening store:", err);
          ui.notifications.error('Failed to open store. Check console for details.');
        }
      });
    }

    const restBtn = root.querySelector('[data-action="cmd-rest"]');
    if (restBtn) {
      restBtn.addEventListener("click", async (ev) => {
        try {
          ev.preventDefault();
          const actor = this.document;
          if (!actor) return;
          const max = actor.system?.secondWind?.max ?? 1;
          await ActorEngine.updateActor(actor, {
            'system.secondWind.uses': max
          });
          ui.notifications.info(`${actor.name} rested. Second Wind uses restored!`);
        } catch (err) {
          console.error("Error resting:", err);
        }
      });
    }

    const conditionsBtn = root.querySelector('[data-action="cmd-conditions"]');
    if (conditionsBtn) {
      conditionsBtn.addEventListener("click", async (ev) => {
        try {
          ev.preventDefault();
          // Scroll to HP/Condition panel in Overview tab
          root.querySelector('[data-tab="overview"]')?.click();
        } catch (err) {
          console.error("Error navigating to conditions:", err);
        }
      });
    }

    /* ---------------- PROGRESSION BUTTONS ---------------- */

    const levelUpBtn = root.querySelector('[data-action="level-up"]');
    if (levelUpBtn) {
      levelUpBtn.addEventListener("click", async (ev) => {
        try {
          ev.preventDefault();
          const actor = this.document;
          if (!actor) return;
          await SWSELevelUp.openEnhanced(actor);
        } catch (err) {
          console.error("Error triggering level up:", err);
        }
      });
    }

    const selectClassBtn = root.querySelector('[data-action="select-class"]');
    if (selectClassBtn) {
      selectClassBtn.addEventListener("click", async (ev) => {
        try {
          ev.preventDefault();
          const actor = this.document;
          if (!actor) return;
          await SWSELevelUp.openEnhanced(actor);
        } catch (err) {
          console.error("Error selecting class:", err);
        }
      });
    }

    const selectSpeciesBtn = root.querySelector('[data-action="select-species"]');
    if (selectSpeciesBtn) {
      selectSpeciesBtn.addEventListener("click", async (ev) => {
        try {
          ev.preventDefault();
          const actor = this.document;
          if (!actor) return;
          await SWSELevelUp.openEnhanced(actor);
        } catch (err) {
          console.error("Error selecting species:", err);
        }
      });
    }

    const selectBackgroundBtn = root.querySelector('[data-action="select-background"]');
    if (selectBackgroundBtn) {
      selectBackgroundBtn.addEventListener("click", async (ev) => {
        try {
          ev.preventDefault();
          const actor = this.document;
          if (!actor) return;
          await SWSELevelUp.openEnhanced(actor);
        } catch (err) {
          console.error("Error selecting background:", err);
        }
      });
    }

    /* ---------------- SKILLS SYSTEM (FILTER + FAVORITE + SORT) ---------------- */

    // Skill filter input
    const skillFilterInput = root.querySelector('[data-action="filter-skills"]');
    if (skillFilterInput) {
      skillFilterInput.addEventListener("input", (ev) => {
        const query = ev.target.value.toLowerCase();
        const skillRows = root.querySelectorAll(".skill-row-container");
        skillRows.forEach(row => {
          const skillName = row.dataset.skillName?.toLowerCase() || "";
          row.style.display = skillName.includes(query) ? "" : "none";
        });
      });
    }

    // Skill favorite toggle
    for (const btn of root.querySelectorAll('[data-action="toggle-favorite"]')) {
      btn.addEventListener("click", async (ev) => {
        try {
          ev.preventDefault();
          const skill = ev.currentTarget?.dataset?.skill;
          if (!skill) return;
          const actor = this.document;
          if (!actor) return;
          const path = `system.skills.${skill}.favorite`;
          const current = actor.system?.skills?.[skill]?.favorite;
          await actor.update({ [path]: !current });
        } catch (err) {
          console.error("Error toggling skill favorite:", err);
        }
      });
    }

    // Skill sort
    const skillSortSelect = root.querySelector('[data-action="sort-skills"]:not([data-sort])');
    if (skillSortSelect) {
      skillSortSelect.addEventListener("change", (ev) => {
        const sortBy = ev.target.value;
        const skillRows = Array.from(root.querySelectorAll(".skill-row-container"));

        const sortedRows = skillRows.sort((a, b) => {
          let aVal, bVal;

          switch (sortBy) {
            case "name":
              aVal = (a.dataset.skillName || "").toLowerCase();
              bVal = (b.dataset.skillName || "").toLowerCase();
              return aVal.localeCompare(bVal);

            case "favorite-first":
              aVal = !!a.querySelector('[data-action="toggle-favorite"].active');
              bVal = !!b.querySelector('[data-action="toggle-favorite"].active');
              return bVal - aVal; // Favorites first

            case "trained-first":
              aVal = !!a.querySelector('.skill-col-trained input:checked');
              bVal = !!b.querySelector('.skill-col-trained input:checked');
              return bVal - aVal; // Trained first

            case "trained-last":
              aVal = !!a.querySelector('.skill-col-trained input:checked');
              bVal = !!b.querySelector('.skill-col-trained input:checked');
              return aVal - bVal; // Untrained first

            case "total-desc":
              aVal = parseInt(a.querySelector('.skill-col-total')?.textContent || "0");
              bVal = parseInt(b.querySelector('.skill-col-total')?.textContent || "0");
              return bVal - aVal;

            case "total-asc":
              aVal = parseInt(a.querySelector('.skill-col-total')?.textContent || "0");
              bVal = parseInt(b.querySelector('.skill-col-total')?.textContent || "0");
              return aVal - bVal;

            default: // default order
              return skillRows.indexOf(a) - skillRows.indexOf(b);
          }
        });

        // Reorder DOM
        const skillsList = root.querySelector(".skills-list");
        if (skillsList) {
          sortedRows.forEach(row => {
            skillsList.appendChild(row);
          });
        }
      });
    }

    /* ---- INITIATIVE CONTROLS ---- */

    root.querySelector(".roll-initiative")?.addEventListener("click", async (ev) => {
      try {
        ev.preventDefault();
        const actor = this.document;
        if (!actor || typeof actor.swseRollInitiative !== "function") return;
        await actor.swseRollInitiative();
      } catch (err) {
        console.error("Error rolling initiative:", err);
      }
    });

    root.querySelector(".take10-initiative")?.addEventListener("click", async (ev) => {
      try {
        ev.preventDefault();
        const actor = this.document;
        if (!actor || typeof actor.swseTake10Initiative !== "function") return;
        await actor.swseTake10Initiative();
      } catch (err) {
        console.error("Error taking 10 on initiative:", err);
      }
    });

    root.querySelector(".roll-initiative-force")?.addEventListener("click", async (ev) => {
      try {
        ev.preventDefault();
        const actor = this.document;
        if (!actor || typeof actor.swseRollInitiative !== "function") return;
        await actor.swseRollInitiative({ useForce: true });
      } catch (err) {
        console.error("Error rolling force initiative:", err);
      }
    });

    /* ---- PHASE 2: CLICK-TO-ROLL SKILLS ---- */

    for (const el of root.querySelectorAll('.rollable-skill')) {
      el.addEventListener("click", async (ev) => {
        try {
          // Prevent selection
          if (ev.detail > 1) return;

          ev.preventDefault();
          const skillKey = ev.currentTarget?.dataset?.skill;
          if (!skillKey) return;
          const actor = this.document;
          if (!actor) return;
          await rollSkill(actor, skillKey);
        } catch (err) {
          console.error("Error rolling skill:", err);
        }
      });

      el.addEventListener("contextmenu", (ev) => {
        try {
          // Prevent browser context menu
          ev.preventDefault();
          // Phase 3 will add context menu logic here
          const skillKey = ev.currentTarget?.dataset?.skill;
          if (skillKey) {
            // Placeholder: log to console for now
            console.log(`[Phase 3] Skill context menu requested for: ${skillKey}`);
          }
        } catch (err) {
          console.error("Error in skill context menu:", err);
        }
      });
    }

    /* ---- PHASE 2: CLICK-TO-ROLL ATTACKS ---- */

    for (const el of root.querySelectorAll('.rollable-attack')) {
      el.addEventListener("click", async (ev) => {
        try {
          ev.preventDefault();
          const itemId = ev.currentTarget?.dataset?.itemId;
          if (!itemId) return;
          const actor = this.document;
          if (!actor) return;

          // Shift+click = damage roll
          if (ev.shiftKey) {
            // For now, just log (Phase 3 will handle damage rolls)
            console.log(`[Phase 2] Shift+click damage for: ${itemId}`);
            return;
          }

          // Left click = attack roll
          const item = actor.items?.get(itemId);
          if (!item) return;

          if (typeof item.roll === "function") {
            await item.roll();
          } else {
            await rollAttack(actor, item);
          }
        } catch (err) {
          console.error("Error rolling attack:", err);
        }
      });
    }

    /* ---------------- SKILL ROLLING (Legacy) ---------------- */

    for (const el of root.querySelectorAll('[data-action="roll-skill"]')) {
      el.addEventListener("click", async (ev) => {
        try {
          ev.preventDefault();
          const skillKey = ev.currentTarget?.dataset?.skill;
          if (!skillKey) return;
          const actor = this.document;
          if (!actor) return;
          await rollSkill(actor, skillKey);
        } catch (err) {
          console.error("Error rolling skill:", err);
        }
      });
    }

    /* ---------------- DEFENSE ROLLING ---------------- */

    for (const el of root.querySelectorAll('[data-action="roll-defense"]')) {
      el.addEventListener("click", async (ev) => {
        try {
          ev.preventDefault();
          const defenseType = ev.currentTarget?.dataset?.defense;
          if (!defenseType) return;
          if (typeof game.swse?.rolls?.defenses?.rollDefense === "function") {
            await game.swse.rolls.defenses.rollDefense(this.document, defenseType);
          }
        } catch (err) {
          console.error("Error rolling defense:", err);
        }
      });
    }

    /* ---------------- WEAPON ROLLING ---------------- */

    for (const el of root.querySelectorAll('[data-action="roll-weapon"]')) {
      el.addEventListener("click", async (ev) => {
        try {
          ev.preventDefault();
          const itemId = ev.currentTarget?.dataset?.itemId;
          if (!itemId) return;
          const actor = this.document;
          if (!actor) return;
          const item = actor.items?.get(itemId);
          if (!item) return;
          if (typeof item.roll === "function") {
            await item.roll();
          } else {
            await rollAttack(actor, item);
          }
        } catch (err) {
          console.error("Error rolling weapon:", err);
        }
      });
    }

    /* ---------------- FORCE POWER ROLLING ---------------- */

    for (const el of root.querySelectorAll('[data-action="roll-force-power"]')) {
      el.addEventListener("click", async (ev) => {
        try {
          ev.preventDefault();
          const itemId = ev.currentTarget?.dataset?.itemId;
          if (!itemId) return;
          if (typeof game.swse?.rolls?.rollForcePower === "function") {
            await game.swse.rolls.rollForcePower(this.document, itemId);
          } else {
            const actor = this.document;
            if (!actor) return;
            const item = actor.items?.get(itemId);
            if (item?.sheet) {
              item.sheet.render(true);
            }
          }
        } catch (err) {
          console.error("Error rolling force power:", err);
        }
      });
    }

    /* ---- PHASE 3: SKILL MODIFIER BREAKDOWN POPOUT & HOVER TOOLTIP ---- */

    for (const miscCell of root.querySelectorAll('.skill-col-misc input')) {
      miscCell.addEventListener("click", async (ev) => {
        try {
          ev.stopPropagation();
          const skillRow = ev.currentTarget?.closest('[data-skill-name]');
          if (!skillRow) return;

          const skillName = skillRow.dataset.skillName;
          if (!skillName) return;

          const actor = this.document;
          if (!actor) return;

          // Get modifiers from ModifierEngine
          const modifiers = ModifierEngine.getSkillModifiers(actor, skillName);

          // Show breakdown dialog
          await ModifierBreakdownDialog.show(actor, modifiers, skillName);
        } catch (err) {
          console.error("Error showing modifier breakdown:", err);
        }
      });

      // Add hover tooltip
      miscCell.addEventListener("mouseenter", (ev) => {
        try {
          const skillRow = ev.currentTarget?.closest('[data-skill-name]');
          if (!skillRow) return;

          const skillName = skillRow.dataset.skillName;
          if (!skillName) return;

          const actor = this.document;
          if (!actor) return;

          // Get modifiers from ModifierEngine
          const modifiers = ModifierEngine.getSkillModifiers(actor, skillName);

          // Build tooltip text
          let tooltipText = `${skillName} Modifiers:\n`;
          let total = 0;
          if (modifiers && modifiers.length > 0) {
            for (const mod of modifiers) {
              const value = mod.value || 0;
              total += value;
              const sign = value >= 0 ? '+' : '';
              tooltipText += `${sign}${value} ${mod.description || mod.sourceName}\n`;
            }
            tooltipText += `\nTotal: ${total >= 0 ? '+' : ''}${total}`;
          } else {
            tooltipText += `No modifiers applied.`;
          }

          ev.currentTarget.title = tooltipText;
        } catch (err) {
          console.error("Error updating modifier tooltip:", err);
        }
      });
    }

    /* ---- PHASE 3: TAKE 10/20 CONTEXT MENU ---- */

    for (const skillRow of root.querySelectorAll('.skill-row-container')) {
      const skillKey = skillRow.dataset.skillName;
      if (!skillKey) continue;

      // Right-click context for Take 10/20
      skillRow.addEventListener("contextmenu", (ev) => {
        try {
          ev.preventDefault();

          const actor = this.document;
          if (!actor) return;

          const skill = actor.system?.skills?.[skillKey];
          if (!skill) return;

          const totalBonus = skill.total ?? 0;
          const take10 = 10 + totalBonus;
          const take20 = 20 + totalBonus;

          const tooltip = `${skillKey}\nTake 10: ${take10}\nTake 20: ${take20}`;
          ui.notifications.info(tooltip);
        } catch (err) {
          console.error("Error showing take 10/20 context:", err);
        }
      });
    }

    /* ---------------- SECOND WIND ACTIONS ---------------- */

    const swRecoverBtn = root.querySelector('[data-action="use-second-wind"]');
    if (swRecoverBtn) {
      swRecoverBtn.addEventListener("click", async (ev) => {
        try {
          ev.preventDefault();
          const actor = this.document;
          if (!actor) return;
          const uses = actor.system?.secondWind?.uses ?? 0;
          const healing = actor.system?.secondWind?.healing ?? 0;

          if (uses > 0 && healing > 0) {
            // Restore HP
            const currentHp = actor.system?.hp?.value ?? 0;
            const maxHp = actor.system?.hp?.max ?? 1;
            const newHp = Math.min(currentHp + healing, maxHp);

            // Decrease uses
            await ActorEngine.updateActor(actor, {
              'system.hp.value': newHp,
              'system.secondWind.uses': uses - 1
            });

            ui.notifications.info(`${actor.name} recovered ${healing} HP with Second Wind!`);
          }
        } catch (err) {
          console.error("Error using second wind:", err);
        }
      });
    }

    const swRestBtn = root.querySelector('[data-action="rest-second-wind"]');
    if (swRestBtn) {
      swRestBtn.addEventListener("click", async (ev) => {
        try {
          ev.preventDefault();
          const actor = this.document;
          if (!actor) return;
          const max = actor.system?.secondWind?.max ?? 1;
          await ActorEngine.updateActor(actor, {
            'system.secondWind.uses': max
          });
          ui.notifications.info(`${actor.name} rested. Second Wind uses restored!`);
        } catch (err) {
          console.error("Error resting second wind:", err);
        }
      });
    }

    /* ---------------- DARK SIDE SPECTRUM CLICK ---------------- */

    const dsSpectrum = root.querySelector('.swse-v2-ds-spectrum');
    if (dsSpectrum) {
      dsSpectrum.addEventListener("click", async (ev) => {
        try {
          const segment = ev.target.closest('.ds-segment');
          if (segment) {
            const index = Number(segment.dataset.index);
            if (Number.isFinite(index)) {
              const actor = this.document;
              if (!actor) return;
              await ActorEngine.updateActor(actor, {
                'system.darkSideScore': index
              });
            }
          }
        } catch (err) {
          console.error("Error updating dark side score:", err);
        }
      });
    }

    /* ---- EQUIPMENT: SELL & DELETE ---- */

    for (const btn of root.querySelectorAll('[data-action="sell-item"]')) {
      btn.addEventListener("click", async (ev) => {
        try {
          ev.preventDefault();
          const itemId = ev.currentTarget?.dataset?.itemId;
          if (!itemId) return;
          const item = this.document.items.get(itemId);
          if (!item) return;

          const price = item.system.price ?? 0;
          const currentCredits = this.document.system.credits ?? 0;

          await this.document.update({
            "system.credits": currentCredits + price
          });

          await this.document.deleteEmbeddedDocuments("Item", [itemId]);
          ui.notifications.info(`Sold ${item.name} for ${price} credits`);
        } catch (err) {
          console.error("Error selling item:", err);
        }
      });
    }

    for (const btn of root.querySelectorAll('[data-action="delete-item"]')) {
      btn.addEventListener("click", async (ev) => {
        try {
          ev.preventDefault();
          const itemId = ev.currentTarget?.dataset?.itemId;
          if (!itemId) return;
          await this.document.deleteEmbeddedDocuments("Item", [itemId]);
        } catch (err) {
          console.error("Error deleting item:", err);
        }
      });
    }

    /* ---- ARMOR EQUIP TOGGLE ---- */

    for (const checkbox of root.querySelectorAll('[data-action="toggle-equip-armor"]')) {
      checkbox.addEventListener("change", async (ev) => {
        try {
          const itemId = ev.currentTarget?.dataset?.itemId;
          if (!itemId) return;
          const item = this.document.items.get(itemId);
          if (!item) return;
          await item.update({ "system.equipped": ev.currentTarget.checked });
        } catch (err) {
          console.error("Error toggling armor equip:", err);
        }
      });
    }

    /* ---- FORCE SUBSYSTEM BUTTONS ---- */

    for (const btn of root.querySelectorAll('[data-action="add-force-power"]')) {
      btn.addEventListener("click", async (ev) => {
        try {
          ev.preventDefault();
          game.swse.progression?.openForcePowerSelector?.(this.document);
        } catch (err) {
          console.error("Error opening force power selector:", err);
        }
      });
    }

    for (const btn of root.querySelectorAll('[data-action="add-force-technique"]')) {
      btn.addEventListener("click", async (ev) => {
        try {
          ev.preventDefault();
          game.swse.progression?.openForceTechniqueSelector?.(this.document);
        } catch (err) {
          console.error("Error opening force technique selector:", err);
        }
      });
    }

    for (const btn of root.querySelectorAll('[data-action="add-force-secret"]')) {
      btn.addEventListener("click", async (ev) => {
        try {
          ev.preventDefault();
          game.swse.progression?.openForceSecretSelector?.(this.document);
        } catch (err) {
          console.error("Error opening force secret selector:", err);
        }
      });
    }

    /* ---- FEAT/TALENT BUTTONS WITH PREREQUISITE CHECKING ---- */

    for (const btn of root.querySelectorAll('[data-action="add-feat"]')) {
      btn.addEventListener("click", async (ev) => {
        try {
          ev.preventDefault();

          const actor = this.document;
          if (!actor) return;

          // Track item count before opening selector
          const itemCountBefore = actor.items?.size ?? 0;

          // Open feat selector
          game.swse.progression?.openFeatSelector?.(actor);

          // After selector completes, check for new items and validate prerequisites
          setTimeout(async () => {
            try {
              const itemCountAfter = actor.items?.size ?? 0;
              if (itemCountAfter > itemCountBefore) {
                // New items were added, validate all feats
                const newItems = Array.from(actor.items).filter(item => item.type === 'feat').slice(-1);
                for (const item of newItems) {
                  const validation = PrerequisiteEngine.validateItemPrerequisites(actor, item);
                  if (!validation.valid) {
                    await PrerequisiteEngine.enableFreeBuildMode(actor);
                    ui.notifications.warn(`${item.name} has unmet prerequisites. Free Build Mode enabled.`);
                  }
                }
              }
            } catch (err) {
              console.error("Error validating feat prerequisites:", err);
            }
          }, 500);
        } catch (err) {
          console.error("Error adding feat:", err);
        }
      });
    }

    for (const btn of root.querySelectorAll('[data-action="add-talent"]')) {
      btn.addEventListener("click", async (ev) => {
        try {
          ev.preventDefault();

          const actor = this.document;
          if (!actor) return;

          // Track item count before opening selector
          const itemCountBefore = actor.items?.size ?? 0;

          // Open talent selector
          game.swse.progression?.openTalentSelector?.(actor);

          // After selector completes, check for new items and validate prerequisites
          setTimeout(async () => {
            try {
              const itemCountAfter = actor.items?.size ?? 0;
              if (itemCountAfter > itemCountBefore) {
                // New items were added, validate all talents
                const newItems = Array.from(actor.items).filter(item => item.type === 'talent').slice(-1);
                for (const item of newItems) {
                  const validation = PrerequisiteEngine.validateItemPrerequisites(actor, item);
                  if (!validation.valid) {
                    await PrerequisiteEngine.enableFreeBuildMode(actor);
                    ui.notifications.warn(`${item.name} has unmet prerequisites. Free Build Mode enabled.`);
                  }
                }
              }
            } catch (err) {
              console.error("Error validating talent prerequisites:", err);
            }
          }, 500);
        } catch (err) {
          console.error("Error adding talent:", err);
        }
      });
    }

    /* ---- LANGUAGES EDITOR ---- */

    for (const btn of root.querySelectorAll('[data-action="add-language"]')) {
      btn.addEventListener("click", async (ev) => {
        try {
          ev.preventDefault();
          const langs = [...(this.document.system.languages || []), ""];
          await this.document.update({ "system.languages": langs });
        } catch (err) {
          console.error("Error adding language:", err);
        }
      });
    }

    for (const btn of root.querySelectorAll('[data-action="remove-language"]')) {
      btn.addEventListener("click", async (ev) => {
        try {
          ev.preventDefault();
          const index = Number(ev.currentTarget?.dataset?.index);
          if (!Number.isFinite(index)) return;
          const langs = [...(this.document.system.languages || [])];
          langs.splice(index, 1);
          await this.document.update({ "system.languages": langs });
        } catch (err) {
          console.error("Error removing language:", err);
        }
      });
    }

    /* ---- OWNED ACTORS MANAGEMENT ---- */

    for (const btn of root.querySelectorAll('[data-action="remove-owned"]')) {
      btn.addEventListener("click", async (ev) => {
        try {
          ev.preventDefault();
          const actorId = ev.currentTarget?.dataset?.actorId;
          if (!actorId) return;
          const owned = this.document.system.ownedActors?.filter(o => o.id !== actorId) || [];
          await this.document.update({ "system.ownedActors": owned });
        } catch (err) {
          console.error("Error removing owned actor:", err);
        }
      });
    }

    for (const btn of root.querySelectorAll('[data-action="open-owned"]')) {
      btn.addEventListener("click", (ev) => {
        try {
          ev.preventDefault();
          const actorId = ev.currentTarget?.dataset?.actorId;
          if (!actorId) return;
          const actor = game.actors.get(actorId);
          if (actor?.sheet) {
            actor.sheet.render(true);
          }
        } catch (err) {
          console.error("Error opening owned actor:", err);
        }
      });
    }

    /* ---- PHASE 2: TALENTS & FEATS MANAGEMENT ---- */

    for (const card of root.querySelectorAll('[data-toggle="expand"]')) {
      card.addEventListener("click", (ev) => {
        try {
          ev.preventDefault();
          card.style.boxShadow = card.style.boxShadow ? '' : '0 0 8px rgba(33, 150, 243, 0.3)';
          const actions = card.querySelector('.talent-card-actions, .feat-card-actions');
          if (actions) {
            actions.style.opacity = actions.style.opacity === '0' ? '1' : '0';
          }
        } catch (err) {
          console.error("Error expanding card:", err);
        }
      });
    }

    for (const btn of root.querySelectorAll('[data-action="delete-talent"]')) {
      btn.addEventListener("click", async (ev) => {
        try {
          ev.preventDefault();
          ev.stopPropagation();
          const itemId = ev.currentTarget?.dataset?.itemId;
          if (!itemId) return;
          const actor = this.document;
          if (!actor) return;
          await actor.deleteEmbeddedDocuments("Item", [itemId]);
          ui.notifications.info("Talent removed.");

          // Auto-revalidate build after item deletion
          setTimeout(async () => {
            try {
              const valid = await PrerequisiteEngine.validateBuild(actor);
              if (valid) {
                ui.notifications.info("Build revalidated - returning to validated mode.");
                await this.render();
              }
            } catch (err) {
              console.error("Error validating build after talent deletion:", err);
            }
          }, 250);
        } catch (err) {
          console.error("Error deleting talent:", err);
        }
      });
    }

    for (const btn of root.querySelectorAll('[data-action="delete-feat"]')) {
      btn.addEventListener("click", async (ev) => {
        try {
          ev.preventDefault();
          ev.stopPropagation();
          const itemId = ev.currentTarget?.dataset?.itemId;
          if (!itemId) return;
          const actor = this.document;
          if (!actor) return;
          await actor.deleteEmbeddedDocuments("Item", [itemId]);
          ui.notifications.info("Feat removed.");

          // Auto-revalidate build after item deletion
          setTimeout(async () => {
            try {
              const valid = await PrerequisiteEngine.validateBuild(actor);
              if (valid) {
                ui.notifications.info("Build revalidated - returning to validated mode.");
                await this.render();
              }
            } catch (err) {
              console.error("Error validating build after feat deletion:", err);
            }
          }, 250);
        } catch (err) {
          console.error("Error deleting feat:", err);
        }
      });
    }

    /* ---- PHASE 3: PREREQUISITE VALIDATION & FREE BUILD MODE ---- */

    const revalidateBtn = root.querySelector('[data-action="revalidate-build"]');
    if (revalidateBtn) {
      revalidateBtn.addEventListener("click", async (ev) => {
        try {
          ev.preventDefault();
          const actor = this.document;
          if (!actor) return;
          const valid = await PrerequisiteEngine.validateBuild(actor);
          if (valid) {
            ui.notifications.info("Build validated successfully!");
            await this.render();
          } else {
            const audit = PrerequisiteEngine.auditBuild(actor);
            const msg = PrerequisiteEngine.formatViolations(audit);
            ui.notifications.warn(msg);
          }
        } catch (err) {
          console.error("Error revalidating build:", err);
        }
      });
    }

    /* ---- PHASE 2: INVENTORY SEARCH FILTER ---- */

    const inventorySearchInput = root.querySelector('[data-action="inventory-search"]');
    if (inventorySearchInput) {
      inventorySearchInput.addEventListener("input", async (ev) => {
        try {
          this._inventorySearch = ev.target.value;
          await this.render();
        } catch (err) {
          console.error("Error filtering inventory:", err);
        }
      });
    }

    /* ---- PHASE 2: STACK SPLITTING ---- */

    for (const btn of root.querySelectorAll('[data-action="split-stack"]')) {
      btn.addEventListener("click", async (ev) => {
        try {
          ev.preventDefault();
          const itemId = ev.currentTarget?.dataset?.itemId;
          const actor = this.document;
          if (!actor) return;
          const item = actor.items?.get(itemId);
          if (!item) return;

          const currentQty = Number(item.system.quantity) || 1;
          if (currentQty <= 1) {
            ui.notifications.warn("Cannot split a stack of 1 item.");
            return;
          }

          // Show inline split dialog
          const splitQty = prompt(`Split ${item.name}?\nEnter quantity to split (1-${currentQty - 1}):`, "1");
          if (!splitQty) return;

          const qty = Number(splitQty);
          if (!Number.isFinite(qty) || qty < 1 || qty >= currentQty) {
            ui.notifications.error("Invalid split quantity.");
            return;
          }

          // Update original item
          await item.update({ "system.quantity": currentQty - qty });

          // Create new stack
          const newItem = item.toObject();
          newItem.system.quantity = qty;
          await actor.createEmbeddedDocuments("Item", [newItem]);

          ui.notifications.info(`${item.name} split: ${qty} item(s) moved to new stack.`);
        } catch (err) {
          console.error("Error splitting stack:", err);
        }
      });
    }

    /* ---- PHASE 2: EXPAND/COLLAPSE ITEM CARDS ---- */

    for (const card of root.querySelectorAll('[data-action="toggle-item-expand"]')) {
      card.addEventListener("click", (ev) => {
        try {
          ev.preventDefault();
          const itemId = ev.currentTarget?.dataset?.itemId;
          if (!itemId) return;

          if (this._expandedItemIds.has(itemId)) {
            this._expandedItemIds.delete(itemId);
          } else {
            this._expandedItemIds.add(itemId);
          }

          // Re-render to show/hide expanded content
          this.render();
        } catch (err) {
          console.error("Error toggling item expand:", err);
        }
      });
    }

    /* ---- DRAG & DROP VISUAL FEEDBACK ---- */

    DropService.bindDragFeedback(root);

    /* -------- ABILITIES TAB HANDLERS (Phase 3) -------- */
    this._bindAbilityCardHandlers(root);

    RenderAssertions.assertRenderComplete(
      this,
      "SWSEV2CharacterSheet"
    );
  }

_bindFollowerInlineModal(root) {
  const host = root.querySelector('[data-inline-modal]');
  if (!host) return;

  if (host.dataset.bound === 'true') return;
  host.dataset.bound = 'true';

  host.querySelectorAll('[data-action="inline-cancel"]').forEach((el) => {
    el.addEventListener('click', () => this._closeInlineModal());
  });

  const prevBtn = host.querySelector('[data-action="follower-prev"]');
  const nextBtn = host.querySelector('[data-action="follower-next"]');

  prevBtn?.addEventListener('click', () => this._cycleFollowerInModal(-1));
  nextBtn?.addEventListener('click', () => this._cycleFollowerInModal(1));
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
        await ActionChatEngine.emote(this.document, `uses ability: ${abilityId}`);
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
        const ability = this.document.items?.get(abilityId);
        if (ability && typeof rollAttack === 'function') {
          await rollAttack(this.document, ability);
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
        const ability = this.document.items?.get(abilityId);
        if (ability) {
          // Mark as used
          const { AbilityUsage } = await import('../../engine/abilities/ability-usage.js');
          await AbilityUsage.markUsed(this.document, abilityId);
          this.render();
        }
      } catch (err) {
        console.error('Error using ability:', err);
      }
    });
  });
}

  /* -------- -------- -------- -------- -------- -------- -------- -------- */
  /* DRAG & DROP HANDLING                                                     */
  /* -------- -------- -------- -------- -------- -------- -------- -------- */

  async _onDrop(event) {
    return DropService.onDrop(event, this);
  }

  /* ------------------------------------------------------------------------ */
  /* FORM UPDATE ROUTING                                                      */
  /* ------------------------------------------------------------------------ */


_onDragStartOwnedEntry(event) {
  const el = event.target?.closest?.('[draggable="true"][data-actor-id]');
  if (!el) return;

  const actorId = el.dataset.actorId;
  const dragged = game.actors.get(actorId);
  if (!dragged) return;

  const payload = {
    type: 'Actor',
    uuid: dragged.uuid,
    swse: { sourceOwnerUuid: this.actor.uuid }
  };

  event.dataTransfer?.setData('text/plain', JSON.stringify(payload));
  event.dataTransfer.effectAllowed = 'copyMove';
}

async _onCreateFollowerFromSlot(event) {
  event.preventDefault();
  const slotId = event.currentTarget?.dataset?.slotId;
  if (!slotId) return;

  const slots = this.actor.getFlag('foundryvtt-swse', 'followerSlots') || [];
  const slot = slots.find((s) => s.id === slotId);
  if (!slot) return;

  const cfg = getFollowerTalentConfig(slot.talentName);
  const max = cfg?.maxCount ?? 0;
  const filled = slots.filter((s) => s.talentName === slot.talentName && !!s.createdActorId).length;
  if (max > 0 && filled >= max) {
    ui.notifications?.warn?.('Follower limit reached for this talent.');
    return;
  }

  const ctx = await FollowerCreator.getInlineCreationContext(
    this.actor,
    cfg?.templateChoices ?? slot.templateChoices ?? null,
    { name: slot.talentName, id: slot.talentItemId }
  );

  if (!ctx) return;

  const bodyHtml = await renderTemplate(
    'systems/foundryvtt-swse/templates/apps/follower-inline-builder.hbs',
    {
      templateTypes: ctx.templateTypes,
      speciesList: ctx.speciesList,
      defaultName: `${this.actor.name}'s Follower`
    }
  );

  this._openInlineModal({
    title: 'Follower Creation',
    bodyHtml,
    footerButtons: [
      {
        label: 'Create',
        iconHtml: '<i class="fa-solid fa-check"></i>',
        onClick: async () => {
          const host = this._getInlineModalHost();
          const form = host?.querySelector('form');
          if (!form) return;

          const fd = new FormData(form);

          const followerData = {
            name: fd.get('name'),
            species: fd.get('species'),
            abilityChoice: fd.get('abilityChoice') || null,
            skillChoice: fd.get('skillChoice') || null,
            featChoice: fd.get('featChoice') || null,
            humanBonus: fd.get('humanBonus') || null,
            templateType: fd.get('templateType')
          };

          const created = await FollowerCreator.createFollowerFromData(
            this.actor,
            followerData.templateType,
            followerData,
            { name: slot.talentName, id: slot.talentItemId }
          );

          if (!created) return;

          // mark actor role for display/search
          try {
            await created.setFlag('foundryvtt-swse', 'followerRole', followerData.templateType);
          } catch {}

          // Attach created follower to slot
          const nextSlots = (this.actor.getFlag('foundryvtt-swse', 'followerSlots') || []).map((s) => {
            if (s.id !== slotId) return s;
            return { ...s, createdActorId: created.id, templateType: followerData.templateType };
          });
          await this.actor.setFlag('foundryvtt-swse', 'followerSlots', nextSlots);

          const followers = this.actor.getFlag('foundryvtt-swse', 'followers') || [];
          if (!followers.some((f) => f.id === created.id)) {
            followers.push({ id: created.id, talent: slot.talentName, slotId });
            await this.actor.setFlag('foundryvtt-swse', 'followers', followers);
          }

          this._closeInlineModal();
          this.render();
        }
      },
      {
        label: 'Cancel',
        iconHtml: '<i class="fa-solid fa-xmark"></i>',
        onClick: () => this._closeInlineModal()
      }
    ]
  });
}

  async _updateObject(event, formData) {
    const expanded = foundry.utils.expandObject(formData);
    if (!expanded?.system) return;

    await ActorEngine.updateActor(this.actor, {
      system: expanded.system
    });
  }
}
