import fs from 'fs';
const rows=JSON.parse(fs.readFileSync('audit-output/attrbasis.json'));
const notes={
 soldier_brawler:['EXPLICIT-PRE','archive note: "STR 22 (after +4 racial), CON 20 (after +4 racial)" vs stored 18/16 → stored scores are pre-species (author statement; base-array legality under V2 generation still unverified: point-buy cost 34)'],
 scoundrel_knuckledragger:['SUGGESTS-PRE','note says "DEX 18"; stored DEX 16 + Duros +2 = 18'],
 scoundrel_brigand:['SUGGESTS-POST (conflicts with knuckledragger, same species)','note says "DEX 18"; stored DEX 18, Duros +2 would make 20'],
 jedi_defender:['UNRESOLVED (species-data conflict)','note says "Zabrak CON bonus"; V2 Zabrak abilityMods are all 0']
};
const out=['| Profile | Species (V2 mods) | Stored str/dex/con/int/wis/cha | Evidence | Determination | Action |','|---|---|---|---|---|---|'];
const cnt={};
for(const r of rows){let det,ev,act='';
 const moot=r.mods==='' ;
 if(notes[r.id]){[det,ev]=notes[r.id]}
 else if(r.cls==='NO_SPECIES_MODS_IN_PACK'){det='UNDETERMINED';ev='Wolf/Bear have no species doc/mods in V2 packs'}
 else if(moot){det='MOOT';ev='V2 species ability mods are all 0 → pre == post'}
 else {det='UNDETERMINED';ev=(r.cls.startsWith('NEITHER')?'not a ≤25 point-buy under either reading; ':r.cls.startsWith('POST')?'only the post-reading fits a 25-pt buy, but 11 profiles share one array regardless of species (favors pre); ':'')+'no authored statement'}
 if(det==='MOOT')act='may proceed (commit stored scores as base)';
 else if(det==='EXPLICIT-PRE')act='may proceed once owner confirms the note';
 else act='BLOCK until owner/author states basis';
 cnt[det.split(' ')[0]]=(cnt[det.split(' ')[0]]||0)+1;
 out.push(`| \`${r.id}\` | ${r.sp} (${r.mods||'none'}) | ${r.scores} | ${ev} | **${det}** | ${act} |`)}
fs.mkdirSync('audit-output',{recursive:true});fs.writeFileSync('audit-output/attrmatrix.md',out.join('\n')+'\n');console.log(cnt);
