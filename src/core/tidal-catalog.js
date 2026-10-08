/** Tide & Sky content. These are geometry contracts, not imported assets. */
const part=(label,category,description,variants,anchor,mirror=false)=>({label,category,description,variants,anchor,size:1,length:1,mirror});
export const TIDAL_PARTS=Object.freeze({
  caudal:part('Propulsion tail','Aquatic','A fork, crescent, or rounded tail. Twist changes a vertical tail to horizontal flukes.',['Fork','Crescent','Round'],[0,0,-1]),
  paddle:part('Webbed paddle','Aquatic','A thick webbed paddle with a powered stroke and a folded return.',['Flipper','Webbed','Lobed'],[1,-.1,0],true),
  bell:part('Pulsing bell','Aquatic','A hollow bell with radial ribs and a contracting rim.',['Dome','Crown','Lantern'],[0,1,0]),
  coil:part('Coiled shell','Aquatic','A logarithmic shell with a visible opening and growth ribs.',['Nautilus','Ammonite','Tower'],[0,1,-.2]),
  ribbon:part('Ribbon fin','Aquatic','A continuous ribbon with a travelling edge wave.',['Long','Forked','Comb'],[0,1,-.2]),
  rayfoil:part('Ray foil','Aquatic','A broad continuous foil. Its trailing edge carries a spanwise wave.',['Manta','Skate','Leaf'],[1,0,0],true),
  featherwing:part('Feather wing','Aerial','An overlapping fan of flight feathers with flexible tips.',['Soarer','Raptor','Rounded'],[1,.2,0],true),
  insectwing:part('Veined wing','Aerial','A narrow vein wing, broad moth wing, or lace wing.',['Dragonfly','Moth','Lace'],[1,.2,0],true),
  tailfan:part('Steering fan','Aerial','A steering fan with separate feathers or long streamers.',['Fork','Fan','Streamers'],[0,0,-1]),
  rotor:part('Seed rotor','Aerial','A rotating seed crown. This is a fantasy plant, not an aerodynamic solver.',['Three blades','Two blades','Whorl'],[0,1,0]),
  elytra:part('Split wing case','Armor','A paired case that opens above the flight wings.',['Beetle','Ribbed','Faceted'],[0,1,-.1]),
  floatsac:part('Float sac','Aerial','A ribbed gas-sac form with three distinct envelopes.',['Long','Round','Cluster'],[0,1,0]),
  optic:part('Flush eye','Senses','A low-profile eye with a lens, pupil, highlight, and blink.',['Round','Slit','Compound'],[1,.2,.5],true),
  siphon:part('Feeding port','Expression','A funnel, tapered snout, or broad filtering port.',['Funnel','Snout','Filter'],[0,0,1]),
  oralarm:part('Arm crown','Aquatic','Six, eight, or ten flexible oral arms around one mount.',['Threads','Arms','Fringe'],[0,-1,0])
});
export const TIDAL_MODELS=Object.freeze([
  {id:'needleswimmer',label:'Needle swimmer',medium:'water',note:'Water · narrow body, forked tail, paired fins'},
  {id:'ribbondrift',label:'Ribbon eel',medium:'water',note:'Water · long continuous body wave'},
  {id:'moonbell',label:'Moon bell',medium:'water',note:'Water · pulsing hollow bell and hanging arms'},
  {id:'coilnautilus',label:'Coil nautiloid',medium:'water',note:'Water · coiled shell, siphon, and arm crown'},
  {id:'diskfin',label:'Diskfin',medium:'water',note:'Water · tall disk body and fanlike fins'},
  {id:'abyssangler',label:'Abyss angler',medium:'water',note:'Water · broad head, feeding port, and light lure'},
  {id:'rayskimmer',label:'Ray skimmer',medium:'water',note:'Water · flat diamond outline and foil waves'},
  {id:'paddleback',label:'Paddleback',medium:'water',note:'Water · low armored body and four paddles'},
  {id:'sailwing',label:'Sailwing',medium:'air',note:'Air · long feather wings and steering fan'},
  {id:'glassdart',label:'Glass dart',medium:'air',note:'Air · four narrow vein wings and a segmented abdomen'},
  {id:'velvetmoth',label:'Velvet moth',medium:'air',note:'Air · four broad wings with eye markings'},
  {id:'skymedusa',label:'Sky medusa',medium:'air',note:'Air · buoyant envelope, vanes, and thin streamers'},
  {id:'cavekite',label:'Cave kite',medium:'air',note:'Air · compact flier with broad webbed wings'},
  {id:'gyreseed',label:'Gyre seed',medium:'air',note:'Air · rotary seed crown and suspended root fringe'},
  {id:'windribbon',label:'Wind ribbon',medium:'air',note:'Air · long body with vertical wave and four small wings'},
  {id:'lanternbeetle',label:'Lantern beetle',medium:'air',note:'Air · split wing case and rapid hind-wing strokes'}
]);
export const TIDAL_KITS=Object.freeze({
  pelagic:{label:'Pelagic kit',note:'Propulsion tail, paddles, and flush eyes',family:'any',parts:[{type:'caudal',host:'core',anchor:[0,0,-1],size:.8,length:1.2},{type:'paddle',host:'core',anchor:[1,0,0],size:.6,mirror:true},{type:'optic',host:'head',anchor:[1,.15,.6],size:.6,mirror:true}]},
  medusa:{label:'Medusa kit',note:'Hollow bell and hanging arm crown',family:'any',parts:[{type:'bell',host:'core',anchor:[0,1,0],size:1.2},{type:'oralarm',host:'core',anchor:[0,-1,0],size:.8,length:1.5}]},
  ray:{label:'Ray kit',note:'Paired foils and a steering tail',family:'any',parts:[{type:'rayfoil',host:'core',anchor:[1,0,0],size:1.1,mirror:true},{type:'caudal',host:'core',anchor:[0,0,-1],size:.5,length:1.6,variant:2}]},
  feathered:{label:'Feather flight kit',note:'Long feather wings and a steering fan',family:'any',parts:[{type:'featherwing',host:'chest',anchor:[1,.2,0],size:1.1,mirror:true},{type:'tailfan',host:'core',anchor:[0,0,-1],size:.8}]},
  fourwing:{label:'Four-wing kit',note:'Two independently phased pairs of veined wings',family:'any',parts:[{type:'insectwing',host:'chest',anchor:[1,.2,.35],size:1,mirror:true},{type:'insectwing',host:'core',anchor:[1,.1,-.5],size:.8,mirror:true,phase:.5}]},
  aerostat:{label:'Aerostat kit',note:'A float sac with stabilizing vanes',family:'any',parts:[{type:'floatsac',host:'core',anchor:[0,1,0],size:1.2},{type:'ribbon',host:'core',anchor:[1,0,-.4],size:.5,mirror:true}]}
});
