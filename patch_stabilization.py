from pathlib import Path
import re
import sys

MARKER = "/* === CHARACTER SHEET STABILIZATION: FLAT MODE + TAB FIXES === */"

CSS_BLOCK = r'''
/* === CHARACTER SHEET STABILIZATION: FLAT MODE + TAB FIXES === */

/*
  Temporary flat-mode pass for the CHARACTER sheet only.
  Goal: remove busy SVG frames/backgrounds/buttons while the layout stabilizes.
  This does NOT touch progression-shell styling.
*/

form.swse-character-sheet-form.swse-sheet-ui,
form.swse-character-sheet-form.swse-sheet-ui .swse-character-sheet {
  --swse-flat-panel-bg: linear-gradient(180deg, rgba(5, 16, 28, 0.96), rgba(4, 11, 20, 0.98));
  --swse-flat-border: rgba(104, 214, 255, 0.28);
  --swse-flat-border-strong: rgba(104, 214, 255, 0.42);
}

/* Kill decorative SVG/pseudo frames */
form.swse-character-sheet-form.swse-sheet-ui .holo-panel::before,
form.swse-character-sheet-form.swse-sheet-ui .holo-panel::after,
form.swse-character-sheet-form.swse-sheet-ui .v3-panel::before,
form.swse-character-sheet-form.swse-sheet-ui .v3-panel::after,
form.swse-character-sheet-form.swse-sheet-ui .svg-panel-frame::before,
form.swse-character-sheet-form.swse-sheet-ui .svg-panel-frame::after,
form.swse-character-sheet-form.swse-sheet-ui .sheet-tabs .item::before,
form.swse-character-sheet-form.swse-sheet-ui .sheet-tabs .item::after,
form.swse-character-sheet-form.swse-sheet-ui .sheet-tabs a::before,
form.swse-character-sheet-form.swse-sheet-ui .sheet-tabs a::after,
form.swse-character-sheet-form.swse-sheet-ui .header-btn::before,
form.swse-character-sheet-form.swse-sheet-ui .header-btn::after,
form.swse-character-sheet-form.swse-sheet-ui .swse-btn::before,
form.swse-character-sheet-form.swse-sheet-ui .swse-btn::after,
form.swse-character-sheet-form.swse-sheet-ui .swse-v2-btn::before,
form.swse-character-sheet-form.swse-sheet-ui .swse-v2-btn::after,
form.swse-character-sheet-form.swse-sheet-ui .mini-btn::before,
form.swse-character-sheet-form.swse-sheet-ui .mini-btn::after,
form.swse-character-sheet-form.swse-sheet-ui .favorite-btn::before,
form.swse-character-sheet-form.swse-sheet-ui .favorite-btn::after,
form.swse-character-sheet-form.swse-sheet-ui .skill-name-btn::before,
form.swse-character-sheet-form.swse-sheet-ui .skill-name-btn::after,
form.swse-character-sheet-form.swse-sheet-ui .skill-bonus-btn::before,
form.swse-character-sheet-form.swse-sheet-ui .skill-bonus-btn::after,
form.swse-character-sheet-form.swse-sheet-ui .header-select-btn::before,
form.swse-character-sheet-form.swse-sheet-ui .header-select-btn::after,
form.swse-character-sheet-form.swse-sheet-ui .swse-panel__frame,
form.swse-character-sheet-form.swse-sheet-ui .swse-panel__frame::before,
form.swse-character-sheet-form.swse-sheet-ui .swse-panel__frame::after {
  content: none !important;
  display: none !important;
  background-image: none !important;
}

/* Flatten panels/cards/major boxes */
form.swse-character-sheet-form.swse-sheet-ui .holo-panel,
form.swse-character-sheet-form.swse-sheet-ui .v3-panel,
form.swse-character-sheet-form.swse-sheet-ui .svg-framed,
form.swse-character-sheet-form.swse-sheet-ui .svg-panel-frame,
form.swse-character-sheet-form.swse-sheet-ui .tab-placeholder,
form.swse-character-sheet-form.swse-sheet-ui .swse-attacks-panel,
form.swse-character-sheet-form.swse-sheet-ui .skills-panel,
form.swse-character-sheet-form.swse-sheet-ui .section-bar,
form.swse-character-sheet-form.swse-sheet-ui .resource,
form.swse-character-sheet-form.swse-sheet-ui .combat-metric,
form.swse-character-sheet-form.swse-sheet-ui .tactical-resource,
form.swse-character-sheet-form.swse-sheet-ui .header-defense-readout,
form.swse-character-sheet-form.swse-sheet-ui .field-with-button,
form.swse-character-sheet-form.swse-sheet-ui .ability-row,
form.swse-character-sheet-form.swse-sheet-ui .defense-row,
form.swse-character-sheet-form.swse-sheet-ui .condition-track,
form.swse-character-sheet-form.swse-sheet-ui .condition-entry,
form.swse-character-sheet-form.swse-sheet-ui .defense-card,
form.swse-character-sheet-form.swse-sheet-ui .defense-item,
form.swse-character-sheet-form.swse-sheet-ui .xp-panel,
form.swse-character-sheet-form.swse-sheet-ui .second-wind-panel,
form.swse-character-sheet-form.swse-sheet-ui .hp-condition-panel,
form.swse-character-sheet-form.swse-sheet-ui .resources-panel,
form.swse-character-sheet-form.swse-sheet-ui .defenses-panel {
  background: var(--swse-flat-panel-bg) !important;
  background-image: none !important;
  border-image: none !important;
  box-shadow: none !important;
}

form.swse-character-sheet-form.swse-sheet-ui .holo-panel,
form.swse-character-sheet-form.swse-sheet-ui .v3-panel,
form.swse-character-sheet-form.swse-sheet-ui .svg-framed,
form.swse-character-sheet-form.swse-sheet-ui .svg-panel-frame,
form.swse-character-sheet-form.swse-sheet-ui .tab-placeholder,
form.swse-character-sheet-form.swse-sheet-ui .swse-attacks-panel,
form.swse-character-sheet-form.swse-sheet-ui .skills-panel,
form.swse-character-sheet-form.swse-sheet-ui .xp-panel,
form.swse-character-sheet-form.swse-sheet-ui .second-wind-panel,
form.swse-character-sheet-form.swse-sheet-ui .hp-condition-panel,
form.swse-character-sheet-form.swse-sheet-ui .resources-panel,
form.swse-character-sheet-form.swse-sheet-ui .defenses-panel {
  border: 1px solid var(--swse-flat-border) !important;
  border-radius: 12px !important;
  overflow: hidden;
}

/* Flatten buttons, tab pills, mini controls */
form.swse-character-sheet-form.swse-sheet-ui .header-btn,
form.swse-character-sheet-form.swse-sheet-ui .swse-btn,
form.swse-character-sheet-form.swse-sheet-ui .swse-v2-btn,
form.swse-character-sheet-form.swse-sheet-ui .mini-btn,
form.swse-character-sheet-form.swse-sheet-ui .favorite-btn,
form.swse-character-sheet-form.swse-sheet-ui .skill-name-btn,
form.swse-character-sheet-form.swse-sheet-ui .skill-bonus-btn,
form.swse-character-sheet-form.swse-sheet-ui .header-select-btn,
form.swse-character-sheet-form.swse-sheet-ui .sheet-tabs .item,
form.swse-character-sheet-form.swse-sheet-ui .sheet-tabs a,
form.swse-character-sheet-form.swse-sheet-ui .sheet-tabs button,
form.swse-character-sheet-form.swse-sheet-ui button[type="button"] {
  background: rgba(8, 18, 32, 0.96) !important;
  background-image: none !important;
  border: 1px solid var(--swse-flat-border) !important;
  border-radius: 8px !important;
  box-shadow: none !important;
  text-shadow: none !important;
}

form.swse-character-sheet-form.swse-sheet-ui .sheet-tabs .item.active,
form.swse-character-sheet-form.swse-sheet-ui .sheet-tabs a.active,
form.swse-character-sheet-form.swse-sheet-ui .sheet-tabs button.active,
form.swse-character-sheet-form.swse-sheet-ui .header-btn:hover,
form.swse-character-sheet-form.swse-sheet-ui .swse-btn:hover,
form.swse-character-sheet-form.swse-sheet-ui .swse-v2-btn:hover,
form.swse-character-sheet-form.swse-sheet-ui .mini-btn:hover,
form.swse-character-sheet-form.swse-sheet-ui .favorite-btn:hover,
form.swse-character-sheet-form.swse-sheet-ui .skill-name-btn:hover,
form.swse-character-sheet-form.swse-sheet-ui .skill-bonus-btn:hover,
form.swse-character-sheet-form.swse-sheet-ui .header-select-btn:hover {
  border-color: var(--swse-flat-border-strong) !important;
  box-shadow: none !important;
  transform: none !important;
}

/* Flatten inputs and value boxes */
form.swse-character-sheet-form.swse-sheet-ui input,
form.swse-character-sheet-form.swse-sheet-ui select,
form.swse-character-sheet-form.swse-sheet-ui textarea,
form.swse-character-sheet-form.swse-sheet-ui .math-pill,
form.swse-character-sheet-form.swse-sheet-ui .math-result,
form.swse-character-sheet-form.swse-sheet-ui .resource-segment-bar,
form.swse-character-sheet-form.swse-sheet-ui .resource-pip-strip,
form.swse-character-sheet-form.swse-sheet-ui .value-row,
form.swse-character-sheet-form.swse-sheet-ui .value-box,
form.swse-character-sheet-form.swse-sheet-ui .header-field,
form.swse-character-sheet-form.swse-sheet-ui .header-player,
form.swse-character-sheet-form.swse-sheet-ui .header-name-block {
  background-image: none !important;
  box-shadow: none !important;
}

form.swse-character-sheet-form.swse-sheet-ui input,
form.swse-character-sheet-form.swse-sheet-ui select,
form.swse-character-sheet-form.swse-sheet-ui textarea,
form.swse-character-sheet-form.swse-sheet-ui .math-pill,
form.swse-character-sheet-form.swse-sheet-ui .math-result,
form.swse-character-sheet-form.swse-sheet-ui .value-box,
form.swse-character-sheet-form.swse-sheet-ui .resource-segment-bar,
form.swse-character-sheet-form.swse-sheet-ui .resource-pip-strip {
  background: rgba(5, 14, 25, 0.96) !important;
  border: 1px solid rgba(104, 214, 255, 0.22) !important;
  border-radius: 8px !important;
}

/* Make sure tabs never disappear after state churn */
form.swse-character-sheet-form.swse-sheet-ui .sheet-body > .tab {
  min-height: 0;
}

form.swse-character-sheet-form.swse-sheet-ui .sheet-body > .tab.active {
  display: flex !important;
  visibility: visible !important;
  opacity: 1 !important;
}

form.swse-character-sheet-form.swse-sheet-ui .sheet-body > .tab:not(.active) {
  display: none !important;
}

/* Small utility layout for the new abilities action row */
form.swse-character-sheet-form.swse-sheet-ui .section-bar__actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
'''

