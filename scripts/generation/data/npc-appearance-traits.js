/**
 * PHASE 8D-2 foundation — NPC physical-appearance trait pool for
 * `npc/npc-narrative-generator.js`. Representative catalog (30
 * entries). Pure flavor description -- never anything that could be
 * mistaken for a mechanical trait (no combat implication, no ability
 * score hint).
 */

export const NPC_APPEARANCE_TRAITS = Object.freeze([
  { value: 'tall and broad-shouldered, hard to miss in a crowd', weight: 3, tags: ['military', 'aggressive'] },
  { value: 'a jagged scar running across one cheek', weight: 2, tags: ['military', 'criminal'] },
  { value: 'meticulously groomed, not a hair out of place', weight: 2, tags: ['noble', 'business'] },
  { value: 'wears mismatched, patched-together clothing', weight: 3, tags: ['criminal', 'frontier'] },
  { value: 'moves with a pronounced limp', weight: 1, tags: ['military', 'weathered'] },
  { value: 'unnervingly still, rarely blinking', weight: 1, tags: ['mysterious'] },
  { value: 'elaborate tattoos covering both arms', weight: 2, tags: ['community', 'criminal'] },
  { value: 'a cybernetic replacement arm, unconcealed', weight: 1, tags: ['military', 'criminal'] },
  { value: 'perpetually squinting, as if into a bright sun', weight: 2, tags: ['frontier'] },
  { value: 'an old military-issue coat, worn with quiet pride', weight: 2, tags: ['military'] },
  { value: 'short and wiry, always in motion', weight: 2, tags: ['criminal', 'trade'] },
  { value: 'immaculately tailored formalwear, slightly out of place here', weight: 2, tags: ['noble', 'business'] },
  { value: 'weathered, sun-worn skin from years off-world', weight: 2, tags: ['frontier'] },
  { value: 'an ornate, clearly expensive piece of jewelry', weight: 1, tags: ['noble', 'business'] },
  { value: 'a heavy utility belt loaded with tools', weight: 2, tags: ['trade', 'frontier'] },
  { value: 'strikingly pale, as if rarely seeing daylight', weight: 1, tags: ['mysterious'] },
  { value: 'burn scars along one side of the face', weight: 1, tags: ['military', 'criminal'] },
  { value: 'an easy, disarming smile that rarely reaches the eyes', weight: 2, tags: ['criminal', 'business'] },
  { value: 'a heavy, guttural accent from a distant world', weight: 2, tags: ['frontier'] },
  { value: 'dressed in simple, practical work clothes', weight: 3, tags: ['rural', 'civilian'] },
  { value: 'carries themselves with rigid military posture', weight: 2, tags: ['military'] },
  { value: 'a distinctive, brightly-colored piece of headgear', weight: 1, tags: ['civilian'] },
  { value: 'noticeably underfed, clothes hanging loose', weight: 1, tags: ['frontier', 'criminal'] },
  { value: 'covered in grease and grime from constant work', weight: 2, tags: ['trade', 'business'] },
  { value: 'an unusually calm, level gaze', weight: 1, tags: ['mysterious', 'force'] },
  { value: 'a nervous, darting-eyed demeanor', weight: 2, tags: ['criminal'] },
  { value: 'religious markings or symbols worn openly', weight: 1, tags: ['religion'] },
  { value: 'a prosthetic eye that occasionally whirs and clicks', weight: 1, tags: ['military', 'criminal'] },
  { value: 'dressed far too formally for the setting', weight: 1, tags: ['noble', 'business'] },
  { value: 'nothing especially memorable about their appearance', weight: 3, tags: [] },
  { value: 'a distinctive scar that draws the eye', weight: 2, tags: ['military', 'criminal'] },
  { value: 'immaculately groomed, not a hair out of place', weight: 1, tags: ['business', 'noble'] },
  { value: 'weathered and sun-worn from years outdoors', weight: 2, tags: ['frontier', 'rural'] },
  { value: 'a faded tattoo hinting at an old affiliation', weight: 1, tags: ['military', 'criminal'] },
  { value: 'wears simple, practical, well-worn work clothes', weight: 2, tags: ['civilian', 'frontier'] },
  { value: 'an unusual hairstyle or headdress marking their culture', weight: 1, tags: ['community-tribe'] },
  { value: 'carries themselves with obvious, practiced confidence', weight: 1, tags: ['military', 'business'] },
  { value: 'visibly nervous, fidgets constantly', weight: 1, tags: ['civilian'] },
  { value: 'a mechanical limb or cybernetic replacement, plainly visible', weight: 1, tags: ['military', 'technology'] },
  { value: 'permanently squints from years spent under harsh light', weight: 1, tags: ['technology', 'frontier'] },
  { value: 'strikingly tall or short for their species', weight: 1, tags: [] },
  { value: 'wears an old, sentimental piece of jewelry', weight: 1, tags: [] },
  { value: 'a voice that carries further than expected', weight: 1, tags: ['military', 'business'] },
  { value: 'wrapped in layered robes regardless of climate', weight: 1, tags: ['religion', 'force-tradition', 'mysterious'] },
  { value: 'an unsettling stillness when at rest', weight: 1, tags: ['mysterious'] },
  { value: 'sharp, calculating eyes that miss nothing', weight: 1, tags: ['criminal', 'business'] },
  { value: 'perpetually smells of engine coolant and ozone', weight: 1, tags: ['technology'] },
  { value: 'an easy, disarming smile that puts people at ease', weight: 2, tags: ['civilian', 'business'] },
  { value: 'moves with the economy of someone trained for combat', weight: 1, tags: ['military', 'criminal'] }
]);
