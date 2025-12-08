import { ProgressionEngine } from "../progression/engine/progression-engine.js";
/**
import { SWSELogger } from '../utils/logger.js';
 * SWSE Level Up System
 * Handles character leveling with class selection and HP rolls
 * Uses enhanced version for visual talent trees and multi-classing
 */

import { getClasses } from "../core/swse-data.js";
import { SWSELevelUpEnhanced } from "./swse-levelup-enhanced.js";
import { getMentorForClass, getMentorGreeting, getLevel1Class, setLevel1Class } from './mentor-dialogues.js';

export class SWSELevelUp {
    /**
     * Open enhanced level up dialog
     * @param {Actor} actor - The actor to level up
     * @returns {Promise<boolean>} True if leveled up, false if cancelled
     */
    static async openEnhanced(actor) {
        if (!actor) {
            ui.notifications.error("No actor provided for level up.");
            return false;
        }

        const levelUpDialog = new SWSELevelUpEnhanced(actor);
        levelUpDialog.render(true);
        return true;
    }

    /**
     * Open level up dialog for an actor
     * @param {Actor} actor - The actor to level up
     * @returns {Promise<boolean>} True if leveled up, false if cancelled
     */
    static async open(actor) {
        if (!actor) {
            ui.notifications.error("No actor provided for level up.");
            return false;
        }
        
        try {
            const classes = await getClasses();
            
            if (!classes || classes.length === 0) {
                ui.notifications.error("No classes available for level up.");
                return false;
            }
            
            const classOptions = classes.map(c => 
                `<option value="${c.name}">${c.name}</option>`
            ).join("");

            const dialogContent = `
                <form>
                    <div class="form-group">
                        <label>Choose Class</label>
                        <select name="classId" required>${classOptions}</select>
                    </div>
                    <div class="form-group">
                        <label>HP Method</label>
                        <select name="hpChoice">
                            <option value="roll">Roll (1d[HD])</option>
                            <option value="average">Take Average (HD/2 + 1)</option>
                            <option value="max">Max (HD)</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Current Level: <strong>${actor.system.level}</strong></label>
                        <label>New Level: <strong>${actor.system.level + 1}</strong></label>
                    </div>
                </form>
            `;

            return new Promise(resolve => {
                new Dialog({
                    title: `Level Up ${actor.name}`,
                    content: dialogContent,
                    buttons: {
                        ok: {
                            icon: '<i class="fas fa-level-up-alt"></i>',
                            label: "Level Up",
                            callback: async html => {
                                try {
                                    const classId = html.find("[name=classId]").val();
                                    const hpChoice = html.find("[name=hpChoice]").val();
                                    
                                    if (!classId) {
                                        ui.notifications.warn("Please select a class.");
                                        resolve(false);
                                        return;
                                    }
                                    
                                    await SWSELevelUp.apply(actor, classId, hpChoice);
                                    resolve(true);
                                } catch (err) {
                                    SWSELogger.error("SWSE Level Up | Error in callback:", err);
                                    ui.notifications.error("Failed to level up character.");
                                    resolve(false);
                                }
                            }
                        },
                        cancel: {
                            icon: '<i class="fas fa-times"></i>',
                            label: "Cancel",
                            callback: () => resolve(false)
                        }
                    },
                    default: "ok"
                }).render(true);
            });
        } catch (err) {
            SWSELogger.error("SWSE Level Up | Failed to open dialog:", err);
            ui.notifications.error("Failed to open level up dialog.");
            return false;
        }
    }

