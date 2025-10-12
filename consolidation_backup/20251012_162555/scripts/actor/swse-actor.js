// swse-actor.js
export default class SWSEActor extends Actor {
    prepareData() {
        super.prepareData();
        
        // Ensure speed is properly structured
        this._applySpeed();
    }
    
    _applySpeed() {
        // Ensure speed is an object
        if (typeof this.system.speed === 'number') {
            this.system.speed = {
                base: this.system.speed,
                armor: 0,
                misc: 0,
                total: this.system.speed
            };
        }
        
        // Ensure all speed properties exist
        if (!this.system.speed) {
            this.system.speed = { base: 6, armor: 0, misc: 0, total: 6 };
        }
        
        const base = this.system.speed.base || 6;
        const armor = this.system.speed.armor || 0;
        const misc = this.system.speed.misc || 0;
        
        this.system.speed.total = base + armor + misc;
    }
}