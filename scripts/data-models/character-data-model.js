/**
 * Character Data Model for SWSE
 */
export class SWSECharacterDataModel extends foundry.abstract.TypeDataModel {
  
  static defineSchema() {
    const fields = foundry.data.fields;
    
    return {
      abilities: new fields.SchemaField({
        str: new fields.SchemaField(this._abilitySchema()),
        dex: new fields.SchemaField(this._abilitySchema()),
        con: new fields.SchemaField(this._abilitySchema()),
        int: new fields.SchemaField(this._abilitySchema()),
        wis: new fields.SchemaField(this._abilitySchema()),
        cha: new fields.SchemaField(this._abilitySchema())
      }),
      
      defenses: new fields.SchemaField({
        reflex: new fields.SchemaField(this._defenseSchema()),
        fortitude: new fields.SchemaField(this._defenseSchema()),
        will: new fields.SchemaField(this._defenseSchema())
      }),
      
      hp: new fields.SchemaField({
        value: new fields.NumberField({ required: true, initial: 1, min: 0, integer: true }),
        max: new fields.NumberField({ required: true, initial: 1, min: 1, integer: true }),
        temp: new fields.NumberField({ required: true, initial: 0, min: 0, integer: true })
      }),
      
      damageThreshold: new fields.SchemaField({
        fortitude: new fields.NumberField({ initial: 10, integer: true }),
        size: new fields.NumberField({ initial: 0, integer: true }),
        total: new fields.NumberField({ initial: 10, integer: true })
      }),
      
      level: new fields.NumberField({
        required: true,
        initial: 1,
        min: 1,
        max: 20,
        integer: true
      }),
      
      bab: new fields.NumberField({ required: true, initial: 0, integer: true }),
      
      conditionTrack: new fields.StringField({
        required: true,
        initial: "normal",
        choices: ["normal", "-1", "-2", "-5", "-10", "helpless"]
      }),
      
      forcePoints: new fields.SchemaField({
        value: new fields.NumberField({ required: true, initial: 0, min: 0, integer: true }),
        max: new fields.NumberField({ required: true, initial: 5, min: 0, integer: true })
      }),
      
      secondWind: new fields.SchemaField({
        uses: new fields.NumberField({ required: true, initial: 1, min: 0, integer: true }),
        healing: new fields.NumberField({ required: true, initial: 0, min: 0, integer: true })
      }),
      
      skills: new fields.SchemaField({
        acrobatics: new fields.SchemaField(this._skillSchema()),
        climb: new fields.SchemaField(this._skillSchema()),
        deception: new fields.SchemaField(this._skillSchema()),
        endurance: new fields.SchemaField(this._skillSchema()),
        initiative: new fields.SchemaField(this._skillSchema()),
        perception: new fields.SchemaField(this._skillSchema()),
        persuasion: new fields.SchemaField(this._skillSchema()),
        pilot: new fields.SchemaField(this._skillSchema()),
        stealth: new fields.SchemaField(this._skillSchema()),
        useTheForce: new fields.SchemaField(this._skillSchema())
      }),
      
      size: new fields.StringField({
        required: true,
        initial: "medium",
        choices: ["fine", "diminutive", "tiny", "small", "medium", "large", "huge", "gargantuan", "colossal"]
      }),
      
      speed: new fields.SchemaField({
        base: new fields.NumberField({ required: true, initial: 6, min: 0, integer: true }),
        total: new fields.NumberField({ required: true, initial: 6, min: 0, integer: true })
      }),
      
      biography: new fields.HTMLField(),
      notes: new fields.HTMLField()
    };
  }
  
  static _abilitySchema() {
    const fields = foundry.data.fields;
    return {
      base: new fields.NumberField({ required: true, initial: 10, min: 0, max: 30, integer: true }),
      racial: new fields.NumberField({ required: true, initial: 0, integer: true }),
      temp: new fields.NumberField({ required: true, initial: 0, integer: true }),
      total: new fields.NumberField({ required: true, initial: 10, integer: true }),
      mod: new fields.NumberField({ required: true, initial: 0, integer: true })
    };
  }
  
  static _defenseSchema() {
    const fields = foundry.data.fields;
    return {
      base: new fields.NumberField({ initial: 10, integer: true }),
      levelArmor: new fields.NumberField({ initial: 0, integer: true }),
      ability: new fields.NumberField({ initial: 0, integer: true }),
      misc: new fields.NumberField({ initial: 0, integer: true }),
      total: new fields.NumberField({ initial: 10, integer: true })
    };
  }
  
  static _skillSchema() {
    const fields = foundry.data.fields;
    return {
      trained: new fields.BooleanField({ required: true, initial: false }),
      focusRanks: new fields.NumberField({ required: true, initial: 0, min: 0, integer: true }),
      misc: new fields.NumberField({ required: true, initial: 0, integer: true }),
      total: new fields.NumberField({ required: true, initial: 0, integer: true })
    };
  }
}
