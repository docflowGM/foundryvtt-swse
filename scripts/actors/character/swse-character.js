import { SWSEActorBase } from '../base/swse-actor-base.js';

export class SWSECharacter extends SWSEActorBase {
  
  async useSecondWind() {
    // TODO: Implement Second Wind
    // - Check uses remaining
    // - Calculate healing (¼ HP + Con)
    // - Apply healing
    // - Decrement uses
    // - Show chat message
  }
  
  async spendForcePoint(reroll = false) {
    // TODO: Implement Force Point spending
    // - Check points remaining
    // - If reroll: get last roll, add bonus dice
    // - If other: apply effect
    // - Decrement points
  }
  
  async levelUp() {
    // TODO: Open level-up dialog
    // - Select class to advance
    // - Add HP
    // - Select feat (if applicable)
    // - Select talent (if applicable)
    // - Increase ability score (if applicable)
    // - Update skills
    // - Reset Force Points
  }
}
