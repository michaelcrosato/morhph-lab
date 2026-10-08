/** Data-only content pack. Dimensions use metres; each factory grows along local +Y. */
export const EXPANSION_PARTS=Object.freeze({
  ear:{label:'Expressive ear',category:'Senses',description:'An upright, pointed, or folded ear with a twitch cycle.',anchor:[1,.45,.2],size:.7,length:1,mirror:true,variants:['Upright','Pointed','Folded']},
  antler:{label:'Branch antler',category:'Ornament',description:'Branching antlers with stag, palm, and coral forms.',anchor:[.6,1,-.2],size:.8,length:1,mirror:true,variants:['Stag','Palm','Coral']},
  beak:{label:'Hinged beak',category:'Expression',description:'Two procedural jaw shells with a controlled opening.',anchor:[0,0,1],size:.7,length:1,mirror:false,variants:['Hook','Bill','Spear']},
  muzzle:{label:'Muzzle',category:'Expression',description:'A canine, broad, or tusked muzzle with a nose and moving jaw.',anchor:[0,-.1,1],size:.7,length:1,mirror:false,variants:['Canine','Broad','Tusked']},
  crystal:{label:'Crystal cluster',category:'Ornament',description:'Faceted shards in a cluster, crown, or spire.',anchor:[0,1,-.2],size:.8,length:1,mirror:false,variants:['Cluster','Crown','Spire']},
  foliage:{label:'Leaf cluster',category:'Membrane',description:'Generated leaves with fern, broadleaf, and fungal forms.',anchor:[1,.4,-.2],size:.8,length:1,mirror:true,variants:['Fern','Broadleaf','Mushroom']},
  blade:{label:'Hand blade',category:'Equipment',description:'A short sword, curved saber, or broad cleaver. Visual equipment only.',socket:'hand',anchor:[-.06,-1,0],size:.65,length:1,mirror:false,variants:['Sword','Saber','Cleaver']},
  shield:{label:'Arm shield',category:'Equipment',description:'A round, kite, or tower shield with raised fittings.',socket:'forearm',anchor:[1,0,0],size:.7,length:1,mirror:false,variants:['Round','Kite','Tower']},
  staff:{label:'Channel staff',category:'Equipment',description:'A walking staff, crystal staff, or forked ritual staff.',socket:'hand',anchor:[-.06,1,0],size:.8,length:1,mirror:false,variants:['Walking','Crystal','Forked']},
  pack:{label:'Back pack',category:'Equipment',description:'A satchel, field pack, or framed expedition pack.',anchor:[0,0,-1],size:.65,length:1,mirror:false,variants:['Satchel','Field','Expedition']},
  pauldron:{label:'Shoulder plate',category:'Armor',description:'Layered shoulder armor with smooth, spiked, or scale forms.',socket:'upperArm',anchor:[1,.3,0],size:.65,length:1,mirror:true,variants:['Plate','Spiked','Scale']},
  banner:{label:'Cloth banner',category:'Equipment',description:'A hanging pennant, forked banner, or wide standard. Procedural cloth motion.',anchor:[0,1,-.2],size:.7,length:1,mirror:false,variants:['Pennant','Forked','Standard']}
});
export const PART_MATERIALS=Object.freeze(['inherit','skin','armor','bone','cloth','metal','glow']);
