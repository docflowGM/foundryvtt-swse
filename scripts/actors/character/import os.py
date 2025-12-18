HBS_ROW = r"""
{{!-- =====================================================================
     SKILL ROW (Holo UI)
     ===================================================================== --}}
<div class="swse-skill-row" data-skill="{{key}}">

  <div class="skill-left">

    {{!-- Roll Button --}}
    <button class="skill-roll-btn roll-skill"
            data-skill="{{key}}"
            title="Roll {{label}}">
      <i class="fas fa-dice-d20"></i>
    </button>

    {{!-- Total --}}
    <div class="skill-total {{#if skill.trained}}trained{{/if}}">
      {{#if skill}}
        {{numberFormat skill.total decimals=0 sign=true}}
      {{else}}+0{{/if}}
    </div>

    {{!-- Skill Label --}}
    <div class="skill-label">{{label}}</div>
  </div>

  <div class="skill-middle">

    {{!-- Ability Select --}}
    <select name="system.skills.{{key}}.selectedAbility"
            class="skill-ability-select"
            title="Ability modifier for this skill">
      {{#each ../system.abilities as |ab aKey|}}
      <option value="{{aKey}}"
        {{#if (eq ../skill.selectedAbility aKey)}}selected{{/if}}>
        {{uppercase aKey}}
        ({{ab.mod}})
      </option>
      {{/each}}
    </select>

    <div class="ability-mod-display">
      {{#if skill}}
        {{numberFormat skill.abilityMod decimals=0 sign=true}}
      {{else}}+0{{/if}}
    </div>
  </div>

  <div class="skill-right">

    {{!-- Trained --}}
    <label class="skill-flag" title="Trained (+5)">
      <input type="checkbox"
             name="system.skills.{{key}}.trained"
             {{checked skill.trained}} />
      T
    </label>

    {{!-- Focus --}}
    <label class="skill-flag" title="Skill Focus (+5)">
      <input type="checkbox"
             name="system.skills.{{key}}.focused"
             {{checked skill.focused}} />
      F
    </label>

    {{!-- Misc --}}
    <input type="number"
           class="skill-misc-input"
           name="system.skills.{{key}}.miscMod"
           value="{{skill.miscMod}}"
           data-dtype="Number"
           placeholder="0"
           title="Misc modifiers"/>

    {{!-- Expand Panel --}}
    <button class="skill-expand-btn"
            data-skill="{{key}}"
            title="Show Skill Actions">
      <i class="fas fa-chevron-down"></i>
    </button>

  </div>

</div>
"""
