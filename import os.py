#!/usr/bin/env python3
"""
SWSE Character Sheet - Datapad Style
Creates a sci-fi datapad themed sheet based on Roll20 design
"""

from pathlib import Path

class SWSEDatapadSheet:
    def __init__(self, repo_path):
        self.repo_path = Path(repo_path)
        
    def run(self):
        """Main execution"""
        print("=" * 70)
        print("SWSE CHARACTER SHEET - DATAPAD STYLE")
        print("=" * 70)
        
        print("\nCreating datapad-style character sheet...")
        self.create_datapad_template()
        
        print("\n✓ Datapad character sheet created!")
        print("  Location: templates/actors/character-sheet.hbs")
        print("\n" + "=" * 70)
        
    def create_datapad_template(self):
        """Create the datapad-style template"""
        template_path = self.repo_path / "templates/actors/character-sheet.hbs"
        
        content = '''{{!-- SWSE Character Sheet - Datapad Style --}}
<form class="swse-datapad-sheet {{cssClass}}" autocomplete="off">
    
    {{!-- TOP HEADER BAR --}}
    <header class="datapad-header">
        <div class="header-left">
            <div class="header-tabs">
                <button type="button" class="header-tab active">PC</button>
                <button type="button" class="header-tab">NPC</button>
                <button type="button" class="header-tab">Vehicle</button>
                <button type="button" class="header-tab">Settings</button>
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
                        <div class="readonly">{{halfLevel}}</div>
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

    {{!-- MAIN CONTENT GRID --}}
    <div class="datapad-main-grid">
        
        {{!-- LEFT COLUMN --}}
        <div class="left-column">
            
            {{!-- ATTRIBUTES --}}
            <section class="datapad-section">
                <div class="section-header-black">Attributes</div>
                <div class="attributes-grid">
                    {{#each system.abilities as |ability key|}}
                    <div class="attribute-row">
                        <label class="attr-label">{{toUpperCase key}}</label>
                        <input type="number" name="system.abilities.{{key}}.base" value="{{ability.base}}" class="attr-input" data-dtype="Number"/>
                        <button type="button" class="roll-btn">⚅</button>
                        <div class="attr-mod">{{#if (gte ability.mod 0)}}+{{/if}}{{ability.mod}}</div>
                        <button type="button" class="roll-btn">⚅</button>
                    </div>
                    {{/each}}
                </div>
            </section>

            {{!-- DEFENSES --}}
            <section class="datapad-section">
                <div class="section-header-black">Defenses</div>
                <div class="defenses-layout">
                    <div class="defense-main">
                        <div class="defense-item">
                            <label>Total</label>
                            <div class="def-box">{{system.defenses.fortitude.total}}</div>
                        </div>
                        <div class="defense-calc">
                            <span>= 10 + {{halfLevel}}</span>
                        </div>
                    </div>
                    <div class="defense-type">
                        <div class="def-circle fortitude">REF</div>
                        <div class="def-value">{{system.defenses.reflex.total}}</div>
                    </div>
                    <div class="defense-type">
                        <div class="def-circle will">WILL</div>
                        <div class="def-value">{{system.defenses.will.total}}</div>
                    </div>
                </div>
            </section>

            {{!-- ARMOR --}}
            <section class="datapad-section">
                <div class="section-header-black">Armor</div>
                <div class="armor-list-compact">
                    {{#each armor as |item|}}
                    <div class="armor-line">
                        <input type="text" value="{{item.name}}" readonly/>
                        <button class="item-delete-sm">×</button>
                    </div>
                    {{/each}}
                    <button type="button" class="add-armor-btn">+ Add</button>
                </div>
            </section>

            {{!-- ATTACKS --}}
            <section class="datapad-section">
                <div class="section-header-black">Attacks</div>
                <div class="attacks-grid">
                    {{#each weapons as |weapon|}}
                    <div class="attack-block">
                        <div class="attack-name">
                            <input type="text" value="{{weapon.name}}" readonly/>
                        </div>
                        <div class="attack-stats">
                            <div class="stat-cell">
                                <label>Atk</label>
                                <button type="button" class="roll-btn">⚅</button>
                            </div>
                            <div class="stat-cell">
                                <label>Dmg</label>
                                <input type="text" value="{{weapon.system.damage}}"/>
                            </div>
                            <div class="stat-cell">
                                <label>Total</label>
                                <button type="button" class="roll-btn">⚅</button>
                            </div>
                            <div class="stat-cell">
                                <label>Mod</label>
                                <button type="button" class="roll-btn">⚅</button>
                            </div>
                        </div>
                    </div>
                    {{/each}}
                    <button type="button" class="add-weapon-btn">+ Add Weapon</button>
                </div>
            </section>
        </div>

        {{!-- CENTER COLUMN --}}
        <div class="center-column">
            
            {{!-- HIT POINTS --}}
            <section class="datapad-section hp-section">
                <div class="section-header-black">Hit Points</div>
                <div class="hp-grid">
                    <div class="hp-current-box">
                        <label>Current</label>
                        <input type="number" name="system.hp.value" value="{{system.hp.value}}" class="hp-big" data-dtype="Number"/>
                    </div>
                    <div class="hp-max-box">
                        <label>Maximum</label>
                        <input type="number" name="system.hp.max" value="{{system.hp.max}}" class="hp-big" data-dtype="Number"/>
                    </div>
                </div>
            </section>

            {{!-- CONDITION --}}
            <section class="datapad-section">
                <div class="section-header-black">Condition</div>
                <select name="system.conditionTrack" class="condition-dropdown">
                    <option value="normal" {{#if (eq system.conditionTrack "normal")}}selected{{/if}}>Normal</option>
                    <option value="-1" {{#if (eq system.conditionTrack "-1")}}selected{{/if}}>-1 (minor)</option>
                    <option value="-2" {{#if (eq system.conditionTrack "-2")}}selected{{/if}}>-2 (hurt)</option>
                    <option value="-5" {{#if (eq system.conditionTrack "-5")}}selected{{/if}}>-5 (wounded)</option>
                    <option value="-10" {{#if (eq system.conditionTrack "-10")}}selected{{/if}}>-10 (disabled)</option>
                    <option value="helpless" {{#if (eq system.conditionTrack "helpless")}}selected{{/if}}>Helpless</option>
                </select>
            </section>

            {{!-- SECOND WIND --}}
            <section class="datapad-section">
                <div class="section-header-black">Second Wind</div>
                <div class="second-wind-layout">
                    <div class="sw-uses">
                        <label>Uses</label>
                        <input type="number" name="system.secondWind.uses" value="{{system.secondWind.uses}}" data-dtype="Number"/>
                    </div>
                    <div class="sw-heals">
                        <label>Heals</label>
                        <div class="readonly-display">{{system.secondWind.healing}}</div>
                    </div>
                    <button type="button" class="use-sw-btn">Use</button>
                </div>
            </section>

            {{!-- DAMAGE THRESHOLD --}}
            <section class="datapad-section">
                <div class="section-header-black">Damage Threshold</div>
                <div class="dt-display">
                    <div class="dt-big">{{damageThreshold}}</div>
                </div>
            </section>

            {{!-- FORCE POINTS --}}
            <section class="datapad-section force-section">
                <div class="section-header-black">Force Points</div>
                <div class="force-layout">
                    <div class="fp-tracker">
                        <input type="number" name="system.forcePoints.value" value="{{system.forcePoints.value}}" data-dtype="Number"/>
                        <span>/</span>
                        <input type="number" name="system.forcePoints.max" value="{{system.forcePoints.max}}" data-dtype="Number"/>
                    </div>
                    <div class="fp-die-select">
                        <label>Die</label>
                        <select name="system.forcePoints.die">
                            <option value="1d6" {{#if (eq system.forcePoints.die "1d6")}}selected{{/if}}>1d6</option>
                            <option value="1d8" {{#if (eq system.forcePoints.die "1d8")}}selected{{/if}}>1d8</option>
                            <option value="1d10" {{#if (eq system.forcePoints.die "1d10")}}selected{{/if}}>1d10</option>
                        </select>
                    </div>
                </div>
            </section>

            {{!-- DESTINY POINTS --}}
            <section class="datapad-section destiny-section">
                <div class="section-header-black">Destiny Pts</div>
                <div class="destiny-layout">
                    <div class="dp-tracker">
                        <label>BAB</label>
                        <input type="number" name="system.bab" value="{{system.bab}}" data-dtype="Number"/>
                    </div>
                    <div class="dp-tracker">
                        <label>Speed</label>
                        <input type="number" name="system.speed.base" value="{{system.speed.base}}" data-dtype="Number"/>
                    </div>
                    <div class="dp-tracker">
                        <label>Dark Side</label>
                        <input type="number" name="system.darkSide" value="{{system.darkSide}}" data-dtype="Number"/>
                    </div>
                </div>
            </section>
        </div>

        {{!-- RIGHT COLUMN - SKILLS --}}
        <div class="right-column">
            <section class="datapad-section skills-section">
                <div class="section-header-black">Skills</div>
                <div class="skills-grid-compact">
                    <div class="skills-header-row">
                        <span class="sh-name">Skill</span>
                        <span class="sh-mod">Mod</span>
                        <span class="sh-t">T</span>
                        <span class="sh-f">F</span>
                        <span class="sh-roll">Roll</span>
                    </div>
                    
                    {{#each skills as |skill|}}
                    <div class="skill-data-row">
                        <label class="skill-name-compact">{{skill.name}}</label>
                        <div class="skill-mod-box">{{skill.mod}}</div>
                        <input type="checkbox" name="system.skills.{{skill.key}}.trained" {{#if skill.trained}}checked{{/if}}/>
                        <input type="checkbox" name="system.skills.{{skill.key}}.focus" {{#if skill.focus}}checked{{/if}}/>
                        <button type="button" class="skill-roll-btn" data-skill="{{skill.key}}">⚅</button>
                    </div>
                    {{/each}}
                </div>
            </section>
        </div>
    </div>

    {{!-- BOTTOM TABS --}}
    <section class="bottom-tabs-section">
        <nav class="bottom-tabs">
            <button type="button" class="bottom-tab active" data-tab="equipment">Equipment</button>
            <button type="button" class="bottom-tab" data-tab="feats">Feats</button>
            <button type="button" class="bottom-tab" data-tab="talents">Talents</button>
            <button type="button" class="bottom-tab" data-tab="force">Force Powers</button>
            <button type="button" class="bottom-tab" data-tab="languages">Languages</button>
            <button type="button" class="bottom-tab" data-tab="notes">Notes</button>
        </nav>

        <div class="bottom-tabs-content">
            {{!-- EQUIPMENT TAB --}}
            <div class="bottom-tab-pane active" data-tab="equipment">
                <div class="equipment-grid">
                    <div class="equip-column">
                        <h4>Carried Equipment</h4>
                        <div class="equip-list">
                            {{#each equipment as |item|}}
                            <div class="equip-item">
                                <input type="text" value="{{item.name}}" readonly/>
                                <button class="item-delete">×</button>
                            </div>
                            {{/each}}
                        </div>
                        <button type="button" class="add-equipment-btn">+ Add Equipment</button>
                    </div>
                    
                    <div class="credits-box">
                        <label>Credits</label>
                        <input type="number" name="system.credits" value="{{system.credits}}" data-dtype="Number"/>
                    </div>
                </div>
            </div>

            {{!-- FEATS TAB --}}
            <div class="bottom-tab-pane" data-tab="feats">
                <div class="feats-list">
                    {{#each feats as |feat|}}
                    <div class="feat-item">
                        <strong>{{feat.name}}</strong>
                        <button class="item-delete">×</button>
                        {{#if feat.system.description}}
                        <p>{{feat.system.description}}</p>
                        {{/if}}
                    </div>
                    {{/each}}
                </div>
                <button type="button" class="add-feat-btn">+ Add Feat</button>
            </div>

            {{!-- TALENTS TAB --}}
            <div class="bottom-tab-pane" data-tab="talents">
                <div class="talents-list">
                    {{#each talents as |talent|}}
                    <div class="talent-item">
                        <strong>{{talent.name}}</strong>
                        <button class="item-delete">×</button>
                        {{#if talent.system.description}}
                        <p>{{talent.system.description}}</p>
                        {{/if}}
                    </div>
                    {{/each}}
                </div>
                <button type="button" class="add-talent-btn">+ Add Talent</button>
            </div>

            {{!-- FORCE POWERS TAB --}}
            <div class="bottom-tab-pane" data-tab="force">
                <div class="force-powers-list">
                    {{#each forcePowers as |power|}}
                    <div class="force-power-item">
                        <div class="power-header">
                            <strong>{{power.name}}</strong>
                            {{#if power.system.uses}}
                            <span class="uses">{{power.system.uses.current}}/{{power.system.uses.max}}</span>
                            {{/if}}
                            <button class="item-delete">×</button>
                        </div>
                        <div class="power-actions-compact">
                            <button type="button" class="use-power-btn">Use</button>
                            <button type="button" class="reload-power-btn">Reload</button>
                        </div>
                    </div>
                    {{/each}}
                </div>
                <button type="button" class="add-power-btn">+ Add Power</button>
            </div>

            {{!-- LANGUAGES TAB --}}
            <div class="bottom-tab-pane" data-tab="languages">
                <textarea name="system.languages" rows="5">{{system.languages}}</textarea>
            </div>

            {{!-- NOTES TAB --}}
            <div class="bottom-tab-pane" data-tab="notes">
                <textarea name="system.notes" rows="10">{{system.notes}}</textarea>
            </div>
        </div>
    </section>
</form>

<style>
/* ============================================
   SWSE DATAPAD CHARACTER SHEET
   Sci-fi holographic interface design
   ============================================ */

.swse-datapad-sheet {
    background: linear-gradient(135deg, #0a1628 0%, #1a2a3e 50%, #0a1628 100%);
    color: #00d9ff;
    font-family: 'Courier New', 'Consolas', monospace;
    padding: 10px;
    border-radius: 10px;
    border: 2px solid #00a8cc;
    box-shadow: 0 0 30px rgba(0, 217, 255, 0.3), inset 0 0 50px rgba(0, 168, 204, 0.1);
    max-width: 1400px;
    position: relative;
}

/* TOP HEADER */
.datapad-header {
    display: grid;
    grid-template-columns: 300px 1fr 150px;
    gap: 15px;
    margin-bottom: 15px;
    padding: 15px;
    background: rgba(0, 0, 0, 0.4);
    border-radius: 8px;
    border: 1px solid #00a8cc;
}

.header-tabs {
    display: flex;
    gap: 4px;
    margin-bottom: 10px;
}

.header-tab {
    flex: 1;
    padding: 6px 10px;
    background: linear-gradient(to bottom, #1a3a4a, #0a2a3a);
    border: 1px solid #00a8cc;
    color: #00d9ff;
    font-size: 11px;
    font-weight: bold;
    cursor: pointer;
    border-radius: 4px;
}

.header-tab.active {
    background: linear-gradient(to bottom, #00a8cc, #007a9c);
    color: #fff;
}

.basic-fields {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.field-trio {
    display: grid;
    grid-template-columns: 2fr 1fr 1fr;
    gap: 6px;
}

.field-row-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
}

.field-sm, .field-md {
    display: flex;
    flex-direction: column;
}

.field-sm label, .field-md label {
    font-size: 9px;
    color: #00d9ff;
    font-weight: bold;
    margin-bottom: 2px;
}

.field-sm input, .field-md input {
    padding: 4px 6px;
    background: rgba(0, 0, 0, 0.6);
    border: 1px solid #00a8cc;
    color: #00ff88;
    font-size: 11px;
    border-radius: 3px;
}

.readonly {
    padding: 4px 6px;
    background: rgba(0, 168, 204, 0.2);
    border: 1px solid #00a8cc;
    color: #fff;
    font-size: 11px;
    border-radius: 3px;
    text-align: center;
    font-weight: bold;
}

.header-center {
    display: flex;
    align-items: center;
    justify-content: center;
}

.sw-logo {
    max-width: 200px;
    filter: drop-shadow(0 0 10px rgba(0, 217, 255, 0.5));
}

.character-portrait {
    width: 140px;
    height: 140px;
    object-fit: cover;
    border: 3px solid #00a8cc;
    border-radius: 8px;
    box-shadow: 0 0 20px rgba(0, 217, 255, 0.4);
    cursor: pointer;
}

/* MAIN GRID */
.datapad-main-grid {
    display: grid;
    grid-template-columns: 280px 1fr 340px;
    gap: 10px;
    margin-bottom: 10px;
}

/* SECTIONS */
.datapad-section {
    background: rgba(0, 0, 0, 0.5);
    border: 1px solid #00a8cc;
    border-radius: 6px;
    margin-bottom: 10px;
    overflow: hidden;
}

.section-header-black {
    background: linear-gradient(to right, #000, #1a1a1a, #000);
    color: #00ff88;
    text-align: center;
    padding: 6px;
    font-weight: bold;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 2px;
    border-bottom: 2px solid #00a8cc;
    text-shadow: 0 0 10px rgba(0, 255, 136, 0.8);
}

/* ATTRIBUTES */
.attributes-grid {
    padding: 8px;
}

.attribute-row {
    display: grid;
    grid-template-columns: 35px 50px 30px 50px 30px;
    gap: 4px;
    align-items: center;
    margin-bottom: 6px;
}

.attr-label {
    font-size: 11px;
    font-weight: bold;
    color: #00d9ff;
}

.attr-input {
    padding: 4px;
    background: rgba(0, 0, 0, 0.7);
    border: 1px solid #00a8cc;
    color: #00ff88;
    text-align: center;
    font-weight: bold;
    border-radius: 3px;
}

.attr-mod {
    padding: 4px;
    background: linear-gradient(to bottom, #003a4a, #001a2a);
    border: 1px solid #00a8cc;
    color: #fff;
    text-align: center;
    font-weight: bold;
    border-radius: 3px;
}

.roll-btn {
    padding: 4px;
    background: linear-gradient(to bottom, #00a8cc, #007a9c);
    border: 1px solid #00d9ff;
    color: #fff;
    font-size: 14px;
    cursor: pointer;
    border-radius: 3px;
    text-shadow: 0 0 5px rgba(255, 255, 255, 0.8);
}

.roll-btn:hover {
    background: linear-gradient(to bottom, #00d9ff, #00a8cc);
    box-shadow: 0 0 10px rgba(0, 217, 255, 0.6);
}

/* DEFENSES */
.defenses-layout {
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.defense-main {
    display: flex;
    align-items: center;
    gap: 8px;
}

.defense-item {
    display: flex;
    flex-direction: column;
    align-items: center;
}

.defense-item label {
    font-size: 9px;
    color: #00d9ff;
    margin-bottom: 4px;
}

.def-box {
    padding: 8px 16px;
    background: linear-gradient(to bottom, #003a4a, #001a2a);
    border: 2px solid #00a8cc;
    color: #fff;
    font-size: 20px;
    font-weight: bold;
    border-radius: 4px;
    text-align: center;
}

.defense-calc {
    font-size: 11px;
    color: #00d9ff;
}

.defense-type {
    display: flex;
    align-items: center;
    gap: 10px;
}

.def-circle {
    width: 50px;
    height: 50px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    font-size: 10px;
    border: 2px solid #00a8cc;
    background: radial-gradient(circle, rgba(0,168,204,0.3), rgba(0,0,0,0.8));
}

.def-circle.fortitude {
    border-color: #ff4444;
    color: #ff4444;
}

.def-circle.will {
    border-color: #4444ff;
    color: #4444ff;
}

.def-value {
    font-size: 18px;
    font-weight: bold;
    color: #fff;
}

/* HP SECTION */
.hp-grid {
    padding: 10px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
}

.hp-current-box, .hp-max-box {
    text-align: center;
}

.hp-current-box label, .hp-max-box label {
    display: block;
    font-size: 10px;
    color: #00d9ff;
    margin-bottom: 6px;
}

.hp-big {
    width: 100%;
    padding: 10px;
    background: rgba(0, 0, 0, 0.7);
    border: 2px solid #00a8cc;
    color: #00ff88;
    font-size: 28px;
    font-weight: bold;
    text-align: center;
    border-radius: 6px;
}

/* CONDITION */
.condition-dropdown {
    width: 100%;
    padding: 8px;
    background: rgba(0, 0, 0, 0.7);
    border: 1px solid #00a8cc;
    color: #00ff88;
    font-weight: bold;
    font-size: 12px;
    border-radius: 0 0 6px 6px;
}

/* SECOND WIND */
.second-wind-layout {
    padding: 10px;
    display: grid;
    grid-template-columns: 1fr 1fr auto;
    gap: 8px;
    align-items: end;
}

.sw-uses, .sw-heals {
    display: flex;
    flex-direction: column;
}

.sw-uses label, .sw-heals label {
    font-size: 9px;
    color: #00d9ff;
    margin-bottom: 4px;
}

.sw-uses input {
    padding: 6px;
    background: rgba(0, 0, 0, 0.7);
    border: 1px solid #00a8cc;
    color: #00ff88;
    text-align: center;
    font-weight: bold;
    border-radius: 3px;
}

.readonly-display {
    padding: 6px;
    background: rgba(0, 168, 204, 0.2);
    border: 1px solid #00a8cc;
    color: #fff;
    text-align: center;
    font-weight: bold;
    border-radius: 3px;
}

.use-sw-btn {
    padding: 6px 12px;
    background: linear-gradient(to bottom, #00a8cc, #007a9c);
    border: 1px solid #00d9ff;
    color: #fff;
    font-weight: bold;
    cursor: pointer;
    border-radius: 4px;
    font-size: 11px;
}

/* DAMAGE THRESHOLD */
.dt-display {
    padding: 15px;
    text-align: center;
}

.dt-big {
    font-size: 48px;
    font-weight: bold;
    color: #fff;
    text-shadow: 0 0 20px rgba(0, 217, 255, 0.8);
}

/* FORCE & DESTINY */
.force-layout, .destiny-layout {
    padding: 10px;
    display: flex;
    gap: 8px;
    align-items: center;
}

.fp-tracker, .dp-tracker {
    display: flex;
    align-items: center;
    gap: 4px;
}

.fp-tracker input, .dp-tracker input {
    width: 40px;
    padding: 4px;
    background: rgba(0, 0, 0, 0.7);
    border: 1px solid #00a8cc;
    color: #00ff88;
    text-align: center;
    font-weight: bold;
    border-radius: 3px;
}

.fp-die-select, .dp-tracker {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.fp-die-select label, .dp-tracker label {
    font-size: 8px;
    color: #00d9ff;
}

.fp-die-select select {
    padding: 4px;
    background: rgba(0, 0, 0, 0.7);
    border: 1px solid #00a8cc;
    color: #00ff88;
    font-size: 10px;
    border-radius: 3px;
}

/* SKILLS */
.skills-grid-compact {
    padding: 8px;
    max-height: 600px;
    overflow-y: auto;
}

.skills-header-row {
    display: grid;
    grid-template-columns: 1fr 50px 25px 25px 35px;
    gap: 4px;
    padding: 4px;
    background: rgba(0, 168, 204, 0.2);
    border-bottom: 1px solid #00a8cc;
    margin-bottom: 4px;
    font-size: 9px;
    font-weight: bold;
}

.skill-data-row {
    display: grid;
    grid-template-columns: 1fr 50px 25px 25px 35px;
    gap: 4px;
    align-items: center;
    padding: 4px;
    margin-bottom: 2px;
    border-bottom: 1px solid rgba(0, 168, 204, 0.2);
}

.skill-name-compact {
    font-size: 10px;
    color: #00d9ff;
}

.skill-mod-box {
    padding: 4px;
    background: rgba(0, 0, 0, 0.7);
    border: 1px solid #00a8cc;
    color: #00ff88;
    text-align: center;
    font-size: 11px;
    font-weight: bold;
    border-radius: 3px;
}

.skill-data-row input[type="checkbox"] {
    width: 18px;
    height: 18px;
    cursor: pointer;
}

.skill-roll-btn {
    padding: 4px;
    background: linear-gradient(to bottom, #00a8cc, #007a9c);
    border: 1px solid #00d9ff;
    color: #fff;
    font-size: 12px;
    cursor: pointer;
    border-radius: 3px;
}

/* ARMOR & ATTACKS */
.armor-list-compact {
    padding: 8px;
}

.armor-line {
    display: flex;
    gap: 4px;
    margin-bottom: 4px;
}

.armor-line input {
    flex: 1;
    padding: 4px;
    background: rgba(0, 0, 0, 0.7);
    border: 1px solid #00a8cc;
    color: #00ff88;
    font-size: 11px;
    border-radius: 3px;
}

.item-delete-sm {
    width: 25px;
    padding: 4px;
    background: #aa0000;
    border: 1px solid #ff0000;
    color: #fff;
    cursor: pointer;
    border-radius: 3px;
    font-weight: bold;
}

.add-armor-btn, .add-weapon-btn {
    width: 100%;
    padding: 6px;
    background: linear-gradient(to bottom, #00a8cc, #007a9c);
    border: 1px solid #00d9ff;
    color: #fff;
    font-weight: bold;
    cursor: pointer;
    border-radius: 4px;
    font-size: 11px;
}

.attacks-grid {
    padding: 8px;
}

.attack-block {
    margin-bottom: 10px;
}

.attack-name input {
    width: 100%;
    padding: 4px;
    background: rgba(0, 0, 0, 0.7);
    border: 1px solid #00a8cc;
    color: #00ff88;
    font-size: 11px;
    border-radius: 3px;
    margin-bottom: 6px;
}

.attack-stats {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 4px;
}

.stat-cell {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
}

.stat-cell label {
    font-size: 8px;
    color: #00d9ff;
}

.stat-cell input {
    width: 100%;
    padding: 4px;
    background: rgba(0, 0, 0, 0.7);
    border: 1px solid #00a8cc;
    color: #00ff88;
    text-align: center;
    font-size: 10px;
    border-radius: 3px;
}

/* BOTTOM TABS */
.bottom-tabs-section {
    background: rgba(0, 0, 0, 0.5);
    border: 1px solid #00a8cc;
    border-radius: 6px;
    overflow: hidden;
}

.bottom-tabs {
    display: flex;
    background: linear-gradient(to right, #000, #1a1a1a, #000);
    border-bottom: 2px solid #00a8cc;
}

.bottom-tab {
    flex: 1;
    padding: 8px 16px;
    background: transparent;
    border: none;
    border-right: 1px solid #00a8cc;
    color: #00d9ff;
    font-weight: bold;
    font-size: 11px;
    cursor: pointer;
    text-transform: uppercase;
}

.bottom-tab:last-child {
    border-right: none;
}

.bottom-tab.active {
    background: linear-gradient(to bottom, #00a8cc, #007a9c);
    color: #fff;
}

.bottom-tabs-content {
    padding: 15px;
}

.bottom-tab-pane {
    display: none;
}

.bottom-tab-pane.active {
    display: block;
}

/* EQUIPMENT, FEATS, TALENTS */
.equipment-grid {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 15px;
}

.equip-list, .feats-list, .talents-list, .force-powers-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.equip-item, .feat-item, .talent-item, .force-power-item {
    padding: 8px;
    background: rgba(0, 168, 204, 0.1);
    border: 1px solid #00a8cc;
    border-radius: 4px;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.equip-item input {
    flex: 1;
    padding: 4px;
    background: transparent;
    border: none;
    color: #00ff88;
    font-size: 11px;
}

.item-delete {
    padding: 4px 8px;
    background: #aa0000;
    border: 1px solid #ff0000;
    color: #fff;
    cursor: pointer;
    border-radius: 3px;
    font-weight: bold;
}

.credits-box {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.credits-box label {
    font-size: 12px;
    color: #00d9ff;
    font-weight: bold;
}

.credits-box input {
    padding: 10px;
    background: rgba(0, 0, 0, 0.7);
    border: 2px solid #00a8cc;
    color: #00ff88;
    font-size: 20px;
    font-weight: bold;
    text-align: center;
    border-radius: 6px;
}

.add-equipment-btn, .add-feat-btn, .add-talent-btn, .add-power-btn {
    padding: 8px 16px;
    background: linear-gradient(to bottom, #00a8cc, #007a9c);
    border: 1px solid #00d9ff;
    color: #fff;
    font-weight: bold;
    cursor: pointer;
    border-radius: 4px;
    font-size: 12px;
    margin-top: 10px;
}

/* FORCE POWERS */
.force-power-item {
    flex-direction: column;
    align-items: flex-start;
}

.power-header {
    width: 100%;
    display: flex;
    justify-content: space-between;
    margin-bottom: 6px;
}

.power-actions-compact {
    display: flex;
    gap: 6px;
}

.use-power-btn, .reload-power-btn {
    padding: 4px 12px;
    background: linear-gradient(to bottom, #00a8cc, #007a9c);
    border: 1px solid #00d9ff;
    color: #fff;
    font-weight: bold;
    cursor: pointer;
    border-radius: 3px;
    font-size: 10px;
}

/* TEXTAREAS */
textarea {
    width: 100%;
    min-height: 200px;
    padding: 10px;
    background: rgba(0, 0, 0, 0.7);
    border: 1px solid #00a8cc;
    color: #00ff88;
    font-family: 'Courier New', monospace;
    font-size: 12px;
    border-radius: 4px;
    resize: vertical;
}

/* SCROLLBAR */
.skills-grid-compact::-webkit-scrollbar {
    width: 8px;
}

.skills-grid-compact::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.5);
    border-radius: 4px;
}

.skills-grid-compact::-webkit-scrollbar-thumb {
    background: linear-gradient(to bottom, #00a8cc, #007a9c);
    border-radius: 4px;
}

.skills-grid-compact::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(to bottom, #00d9ff, #00a8cc);
}
</style>'''
        
        template_path.write_text(content, encoding='utf-8')
        print("  ✓ Created datapad-style template")

# ===========================================
# MAIN EXECUTION
# ===========================================

if __name__ == "__main__":
    repo_path = r"C:\Users\Owner\Documents\GitHub\foundryvtt-swse"
    
    if not Path(repo_path).exists():
        print(f"ERROR: Repository path not found: {repo_path}")
        exit(1)
    
    creator = SWSEDatapadSheet(repo_path)
    creator.run()
    
    print("\n✨ Datapad character sheet created!")
    print("🔄 Restart Foundry VTT to see the changes")