/**
 * Inline lightsaber chassis visuals for the item customization workbench.
 * Geometry is adapted from the Lightsaber Chassis Concepts handoff.
 */
const NS="http://www.w3.org/2000/svg";
const cx=70, VW=140, VH=470;

/* ---- finishes (base metal colours; ramps generated) ----------------- */
const FINISHES=[
 {id:"steel",   label:"Brushed Steel",     steel:"#c3c9d0", dark:"#42464d", gun:"#4d525a", brass:"#d6a24e", copper:"#cf7b4e", accent:"#e8763d"},
 {id:"gun",     label:"Gunmetal",          steel:"#727781", dark:"#23262b", gun:"#3a3e45", brass:"#9aa0a8", copper:"#6b7079", accent:"#5fb4d8"},
 {id:"bronze",  label:"Antique Bronze",    steel:"#b3873f", dark:"#3a2c14", gun:"#5a4420", brass:"#e0bd6a", copper:"#b9603c", accent:"#f0b53d"},
 {id:"obsidian",label:"Obsidian & Gold",   steel:"#34373d", dark:"#141519", gun:"#23262b", brass:"#e6c66a", copper:"#caa24a", accent:"#f3d27a"},
 {id:"chrome",  label:"Chrome & Sapphire", steel:"#dadfe4", dark:"#3a3e45", gun:"#aeb4bc", brass:"#b8bec6", copper:"#9aa0a8", accent:"#4f8fe6"},
 {id:"crimson", label:"Crimson Alloy",     steel:"#a6acb4", dark:"#2a1517", gun:"#3a2426", brass:"#b5483f", copper:"#c2412f", accent:"#e2473a"},
];

/* ---- gradient generation -------------------------------------------- */
function hx(h){h=h.replace('#','');return{r:parseInt(h.slice(0,2),16),g:parseInt(h.slice(2,4),16),b:parseInt(h.slice(4,6),16)};}
function toHex(n){return Math.max(0,Math.min(255,Math.round(n))).toString(16).padStart(2,'0');}
function shade(hex,t){const c=hx(hex),tgt=t>0?255:0,a=Math.abs(t);const m=x=>x+(tgt-x)*a;return '#'+toHex(m(c.r))+toHex(m(c.g))+toHex(m(c.b));}
function metalGrad(id,base){
  const s=[[0,-0.55],[0.16,0.08],[0.42,0.52],[0.6,-0.12],[0.84,-0.48],[1,-0.72]];
  return `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="0">`
   +s.map(([o,t])=>`<stop offset="${o}" stop-color="${shade(base,t)}"/>`).join('')+`</linearGradient>`;
}
function bladeGrad(id,a){return `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${a}" stop-opacity="0"/><stop offset="0.5" stop-color="${shade(a,0.6)}"/><stop offset="1" stop-color="${a}" stop-opacity="0"/></linearGradient>`;}
function buildDefs(f){const s=f.id;return `<defs>`
  +metalGrad('steel_'+s,f.steel)+metalGrad('dark_'+s,f.dark)+metalGrad('gun_'+s,f.gun)
  +metalGrad('brass_'+s,f.brass)+metalGrad('copper_'+s,f.copper)+bladeGrad('blade_'+s,f.accent)+`</defs>`;}

/* ---- drawing primitives (use #name) refs, re-suffixed per finish) ---- */
const X=w=>cx-w/2;
function tube(y,h,w,fill="url(#steel)",rx=2){const x=X(w);
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="#08090b" stroke-width="1"/>`
   +`<rect x="${(cx-w*0.18).toFixed(1)}" y="${y+1.5}" width="1.8" height="${h-3}" fill="#ffffff" opacity="0.32"/>`;}
function bevelRing(y,w,h=8,fill="url(#dark)"){const x=X(w);
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="1.5" fill="${fill}" stroke="#08090b" stroke-width="1"/>`
   +`<line x1="${x+1}" y1="${y+1.3}" x2="${x+w-1}" y2="${y+1.3}" stroke="#fff" opacity="0.28" stroke-width="1"/>`
   +`<line x1="${x+1}" y1="${y+h-1.2}" x2="${x+w-1}" y2="${y+h-1.2}" stroke="#000" opacity="0.55" stroke-width="1"/>`;}
function knurl(y,h,w){const x=X(w);let s=tube(y,h,w,"url(#dark)",1.5);
  for(let xx=x+2.4;xx<x+w-1.5;xx+=2.1){s+=`<line x1="${xx.toFixed(1)}" y1="${y+2}" x2="${xx.toFixed(1)}" y2="${y+h-2}" stroke="#000" opacity="0.4" stroke-width="0.7"/>`
   +`<line x1="${(xx+0.9).toFixed(1)}" y1="${y+2}" x2="${(xx+0.9).toFixed(1)}" y2="${y+h-2}" stroke="#fff" opacity="0.12" stroke-width="0.7"/>`;}
  return bevelRing(y-2,w+2,4)+s+bevelRing(y+h-2,w+2,4);}
