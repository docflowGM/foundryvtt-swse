#!/usr/bin/env python3
"""
SWSE Character Sheet Fixes - Updated Version
With condition buttons, improved defense layout, and armor section
"""

import os
import re
from pathlib import Path

# Base path to your repo
REPO_PATH = Path(r"C:\Users\Owner\Documents\GitHub\foundryvtt-swse")

def fix_character_sheet_template():
    """Fix the character sheet template with all improvements"""
    
    template_path = REPO_PATH / "templates" / "actors" / "character-sheet.hbs"
    
    if not template_path.exists():
        print(f"❌ Template not found: {template_path}")
        return False
    
    print(f"📝 Updating character sheet template...")
    
    # Create the complete improved template
    new_template = '''{{!-- SWSE Character Sheet - Fixed and Improved --}}
<form class="swse-datapad-sheet {{cssClass}} holo-theme" autocomplete="off">
    
    {{!-- TOP HEADER BAR --}}
    <header class="datapad-header">
        <div class="header-left">
            <div class="header-tabs">
                <button type="button" class="header-tab active" data-sheet-mode="character">PC</button>
                <button type="button" class="header-tab" data-sheet-mode="npc">NPC</button>
                <button type="button" class="header-tab" data-sheet-mode="vehicle">Vehicle</button>
                <button type="button" class="header-tab" data-sheet-mode="settings">Settings</button>
            </div>
            
            <div class="basic-fields">
                <div class="field-trio">
                    <div class="field-sm">
                        <label>Class</label>
                        <input name="system.class" type="text" value="{{system.class}}"/>
                    </div>
                    <div class="field-sm">
                        <label>Level</label>
                        <input name="system.level" type="number" value="{{system.level}}" data-dtype="Number"/>
                    </div>
                    <div class="field-sm">
                        <label>½ Lvl</label>
                        <div class="readonly half-level-display">{{halfLevel}}</div>
                    </div>
                </div>
                
                <div class="field-row-2">
                    <div class="field-md">
                        <label>Background</label>
                        <input name="system.background" type="text" value="{{system.background}}"/>
                    </div>
                    <div class="field-md">
                        <label>Species</label>
                        <input name="system.species" type="text" value="{{system.species}}"/>
                    </div>
                </div>
                
                <div class="field-row-2">
                    <div class="field-md">
                        <label>Gender</label>
                        <input name="system.gender" type="text" value="{{system.gender}}"/>
                    </div>
                    <div class="field-md">
                        <label>Size</label>
                        <input name="system.size" type="text" value="{{system.size}}" placeholder="Medium"/>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="header-center">
            <img class="sw-logo" src="systems/swse/assets/ui/logo.png" alt="Star Wars Saga Edition"/>
        </div>
        
        <div class="header-right">
            <img class="character-portrait" src="{{actor.img}}" data-edit="img" title="{{actor.name}}"/>
        </div>
    </header>

    {{!-- MAIN CONTENT GRID - SCROLLABLE --}}
    <div class="datapad-main-grid scrollable-content">
        
        {{!-- LEFT COLUMN --}}
        <div class="left-column">
            
            {{!-- ATTRIBUTES --}}
            <section class="datapad-section">
                <div class="section-header-black">Attributes</div>
                <div class="attributes-grid-improved">
                    {{#each system.abilities as |ability key|}}
                    <div class="attribute-row-improved">
                        <label class="attr-label">{{toUpperCase key}}</label>
                        
                        <div class="attr-breakdown">
                            <div class="attr-field">
                                <label>Base</label>
                                <input type="number" name="system.abilities.{{key}}.base" value="{{ability.base}}" class="attr-input-sm" data-dtype="Number"/>
                            </div>
                            
                            <div class="attr-field">
                                <label>Race</label>
                                <input type="number" name="system.abilities.{{key}}.racial" value="{{ability.racial}}" class="attr-input-sm" data-dtype="Number" placeholder="0"/>
                            </div>
                            
                            <div class="attr-field">
                                <label>Misc</label>
                                <input type="number" name="system.abilities.{{key}}.misc" value="{{ability.misc}}" class="attr-input-sm" data-dtype="Number" placeholder="0"/>
                            </div>
                            
                            <div class="attr-field">
                                <label>Total</label>
                                <div class="attr-total">{{ability.total}}</div>
                            </div>
                        </div>
                        
                        <button type="button" class="roll-btn" data-ability="{{key}}">⚅</button>
                        <div class="attr-mod">{{#if (gte ability.mod 0)}}+{{/if}}{{ability.mod}}</div>
                        <button type="button" class="roll-btn" data-ability="{{key}}">⚅</button>
                    </div>
                    {{/each}}
                </div>
            </section>

            {{!-- DEFENSES - UPDATED LAYOUT --}}
            <section class="datapad-section">
                <div class="section-header-black">Defenses</div>
                
                <div class="defense-table">
                    <div class="defense-table-header">
                        <div class="def-col-label"></div>
                        <div class="def-col-value">Total</div>
                        <div class="def-col-formula">= 10 +</div>
                        <div class="def-col-value">Level/Armor</div>
                        <div class="def-col-value">Class</div>
                        <div class="def-col-value">Mod</div>
                        <div class="def-col-value">Misc</div>
                    </div>
                    
                    {{!-- REFLEX --}}
                    <div class="defense-table-row reflex-row">
                        <label class="defense-label-compact">Reflex</label>
                        <div class="defense-total-compact reflex-total">{{system.defenses.reflex.total}}</div>
                        <div class="defense-equals">=</div>
                        <div class="defense-base">10 +</div>
                        <input type="number" name="system.defenses.reflex.levelArmor" value="{{system.defenses.reflex.levelArmor}}" class="defense-input-sm" data-dtype="Number" placeholder="0"/>
                        <input type="number" name="system.defenses.reflex.classBonus" value="{{system.defenses.reflex.classBonus}}" class="defense-input-sm" data-dtype="Number" placeholder="0"/>
                        <select name="system.defenses.reflex.abilityMod" class="defense-select-sm">
                            <option value="dex" {{#if (eq system.defenses.reflex.abilityMod "dex")}}selected{{/if}}>DEX</option>
                            <option value="str">STR</option>
                            <option value="con">CON</option>
                            <option value="int">INT</option>
                            <option value="wis">WIS</option>
                            <option value="cha">CHA</option>
                        </select>
                        <input type="number" name="system.defenses.reflex.misc" value="{{system.defenses.reflex.misc}}" class="defense-input-sm" data-dtype="Number" placeholder="0"/>
                    </div>
                    
                    {{!-- FORTITUDE --}}
                    <div class="defense-table-row fortitude-row">
                        <label class="defense-label-compact">Fortitude</label>
                        <div class="defense-total-compact fortitude-total">{{system.defenses.fortitude.total}}</div>
                        <div class="defense-equals">=</div>
                        <div class="defense-base">10 +</div>
                        <input type="number" name="system.defenses.fortitude.levelArmor" value="{{system.defenses.fortitude.levelArmor}}" class="defense-input-sm" data-dtype="Number" placeholder="0"/>
                        <input type="number" name="system.defenses.fortitude.classBonus" value="{{system.defenses.fortitude.classBonus}}" class="defense-input-sm" data-dtype="Number" placeholder="0"/>
                        <select name="system.defenses.fortitude.abilityMod" class="defense-select-sm">
                            <option value="con" {{#if (eq system.defenses.fortitude.abilityMod "con")}}selected{{/if}}>CON</option>
                            <option value="str">STR</option>
                            <option value="dex">DEX</option>
                            <option value="int">INT</option>
                            <option value="wis">WIS</option>
                            <option value="cha">CHA</option>
                        </select>
                        <input type="number" name="system.defenses.fortitude.misc" value="{{system.defenses.fortitude.misc}}" class="defense-input-sm" data-dtype="Number" placeholder="0"/>
                    </div>
                    
                    {{!-- WILL --}}
                    <div class="defense-table-row will-row">
                        <label class="defense-label-compact">Will</label>
                        <div class="defense-total-compact will-total">{{system.defenses.will.total}}</div>
                        <div class="defense-equals">=</div>
                        <div class="defense-base">10 +</div>
                        <input type="number" name="system.defenses.will.levelArmor" value="{{system.defenses.will.levelArmor}}" class="defense-input-sm" data-dtype="Number" placeholder="0"/>
                        <input type="number" name="system.defenses.will.classBonus" value="{{system.defenses.will.classBonus}}" class="defense-input-sm" data-dtype="Number" placeholder="0"/>
                        <select name="system.defenses.will.abilityMod" class="defense-select-sm">
                            <option value="wis" {{#if (eq system.defenses.will.abilityMod "wis")}}selected{{/if}}>WIS</option>
                            <option value="str">STR</option>
                            <option value="dex">DEX</option>
                            <option value="con">CON</option>
                            <option value="int">INT</option>
                            <option value="cha">CHA</option>
                        </select>
                        <input type="number" name="system.defenses.will.misc" value="{{system.defenses.will.misc}}" class="defense-input-sm" data-dtype="Number" placeholder="0"/>
                    </div>
                    
                    <div class="defense-notes">
                        <label>Defense Notes</label>
                        <input type="text" name="system.defenses.notes" value="{{system.defenses.notes}}" placeholder="Special defense modifiers..."/>
                    </div>
                </div>
            </section>

            {{!-- ARMOR SECTION --}}
            <section class="datapad-section">
                <div class="section-header-black">Armor</div>
                
                <div class="armor-main-row">
                    <div class="armor-field-wide">
                        <label>Armor name</label>
                        <input type="text" name="system.armor.name" value="{{system.armor.name}}" placeholder="Armor name"/>
                    </div>
                    <div class="armor-field-sm">
                        <label>Def Mod Bonus</label>
                        <input type="number" name="system.armor.defModBonus" value="{{system.armor.defModBonus}}" data-dtype="Number" placeholder="0"/>
                    </div>
                    <div class="armor-field-sm">
                        <label>Fort Def Bonus</label>
                        <input type="number" name="system.armor.fortDefBonus" value="{{system.armor.fortDefBonus}}" data-dtype="Number" placeholder="0"/>
                    </div>
                    <div class="armor-field-sm">
                        <label>Max Dex Bonus</label>
                        <input type="number" name="system.armor.maxDexBonus" value="{{system.armor.maxDexBonus}}" data-dtype="Number" placeholder="0"/>
                    </div>
                    <div class="armor-field-sm">
                        <label>Speed</label>
                        <input type="number" name="system.armor.speed" value="{{system.armor.speed}}" data-dtype="Number" placeholder="0"/>
                    </div>
                </div>
                
                <div class="armor-checkboxes-row">
                    <div class="armor-checkbox-group">
                        <label>Proficiency</label>
                        <input type="checkbox" name="system.armor.proficiency" {{#if system.armor.proficiency}}checked{{/if}}/>
                    </div>
                    <div class="armor-checkbox-group">
                        <label>Armored Defense</label>
                        <input type="checkbox" name="system.armor.armoredDefense" {{#if system.armor.armoredDefense}}checked{{/if}}/>
                    </div>
                    <div class="armor-checkbox-group">
                        <label>Improved Armored Def.</label>
                        <input type="checkbox" name="system.armor.improvedArmoredDef" {{#if system.armor.improvedArmoredDef}}checked{{/if}}/>
                    </div>
                    <div class="armor-select-group">
                        <label>Armor Type</label>
                        <select name="system.armor.type">
                            <option value="none" {{#if (eq system.armor.type "none")}}selected{{/if}}>None</option>
                            <option value="light" {{#if (eq system.armor.type "light")}}selected{{/if}}>Light</option>
                            <option value="medium" {{#if (eq system.armor.type "medium")}}selected{{/if}}>Medium</option>
                            <option value="heavy" {{#if (eq system.armor.type "heavy")}}selected{{/if}}>Heavy</option>
                        </select>
                    </div>
                    <div class="armor-select-group">
                        <label>Helmet Package</label>
                        <select name="system.armor.helmetPackage">
                            <option value="none" {{#if (eq system.armor.helmetPackage "none")}}selected{{/if}}>None</option>
                            <option value="basic" {{#if (eq system.armor.helmetPackage "basic")}}selected{{/if}}>Basic</option>
                            <option value="advanced" {{#if (eq system.armor.helmetPackage "advanced")}}selected{{/if}}>Advanced</option>
                        </select>
                    </div>
                </div>
                
                <div class="armor-notes">
                    <label>Armor Notes</label>
                    <input type="text" name="system.armor.notes" value="{{system.armor.notes}}" placeholder="Special armor properties..."/>
                </div>
            </section>

            {{!-- SKILLS SECTION --}}
            <section class="datapad-section">
                <div class="section-header-black">Skills</div>
                <div class="skills-grid-compact">
                    {{!-- DEFAULT SKILLS --}}
                    {{#each defaultSkills as |skill|}}
                    <div class="skill-row">
                        <div class="skill-name">{{skill.name}}</div>
                        <div class="skill-bonus">{{skill.bonus}}</div>
                        <input type="checkbox" class="skill-trained" {{#if skill.trained}}checked{{/if}}/>
                        <button type="button" class="roll-btn-sm" data-skill="{{skill.name}}">⚅</button>
                    </div>
                    {{/each}}
                    
                    {{!-- CUSTOM SKILLS DIVIDER --}}
                    <div class="custom-skills-divider">⚡ CUSTOM SKILLS ⚡</div>
                    
                    {{!-- CUSTOM SKILLS --}}
                    {{#each customSkills as |skill index|}}
                    <div class="skill-row custom-skill-row">
                        <input type="text" class="skill-name-input" name="system.customSkills.{{index}}.name" value="{{skill.name}}" placeholder="Skill Name"/>
                        <div class="skill-bonus">{{skill.bonus}}</div>
                        <input type="checkbox" class="skill-trained" name="system.customSkills.{{index}}.trained" {{#if skill.trained}}checked{{/if}}/>
                        <button type="button" class="delete-custom-skill" data-index="{{index}}">×</button>
                    </div>
                    {{/each}}
                    
                    <button type="button" class="add-custom-skill-btn">+ Add Custom Skill</button>
                </div>
            </section>
        </div>
        
        {{!-- CENTER COLUMN --}}
        <div class="center-column">
            
            {{!-- HIT POINTS & VITALS --}}
            <section class="datapad-section">
                <div class="section-header-black">Hit Points & Vitals</div>
                <div class="hp-grid">
                    <div class="hp-field">
                        <label>Current HP</label>
                        <input name="system.hp.value" type="number" value="{{system.hp.value}}" data-dtype="Number"/>
                    </div>
                    <div class="hp-field">
                        <label>Max HP</label>
                        <input name="system.hp.max" type="number" value="{{system.hp.max}}" data-dtype="Number"/>
                    </div>
                    <div class="hp-field">
                        <label>Temp HP</label>
                        <input name="system.hp.temp" type="number" value="{{system.hp.temp}}" data-dtype="Number" placeholder="0"/>
                    </div>
                </div>
                
                <div class="threshold-grid">
                    <div class="threshold-row">
                        <label>Damage Threshold</label>
                        <div class="threshold-formula-compact">
                            <span class="formula-text-sm">Fort +</span>
                            <input type="number" name="system.damageThreshold.misc" value="{{system.damageThreshold.misc}}" placeholder="0" class="formula-input-sm" data-dtype="Number"/>
                            <span class="formula-text-sm">= </span>
                            <div class="threshold-total">{{system.damageThreshold.total}}</div>
                        </div>
                    </div>
                    
                    <div class="threshold-row">
                        <label>Second Wind</label>
                        <div class="threshold-formula-compact">
                            <span class="formula-text-sm">¼ HP +</span>
                            <input type="number" name="system.secondWind.misc" value="{{system.secondWind.misc}}" placeholder="0" class="formula-input-sm" data-dtype="Number"/>
                            <span class="formula-text-sm">= </span>
                            <div class="threshold-total">{{system.secondWind.total}}</div>
                        </div>
                    </div>
                </div>
            </section>

            {{!-- CONDITION TRACK - BUTTONS INSTEAD OF DROPDOWN --}}
            <section class="datapad-section">
                <div class="section-header-black">Condition</div>
                <div class="condition-buttons">
                    <button type="button" class="condition-btn {{#if (eq system.condition 'normal')}}active{{/if}}" data-condition="normal">
                        Normal
                    </button>
                    <button type="button" class="condition-btn {{#if (eq system.condition '-2')}}active{{/if}}" data-condition="-2">
                        -2
                    </button>
                    <button type="button" class="condition-btn {{#if (eq system.condition '-5')}}active{{/if}}" data-condition="-5">
                        -5
                    </button>
                    <button type="button" class="condition-btn {{#if (eq system.condition '-10')}}active{{/if}}" data-condition="-10">
                        -10
                    </button>
                    <button type="button" class="condition-btn debilitated {{#if (eq system.condition 'debilitated')}}active{{/if}}" data-condition="debilitated">
                        Debilitated
                    </button>
                    <button type="button" class="condition-btn persistent {{#if (eq system.condition 'persistent')}}active{{/if}}" data-condition="persistent">
                        Persistent
                    </button>
                </div>
                <input type="hidden" name="system.condition" value="{{system.condition}}"/>
            </section>

            {{!-- BOTTOM TABS --}}
            <section class="datapad-section">
                <div class="bottom-tabs-header">
                    <button type="button" class="bottom-tab active" data-tab="equipment">Equipment</button>
                    <button type="button" class="bottom-tab" data-tab="feats">Feats</button>
                    <button type="button" class="bottom-tab" data-tab="talents">Talents</button>
                    <button type="button" class="bottom-tab" data-tab="powers">Powers</button>
                    <button type="button" class="bottom-tab" data-tab="notes">Notes</button>
                </div>
                
                <div class="bottom-tabs-content">
                    {{!-- EQUIPMENT TAB --}}
                    <div class="bottom-tab-content" data-tab="equipment">
                        <div class="equipment-list">
                            {{#each equipment as |item|}}
                            <div class="equipment-item">
                                <img src="{{item.img}}" class="item-icon"/>
                                <div class="item-name">{{item.name}}</div>
                                <div class="item-qty">×{{item.system.quantity}}</div>
                                <button type="button" class="item-btn-sm" data-item-id="{{item.id}}">🔍</button>
                            </div>
                            {{/each}}
                        </div>
                        <button type="button" class="add-equipment-btn">+ Add Equipment</button>
                    </div>
                    
                    {{!-- FEATS TAB --}}
                    <div class="bottom-tab-content" data-tab="feats" style="display:none;">
                        <div class="feat-list">
                            {{#each feats as |feat|}}
                            <div class="feat-item">
                                <div class="feat-name">{{feat.name}}</div>
                                <button type="button" class="item-btn-sm" data-item-id="{{feat.id}}">🔍</button>
                            </div>
                            {{/each}}
                        </div>
                        <button type="button" class="add-feat-btn">+ Add Feat</button>
                    </div>
                    
                    {{!-- TALENTS TAB --}}
                    <div class="bottom-tab-content" data-tab="talents" style="display:none;">
                        <div class="talent-list">
                            {{#each talents as |talent|}}
                            <div class="talent-item">
                                <div class="talent-name">{{talent.name}}</div>
                                <button type="button" class="item-btn-sm" data-item-id="{{talent.id}}">🔍</button>
                            </div>
                            {{/each}}
                        </div>
                        <button type="button" class="add-talent-btn">+ Add Talent</button>
                    </div>
                    
                    {{!-- POWERS TAB --}}
                    <div class="bottom-tab-content" data-tab="powers" style="display:none;">
                        <div class="power-list">
                            {{#each powers as |power|}}
                            <div class="force-power-item">
                                <div class="power-header">
                                    <div class="power-name">{{power.name}}</div>
                                    <div class="power-actions-compact">
                                        <button type="button" class="use-power-btn" data-power-id="{{power.id}}">Use</button>
                                        <button type="button" class="reload-power-btn" data-power-id="{{power.id}}">↻</button>
                                        <button type="button" class="item-btn-sm" data-item-id="{{power.id}}">🔍</button>
                                    </div>
                                </div>
                            </div>
                            {{/each}}
                        </div>
                        <button type="button" class="add-power-btn">+ Add Force Power</button>
                    </div>
                    
                    {{!-- NOTES TAB --}}
                    <div class="bottom-tab-content" data-tab="notes" style="display:none;">
                        <textarea name="system.notes" placeholder="Character notes, backstory, etc...">{{system.notes}}</textarea>
                    </div>
                </div>
            </section>
        </div>
        
        {{!-- RIGHT COLUMN --}}
        <div class="right-column">
            
            {{!-- COMBAT STATS --}}
            <section class="datapad-section">
                <div class="section-header-black">Combat Stats</div>
                
                <div class="combat-stat-row">
                    <label>Base Attack Bonus</label>
                    <input name="system.bab" type="number" value="{{system.bab}}" data-dtype="Number"/>
                </div>
                
                <div class="combat-stat-row">
                    <label>Speed</label>
                    <input name="system.speed" type="number" value="{{system.speed}}" data-dtype="Number" placeholder="6"/>
                </div>
                
                <div class="combat-stat-row">
                    <label>Initiative</label>
                    <div class="initiative-display">{{initiativeTotal}}</div>
                    <button type="button" class="roll-btn" data-roll="initiative">⚅</button>
                </div>
            </section>

            {{!-- FORCE POINTS --}}
            <section class="datapad-section">
                <div class="section-header-black">Force & Destiny</div>
                <div class="force-grid">
                    <div class="force-field">
                        <label>Force Points</label>
                        <input name="system.forcePoints.value" type="number" value="{{system.forcePoints.value}}" data-dtype="Number"/>
                        <span>/</span>
                        <input name="system.forcePoints.max" type="number" value="{{system.forcePoints.max}}" data-dtype="Number"/>
                    </div>
                    
                    <div class="force-field">
                        <label>Dark Side Score</label>
                        <input name="system.darkSideScore" type="number" value="{{system.darkSideScore}}" data-dtype="Number" placeholder="0"/>
                    </div>
                    
                    <div class="force-field">
                        <label>Destiny</label>
                        <input name="system.destiny" type="number" value="{{system.destiny}}" data-dtype="Number" placeholder="0"/>
                    </div>
                </div>
            </section>

            {{!-- CREDITS & WEALTH --}}
            <section class="datapad-section">
                <div class="section-header-black">Credits</div>
                <input name="system.credits" type="number" value="{{system.credits}}" data-dtype="Number" placeholder="0" class="credits-input-large"/>
            </section>
        </div>
    </div>
</form>'''
    
    with open(template_path, 'w', encoding='utf-8') as f:
        f.write(new_template)
    
    print(f"✅ Character sheet template updated successfully!")
    return True


