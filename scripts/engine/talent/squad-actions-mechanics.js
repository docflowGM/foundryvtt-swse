/**
 * Squad Actions Mechanics (Followers)
 *
 * PURE ENGINE LAYER - NO UI IMPORTS
 *
 * Provides mechanics helpers for the "Squad Actions" talent.
 *
 * Stability policy:
 * - No automation of line-of-sight, targeting, or damage math.
 * - The system computes *eligible follower counts* based on inventory only.
 * - The user applies the resulting modifiers manually.
 *
 * Note: To get followers for an actor, apps layer should pass them in or
 * call a separate FollowerRegistry service. This engine only analyzes weapons.
 */

export default class SquadActionsMechanics {

  static TALENT_NAME = 'Squad Actions';

  static hasSquadActions(actor) {
    return Boolean(actor?.items?.some(i => i.type === 'talent' && i.name === this.TALENT_NAME));
  }

  static _isRangedWeapon(item) {
    if (!item || item.type !== 'weapon') {return false;}
    const range = String(item.system?.range ?? '').toLowerCase();
    // Typical data uses "X squares" for ranged, and "melee" or empty for melee.
    if (range.includes('squares')) {return true;}
    if (range.includes('melee')) {return false;}
    // Fallback: category hints
    const cat = String(item.system?.category ?? '').toLowerCase();
    if (cat.includes('pistol') || cat.includes('rifle') || cat.includes('heavy') || cat.includes('sniper')) {return true;}
    return false;
  }

  static _isAutofireCapable(item) {
    if (!this._isRangedWeapon(item)) {return false;}
    const props = item.system?.properties;
    const list = Array.isArray(props) ? props : (props ? [props] : []);
    return list.some(p => String(p).toLowerCase() === 'autofire');
  }

  /**
   * Get follower weapon counts for an actor
   * @param {Actor} actor - The actor
   * @param {Array} followers - Array of follower actors/objects. If not provided, empty.
   * @returns {Object} Weapon count summary
   */
  static getFollowerWeaponCounts(actor, followers = []) {
    // Filter to valid followers (not owner, not null)
    const validFollowers = followers.filter(f => f && !f.isOwner);

    const ranged = validFollowers.filter(f => f.items?.some(i => this._isRangedWeapon(i)));
    const autofire = validFollowers.filter(f => f.items?.some(i => this._isAutofireCapable(i)));

    return {
      followersTotal: validFollowers.length,
      rangedCount: ranged.length,
      autofireCount: autofire.length,
      rangedNames: ranged.map(f => f.name),
      autofireNames: autofire.map(f => f.name)
    };
  }

  static async _toChat(actor, title, bodyHtml) {
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: `
        <div class="swse-squad-actions-card">
          <h3>${title}</h3>
          ${bodyHtml}
        </div>
      `
    });
  }

  static async openFire(actor, followers = []) {
    const c = this.getFollowerWeaponCounts(actor, followers);
    await this._toChat(actor, 'Squad Actions: Open Fire', `
      <p><strong>Action:</strong> Standard Action (ranged attack vs single target).</p>
      <p><strong>Eligible followers (armed w/ ranged weapon):</strong> ${c.rangedCount}/${c.followersTotal}</p>
      <p><strong>Effect:</strong> On a hit, add <strong>+2 damage</strong> for each eligible follower who has <em>line of sight</em> to the target.</p>
      <p><em>Manual:</em> Verify line of sight and apply the total modifier yourself.</p>
      ${c.rangedNames.length ? `<details><summary>Eligible follower list</summary><ul>${c.rangedNames.map(n => `<li>${n}</li>`).join('')}</ul></details>` : ''}
    `);
  }

  static async paintedTarget(actor, followers = []) {
    const c = this.getFollowerWeaponCounts(actor, followers);
    await this._toChat(actor, 'Squad Actions: Painted Target', `
      <p><strong>Action:</strong> Standard Action (ranged attack vs single target).</p>
      <p><strong>Eligible followers (armed w/ ranged weapon):</strong> ${c.rangedCount}/${c.followersTotal}</p>
      <p><strong>Effect:</strong> Gain a <strong>competence bonus to attack</strong> equal to the number of eligible followers who have <em>line of sight</em> to the target.</p>
      <p><em>Manual:</em> Verify line of sight, then apply <strong>+N</strong> to the attack roll.</p>
      ${c.rangedNames.length ? `<details><summary>Eligible follower list</summary><ul>${c.rangedNames.map(n => `<li>${n}</li>`).join('')}</ul></details>` : ''}
    `);
  }

  static async autofireBarrage(actor, followers = []) {
    const c = this.getFollowerWeaponCounts(actor, followers);
    await this._toChat(actor, 'Squad Actions: Autofire Barrage', `
      <p><strong>Action:</strong> Standard Action (Autofire attack vs legal target spaces).</p>
      <p><strong>Eligible followers (armed w/ Autofire):</strong> ${c.autofireCount}/${c.followersTotal}</p>
      <p><strong>Effect:</strong> For each eligible follower who has <em>line of sight</em> to the targeted area, you may designate <strong>one additional adjacent square</strong> as targeted.</p>
      <p><em>Manual:</em> Verify line of sight, then mark extra squares (adjacent to the original area) up to <strong>N</strong> squares.</p>
      ${c.autofireNames.length ? `<details><summary>Eligible follower list</summary><ul>${c.autofireNames.map(n => `<li>${n}</li>`).join('')}</ul></details>` : ''}
    `);
  }
}