function ribs(y,h,count,w){let s=tube(y,h,w,"url(#dark)",1.5);const step=h/count;
  for(let i=0;i<count;i++)s+=bevelRing(y+i*step+0.6,w,step-1.4,"url(#dark)");return s;}
function vents(y,count,w){let s="";const x=X(w);for(let i=0;i<count;i++)s+=`<rect x="${x+3}" y="${(y+i*3.2).toFixed(1)}" width="${w-6}" height="1.6" rx="0.8" fill="#000" opacity="0.7"/>`;return s;}
function screw(x,y){return `<circle cx="${x}" cy="${y}" r="2" fill="url(#dark)" stroke="#08090b" stroke-width="0.8"/><line x1="${x-1.3}" y1="${y}" x2="${x+1.3}" y2="${y}" stroke="#000" stroke-width="0.8"/>`;}
function button(x,y,fill="var(--accent)",r=3.2){return `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" stroke="#08090b" stroke-width="1"/><circle cx="${x-r*0.32}" cy="${y-r*0.32}" r="${r*0.3}" fill="#fff" opacity="0.55"/>`;}
function glassEye(x,y,color="var(--accent)",r=3.4){return `<circle cx="${x}" cy="${y}" r="${r}" fill="${color}"/><circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="#08090b" stroke-width="1"/><circle cx="${x-1}" cy="${y-1}" r="${r*0.32}" fill="#fff" opacity="0.75"/>`;}
function ctrlBox(y,h,w=20){const x=cx+5;
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2.5" fill="url(#gun)" stroke="#08090b" stroke-width="1"/>`
   +screw(x+3,y+3)+screw(x+w-3,y+3)+screw(x+3,y+h-3)+screw(x+w-3,y+h-3)
   +button(x+w/2-2,y+h*0.3)+`<rect x="${x+w/2-2}" y="${y+h*0.5}" width="5" height="${h*0.3}" rx="2" fill="#cfd3d8" stroke="#08090b" stroke-width="0.8"/>`;}
function emitter(y,w,fill="url(#dark)"){const x=X(w);
  let s=`<path d="M ${x-4} ${y+18} L ${x} ${y} L ${cx+w/2} ${y} L ${cx+w/2+4} ${y+18} Z" fill="${fill}" stroke="#08090b" stroke-width="1"/>`;
  for(let i=-1;i<=1;i++)s+=`<rect x="${cx+i*6-1.4}" y="${y+3}" width="2.8" height="11" rx="1.2" fill="#000" opacity="0.65"/>`;
  return s+`<ellipse cx="${cx}" cy="${y+1}" rx="${w/2-3}" ry="3" fill="#08090b"/>`;}
function chokeRing(y,w){return bevelRing(y,w+6,9,"url(#steel)");}
function dRing(y){return `<rect x="${cx-5}" y="${y-4}" width="10" height="8" rx="2" fill="url(#gun)" stroke="#08090b" stroke-width="1"/>`
   +`<circle cx="${cx}" cy="${y+12}" r="8" fill="none" stroke="url(#steel)" stroke-width="3.4"/><circle cx="${cx}" cy="${y+12}" r="8" fill="none" stroke="#08090b" stroke-width="0.8"/>`;}
function pommel(y,w,fill="url(#dark)"){return bevelRing(y,w+4,7,"url(#steel)")+tube(y+7,16,w,fill,3);}
function flaredEmitter(y,w,fill="url(#dark)"){const x=X(w);
  return `<path d="M ${cx-w/2-9} ${y} L ${x} ${y+15} L ${cx+w/2} ${y+15} L ${cx+w/2+9} ${y} Z" fill="${fill}" stroke="#08090b" stroke-width="1"/>`
   +`<ellipse cx="${cx}" cy="${y}" rx="${w/2+9}" ry="3.5" fill="#08090b"/><ellipse cx="${cx}" cy="${y}" rx="${w/2+5}" ry="2" fill="#1b1d22"/>`;}
function emitterDown(y,w,fill="url(#dark)"){return `<g transform="rotate(180 ${cx} ${y+9})">`+emitter(y,w,fill)+`</g>`;}
function perpHandle(y,len){const x0=cx-15-len,h=18;let s="";
  s+=`<rect x="${cx-16}" y="${y-4}" width="15" height="${h+8}" rx="3" fill="url(#dark)" stroke="#08090b"/>`;
  s+=`<rect x="${x0}" y="${y}" width="${len}" height="${h}" rx="5" fill="url(#dark)" stroke="#08090b"/>`;
  s+=`<rect x="${x0+2}" y="${y+2}" width="${len-3}" height="1.6" fill="#fff" opacity="0.22"/>`;
  for(let xx=x0+4;xx<x0+len-2;xx+=2.3)s+=`<line x1="${xx.toFixed(1)}" y1="${y+2}" x2="${xx.toFixed(1)}" y2="${y+h-2}" stroke="#000" opacity="0.35" stroke-width="0.7"/>`;
  return s+`<rect x="${x0-2}" y="${y-1}" width="5" height="${h+2}" rx="2" fill="url(#steel)" stroke="#08090b"/>`;}
function beltRig(fromX,fromY){const px=8,py=350,pw=42,ph=86;let s="";
  const d=`M ${fromX} ${fromY} C ${fromX-26} ${fromY+36}, ${px+pw+36} ${py-36}, ${px+pw} ${py+22}`;
  s+=`<path d="${d}" fill="none" stroke="#0e1014" stroke-width="5"/><path d="${d}" fill="none" stroke="url(#gun)" stroke-width="2"/>`;
  s+=`<rect x="${px}" y="${py}" width="${pw}" height="${ph}" rx="5" fill="url(#gun)" stroke="#08090b"/>`;
  s+=`<rect x="${(px+0.18*pw).toFixed(1)}" y="${py+2}" width="1.8" height="${ph-4}" fill="#fff" opacity="0.22"/>`;
  for(let i=0;i<4;i++)s+=`<rect x="${px+4}" y="${py+12+i*6}" width="${pw-8}" height="2" rx="1" fill="#000" opacity="0.55"/>`;
  return s+glassEye(px+pw/2,py+ph-16)+`<rect x="${px-2}" y="${py+ph-6}" width="${pw+4}" height="6" rx="2" fill="url(#steel)" stroke="#08090b"/>`;}

/* curved (parabolic) dueling hilt — slices follow a bezier so each keeps a
   cylindrical cross-section gradient */
function curvedDueling(){
  const P0=[cx-4,48],P1=[cx-32,232],P2=[cx+20,420];
  const bez=t=>{const u=1-t;return[u*u*P0[0]+2*u*t*P1[0]+t*t*P2[0],u*u*P0[1]+2*u*t*P1[1]+t*t*P2[1]];};
  const dbz=t=>[2*(1-t)*(P1[0]-P0[0])+2*t*(P2[0]-P1[0]),2*(1-t)*(P1[1]-P0[1])+2*t*(P2[1]-P1[1])];
  const deg=t=>{const d=dbz(t);return Math.atan2(d[1],d[0])*180/Math.PI-90;};
  const N=30,segH=(P2[1]-P0[1])/N*1.5+2;let s="";
  for(let i=0;i<=N;i++){const t=i/N,[x,y]=bez(t),grip=t>0.30&&t<0.80,w=grip?28:26,fill=grip?"url(#dark)":"url(#steel)";
    s+=`<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${deg(t).toFixed(1)})">`
     +`<rect x="${-w/2}" y="${(-segH/2).toFixed(1)}" width="${w}" height="${segH.toFixed(1)}" fill="${fill}" stroke="#08090b" stroke-width="0.5"/>`
     +`<rect x="${(-w*0.2).toFixed(1)}" y="${(-segH/2).toFixed(1)}" width="1.6" height="${segH.toFixed(1)}" fill="#fff" opacity="0.28"/>`
     +(grip&&i%2===0?`<rect x="${-w/2}" y="${(-segH/2).toFixed(1)}" width="${w}" height="1.4" fill="#000" opacity="0.5"/>`:"")+`</g>`;}
  let p=bez(0);s+=`<g transform="translate(${p[0].toFixed(1)} ${p[1].toFixed(1)}) rotate(${deg(0).toFixed(1)})">`
   +`<path d="M -16 8 L -13 -8 L 13 -8 L 16 8 Z" fill="url(#dark)" stroke="#08090b"/>`
   +`<ellipse cx="0" cy="-8" rx="10" ry="2.6" fill="#08090b"/>`
   +`<rect x="-15" y="8" width="30" height="7" rx="2" fill="url(#brass)" stroke="#08090b"/></g>`;
  p=bez(1);s+=`<g transform="translate(${p[0].toFixed(1)} ${p[1].toFixed(1)}) rotate(${deg(1).toFixed(1)})">`
   +`<rect x="-15" y="-3" width="30" height="7" rx="2" fill="url(#brass)" stroke="#08090b"/>`
   +`<rect x="-12" y="4" width="24" height="15" rx="3" fill="url(#dark)" stroke="#08090b"/></g>`;
  p=bez(0.5);s+=`<g transform="translate(${p[0].toFixed(1)} ${p[1].toFixed(1)}) rotate(${deg(0.5).toFixed(1)})">`
   +`<rect x="14" y="-22" width="18" height="44" rx="2.5" fill="url(#gun)" stroke="#08090b"/>`
   +button(23,-12)+`<rect x="20" y="3" width="5" height="13" rx="2" fill="#cfd3d8" stroke="#08090b"/>`
   +glassEye(-9,-2)+`</g>`;
  return s;}

/* caged emitter shroud (retrosaber) */
function cageEmitter(y,w){const W=w+6;let s="";
  s+=`<rect x="${cx-w/2+2}" y="${y+6}" width="${w-4}" height="58" rx="2" fill="url(#dark)" stroke="#08090b"/>`;
  s+=`<rect x="${cx-2.5}" y="${y+12}" width="5" height="46" rx="2" fill="var(--accent)" opacity="0.55"/>`;
  const sx=cx-W/2;[0,0.25,0.5,0.75,1].forEach(f=>{const px=sx+f*W;s+=`<rect x="${(px-2).toFixed(1)}" y="${y+6}" width="4" height="58" fill="url(#steel)" stroke="#08090b" stroke-width="0.6"/>`;});
  s+=bevelRing(y,W,9,"url(#steel)")+bevelRing(y+58,W,9,"url(#steel)");
  return s+`<ellipse cx="${cx}" cy="${y+1}" rx="${w/2-2}" ry="2.6" fill="#08090b"/>`;}

/* perpendicular crossguard quillon arm (dir -1 left / +1 right) */
function crossArm(dir){const inner=cx+dir*13,outer=cx+dir*55,y=76,h=15;
  const x0=Math.min(inner,outer),w=Math.abs(outer-inner);let s="";
  s+=`<rect x="${x0}" y="${y}" width="${w}" height="${h}" rx="4" fill="url(#dark)" stroke="#08090b"/>`;
  s+=`<rect x="${x0+2}" y="${y+2}" width="${w-4}" height="1.6" fill="#fff" opacity="0.22"/>`;
  for(let xx=x0+3;xx<x0+w-2;xx+=3)s+=`<line x1="${xx.toFixed(1)}" y1="${y+2}" x2="${xx.toFixed(1)}" y2="${y+h-2}" stroke="#000" opacity="0.4" stroke-width="0.7"/>`;
  const tipx=cx+dir*55;
  s+=`<rect x="${tipx-2.5}" y="${y-1}" width="5" height="${h+2}" rx="2" fill="url(#steel)" stroke="#08090b"/>`;
  return s+`<ellipse cx="${tipx+dir*1}" cy="${y+h/2}" rx="2" ry="${h/2-2}" fill="#08090b"/>`;}

/* ---- the 15 SWSE lightsaber variants (raw parts) -------------------- */
const concepts=[
{name:"Double-Bladed Lightsaber",parts:
   emitter(34,24)+chokeRing(48,24)+tube(60,148,26)+ribs(64,142,9,26)+
   bevelRing(206,32,10,"url(#brass)")+
   `<rect x="${cx-16}" y="216" width="32" height="42" rx="3" fill="url(#brass)" stroke="#08090b"/>`+
   screw(cx-11,224)+screw(cx+11,224)+screw(cx-11,250)+screw(cx+11,250)+
   button(cx-4,237)+button(cx+5,237,"#cfd3d8")+
   bevelRing(256,32,10,"url(#brass)")+tube(268,148,26)+ribs(272,142,9,26)+chokeRing(414,24)+emitterDown(428,24)},

{name:"Lightsaber",parts:
   emitter(50,32)+chokeRing(66,32)+tube(78,40,30)+vents(84,5,30)+ribs(120,150,11,30)+
   ctrlBox(150,52)+glassEye(cx-9,138)+bevelRing(272,34,9,"url(#steel)")+knurl(282,80,28)+pommel(366,30)+dRing(390)},

{name:"Short Lightsaber",parts:
   emitter(120,26)+chokeRing(136,26)+tube(148,30,24)+vents(152,3,24)+knurl(180,80,24)+
   ctrlBox(186,44,16)+glassEye(cx-8,168)+bevelRing(262,30,9,"url(#steel)")+pommel(272,22)+dRing(296)},

{name:"Archaic Lightfoil",parts:
   emitter(74,20)+bevelRing(88,24,7,"url(#brass)")+tube(96,206,18,"url(#steel)")+
   bevelRing(112,22,5,"url(#brass)")+bevelRing(150,22,5,"url(#brass)")+bevelRing(226,22,5,"url(#brass)")+
   glassEye(cx,131)+knurl(170,48,18)+bevelRing(302,24,8,"url(#brass)")+pommel(312,16,"url(#brass)")},

{name:"Archaic Lightsaber",parts:
   emitter(46,26)+chokeRing(62,26)+tube(74,34,24)+vents(78,3,24)+ribs(108,110,7,24)+
   ctrlBox(120,44,16)+glassEye(cx-8,96)+bevelRing(218,30,9,"url(#steel)")+tube(228,22,22,"url(#dark)")+
   `<rect x="${cx-6}" y="250" width="12" height="14" rx="2" fill="url(#gun)" stroke="#08090b"/>`+beltRig(cx,262)},

{name:"Crossguard Lightsaber",parts:
   emitter(40,26)+chokeRing(56,26)+
   crossArm(-1)+crossArm(1)+
   `<rect x="${cx-15}" y="66" width="30" height="40" rx="4" fill="url(#gun)" stroke="#08090b"/>`+
   `<rect x="${(cx-15+0.18*30).toFixed(1)}" y="68" width="1.8" height="36" fill="#fff" opacity="0.25"/>`+
   vents(72,3,30)+button(cx,98,"var(--accent)")+
   tube(106,150,28,"url(#gun)")+ribs(110,140,8,28)+
   ctrlBox(140,50)+glassEye(cx-9,128)+
   bevelRing(262,32,9,"url(#steel)")+knurl(272,60,26)+pommel(336,28)+dRing(360)},

{name:"Dual-Phase Lightsaber",parts:
   emitter(40,26)+chokeRing(56,26)+tube(68,300,24)+vents(74,4,24)+
   bevelRing(110,30,10,"url(#brass)")+bevelRing(220,30,10,"url(#brass)")+knurl(124,80,24)+knurl(234,90,24)+
   ctrlBox(150,46,16)+glassEye(cx-8,138)+bevelRing(368,30,9,"url(#steel)")+pommel(378,22)},

{name:"Dueling Lightsaber",parts:curvedDueling()},

{name:"Great Lightsaber",parts:
   emitter(40,40)+chokeRing(56,40)+tube(70,42,38)+vents(76,5,38)+ribs(114,206,12,38)+
   ctrlBox(150,62,22)+glassEye(cx-13,130)+bevelRing(322,46,12,"url(#steel)")+knurl(334,72,36)+pommel(408,38)},

{name:"Guard Shoto",parts:
   emitter(50,24)+chokeRing(66,24)+tube(78,338,24)+
   knurl(100,60,24)+perpHandle(152,48)+
   bevelRing(172,28,8,"url(#steel)")+knurl(198,150,24)+
   ctrlBox(212,46,16)+glassEye(cx-8,300)+
   bevelRing(352,28,8,"url(#steel)")+pommel(362,22)+dRing(386)},

{name:"Lightsaber Pike",parts:
   emitter(34,20)+chokeRing(48,20)+tube(60,356,16,"url(#gun)")+
   bevelRing(96,20,5,"url(#steel)")+bevelRing(330,20,5,"url(#steel)")+knurl(196,96,18)+
   ctrlBox(150,40,15)+glassEye(cx-8,140)+emitterDown(420,18)},

{name:"Lightwhip",parts:
   flaredEmitter(66,22)+bevelRing(82,30,6,"url(#brass)")+bevelRing(90,28,5,"url(#brass)")+bevelRing(98,26,5,"url(#brass)")+
   tube(106,170,24,"url(#steel)")+bevelRing(130,26,5,"url(#brass)")+bevelRing(170,26,5,"url(#brass)")+bevelRing(210,26,5,"url(#brass)")+
   glassEye(cx,150)+knurl(240,40,24)+bevelRing(288,30,9,"url(#brass)")+pommel(298,22,"url(#brass)")},

{name:"Long-Handle Lightsaber",parts:
   emitter(48,26)+chokeRing(64,26)+tube(76,26,24)+ctrlBox(84,42,16)+glassEye(cx-8,94)+
   bevelRing(104,30,9,"url(#steel)")+knurl(116,224,26)+bevelRing(342,30,9,"url(#steel)")+pommel(352,22)+dRing(376)},

{name:"Modern Lightfoil",parts:
   `<path d="M ${cx-10} 86 L ${cx-10} 74 Q ${cx} 64 ${cx+10} 74 L ${cx+10} 86 Z" fill="url(#steel)" stroke="#08090b"/>`+
   `<ellipse cx="${cx}" cy="70" rx="8" ry="2.5" fill="#08090b"/>`+tube(86,212,18,"url(#steel)")+
   `<rect x="${cx-2.5}" y="120" width="5" height="64" rx="2.5" fill="var(--accent)"/>`+
   `<rect x="${cx-2.5}" y="120" width="5" height="64" rx="2.5" fill="none" stroke="#08090b" stroke-width="0.5"/>`+
   bevelRing(100,20,5,"url(#steel)")+bevelRing(196,20,5,"url(#steel)")+
   `<circle cx="${cx}" cy="208" r="2.6" fill="#cfd3d8" stroke="#08090b"/>`+bevelRing(298,22,7,"url(#dark)")+pommel(308,16)},

{name:"Retrosaber",parts:
   cageEmitter(40,26)+
   bevelRing(110,32,8,"url(#steel)")+
   tube(118,30,28,"url(#gun)")+vents(122,5,28)+glassEye(cx+9,133)+
   bevelRing(150,34,8,"url(#steel)")+
   tube(158,150,30,"url(#copper)")+
   bevelRing(172,34,6,"url(#steel)")+
   ctrlBox(194,48,18)+
   bevelRing(308,36,9,"url(#steel)")+pommel(318,30)+dRing(342)},
];

/* ---- Foundry workbench exports -------------------------------------- */
const DEFAULT_CHASSIS_FINISH_KEY = 'steel';
const CHASSIS_VISUAL_ALIASES = {
  standard: 'Lightsaber',
  lightsaber: 'Lightsaber',
  'lightsaber-standard': 'Lightsaber',
  'standard-lightsaber': 'Lightsaber',
  double: 'Double-Bladed Lightsaber',
  'double-bladed': 'Double-Bladed Lightsaber',
  'doublebladed': 'Double-Bladed Lightsaber',
  short: 'Short Lightsaber',
  shoto: 'Short Lightsaber',
  'archaic-lightfoil': 'Archaic Lightfoil',
  'archaic-lightsaber': 'Archaic Lightsaber',
  crossguard: 'Crossguard Lightsaber',
  'dual-phase': 'Dual-Phase Lightsaber',
  dualphase: 'Dual-Phase Lightsaber',
  dueling: 'Dueling Lightsaber',
  curved: 'Dueling Lightsaber',
  great: 'Great Lightsaber',
  'guard-shoto': 'Guard Shoto',
  guardshoto: 'Guard Shoto',
  pike: 'Lightsaber Pike',
  'lightsaber-pike': 'Lightsaber Pike',
  lightwhip: 'Lightwhip',
  whip: 'Lightwhip',
  longhandle: 'Long-Handle Lightsaber',
  'long-handle': 'Long-Handle Lightsaber',
  'modern-lightfoil': 'Modern Lightfoil',
  retrosaber: 'Retrosaber',
  retro: 'Retrosaber'
};
const CONCEPT_BY_NAME = new Map(concepts.map(concept => [concept.name, concept]));
const FINISH_BY_KEY = new Map(FINISHES.map(finish => [finish.id, finish]));
const CHASSIS_IDS = ['steel','dark','gun','brass','copper','blade'];

function normalizeVisualToken(value){
  return String(value ?? '')
    .toLowerCase()
    .replace(/&amp;/g, 'and')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function resolveConceptName(chassis){
  const system = chassis?.system || {};
  const flags = chassis?.flags?.['foundryvtt-swse'] || chassis?.flags?.swse || {};
  const candidates = [
    flags.lightsaberVisualKey,
    flags.lightsaberChassisVisual,
    system.visual?.chassisVisualKey,
    system.chassisId,
    system.lightsaber?.chassisId,
    chassis?.id,
    chassis?._id,
    chassis?.name
  ].filter(Boolean);

  for (const candidate of candidates) {
    const token = normalizeVisualToken(candidate);
    if (CHASSIS_VISUAL_ALIASES[token]) return CHASSIS_VISUAL_ALIASES[token];
    const compact = token.replace(/-/g, '');
    if (CHASSIS_VISUAL_ALIASES[compact]) return CHASSIS_VISUAL_ALIASES[compact];
    const matched = concepts.find(concept => normalizeVisualToken(concept.name) === token || normalizeVisualToken(concept.name).replace(/-/g, '') === compact);
    if (matched) return matched.name;
  }
  return 'Lightsaber';
}

function safeHex(value, fallback = '#00bfff'){
  const raw = String(value || '').trim();
  if (/^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(raw)) return raw;
  return fallback;
}

function normalizeFinishKey(value){
  const key = normalizeVisualToken(value || DEFAULT_CHASSIS_FINISH_KEY);
  const compact = key.replace(/-/g, '');
  return FINISHES.find(finish => finish.id === key || normalizeVisualToken(finish.label) === key || normalizeVisualToken(finish.label).replace(/-/g, '') === compact)?.id || DEFAULT_CHASSIS_FINISH_KEY;
}

function getFinish(finishKey){
  return FINISH_BY_KEY.get(normalizeFinishKey(finishKey)) || FINISH_BY_KEY.get(DEFAULT_CHASSIS_FINISH_KEY) || FINISHES[0];
}

function suffixPartRefs(parts, finish, instanceId){
  let output = String(parts || '');
  CHASSIS_IDS.forEach(id => { output = output.split('#'+id+')').join('#'+id+'_'+finish.id+'_'+instanceId+')'); });
  return output;
}

function buildVisualDefs(finish, instanceId){
  const glowId = 'ls_blade_glow_'+instanceId;
  return `<defs>`
    + metalGrad('steel_'+finish.id+'_'+instanceId, finish.steel)
    + metalGrad('dark_'+finish.id+'_'+instanceId, finish.dark)
    + metalGrad('gun_'+finish.id+'_'+instanceId, finish.gun)
    + metalGrad('brass_'+finish.id+'_'+instanceId, finish.brass)
    + metalGrad('copper_'+finish.id+'_'+instanceId, finish.copper)
    + `<filter id="${glowId}" x="-320" y="-760" width="780" height="1800" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">`
    + `<feGaussianBlur in="SourceGraphic" stdDeviation="1.8" result="nearGlow"/>`
    + `<feGaussianBlur in="SourceGraphic" stdDeviation="6.5" result="midGlow"/>`
    + `<feGaussianBlur in="SourceGraphic" stdDeviation="15" result="farGlow"/>`
    + `<feMerge><feMergeNode in="farGlow"/><feMergeNode in="midGlow"/><feMergeNode in="nearGlow"/><feMergeNode in="SourceGraphic"/></feMerge>`
    + `</filter>`
    + `</defs>`;
}

function bladeNumber(value){
  return Number(value).toFixed(2).replace(/\.?0+$/, '');
}

function bladeEmitterFlare(x, y, width, color, angle = 0){
  const rx = bladeNumber(Math.max(width * 1.55, 5));
  const ry = bladeNumber(Math.max(width * 0.72, 2.4));
  return `<g class="ls-blade-emitter-flare" transform="translate(${bladeNumber(x)} ${bladeNumber(y)}) rotate(${bladeNumber(angle)})">`
    + `<ellipse cx="0" cy="0" rx="${rx}" ry="${ry}" fill="${color}" opacity="0.5"/>`
    + `<ellipse cx="0" cy="0" rx="${bladeNumber(Math.max(width * 0.82, 3))}" ry="${bladeNumber(Math.max(width * 0.34, 1.6))}" fill="#fff" opacity="0.72"/>`
    + `</g>`;
}

function bladeTipSpark(x, y, width, color){
  return `<g class="ls-blade-tip-spark" transform="translate(${bladeNumber(x)} ${bladeNumber(y)})">`
    + `<circle cx="0" cy="0" r="${bladeNumber(Math.max(width * 0.74, 2.8))}" fill="${color}" opacity="0.22"/>`
    + `<circle cx="0" cy="0" r="${bladeNumber(Math.max(width * 0.28, 1.25))}" fill="#fff" opacity="0.82"/>`
    + `</g>`;
}

function bladeStrokePath(d, width = 7, color = '#00bfff', { instanceId = 'chassis', className = '', emitter = null, tip = null } = {}){
  const glowId = 'ls_blade_glow_'+instanceId;
  const outer = bladeNumber(Math.max(width * 4.25, width + 13));
  const middle = bladeNumber(Math.max(width * 2.55, width + 6));
  const body = bladeNumber(Math.max(width * 1.22, width + 0.75));
  const core = bladeNumber(Math.max(width * 0.44, 1.8));
  const glint = bladeNumber(Math.max(width * 0.13, 0.72));
  const dash = `${bladeNumber(Math.max(width * 3.2, 14))} ${bladeNumber(Math.max(width * 5.2, 22))}`;
  return `<g class="ls-svg-blade ${className}" filter="url(#${glowId})">`
    + `<path class="ls-blade-aura ls-blade-aura--outer" d="${d}" fill="none" stroke="${color}" stroke-width="${outer}" stroke-linecap="round" stroke-linejoin="round" opacity="0.12"/>`
    + `<path class="ls-blade-aura ls-blade-aura--mid" d="${d}" fill="none" stroke="${color}" stroke-width="${middle}" stroke-linecap="round" stroke-linejoin="round" opacity="0.28"/>`
    + `<path class="ls-blade-body" d="${d}" fill="none" stroke="var(--blade-color)" stroke-width="${body}" stroke-linecap="round" stroke-linejoin="round" opacity="0.96"/>`
    + `<path class="ls-blade-core" d="${d}" fill="none" stroke="#fff" stroke-width="${core}" stroke-linecap="round" stroke-linejoin="round" opacity="0.93"/>`
    + `<path class="ls-blade-hotline" d="${d}" fill="none" stroke="#fff" stroke-width="${glint}" stroke-linecap="round" stroke-linejoin="round" opacity="0.55" stroke-dasharray="${dash}" stroke-dashoffset="${bladeNumber(width * 2)}"/>`
    + (emitter ? bladeEmitterFlare(emitter.x, emitter.y, width, color, emitter.angle || 0) : '')
    + (tip ? bladeTipSpark(tip.x, tip.y, width, color) : '')
    + `</g>`;
}

function verticalBlade(x, y1, y2, width = 7, color = '#00bfff', instanceId = 'chassis', className = 'ls-svg-blade--vertical'){
  const emitterY = Math.abs(y1 - VH / 2) <= Math.abs(y2 - VH / 2) ? y1 : y2;
  const tipY = emitterY === y1 ? y2 : y1;
  const d = `M ${bladeNumber(x)} ${bladeNumber(y1)} L ${bladeNumber(x)} ${bladeNumber(y2)}`;
  return bladeStrokePath(d, width, color, {
    instanceId,
    className,
    emitter: { x, y: emitterY, angle: 0 },
    tip: { x, y: tipY }
  });
}

function horizontalBlade(x1, x2, y, width = 7, color = '#00bfff', instanceId = 'chassis', className = 'ls-svg-blade--quillon'){
  const emitterX = Math.abs(x1 - cx) <= Math.abs(x2 - cx) ? x1 : x2;
  const tipX = emitterX === x1 ? x2 : x1;
  const d = `M ${bladeNumber(x1)} ${bladeNumber(y)} L ${bladeNumber(x2)} ${bladeNumber(y)}`;
  return bladeStrokePath(d, width, color, {
    instanceId,
    className,
    emitter: { x: emitterX, y, angle: 90 },
    tip: { x: tipX, y }
  });
}

function whipBlade(color = '#00bfff', instanceId = 'chassis'){
  const d = 'M 70 66 C 46 10, 108 -46, 72 -105 C 42 -154, 103 -195, 63 -238';
  return bladeStrokePath(d, 7, color, {
    instanceId,
    className: 'ls-svg-blade--whip',
    emitter: { x: 70, y: 66, angle: 0 },
    tip: { x: 63, y: -238 }
  });
}

function buildBladeLayer(conceptName, bladeColor, instanceId){
  const color = safeHex(bladeColor);
  switch (conceptName) {
    case 'Double-Bladed Lightsaber':
      return verticalBlade(70, -240, 34, 8, color, instanceId, 'ls-svg-blade--vertical ls-svg-blade--main') + verticalBlade(70, 446, 710, 8, color, instanceId, 'ls-svg-blade--vertical ls-svg-blade--rear');
    case 'Crossguard Lightsaber':
      return verticalBlade(70, -240, 40, 8, color, instanceId, 'ls-svg-blade--vertical ls-svg-blade--main') + horizontalBlade(1, 55, 83.5, 5.6, color, instanceId, 'ls-svg-blade--quillon ls-svg-blade--quillon-left') + horizontalBlade(85, 139, 83.5, 5.6, color, instanceId, 'ls-svg-blade--quillon ls-svg-blade--quillon-right');
    case 'Short Lightsaber':
    case 'Guard Shoto':
      return verticalBlade(70, -150, 50, 7, color, instanceId, 'ls-svg-blade--vertical ls-svg-blade--short');
    case 'Archaic Lightfoil':
    case 'Modern Lightfoil':
      return verticalBlade(70, -210, 72, 4.5, color, instanceId, 'ls-svg-blade--vertical ls-svg-blade--foil');
    case 'Lightwhip':
      return whipBlade(color, instanceId);
    case 'Great Lightsaber':
      return verticalBlade(70, -280, 40, 11, color, instanceId, 'ls-svg-blade--vertical ls-svg-blade--great');
    case 'Lightsaber Pike':
      return verticalBlade(70, -265, 34, 6, color, instanceId, 'ls-svg-blade--vertical ls-svg-blade--pike');
    case 'Dueling Lightsaber':
      return verticalBlade(66, -225, 44, 7, color, instanceId, 'ls-svg-blade--vertical ls-svg-blade--dueling');
    default:
      return verticalBlade(70, -235, 50, 8, color, instanceId, 'ls-svg-blade--vertical ls-svg-blade--main');
  }
}

let renderSequence = 0;
function escapeSvgText(value){
  return String(value || '').replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
}

function renderConceptSvg(conceptName, { finishKey = DEFAULT_CHASSIS_FINISH_KEY, bladeColor = '#00bfff', showBlade = true, title = '', className = '' } = {}){
  const concept = CONCEPT_BY_NAME.get(conceptName) || CONCEPT_BY_NAME.get('Lightsaber') || concepts[0];
  const finish = getFinish(finishKey);
  const accent = safeHex(finish.accent, '#e8763d');
  const blade = safeHex(bladeColor, accent);
  const instanceBase = normalizeVisualToken(`${concept.name}-${finish.id}-${className}-${title}`).slice(0, 48) || 'chassis';
  const instanceId = `${instanceBase}-${++renderSequence}`;
  const parts = suffixPartRefs(concept.parts, finish, instanceId);
  const label = escapeSvgText(title || concept.name);
  const cssClass = ['swse-lightsaber-chassis-svg', className].filter(Boolean).join(' ');
  return `<svg class="${cssClass}" viewBox="0 -255 140 965" xmlns="${NS}" role="img" aria-label="${label}" overflow="visible" style="--accent:${accent};--blade-color:${blade};">`
    + `<title>${label}</title>`
    + buildVisualDefs(finish, instanceId)
    + (showBlade ? `<g class="ls-svg-blades">${buildBladeLayer(concept.name, blade, instanceId)}</g>` : '')
    + `<g class="ls-svg-hilt">${parts}</g>`
    + `</svg>`;
}

export const LIGHTSABER_CHASSIS_FINISHES = FINISHES.map(finish => ({ ...finish }));
export const DEFAULT_LIGHTSABER_CHASSIS_FINISH_KEY = DEFAULT_CHASSIS_FINISH_KEY;
export const LIGHTSABER_CHASSIS_VISUAL_NAMES = concepts.map(concept => concept.name);
export function normalizeLightsaberChassisFinishKey(value){ return normalizeFinishKey(value); }
export function getLightsaberChassisFinish(value){ return { ...getFinish(value) }; }
export function getLightsaberChassisVisualName(chassis){ return resolveConceptName(chassis); }
export function renderLightsaberChassisSvg(chassis, options = {}){ return renderConceptSvg(resolveConceptName(chassis), options); }
export function renderLightsaberChassisSvgByName(conceptName, options = {}){ return renderConceptSvg(conceptName, options); }

