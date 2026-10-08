import {FIELD_KITS} from './field-catalog.js';
import {BLOOM_KITS} from './bloom-catalog.js';
import {FRONTIER_KITS} from './frontier-catalog.js';
import {TIDAL_KITS} from './tidal-catalog.js';
/** Version 4 authored recipes. Labels are content, not engine class names. */
export const HUMANOID_CONTENT=Object.freeze([
  {id:'duelist',label:'Duelist',note:'Humanoid · blade, buckler, and nimble gait'},
  {id:'outrider',label:'Outrider',note:'Humanoid · field pack and banner'},
  {id:'artisan',label:'Artisan',note:'Humanoid · worker with a tool grip'},
  {id:'pilgrim',label:'Pilgrim',note:'Humanoid · traveler with staff and pack'},
  {id:'grovekeeper',label:'Grovekeeper',note:'Humanoid · antlers, leaves, and bark'},
  {id:'oracle',label:'Oracle',note:'Humanoid · crystal staff and crown'},
  {id:'jackal',label:'Jackal',note:'Humanoid · muzzle, ears, and claws'},
  {id:'clockwork',label:'Clockwork',note:'Humanoid · metal shell and circuit skin'}
]);
export const CREATURE_CONTENT=Object.freeze([
  {id:'crownstag',label:'Crownstag',note:'Creature · antlered long-leg walker'},
  {id:'myconid',label:'Myconid',note:'Creature · fungal crown and leaf frills'},
  {id:'shardback',label:'Shardback',note:'Creature · armored crystal crawler'},
  {id:'billrunner',label:'Billrunner',note:'Creature · beak, short wings, and long legs'},
  {id:'boglurker',label:'Bog lurker',note:'Creature · low muzzle and reed growth'},
  {id:'sunmanta',label:'Sun manta',note:'Creature · broad wings and banded skin'},
  {id:'rootweaver',label:'Rootweaver',note:'Creature · roots, branches, and leaves'},
  {id:'ironmaw',label:'Ironmaw',note:'Creature · plated jaws and mineral skin'}
]);
/** One kit is a list of ordinary genes. It is not a hidden runtime attachment. */
export const PART_KITS=Object.freeze({
  ...TIDAL_KITS,...FRONTIER_KITS,...BLOOM_KITS,...FIELD_KITS,
  guard:{label:'Guard kit',note:'Sword, shield, and paired shoulder plates',family:'humanoid',parts:[
    {type:'blade',socket:'hand',anchor:[-.06,-1,0],size:.68,variant:0},
    {type:'shield',socket:'forearm',anchor:[1,0,.15],size:.72,variant:1},
    {type:'pauldron',socket:'upperArm',anchor:[1,.25,0],size:.67,mirror:true}]},
  traveler:{label:'Traveler kit',note:'Field pack, walking staff, and pennant',family:'humanoid',parts:[
    {type:'pack',host:'chest',anchor:[0,.06,-1],size:.82,variant:2},
    {type:'staff',socket:'hand',anchor:[-.06,1,0],size:.85,variant:0},
    {type:'banner',host:'chest',anchor:[.12,.4,-1],size:.58,variant:0}]},
  caster:{label:'Caster kit',note:'Crystal staff and paired shoulder shards',family:'humanoid',parts:[
    {type:'staff',socket:'hand',anchor:[-.06,1,0],size:.82,variant:1},
    {type:'crystal',socket:'upperArm',anchor:[1,.6,0],size:.40,variant:0,mirror:true}]},
  herald:{label:'Herald kit',note:'A standard, tower shield, and plates',family:'humanoid',parts:[
    {type:'banner',host:'chest',anchor:[0,.5,-1],size:.85,variant:2},
    {type:'shield',socket:'forearm',anchor:[1,.1,0],size:.68,variant:2},
    {type:'pauldron',socket:'upperArm',anchor:[1,.2,0],size:.66,mirror:true}]},
  wild:{label:'Wild head kit',note:'Antlers, ears, and a muzzle',family:'any',parts:[
    {type:'antler',host:'head',anchor:[.58,1,-.2],size:.7,mirror:true},
    {type:'ear',host:'head',anchor:[1,.38,0],size:.50,mirror:true},
    {type:'muzzle',host:'head',anchor:[0,-.15,1],size:.55,variant:0}]},
  mineral:{label:'Mineral kit',note:'Crystal crown and paired body shards',family:'any',parts:[
    {type:'crystal',host:'head',anchor:[0,1,-.1],size:.5,variant:1},
    {type:'crystal',host:'core',anchor:[1,.5,-.2],size:.6,variant:0,mirror:true}]},
  botanical:{label:'Botanical kit',note:'Fungal cap, leaves, and root tendrils',family:'any',parts:[
    {type:'foliage',host:'head',anchor:[0,1,0],size:.85,variant:2},
    {type:'foliage',host:'core',anchor:[1,.4,-.2],size:.62,variant:1,mirror:true},
    {type:'tentacle',host:'core',anchor:[.65,-.5,-1],size:.4,length:1.3,mirror:true}]},
  avian:{label:'Avian kit',note:'Beak, wings, and crest',family:'any',parts:[
    {type:'beak',host:'head',anchor:[0,0,1],size:.55,variant:0},
    {type:'wing',host:'chest',anchor:[1,.5,-.1],size:.8,mirror:true},
    {type:'crest',host:'head',anchor:[0,1,-.4],size:.55,variant:1}]}
});