NEW_ABILITIES = '''
<section class="abilities-panel v3-panel holo-panel">

  <header class="section-bar">
    <h3 class="section-header">Abilities</h3>
    <div class="section-bar__actions">
      <button type="button"
              data-action="roll-attributes"
              class="swse-btn"
              title="Open the progression engine on the attribute step">
        Roll for Attributes
      </button>
      <button type="button"
              data-action="toggle-abilities"
              class="swse-btn">
        Toggle View
      </button>
    </div>
  </header>

  <div class="abilities-container">

    {{#each abilities as |ability|}}

      <div class="ability-row ability-{{ability.key}}"
           data-swse-tooltip="{{#if (eq ability.key 'str')}}Strength{{else if (eq ability.key 'dex')}}Dexterity{{else if (eq ability.key 'con')}}Constitution{{else if (eq ability.key 'int')}}Intelligence{{else if (eq ability.key 'wis')}}Wisdom{{else if (eq ability.key 'cha')}}Charisma{{/if}}">

        <!-- COLLAPSED VIEW -->
        <div class="ability-collapsed">

          <div class="ability-label">
            {{ability.label}}
          </div>

          <div class="ability-total">
            {{ability.total}}
          </div>

          <div class="ability-mod {{ability.modClass}}">
            <span class="mod-value">{{numberFormat ability.mod decimals=0 sign=true}}</span>
          </div>

          <button type="button"
                  data-action="roll-ability"
                  data-ability="{{ability.key}}"
                  class="swse-btn roll-btn"
                  title="Roll d20 + {{ability.key}} modifier">
            <i class="fa-solid fa-dice-d20"></i>
          </button>

        </div>


        <!-- EXPANDED VIEW -->
        <div class="ability-expanded">

          <div class="math-pill compact">
            <input type="number"
                   data-field="base"
                   name="system.abilities.{{ability.key}}.base"
                   value="{{ability.base}}"
                   title="Base ability score">
          </div>

          <div class="math-operator">+</div>

          <div class="math-pill compact">
            <input type="number"
                   data-field="racial"
                   name="system.abilities.{{ability.key}}.racial"
                   value="{{ability.racial}}"
                   title="Racial bonus">
          </div>

          <div class="math-operator">+</div>

          <div class="math-pill compact">
            <input type="number"
                   data-field="temp"
                   name="system.abilities.{{ability.key}}.temp"
                   value="{{ability.temp}}"
                   title="Temporary modifier">
          </div>

          <div class="math-operator">=</div>

          <div class="math-result">
            {{ability.total}}
          </div>

          <div class="math-mod {{ability.modClass}}">
            <span class="mod-value">{{numberFormat ability.mod decimals=0 sign=true}}</span>
          </div>

          <button type="button"
                  data-action="roll-ability"
                  data-ability="{{ability.key}}"
                  class="swse-btn roll-btn"
                  title="Roll d20 + {{ability.key}} modifier">
            <i class="fa-solid fa-dice-d20"></i>
          </button>

        </div>

      </div>


    {{/each}}

  </div>

</section>
'''.lstrip('\n')