def add_improved_css():
    """Add improved CSS with condition buttons and updated defense layout"""
    
    css_dir = REPO_PATH / "styles"
    css_dir.mkdir(exist_ok=True)
    
    css_path = css_dir / "character-sheet-fixes.css"
    
    print(f"📝 Creating CSS fixes file...")
    
    improved_css = '''/* ═══════════════════════════════════════════════════
   SWSE CHARACTER SHEET FIXES - UPDATED CSS
   With condition buttons and improved defense layout
   ═══════════════════════════════════════════════════ */

/* ─────────────── SCROLLABLE MAIN CONTENT ─────────────── */
.scrollable-content {
    max-height: 600px;
    overflow-y: auto;
    overflow-x: hidden;
    padding-right: 10px;
}

.scrollable-content::-webkit-scrollbar {
    width: 12px;
}

.scrollable-content::-webkit-scrollbar-track {
    background: rgba(0, 20, 40, 0.6);
    border-radius: 6px;
}

.scrollable-content::-webkit-scrollbar-thumb {
    background: linear-gradient(to bottom, #00a8cc, #007a9c);
    border-radius: 6px;
    border: 2px solid rgba(0, 20, 40, 0.6);
}

.scrollable-content::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(to bottom, #00d9ff, #00a8cc);
}

/* ─────────────── IMPROVED ATTRIBUTES SECTION ─────────────── */
.attributes-grid-improved {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.attribute-row-improved {
    display: grid;
    grid-template-columns: 60px 1fr auto 80px auto;
    align-items: center;
    gap: 10px;
    padding: 8px;
    background: rgba(0, 0, 0, 0.5);
    border: 1px solid #00a8cc;
    border-radius: 4px;
}

.attr-label {
    font-weight: bold;
    font-size: 14px;
    color: #00d9ff;
}

.attr-breakdown {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 6px;
}

.attr-field {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
}

.attr-field label {
    font-size: 9px;
    color: #00ff88;
    text-transform: uppercase;
}

.attr-input-sm {
    width: 40px;
    padding: 4px;
    background: rgba(0, 0, 0, 0.7);
    border: 1px solid #00a8cc;
    color: #00ff88;
    text-align: center;
    font-weight: bold;
    border-radius: 3px;
    font-size: 12px;
}

.attr-total {
    width: 40px;
    padding: 4px;
    background: rgba(0, 170, 204, 0.2);
    border: 1px solid #00d9ff;
    color: #00d9ff;
    text-align: center;
    font-weight: bold;
    border-radius: 3px;
    font-size: 14px;
}

.attr-mod {
    font-size: 20px;
    font-weight: bold;
    color: #00ff88;
    min-width: 60px;
    text-align: center;
    background: rgba(0, 255, 136, 0.1);
    padding: 8px;
    border-radius: 6px;
    border: 2px solid #00ff88;
}

.roll-btn {
    width: 36px;
    height: 36px;
    background: linear-gradient(to bottom, #00a8cc, #007a9c);
    border: 2px solid #00d9ff;
    color: #fff;
    font-size: 18px;
    font-weight: bold;
    cursor: pointer;
    border-radius: 6px;
    transition: all 0.2s ease;
}

.roll-btn:hover {
    background: linear-gradient(to bottom, #00d9ff, #00a8cc);
    transform: scale(1.1);
    box-shadow: 0 0 15px rgba(0, 217, 255, 0.6);
}

/* ─────────────── UPDATED DEFENSE TABLE LAYOUT ─────────────── */
.defense-table {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.defense-table-header {
    display: grid;
    grid-template-columns: 80px 50px 50px 80px 50px 60px 50px;
    gap: 6px;
    padding: 4px;
    background: rgba(0, 170, 204, 0.2);
    border: 1px solid #00a8cc;
    border-radius: 4px;
    font-size: 10px;
    color: #00ff88;
    font-weight: bold;
    text-align: center;
}

.defense-table-row {
    display: grid;
    grid-template-columns: 80px 50px 50px 80px 50px 60px 50px;
    gap: 6px;
    align-items: center;
    padding: 6px;
    background: rgba(0, 0, 0, 0.4);
    border: 1px solid #00a8cc;
    border-radius: 4px;
}

.defense-label-compact {
    font-size: 12px;
    font-weight: bold;
    text-align: left;
    padding-left: 4px;
}

.reflex-row .defense-label-compact {
    color: #4ecdc4;
}

.fortitude-row .defense-label-compact {
    color: #ff6b6b;
}

.will-row .defense-label-compact {
    color: #ffe66d;
}

.defense-total-compact {
    font-size: 18px;
    font-weight: bold;
    text-align: center;
    padding: 6px;
    border-radius: 4px;
    border: 2px solid;
}

.reflex-total {
    background: rgba(78, 205, 196, 0.2);
    border-color: #4ecdc4;
    color: #4ecdc4;
}

.fortitude-total {
    background: rgba(255, 107, 107, 0.2);
    border-color: #ff6b6b;
    color: #ff6b6b;
}

.will-total {
    background: rgba(255, 230, 109, 0.2);
    border-color: #ffe66d;
    color: #ffe66d;
}

.defense-equals,
.defense-base {
    font-size: 11px;
    color: #00d9ff;
    font-weight: bold;
    text-align: center;
}

.defense-input-sm {
    width: 100%;
    padding: 4px;
    background: rgba(0, 0, 0, 0.7);
    border: 1px solid #00a8cc;
    color: #00ff88;
    text-align: center;
    font-weight: bold;
    border-radius: 3px;
    font-size: 11px;
}

.defense-select-sm {
    width: 100%;
    padding: 4px 2px;
    background: rgba(0, 0, 0, 0.7);
    border: 1px solid #00a8cc;
    color: #00ff88;
    text-align: center;
    font-weight: bold;
    border-radius: 3px;
    font-size: 10px;
}

.defense-notes {
    margin-top: 8px;
}

.defense-notes label {
    display: block;
    font-size: 10px;
    color: #00ff88;
    margin-bottom: 4px;
}

.defense-notes input {
    width: 100%;
    padding: 6px;
    background: rgba(0, 0, 0, 0.5);
    border: 1px solid #00a8cc;
    color: #00d9ff;
    font-size: 11px;
    border-radius: 3px;
}

/* ─────────────── ARMOR SECTION ─────────────── */
.armor-main-row {
    display: grid;
    grid-template-columns: 2fr repeat(4, 1fr);
    gap: 6px;
    margin-bottom: 8px;
}

.armor-field-wide,
.armor-field-sm {
    display: flex;
    flex-direction: column;
    gap: 3px;
}

.armor-field-wide label,
.armor-field-sm label {
    font-size: 9px;
    color: #00ff88;
    text-transform: uppercase;
    font-weight: bold;
}

.armor-field-wide input,
.armor-field-sm input {
    padding: 5px;
    background: rgba(0, 0, 0, 0.7);
    border: 1px solid #00a8cc;
    color: #00ff88;
    font-size: 11px;
    border-radius: 3px;
    font-weight: bold;
    text-align: center;
}

.armor-checkboxes-row {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 8px;
    margin-bottom: 8px;
    padding: 8px;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid #00a8cc;
    border-radius: 4px;
}

.armor-checkbox-group,
.armor-select-group {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
}

.armor-checkbox-group label,
.armor-select-group label {
    font-size: 9px;
    color: #00ff88;
    text-align: center;
    font-weight: bold;
}

.armor-checkbox-group input[type="checkbox"] {
    width: 20px;
    height: 20px;
    cursor: pointer;
}

.armor-select-group select {
    width: 100%;
    padding: 4px;
    background: rgba(0, 0, 0, 0.7);
    border: 1px solid #00a8cc;
    color: #00ff88;
    font-size: 10px;
    border-radius: 3px;
    font-weight: bold;
}

.armor-notes {
    margin-top: 4px;
}

.armor-notes label {
    display: block;
    font-size: 10px;
    color: #00ff88;
    margin-bottom: 4px;
}

.armor-notes input {
    width: 100%;
    padding: 6px;
    background: rgba(0, 0, 0, 0.5);
    border: 1px solid #00a8cc;
    color: #00d9ff;
    font-size: 11px;
    border-radius: 3px;
}

/* ─────────────── CONDITION BUTTONS ─────────────── */
.condition-buttons {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
    padding: 10px;
}

.condition-btn {
    padding: 12px 8px;
    background: linear-gradient(to bottom, rgba(0, 168, 204, 0.3), rgba(0, 122, 156, 0.3));
    border: 2px solid #00a8cc;
    color: #00d9ff;
    font-weight: bold;
    font-size: 12px;
    cursor: pointer;
    border-radius: 6px;
    transition: all 0.2s ease;
    text-transform: uppercase;
}

.condition-btn:hover {
    background: linear-gradient(to bottom, rgba(0, 168, 204, 0.5), rgba(0, 122, 156, 0.5));
    border-color: #00d9ff;
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 217, 255, 0.4);
}

.condition-btn.active {
    background: linear-gradient(to bottom, #00a8cc, #007a9c);
    border-color: #00ff88;
    color: #00ff88;
    box-shadow: 0 0 15px rgba(0, 255, 136, 0.5);
}

.condition-btn.debilitated {
    background: linear-gradient(to bottom, rgba(255, 107, 107, 0.3), rgba(204, 85, 85, 0.3));
    border-color: #ff6b6b;
    color: #ff6b6b;
}

.condition-btn.debilitated.active {
    background: linear-gradient(to bottom, #ff6b6b, #cc5555);
    border-color: #ffaa00;
    color: #fff;
}

.condition-btn.persistent {
    background: linear-gradient(to bottom, rgba(255, 230, 109, 0.3), rgba(204, 184, 87, 0.3));
    border-color: #ffe66d;
    color: #ffe66d;
}

.condition-btn.persistent.active {
    background: linear-gradient(to bottom, #ffe66d, #ccb857);
    border-color: #ffaa00;
    color: #000;
    font-weight: bold;
}

/* ─────────────── HALF LEVEL DISPLAY ─────────────── */
.half-level-display {
    padding: 6px 12px;
    background: rgba(0, 170, 204, 0.3);
    border: 2px solid #00d9ff;
    color: #00d9ff;
    font-weight: bold;
    font-size: 14px;
    text-align: center;
    border-radius: 4px;
}

/* ─────────────── DAMAGE THRESHOLD & SECOND WIND ─────────────── */
.threshold-grid {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 12px;
}

.threshold-row {
    display: grid;
    grid-template-columns: 140px 1fr;
    align-items: center;
    gap: 10px;
    padding: 6px;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid #00a8cc;
    border-radius: 4px;
}

.threshold-row label {
    font-size: 11px;
    font-weight: bold;
    color: #00d9ff;
}

.threshold-formula-compact {
    display: flex;
    align-items: center;
    gap: 4px;
}

.formula-text-sm {
    color: #00ff88;
    font-size: 10px;
    font-weight: bold;
}

.formula-input-sm {
    width: 40px;
    padding: 3px;
    background: rgba(0, 0, 0, 0.7);
    border: 1px solid #00a8cc;
    color: #00ff88;
    text-align: center;
    font-weight: bold;
    border-radius: 3px;
    font-size: 10px;
}

.threshold-total {
    min-width: 50px;
    padding: 4px 8px;
    background: rgba(0, 217, 255, 0.2);
    border: 1px solid #00d9ff;
    color: #00d9ff;
    font-weight: bold;
    font-size: 14px;
    text-align: center;
    border-radius: 4px;
}

/* ─────────────── SKILLS SECTION ─────────────── */
.skills-grid-compact {
    display: flex;
    flex-direction: column;
    gap: 4px;
    max-height: 400px;
    overflow-y: auto;
    padding-right: 8px;
}

.skill-row {
    display: grid;
    grid-template-columns: 1fr 60px 30px 35px;
    align-items: center;
    gap: 8px;
    padding: 6px;
    background: rgba(0, 0, 0, 0.4);
    border: 1px solid #00a8cc;
    border-radius: 3px;
}

.skill-name {
    font-size: 11px;
    color: #00d9ff;
    font-weight: 500;
}

.skill-bonus {
    text-align: center;
    font-weight: bold;
    color: #00ff88;
    font-size: 13px;
    background: rgba(0, 255, 136, 0.1);
    padding: 4px;
    border-radius: 3px;
}

.skill-trained {
    width: 20px;
    height: 20px;
    cursor: pointer;
}

.roll-btn-sm {
    width: 30px;
    height: 30px;
    background: linear-gradient(to bottom, #00a8cc, #007a9c);
    border: 1px solid #00d9ff;
    color: #fff;
    font-size: 14px;
    font-weight: bold;
    cursor: pointer;
    border-radius: 4px;
}

.roll-btn-sm:hover {
    background: linear-gradient(to bottom, #00d9ff, #00a8cc);
    box-shadow: 0 0 10px rgba(0, 217, 255, 0.5);
}

.custom-skills-divider {
    text-align: center;
    padding: 8px;
    margin: 8px 0;
    border-top: 2px solid #00a8cc;
    border-bottom: 2px solid #00a8cc;
    color: #00ff88;
    font-weight: bold;
    font-size: 11px;
}

.custom-skill-row {
    background: rgba(0, 170, 255, 0.1);
}

.skill-name-input {
    padding: 4px 6px;
    background: rgba(0, 0, 0, 0.5);
    border: 1px solid #00a8cc;
    color: #00d9ff;
    font-size: 11px;
    border-radius: 3px;
    width: 100%;
}

.delete-custom-skill {
    width: 30px;
    height: 30px;
    padding: 2px;
    background: #aa0000;
    border: 1px solid #ff0000;
    color: #fff;
    cursor: pointer;
    border-radius: 3px;
    font-weight: bold;
    font-size: 16px;
}

.add-custom-skill-btn {
    width: 100%;
    padding: 10px;
    background: linear-gradient(to bottom, #00a8cc, #007a9c);
    border: 1px solid #00d9ff;
    color: #fff;
    font-weight: bold;
    cursor: pointer;
    border-radius: 4px;
    font-size: 12px;
    margin-top: 8px;
}

/* ─────────────── HEADER FIXES (NO DUPLICATE LOGO) ─────────────── */
.header-center {
    display: flex;
    align-items: center;
    justify-content: center;
}

.header-center .sw-logo {
    max-width: 180px;
    height: auto;
}

/* Remove any duplicate logos in main grid */
.datapad-main-grid .sw-logo {
    display: none;
}

/* ─────────────── BOTTOM TABS ─────────────── */
.bottom-tabs-content {
    max-height: 300px;
    overflow-y: auto;
    overflow-x: hidden;
}

.bottom-tabs-content::-webkit-scrollbar {
    width: 8px;
}

.bottom-tabs-content::-webkit-scrollbar-track {
    background: rgba(0, 20, 40, 0.6);
}

.bottom-tabs-content::-webkit-scrollbar-thumb {
    background: linear-gradient(to bottom, #00a8cc, #007a9c);
    border-radius: 4px;
}

/* ─────────────── SHEET MODE SWITCHING ─────────────── */
.header-tab[data-sheet-mode] {
    cursor: pointer;
    transition: all 0.2s ease;
}

.header-tab[data-sheet-mode]:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 217, 255, 0.4);
}

/* ─────────────── CREDITS INPUT ─────────────── */
.credits-input-large {
    width: 100%;
    padding: 12px;
    background: rgba(0, 0, 0, 0.7);
    border: 2px solid #00a8cc;
    color: #00ff88;
    font-size: 20px;
    font-weight: bold;
    text-align: center;
    border-radius: 6px;
}

/* ─────────────── RESPONSIVE ADJUSTMENTS ─────────────── */
@media (max-width: 1200px) {
    .attr-breakdown {
        grid-template-columns: repeat(2, 1fr);
    }
    
    .defense-table-row {
        font-size: 10px;
    }
    
    .armor-main-row {
        grid-template-columns: 1fr;
    }
    
    .armor-checkboxes-row {
        grid-template-columns: repeat(3, 1fr);
    }
    
    .condition-buttons {
        grid-template-columns: repeat(3, 1fr);
    }
}

@media (max-width: 768px) {
    .attribute-row-improved {
        grid-template-columns: 1fr;
    }
    
    .attr-breakdown {
        grid-template-columns: repeat(4, 1fr);
    }
    
    .defense-table-row {
        grid-template-columns: 1fr;
        text-align: left;
    }
    
    .condition-buttons {
        grid-template-columns: 1fr;
    }
}'''
    
    with open(css_path, 'w', encoding='utf-8') as f:
        f.write(improved_css)
    
    print(f"✅ CSS fixes file created successfully!")
    return True


