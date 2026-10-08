import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {FrameClock} from '../src/core/frame-clock.js';
import {PhysicsWorld} from '../src/physics/world.js';

test('The first callback primes the clock without advancing physics',()=>{
  const c=new FrameClock();assert.equal(c.tick(1042),0);assert.equal(c.tick(1058),.016);
});
test('Habitat transitions cannot subtract a later wall-clock sample',()=>{
  const c=new FrameClock();c.tick(100);c.tick(116);c.reset();assert.equal(c.tick(115),0);assert.equal(c.tick(131),.016);
});
test('Repeated and backward callback times cannot make a negative step',()=>{
  const c=new FrameClock();for(const t of [100,90,90,80])assert.equal(c.tick(t),0);assert.equal(c.tick(96),.016);
});
for(const value of [undefined,null,NaN,Infinity,-Infinity,-1,'100'])test('Invalid timestamp resets the clock: '+String(value),()=>{
  const c=new FrameClock();c.tick(50);assert.equal(c.tick(value),0);assert.equal(c.tick(500),0);assert.equal(c.tick(510),.01);
});
test('A suspended tab has no accumulated catch-up step',()=>{
  const c=new FrameClock();c.tick(1);assert.equal(c.tick(100000,true),0);assert.equal(c.tick(200000),0);assert.equal(c.tick(200020),.02);
});
test('Large time gaps are bounded',()=>{const c=new FrameClock();c.tick(0);assert.equal(c.tick(30000),.1);assert.equal(c.tick(30016),.016);});
test('A custom time-step ceiling is enforced',()=>{const c=new FrameClock(.05);c.tick(0);assert.equal(c.tick(999),.05);});
test('Clock limits are validated',()=>{for(const x of [0,-1,NaN,Infinity])assert.throws(()=>new FrameClock(x));});
test('Physics still rejects invalid caller time; the guard was not removed',()=>{
  for(const dt of [-.001,NaN,Infinity])assert.throws(()=>PhysicsWorld.prototype.advance.call({},dt,{}),/finite, nonnegative/);
});
test('The actual Workshop uses the clock on start, transition, and visibility change',()=>{
  const s=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
  assert.match(s,/frameClock.tick\(now,document.hidden\)/);assert.ok(s.match(/frameClock.reset\(\)/g).length>=4);
  assert.doesNotMatch(s,/lastTime|now-lastBuild/);
});
