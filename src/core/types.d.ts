/** Schema 6 contracts, application version 8. Runtime validation is authoritative.
 * Version 1, 2, 3, 4, and 5 blueprints are upgraded. These declarations do not type-check JS. */
export type Vec3 = [number, number, number];
export type PartType = 'leg'|'eye'|'horn'|'tail'|'fin'|'mouth'|'wing'|'tentacle'|'antenna'|'shell'|'mandible'|'crest'|'clubtail'|'frill'|'claw'|'gill'|'ear'|'antler'|'beak'|'muzzle'|'crystal'|'foliage'|'blade'|'shield'|'staff'|'pack'|'pauldron'|'banner'|'caudal'|'paddle'|'bell'|'coil'|'ribbon'|'rayfoil'|'featherwing'|'insectwing'|'tailfan'|'rotor'|'elytra'|'floatsac'|'optic'|'siphon'|'oralarm'|'combrail'|'pumpbarrel'|'radialweb'|'mantleskirt'|'swimmeret'|'branchfan'|'ringwing'|'pappus'|'sailcell'|'helixvane'|'ductfan'|'foldwing'|'legbank'|'plateband'|'petalcrown'|'valvepair'|'tubecluster'|'irismouth'|'latticecage'|'whiskerfan'|'trunk'|'faceplate';
export type Pattern = 'plain'|'spots'|'stripes'|'scales'|'cells'|'marble'|'rings'|'speckle'|'chevron'|'cracks'|'rosettes'|'mottled'|'veins'|'weave'|'lattice'|'woodgrain'|'circuit'|'patches'|'cycloid'|'chromatophore'|'featherbarbs'|'eyespots'|'lightrows'|'shellgrowth'|'wingveins'|'currentbands'|'combtracks'|'polypcells'|'fanrays'|'dendrite'|'foldbands'|'holofoil'|'tessera'|'saltfleck'|'scuteedges'|'petalveins'|'pollen'|'saddle'|'stitchgrid'|'oxidation'|'maze'|'growthbands';
export type MicroSurface = 'pores'|'scales'|'ridges'|'pebbles'|'weave'|'brushed'|'bark'|'pitted'|'hex'|'leather'|'denticles'|'feather'|'down'|'lamellae'|'growthrings'|'wingmesh'|'cilia'|'pleats'|'meshknit'|'chalk'|'tesserae'|'capillary'|'scutes'|'petalgrain'|'suction'|'ribcloth'|'gravel'|'hammered';
export type MotionClip = 'idle'|'walk'|'run'|'creep'|'bound'|'swim'|'hover'|'display'|'backpedal'|'strafe'|'prowl'|'trot'|'cruise'|'undulate'|'jet'|'row'|'soar'|'powerflight'|'flutter'|'float'|'combbeat'|'chainpump'|'radialstroke'|'metachronal'|'canopy'|'corkscrew'|'turbines'|'concertina'|'ripplewalk'|'shellclap'|'bloomcycle'|'siphonreach'|'padcrawl'|'sensorscan';
export type MotionLayer = 'breath'|'blink'|'gaze'|'tail'|'flex'|'jaw';
export type MixChannel = 'body'|'parts'|'pigment'|'surface'|'motion';
export type Socket = 'body'|'head'|'chest'|'pelvis'|'upperArm'|'forearm'|'hand'|'upperLeg'|'shin'|'foot';
export type HumanoidAction = 'none'|'wave'|'point'|'talk'|'guard'|'attack'|'cast'|'hit'|'jump'|'sit'|'defeat'|'celebrate'|'bow'|'kneel'|'pray'|'inspect'|'interact'|'carry'|'push'|'work'|'thrust'|'kick'|'dodge'|'roar'|'salute'|'beckon'|'shiver'|'stretch'|'overhead'|'sweep';
export type PartMaterial = 'inherit'|'skin'|'armor'|'bone'|'cloth'|'metal'|'glow';
export type ActorRole = 'civilian'|'guard'|'scout'|'skirmisher'|'brute'|'stalker'|'sentinel'|'caster'|'monster';
export interface Proportions {scale:number;torso:number;shoulders:number;hips:number;arms:number;legs:number;head:number;bulk:number;hands:number;feet:number;posture:number;}
export type Rig = {family:'creature'} | {family:'humanoid';proportions:Proportions;outfit:'tunic'|'armor'|'wrap'|'carapace';headStyle:'crest'|'crop'|'hood'|'bare';handStyle:'fingers'|'claws'|'stone';bodyStyle:'classic'|'defined'};
export interface ActorProfile {role:ActorRole;faction:'friendly'|'neutral'|'hostile';behavior:'stationary'|'wander'|'patrol'|'chase'|'keep-distance';health:number;speed:number;sight:number;range:number;damage:number;cooldown:number;}
export interface BodyNode {id:string;parent:string|null;offset:Vec3;radii:Vec3;}
export interface PartGene {material:PartMaterial;id:string;type:PartType;host:string;anchor:Vec3;size:number;length:number;twist:number;mirror:boolean;flex:number;phase:number;bend:number;variant:0|1|2;presence:number;socket:Socket;socketOffset:Vec3;}
export interface PigmentLayer {pattern:Pattern;scale:number;weight:number;angle:number;warp:number;}
export interface Appearance {
  color:string;accent:string;pattern:Pattern;patternScale:number;weight:number;angle:number;warp:number;
  /** At most three extra layers plus the primary layer. */
  layers:PigmentLayer[];strength:number;roughness:number;metalness:number;relief:number;emission:number;micro:MicroSurface;textureSeed:number;
}
export interface HumanoidMotion {style:'neutral'|'heavy'|'skulking'|'stiff'|'proud'|'nimble'|'limping';armSwing:number;lookYaw:number;lookPitch:number;action:HumanoidAction;actionWeight:number;actionSpeed:number;repeat:boolean;mask:'auto'|'upper'|'full';}
export interface TravelRecipe {medium:"ground"|"water"|"air";speed:number;climb:number;bank:number;}
export interface BodyWave {kind:"rigid"|"lateral"|"vertical"|"pulse";amplitude:number;frequency:number;wavelength:number;}
export interface MotionRecipe {travel:TravelRecipe;bodyWave:BodyWave;weights:Record<MotionClip,number>;layers:Record<MotionLayer,number>;tempo:number;stride:number;lift:number;phaseLag:number;humanoid:HumanoidMotion;}
export interface MotionPose {stepBank:number;valve:number;bloom:number;reach:number;pad:number;sense:number;comb:number;pump:number;spread:number;spin:number;fold:number;scull:number;wingRate:number;wingOpen:number;pulse:number;paddle:number;lateral:number;rate:number;stride:number;lift:number;stance:number;bob:number;sway:number;pitch:number;flap:number;tail:number;jaw:number;tuck:number;phaseLag:number;layers:Record<MotionLayer,number>;}
export interface Genome {version:6;name:string;seed:number;generation:number;nodes:BodyNode[];parts:PartGene[];appearance:Appearance;motion:MotionRecipe;rig:Rig;actor:ActorProfile;}
export interface MixSettings {channels:Record<MixChannel,number>;locks:Record<MixChannel,boolean>;topology:'auto'|'a'|'b';mutation:number;seed:number;}
export interface MixRecipe {format:'morph-lab-mixer';version:1;sources:{a:Genome;b:Genome};settings:MixSettings;frozen:Genome;}
export interface MixResult {genome:Genome;notes:string[];stats:{bodyNodes:number;genes:number;patternLayers:number;signature:string};}
export interface ResolvedNode extends BodyNode {center:Vec3;}
export interface ExpandedPart extends PartGene {position:Vec3;normal:Vec3;side:number;mirrorSide:number;pair:number;indexKey:string;}
export interface AnatomyAnalysis {visualSupportPoints?:number;travel:TravelRecipe;nodes:ResolvedNode[];parts:ExpandedPart[];legs:number;restHeight:number;speed:number;volume:number;partCount:number;warnings:string[];}
export interface SurfaceBuffers {positions:Float32Array;normals:Float32Array;uvs:Float32Array;indices:Uint32Array;voxelStep:number;cells:number;}
export interface MovementInput {y?:number;x:number;z:number;sprint?:boolean;}
export interface PhysicsPose {medium:TravelRecipe["medium"];bank:number;position:Vec3;yaw:number;speed:number;}
export interface AnimationMarker {name:string;time:number;action:HumanoidAction;cycle:number;}
export interface HumanoidPose {rotations:Record<string,Vec3>;pelvisOffset:Vec3;weight:number;mask:'upper'|'full';phase:number;finished:boolean;handCurl:number;jaw:number;}
export interface CompatibilityReport {family:Rig['family'];locomotion:MotionClip[];inactiveGenes:string[];notes:string[];capabilities:{proceduralRig:boolean;handSockets:boolean;upperBodyActions:boolean;footIK:boolean;ragdoll:false;rootMotion:false;combat:false;navigation:false;};}
export interface ActorManifest {format:'morph-lab-actor';version:1;blueprint:Genome;contract:{units:'metres';up:'+Y';forward:'+Z';rig:Rig['family'];controller:'dynamic-compound-upright';travel:TravelRecipe;bodyWave:BodyWave;restHeight:number|null;sockets:Socket[];actions:Record<string,{duration:number;mask:'upper'|'full';events:{at:number;name:string}[]}>;compatibility:CompatibilityReport;roleIsMetadata:true;geometry:'generated-at-runtime';animations:'procedural-at-runtime';};}
export interface ActorRoster {format:'morph-lab-roster';version:1;seed:number;variation:number;actors:(ActorManifest&{id:string})[];}

export type PartKitId = 'guard'|'traveler'|'caster'|'herald'|'wild'|'mineral'|'botanical'|'avian'|'pelagic'|'medusa'|'ray'|'feathered'|'fourwing'|'aerostat'|'ciliary'|'linkedpump'|'annular'|'radial'|'canopy'|'ducted'|'segmented'|'blossom'|'bivalve'|'sensory'|'basket'|'masked';
export interface PartKitResult {genome:Genome;added:string[];}

/** Added copies are ordinary, independent genes. Count includes the source. */
export interface PartArraySettings {layout:'ring'|'fan'|'row';axis:'x'|'y'|'z';count:number;span:number;spacing:number;phaseStep:number;}
export interface PartArrayResult {genome:Genome;added:string[];settings:PartArraySettings;}