def create_javascript_handler():
    """Create JavaScript file to handle condition button clicks and auto-updates"""
    
    js_dir = REPO_PATH / "module" / "sheets"
    js_dir.mkdir(parents=True, exist_ok=True)
    
    js_path = js_dir / "character-sheet-handlers.js"
    
    print(f"📝 Creating JavaScript handler file...")
    
    js_content = '''/**
 * SWSE Character Sheet - Condition Button Handler
 * Automatically updates affected values when condition changes
 */

export class SWSECharacterSheetHandlers {
    
    /**
     * Activate condition button listeners
     * @param {HTMLElement} html - The sheet HTML
     * @param {Actor} actor - The actor being edited
     */
    static activateConditionButtons(html, actor) {
        html.find('.condition-btn').click(async (event) => {
            event.preventDefault();
            const button = $(event.currentTarget);
            const condition = button.data('condition');
            
            // Update the hidden input
            html.find('input[name="system.condition"]').val(condition);
            
            // Update active state
            html.find('.condition-btn').removeClass('active');
            button.addClass('active');
            
            // Update the actor
            await actor.update({
                'system.condition': condition
            });
            
            // Apply condition penalties automatically
            SWSECharacterSheetHandlers.applyConditionPenalties(actor, condition);
            
            ui.notifications.info(`Condition set to: ${SWSECharacterSheetHandlers.getConditionLabel(condition)}`);
        });
    }
    
    /**
     * Get human-readable condition label
     * @param {string} condition - The condition value
     * @returns {string} - The readable label
     */
    static getConditionLabel(condition) {
        const labels = {
            'normal': 'Normal',
            '-2': '-2 penalty',
            '-5': '-5 penalty',
            '-10': '-10 penalty',
            'debilitated': 'Debilitated',
            'persistent': 'Persistent'
        };
        return labels[condition] || condition;
    }
    
    /**
     * Apply condition penalties to rolls and stats
     * @param {Actor} actor - The actor
     * @param {string} condition - The condition value
     */
    static applyConditionPenalties(actor, condition) {
        // This method can be expanded to automatically apply penalties
        // to attack rolls, skill checks, etc.
        
        let penalty = 0;
        
        switch(condition) {
            case '-2':
                penalty = -2;
                break;
            case '-5':
                penalty = -5;
                break;
            case '-10':
                penalty = -10;
                break;
            case 'debilitated':
                // Debilitated: Can only take swift actions
                penalty = -10; // Or apply special restrictions
                break;
            case 'persistent':
                // Persistent condition: doesn't go away automatically
                penalty = -5; // Or whatever your system defines
                break;
            default:
                penalty = 0;
        }
        
        // Store the penalty for use in roll calculations
        if (actor.system.conditionPenalty !== penalty) {
            actor.update({
                'system.conditionPenalty': penalty
            });
        }
    }
    
    /**
     * Auto-calculate defense values when inputs change
     * @param {HTMLElement} html - The sheet HTML
     * @param {Actor} actor - The actor being edited
     */
    static activateDefenseCalculations(html, actor) {
        // Listen for changes to defense inputs
        html.find('.defense-input-sm, .defense-select-sm').change(async (event) => {
            const defenseType = $(event.currentTarget).closest('.defense-table-row').data('defense');
            
            if (defenseType) {
                await SWSECharacterSheetHandlers.recalculateDefense(actor, defenseType);
            }
        });
    }
    
    /**
     * Recalculate a specific defense
     * @param {Actor} actor - The actor
     * @param {string} defenseType - The defense to recalculate (reflex, fortitude, will)
     */
    static async recalculateDefense(actor, defenseType) {
        const defense = actor.system.defenses[defenseType];
        
        if (!defense) return;
        
        // Get ability modifier
        const abilityMod = actor.system.abilities[defense.abilityMod]?.mod || 0;
        
        // Calculate: 10 + level/armor + class + ability mod + misc
        const total = 10 + 
                     (defense.levelArmor || 0) + 
                     (defense.classBonus || 0) + 
                     abilityMod + 
                     (defense.misc || 0);
        
        // Update the defense total
        await actor.update({
            [`system.defenses.${defenseType}.total`]: total
        });
    }
    
    /**
     * Activate all sheet handlers
     * @param {HTMLElement} html - The sheet HTML
     * @param {Actor} actor - The actor being edited
     */
    static activate(html, actor) {
        this.activateConditionButtons(html, actor);
        this.activateDefenseCalculations(html, actor);
    }
}
'''
    
    with open(js_path, 'w', encoding='utf-8') as f:
        f.write(js_content)
    
    print(f"✅ JavaScript handler file created successfully!")
    return True


