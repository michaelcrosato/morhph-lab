/** Strange Forms pack. Metadata has no renderer dependency. */
const part=(label,category,description,variants,anchor,mirror=false)=>({label,category,description,variants,anchor,size:1,length:1,mirror});
export const FRONTIER_PARTS=Object.freeze({
  combrail:part('Ciliary rail','Aquatic','A curved rail with hinged comb plates. A travelling phase drives each plate.',['Short combs','Wide combs','Split combs'],[1,0,0],true),
  pumpbarrel:part('Pump barrel','Aquatic','A hollow tube with end rings and a contracting wall.',['Barrel','Nozzle','Cross barrel'],[0,0,-1]),
  radialweb:part('Radial web','Aquatic','Five, six, or eight arms support a continuous star-shaped web.',['Five arms','Six arms','Eight arms'],[0,-1,0]),
  mantleskirt:part('Mantle skirt','Aquatic','A broad low skirt with a folded margin and a travelling edge wave.',['Frilled','Scalloped','Split lobes'],[0,1,0]),
  swimmeret:part('Swimmeret rail','Aquatic','A rail with staggered rigid paddles and a folded return stroke.',['Six oars','Eight oars','Ten oars'],[1,-.3,0],true),
  branchfan:part('Branching crown','Aquatic','Branching soft plumes with independent sway.',['Three plumes','Five plumes','Seven plumes'],[0,1,0]),
  ringwing:part('Annular wing','Aerial','A closed ring wing with curved airfoil sections and radial supports.',['Circle','Oval','Twin ring'],[0,1,0]),
  pappus:part('Bristle canopy','Aerial','Fine radial bristles open and close above a suspended body.',['Umbrella','Double crown','Bowl'],[0,1,0]),
  sailcell:part('Kite cell','Aerial','Open triangular or diamond sails on a three-dimensional frame.',['Three sails','Four sails','Diamond cell'],[0,1,0]),
  helixvane:part('Helical vane','Aerial','A continuous twisted ribbon around an open shaft.',['Single ribbon','Double ribbon','Triple ribbon'],[0,1,0]),
  ductfan:part('Ducted fan','Aerial','An open circular duct contains separately rotating blades.',['Three blades','Five blades','Contra rotor'],[1,.1,0],true),
  foldwing:part('Accordion wing','Aerial','A ribbed fan with separate hinged pleats.',['Five pleats','Seven pleats','Nine pleats'],[1,.15,0],true)
});
export const FRONTIER_MODELS=Object.freeze([
  {id:'comblantern',label:'Comb lantern',medium:'water',collection:'frontier',note:'Water · eight ciliary rails around a short oval body'},
  {id:'salpchain',label:'Linked salp',medium:'water',collection:'frontier',note:'Water · five linked pump barrels with a delayed pulse'},
  {id:'starweaver',label:'Star weaver',medium:'water',collection:'frontier',note:'Water · five-arm radial web; no left/right wing pair'},
  {id:'velvetslug',label:'Velvet slug',medium:'water',collection:'frontier',note:'Water · low body, broad frilled mantle, branching plumes'},
  {id:'oarshrimp',label:'Oar shrimp',medium:'water',collection:'frontier',note:'Water · long body and two rails of staggered paddles'},
  {id:'twinjet',label:'Twin jet',medium:'water',collection:'frontier',note:'Water · two lateral pump tubes and a small central pilot body'},
  {id:'hoopglider',label:'Hoop glider',medium:'air',collection:'frontier',note:'Air · continuous oval ring wing and suspended keel'},
  {id:'sievewisp',label:'Sieve wisp',medium:'air',collection:'frontier',note:'Air · opening bristle canopy above a hanging seed'},
  {id:'prismkite',label:'Prism kite',medium:'air',collection:'frontier',note:'Air · upright diamond sail cell with open framed bays'},
  {id:'screwdrifter',label:'Screw drifter',medium:'air',collection:'frontier',note:'Air · continuous helical ribbons, not separate rotor leaves'},
  {id:'ductmanta',label:'Duct skiff',medium:'air',collection:'frontier',note:'Air · paired open ducts with counter-rotating blades'},
  {id:'pleatdrake',label:'Pleat drake',medium:'air',collection:'frontier',note:'Air · three pairs of folding accordion fans'}
]);
export const FRONTIER_KITS=Object.freeze({
  ciliary:{label:'Ciliary kit',note:'Mirrored comb rails and branching crown',family:'any',parts:[{type:'combrail',host:'core',anchor:[1,.1,0],size:.65,mirror:true},{type:'branchfan',host:'head',anchor:[0,1,0],size:.45,length:.8}]},
  linkedpump:{label:'Twin pump kit',note:'Two phase-offset pump tubes',family:'any',parts:[{type:'pumpbarrel',host:'core',anchor:[1,0,-.1],size:.65,mirror:true,twist:Math.PI/2}]},
  radial:{label:'Radial kit',note:'Radial web with a central feeding port',family:'any',parts:[{type:'radialweb',host:'core',anchor:[0,-1,0],size:1.1},{type:'siphon',host:'core',anchor:[0,-1,0],size:.6}]},
  canopy:{label:'Canopy kit',note:'Opening bristle canopy and trailing plume',family:'any',parts:[{type:'pappus',host:'core',anchor:[0,1,0],size:1.2},{type:'branchfan',host:'core',anchor:[0,-1,0],size:.4,length:1.2}]},
  annular:{label:'Annular kit',note:'Closed ring wing and steering fan',family:'any',parts:[{type:'ringwing',host:'core',anchor:[0,1,0],size:1.15,variant:1},{type:'tailfan',host:'core',anchor:[0,0,-1],size:.45,twist:Math.PI/2}]},
  ducted:{label:'Duct kit',note:'Twin contra-rotors and tail vanes',family:'any',parts:[{type:'ductfan',host:'core',anchor:[1,.1,0],size:.8,variant:2,mirror:true},{type:'ribbon',host:'core',anchor:[0,0,-1],size:.35,length:.7}]}
});
