import {defaultTravel,travelVelocity} from '../core/travel.js';
import {clamp,shortestAngle} from '../core/math.js';
/** Real Rapier rigid bodies, compound anatomy colliders, sensor pickups and CCD.
 * Feet are animation-only. A support capsule stabilizes arbitrary anatomies. */
export class PhysicsWorld {
  constructor(RAPIER,analysis,level,solids=[],onCollect=()=>{}){
    this.R=RAPIER;this.analysis=analysis;this.level=level;this.onCollect=onCollect;this.world=new RAPIER.World({x:0,y:-18,z:0});this.world.timestep=1/60;this.world.numSolverIterations=6;this.events=new RAPIER.EventQueue(false);this.dynamic=new Map();this.sensorIds=new Map();this.playerHandles=new Set();this.collected=new Set();this.accumulator=0;this.elapsed=0;this.distance=0;this.yaw=0;this.prevYaw=0;this.jumpBuffer=0;this.coyote=0;this.jumps=0;this.droppedTime=0;
    this.travel=analysis.travel??defaultTravel();this.afloat=this.travel.medium!=='ground';this.spawnY=this.afloat?(level.spawnY??4.4):analysis.restHeight+.15;this.bank=0;this.prevBank=0;
    const w=this.world,R=RAPIER;
    w.createCollider(R.ColliderDesc.cylinder(.25,level.radius).setTranslation(0,-.25,0).setFriction(.9));
    for(const solid of solids){const desc=R.ColliderDesc.convexHull(solid.vertices);if(desc)w.createCollider(desc.setTranslation(...solid.position).setFriction(.85));}
    const r=level.ramp,q={x:Math.sin(r.angle/2),y:0,z:0,w:Math.cos(r.angle/2)};
    w.createCollider(R.ColliderDesc.cuboid(r.width,r.height,r.depth).setTranslation(r.x,r.y,r.z).setRotation(q).setFriction(.85));
    for(const b of level.balls){const rb=w.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(b.x,b.radius+.12,b.z).setCcdEnabled(true));w.createCollider(R.ColliderDesc.ball(b.radius).setDensity(1.5).setFriction(.65).setRestitution(.16),rb);this.dynamic.set(b.id,rb);}
    for(const s of level.spores){const c=w.createCollider(R.ColliderDesc.ball(.62).setTranslation(s.x,s.y,s.z).setSensor(true).setActiveEvents(R.ActiveEvents.COLLISION_EVENTS));this.sensorIds.set(c.handle,s.id);}
    this.body=w.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(0,this.spawnY,0).setGravityScale(this.afloat?0:1).lockRotations().setLinearDamping(.55).setCanSleep(false).setCcdEnabled(true));
    for(const node of analysis.nodes){
      const vertices=[];for(let i=0;i<=8;i++){const phi=i/8*Math.PI;for(let j=0;j<12;j++){const a=j/12*Math.PI*2;vertices.push(Math.sin(phi)*Math.cos(a)*node.radii[0],Math.cos(phi)*node.radii[1],Math.sin(phi)*Math.sin(a)*node.radii[2]);}}
      const hull=R.ColliderDesc.convexHull(new Float32Array(vertices));if(!hull)throw new Error('Rapier rejected a body collider.');const c=w.createCollider(hull.setTranslation(...node.center).setDensity(1.2).setFriction(.65),this.body);this.playerHandles.add(c.handle);
    }
    const radius=clamp(Math.min(...analysis.nodes[0].radii)*.48,.18,.45),halfHeight=Math.max(.01,analysis.restHeight*.5-radius);
    if(!this.afloat){const support=w.createCollider(R.ColliderDesc.capsule(halfHeight,radius).setTranslation(0,-analysis.restHeight+halfHeight+radius+.04,0).setDensity(.15).setFriction(.6),this.body);this.playerHandles.add(support.handle);}
    this.current={...this.body.translation()};this.previous={...this.current};w.step(this.events);
  }
  queueJump(){if(!this.afloat)this.jumpBuffer=.16;}
  reset(){this.body.setTranslation({x:0,y:this.spawnY+.05,z:0},true);this.body.setLinvel({x:0,y:0,z:0},true);this.body.setAngvel({x:0,y:0,z:0},true);this.body.setRotation({x:0,y:0,z:0,w:1},true);this.yaw=0;this.prevYaw=0;this.bank=0;this.prevBank=0;this.grounded=false;this.coyote=0;this.current={...this.body.translation()};this.previous={...this.current};this.accumulator=0;this.jumpBuffer=0;}
  groundHeight(x,z){const R=this.R;const ray=new R.Ray({x,y:10,z},{x:0,y:-1,z:0});const hit=this.world.castRay(ray,16,true,R.QueryFilterFlags.EXCLUDE_SENSORS,undefined,undefined,this.body);return hit?10-hit.timeOfImpact:0;}
  advance(dt,input){
    if(!Number.isFinite(dt)||dt<0)throw new Error('Frame time must be a finite, nonnegative number.');
    const accepted=Math.min(dt,.1);this.droppedTime+=Math.max(0,dt-accepted);this.accumulator+=accepted;let steps=0;
    while(this.accumulator>=1/60&&steps<6){this.accumulator-=1/60;this.step(input,1/60);steps++;}return this.accumulator/(1/60);
  }
  step(input,dt){
    const R=this.R,body=this.body,p=body.translation(),v=body.linvel();this.previous={...this.current};this.prevYaw=this.yaw;
    this.prevBank=this.bank;
    if(this.afloat){
      this.grounded=false;const target=travelVelocity(this.travel,input,p,this.level.travelBounds),gain=1-Math.exp(-dt*(this.travel.medium==='water'?5:4)),mass=body.mass();
      const actorGain=this.analysis.speed/this.travel.speed;target.x*=actorGain;target.z*=actorGain;
      body.applyImpulse({x:(target.x-v.x)*gain*mass,y:(target.y-v.y)*gain*mass,z:(target.z-v.z)*gain*mass},true);
      if(Math.hypot(target.x,target.z)>.08){const desired=Math.atan2(target.x,target.z),turn=shortestAngle(this.yaw,desired);this.bank+=(clamp(-turn*this.travel.bank,-this.travel.bank,this.travel.bank)-this.bank)*Math.min(1,dt*5);this.yaw+=turn*Math.min(1,dt*4);body.setRotation({x:0,y:Math.sin(this.yaw/2),z:0,w:Math.cos(this.yaw/2)},true);}else this.bank*=Math.exp(-dt*4);
    }else{
    const ray=new R.Ray({x:p.x,y:p.y-this.analysis.restHeight+.20,z:p.z},{x:0,y:-1,z:0});
    const hit=this.world.castRay(ray,.31,true,R.QueryFilterFlags.EXCLUDE_SENSORS,undefined,undefined,body);
    this.grounded=!!hit&&v.y<1.2;this.coyote=this.grounded?.12:Math.max(0,this.coyote-dt);this.jumpBuffer=Math.max(0,this.jumpBuffer-dt);
    if(this.jumpBuffer>0&&this.coyote>0){body.applyImpulse({x:0,y:body.mass()*(6.0-v.y),z:0},true);this.jumpBuffer=0;this.coyote=0;this.grounded=false;this.jumps++;}
    const mag=Math.hypot(input.x||0,input.z||0),speed=this.analysis.speed*(input.sprint?1.55:1);
    const dx=mag?(input.x/mag)*speed:0,dz=mag?(input.z/mag)*speed:0,accel=(this.grounded?16:6)*dt;
    body.applyImpulse({x:clamp(dx-v.x,-accel,accel)*body.mass(),y:0,z:clamp(dz-v.z,-accel,accel)*body.mass()},true);
    if(mag>.01){const desired=Math.atan2(dx,dz);this.yaw+=shortestAngle(this.yaw,desired)*Math.min(1,dt*10);body.setRotation({x:0,y:Math.sin(this.yaw/2),z:0,w:Math.cos(this.yaw/2)},true);}
    }
    this.world.step(this.events);this.elapsed+=dt;this.current={...body.translation()};this.distance+=Math.hypot(this.current.x-this.previous.x,this.current.z-this.previous.z,this.afloat?this.current.y-this.previous.y:0);
    this.events.drainCollisionEvents((a,b,started)=>{if(!started)return;const sensor=this.playerHandles.has(a)?b:this.playerHandles.has(b)?a:null;const id=this.sensorIds.get(sensor);if(id&&!this.collected.has(id)){this.collected.add(id);this.world.getCollider(sensor)?.setEnabled(false);this.onCollect(id,this.collected.size);}});
    if(this.current.y<-8||Math.abs(this.current.x)>50||Math.abs(this.current.z)>50)this.reset();
  }
  sample(alpha){alpha=clamp(alpha,0,1);const a=this.previous,b=this.current;return {position:[a.x+(b.x-a.x)*alpha,a.y+(b.y-a.y)*alpha,a.z+(b.z-a.z)*alpha],yaw:this.prevYaw+shortestAngle(this.prevYaw,this.yaw)*alpha,bank:this.prevBank+(this.bank-this.prevBank)*alpha,medium:this.travel.medium,speed:Math.hypot(this.body.linvel().x,this.body.linvel().z)};}
  dispose(){this.events.free();this.world.free();this.dynamic.clear();this.sensorIds.clear();this.playerHandles.clear();}
}