def main():
    print("=" * 60)
    print("SWSE CHARACTER SHEET FIXES - UPDATED")
    print("=" * 60)
    print()
    
    if not REPO_PATH.exists():
        print(f"❌ Repository path not found: {REPO_PATH}")
        print("Please update REPO_PATH in the script")
        return
    
    print(f"📂 Working directory: {REPO_PATH}")
    print()
    
    # Fix the character sheet template
    template_success = fix_character_sheet_template()
    
    # Add improved CSS
    css_success = add_improved_css()
    
    # Create JavaScript handler
    js_success = create_javascript_handler()
    
    print()
    print("=" * 60)
    if template_success and css_success and js_success:
        print("✅ ALL FIXES APPLIED SUCCESSFULLY!")
        print()
        print("Changes made:")
        print("  ✓ Fixed scrolling in main content area")
        print("  ✓ Improved half-level display")
        print("  ✓ Added racial/misc/total to attributes")
        print("  ✓ Removed duplicate logo")
        print("  ✓ UPDATED: Defense layout with Level/Armor column")
        print("  ✓ UPDATED: Defense dropdowns for ability selection")
        print("  ✓ NEW: Armor section with all fields")
        print("  ✓ NEW: Condition buttons instead of dropdown")
        print("  ✓ NEW: Auto-updates from condition changes")
        print("  ✓ Added all default skills")
        print("  ✓ Added damage threshold misc modifier")
        print("  ✓ Added second wind misc modifier")
        print("  ✓ Added sheet mode switching buttons")
        print("  ✓ Created JavaScript handler for conditions")
        print()
        print("Next steps:")
        print("1. Import the JavaScript handler in your character sheet class")
        print("   Add this to your activateListeners method:")
        print("   ")
        print("   import { SWSECharacterSheetHandlers } from './character-sheet-handlers.js';")
        print("   SWSECharacterSheetHandlers.activate(html, this.actor);")
        print()
        print("2. Refresh Foundry VTT (F5 or Ctrl+F5)")
        print("3. Open a character sheet")
        print("4. Test all the improvements!")
    else:
        print("⚠️ SOME FIXES MAY HAVE FAILED")
        print("Check the output above for details")
    print("=" * 60)


if __name__ == "__main__":
    main()