TAB_HANDLER = '''    // DELEGATED: Tab Switching - Route through shared UI state manager
    // This prevents "blank body" states where DOM classes and remembered state diverge.
    html.addEventListener("click", ev => {
      const tabLink = ev.target.closest("[data-action='tab']");
      if (!tabLink) return;

      const tabName = tabLink.dataset.tab;
      if (!tabName) return;

      ev.preventDefault();
      ev.stopPropagation();

      console.log(`[TAB SWITCH] Switching to tab: ${tabName}`);

      // Keep both sheet-specific and shared state managers aligned.
      this.visibilityManager?.setActiveTab?.(tabName);
      this.uiStateManager?._activateTab?.(tabLink);

      // Hard fallback: ensure exactly one visible panel exists for the requested tab.
      const panels = html.querySelectorAll(".sheet-body > .tab");
      panels.forEach(panel => {
        const isActive = panel.dataset.tab === tabName;
        panel.classList.toggle("active", isActive);
        panel.hidden = !isActive;
        panel.style.display = isActive ? "flex" : "none";
      });
    }, { signal });
'''

ROLL_ATTR_HANDLER = '''    // Abilities panel: jump directly to the progression attribute step
    html.addEventListener("click", async ev => {
      const button = ev.target.closest('[data-action="roll-attributes"]');
      if (!button) return;
      ev.preventDefault();
      try {
        await launchProgression(this.actor, { currentStep: 'attribute' });
      } catch (err) {
        console.error('[SHEET] â roll-attributes failed:', err);
        SWSELogger.error('[CharacterSheet] roll-attributes failed:', err);
      }
    }, { signal, capture: false });
'''