    /**
     * Apply level up to an actor
     * @param {Actor} actor - The actor to level up
     * @param {string} className - Name of the class to add
     * @param {string} hpChoice - HP calculation method ('roll', 'average', or 'max')
     */
    static async apply(actor, className, hpChoice = "average") {
        try {
            const classes = await getClasses();
            const classData = classes.find(c => c.name === className);
            
            if (!classData) {
                ui.notifications.error("Class not found!");
                return;
            }

            const hitDie = Number(classData.hitDie) || 6;
            const conMod = actor.system.abilities.con?.mod || 0;
            
            let hpGain = 0;
            let rollMessage = "";
            
            // Calculate HP gain based on method
            switch (hpChoice) {
                case "max":
                    hpGain = hitDie + conMod;
                    rollMessage = `Took maximum HP: ${hitDie} + ${conMod} (CON) = ${hpGain}`;
                    break;
                    
                case "average":
                    const avg = Math.floor(hitDie / 2) + 1;
                    hpGain = avg + conMod;
                    rollMessage = `Took average HP: ${avg} + ${conMod} (CON) = ${hpGain}`;
                    break;
                    
                case "roll":
                default:
                    const roll = await globalThis.SWSE.RollEngine.safeRoll(`1d${hitDie}`).evaluate({ async: true });
                    hpGain = roll.total + conMod;
                    rollMessage = `Rolled ${roll.total} on d${hitDie} + ${conMod} (CON) = ${hpGain} HP`;
                    
                    await roll.toMessage({
                        speaker: ChatMessage.getSpeaker({ actor }),
                        flavor: `<strong>HP Roll for Level ${actor.system.level + 1}</strong>`
                    });
                    break;
            }
            
            // Ensure minimum of 1 HP gained
            hpGain = Math.max(1, hpGain);

            // Create class item
            const classItem = {
                name: className,
                type: "class",
                system: { 
                    level: 1,
                    hitDie: `1d${hitDie}`
                }
            };
            
            await actor.createEmbeddedDocuments("Item", [classItem]);

            // Update actor level and HP
            const newLevel = actor.system.level + 1;
            const newHPMax = actor.system.hp.max + hpGain;
            const newHPValue = actor.system.hp.value + hpGain;
            
            await // AUTO-CONVERT actor.update -> ProgressionEngine (confidence=0.00)
// TODO: manual migration required. Original: globalThis.SWSE.ActorEngine.updateActor(actor, {
                "system.level": newLevel,
                "system.hp.max": newHPMax,
                "system.hp.value": newHPValue
            });
globalThis.SWSE.ActorEngine.updateActor(actor, {
                "system.level": newLevel,
                "system.hp.max": newHPMax,
                "system.hp.value": newHPValue
            });
/* ORIGINAL: globalThis.SWSE.ActorEngine.updateActor(actor, {
                "system.level": newLevel,
                "system.hp.max": newHPMax,
                "system.hp.value": newHPValue
            }); */


            // Get mentor for narration
            // Check if this is a prestige class
            const isPrestige = !['Jedi', 'Noble', 'Scoundrel', 'Scout', 'Soldier'].includes(className);
            let mentor, mentorGreeting, classLevel;

            if (isPrestige) {
                // For prestige classes, use the prestige class mentor
                mentor = getMentorForClass(className);
                // Determine which level of this prestige class this is
                const classItems = actor.items.filter(i => i.type === 'class' && i.name === className);
                classLevel = classItems.length + 1;
                mentorGreeting = getMentorGreeting(mentor, classLevel, actor);
            } else {
                // For base classes, use the level 1 class mentor
                const level1Class = getLevel1Class(actor);
                mentor = getMentorForClass(level1Class);
                mentorGreeting = getMentorGreeting(mentor, newLevel, actor);
            }

            // If this is level 1, save the starting class
            if (// AUTO-CONVERT actor.system.* assignment -> ProgressionEngine (confidence=0.00)
// TODO: manual migration required. Original: actor.system.level === 1) {
                await setLevel1Class(actor, className);
// (no heuristic applied)
/* ORIGINAL: actor.system.level === 1) {
                await setLevel1Class(actor, className); */

            }

            // Create chat message summarizing level up with mentor narration
            const chatContent = `
                <div class="swse level-up-message">
                    <h3><i class="fas fa-level-up-alt"></i> Level Up!</h3>
                    <div class="mentor-narration" style="background: rgba(0,0,0,0.3); padding: 0.5rem; border-left: 3px solid #00d9ff; margin: 0.5rem 0; font-style: italic;">
                        <strong>${mentor.name}, ${mentor.title}:</strong><br>
                        "${mentorGreeting}"
                    </div>
                    <p><strong>${actor.name}</strong> advanced to level <strong>${newLevel}</strong>!</p>
                    <p><strong>Class:</strong> ${className}</p>
                    <p><strong>HP Gained:</strong> ${rollMessage}</p>
                    <p><strong>New HP Total:</strong> ${newHPMax}</p>
                </div>
            `;
            
            await ChatMessage.create({
                speaker: ChatMessage.getSpeaker({ actor }),
                content: chatContent,
                type: CONST.CHAT_MESSAGE_TYPES.OTHER
            });

            ui.notifications.info(`${actor.name} leveled up to level ${newLevel}!`);
            
            // Re-render actor sheet to show changes
            actor.sheet.render(false);
            
        } catch (err) {
            SWSELogger.error("SWSE Level Up | Error applying level up:", err);
            ui.notifications.error("Failed to apply level up. See console for details.");
            throw err;
        }
    }
}
