/** Carapace & Bloom content. Metadata does not depend on an engine. */
const part=(label,category,description,variants,anchor,mirror=false)=>({label,category,description,variants,anchor,size:1,length:1,mirror});
export const BLOOM_PARTS=Object.freeze({
  legbank:part('Jointed leg bank','Locomotion','Three to five two-link legs. Each leg has its own step phase. Visual IK only.',['Three legs','Four legs','Five legs'],[1,-.6,0],true),
  plateband:part('Overlapping plate band','Armor','A line of broad, curved plates with separate hinges.',['Five plates','Seven plates','Nine plates'],[0,1,0]),
  petalcrown:part('Petal crown','Botanical','Separate broad petals curl from a central cup.',['Five petals','Seven petals','Nine petals'],[0,1,0]),
  valvepair:part('Hinged valves','Aquatic','Two ribbed shells open around a basal hinge.',['Scallop','Round valves','Pointed valves'],[0,0,1]),
  tubecluster:part('Tube foot cluster','Appendage','A radial cluster of soft stems ends in suction cups.',['Seven cups','Eleven cups','Fifteen cups'],[0,-1,0]),
  irismouth:part('Iris mouth','Senses','An open ring with overlapping blades that change the aperture.',['Six blades','Eight blades','Ten blades'],[0,0,1]),
  latticecage:part('Lattice cage','Armor','An open basket of crossing ribs surrounds an inner core.',['Oval cage','Bell cage','Diamond cage'],[0,1,0]),
  whiskerfan:part('Whisker array','Senses','Long curved whiskers sweep at different phases.',['Seven whiskers','Eleven whiskers','Fifteen whiskers'],[1,.15,.6],true),
  trunk:part('Sectioned trunk','Appendage','A thick curved trunk with collar rings and an end port.',['Tapered','Broad muzzle','Split tip'],[0,0,1]),
  faceplate:{...part('Face plate','Equipment','A raised mask with protected dark eye openings.',['Beaked mask','Slit visor','Leaf mask'],[0,0,1]),socket:'head'}
});
export const BLOOM_MODELS=Object.freeze([
  {id:'pebbleroller',label:'Pebble crawler',medium:'ground',collection:'bloom',note:'Ground · low plate armor and two banks of jointed legs'},
  {id:'mossstrider',label:'Moss strider',medium:'ground',collection:'bloom',note:'Ground · long front body, tall legs, and sweeping whiskers'},
  {id:'crowngrazer',label:'Crown grazer',medium:'ground',collection:'bloom',note:'Ground · upright flower crown on a six-leg body'},
  {id:'duneauger',label:'Dune auger',medium:'ground',collection:'bloom',note:'Ground · segmented body, tube feet, and a working iris'},
  {id:'clapshell',label:'Clap shell',medium:'water',collection:'bloom',note:'Water · paired opening valves around a small soft body'},
  {id:'lanternpolyp',label:'Lantern polyp',medium:'water',collection:'bloom',note:'Water · open rib cage, cup cluster, and petal ring'},
  {id:'bristleskate',label:'Bristle skate',medium:'water',collection:'bloom',note:'Water · wide flat body with paired sensory whisker fans'},
  {id:'suckerribbon',label:'Sucker ribbon',medium:'water',collection:'bloom',note:'Water · long soft body with rows of pulsing cup stems'},
  {id:'bloomkite',label:'Bloom kite',medium:'air',collection:'bloom',note:'Air · two tiers of independent curling petals'},
  {id:'basketdrifter',label:'Basket drifter',medium:'air',collection:'bloom',note:'Air · a suspended body inside an open diamond cage'},
  {id:'apiarist',label:'Apiarist',family:'humanoid',medium:'ground',collection:'bloom',note:'Humanoid · masked worker with a cup tool and pollen colors'},
  {id:'shrinesentinel',label:'Shrine sentinel',family:'humanoid',medium:'ground',collection:'bloom',note:'Humanoid · broad visor, cage shoulders, and plated armor'},
  {id:'marshforager',label:'Marsh forager',family:'humanoid',medium:'ground',collection:'bloom',note:'Humanoid · long-limbed scout with a curved trunk and feelers'},
  {id:'thornenvoy',label:'Thorn envoy',family:'humanoid',medium:'ground',collection:'bloom',note:'Humanoid · a leaf mask, petal crown, and flowering shoulders'}
]);
export const BLOOM_KITS=Object.freeze({
  segmented:{label:'Segmented kit',note:'Jointed legs and overlapping plates',family:'any',parts:[{type:'legbank',host:'core',anchor:[1,-.6,0],size:.65,mirror:true},{type:'plateband',host:'core',anchor:[0,1,0],size:.9}]},
  blossom:{label:'Blossom kit',note:'Petal crown with a cup at its base',family:'any',parts:[{type:'petalcrown',host:'head',anchor:[0,1,0],size:.7},{type:'irismouth',host:'head',anchor:[0,.3,1],size:.4,variant:1}]},
  bivalve:{label:'Bivalve kit',note:'Paired valves and a small tube-foot cluster',family:'any',parts:[{type:'valvepair',host:'core',anchor:[0,0,1],size:1.1},{type:'tubecluster',host:'core',anchor:[0,-1,0],size:.5}]},
  sensory:{label:'Sensory kit',note:'Whiskers and a flexible trunk',family:'any',parts:[{type:'whiskerfan',host:'head',anchor:[1,.2,.7],size:.55,mirror:true},{type:'trunk',host:'head',anchor:[0,-.1,1],size:.5}]},
  basket:{label:'Basket kit',note:'Open cage and an opening flower base',family:'any',parts:[{type:'latticecage',host:'core',anchor:[0,1,0],size:1.05,variant:2},{type:'petalcrown',host:'core',anchor:[0,-1,0],size:.65,variant:1}]},
  masked:{label:'Masked guard kit',note:'A visor and two plated upper arms',family:'humanoid',parts:[{type:'faceplate',host:'head',socket:'head',anchor:[0,0,1],size:.44,variant:1},{type:'plateband',host:'chest',socket:'upperArm',anchor:[1,.2,0],size:.4,length:.65,mirror:true,material:'armor'}]}
});