def patch_text(path: Path, transform):
    original = path.read_text(encoding='utf-8')
    updated = transform(original)
    if updated != original:
        path.write_text(updated, encoding='utf-8')
        print(f'patched: {path}')
    else:
        print(f'no changes: {path}')


def patch_abilities(path: Path):
    def transform(text: str) -> str:
        pattern = re.compile(r'<section class="abilities-panel v3-panel holo-panel">.*?</section>\s*$', re.S)
        if not pattern.search(text):
            raise RuntimeError(f'Could not find abilities panel block in {path}')
        return pattern.sub(NEW_ABILITIES, text)
    patch_text(path, transform)


def patch_js(path: Path):
    def transform(text: str) -> str:
        tab_pattern = re.compile(
            r'\s*// DELEGATED: Tab Switching - Update panel visibility manager AND DOM\n'
            r'\s*// CRITICAL: Must update both internal state AND DOM classes for CSS visibility\n'
            r'\s*html\.addEventListener\("click", ev => \{.*?\n\s*\}, \{ signal \}\);\n',
            re.S,
        )
        if not tab_pattern.search(text):
            raise RuntimeError('Could not find existing tab switching handler')
        text = tab_pattern.sub('\n' + TAB_HANDLER + '\n', text, count=1)

        anchor = "    // Store button (delegated)\n"
        if ROLL_ATTR_HANDLER not in text:
            idx = text.find(anchor)
            if idx == -1:
                raise RuntimeError('Could not find insertion point for roll-attributes handler')
            text = text[:idx] + ROLL_ATTR_HANDLER + '\n' + text[idx:]
        return text
    patch_text(path, transform)


def patch_css(path: Path):
    def transform(text: str) -> str:
        if MARKER in text:
            return text
        return text.rstrip() + '\n\n' + CSS_BLOCK.strip() + '\n'
    patch_text(path, transform)


def main():
    repo_root = Path.cwd()
    if not (repo_root / 'system.json').exists():
        print('Run this from the repo root (the folder that contains system.json).', file=sys.stderr)
        sys.exit(1)

    patch_abilities(repo_root / 'templates/actors/character/v2/partials/abilities-panel.hbs')
    patch_js(repo_root / 'scripts/sheets/v2/character-sheet.js')
    patch_css(repo_root / 'styles/sheets/v2-sheet.css')
    print('\nDone. Reload Foundry and hard-refresh the client to verify the flat-mode pass and tab behavior.')


if __name__ == '__main__':
    main()
