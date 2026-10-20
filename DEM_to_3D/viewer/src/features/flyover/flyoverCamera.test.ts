import {describe,expect,it} from 'vitest';
import {createFlyoverBearing} from './flyoverCamera';
import {createPathSampler,planFlyover} from './flyoverPlan';

describe('tracking camera',()=>{
  const path=createPathSampler(Array.from({length:121},(_,i)=>({x:Math.sin(i/12)*1300,y:100,z:i*220})),10,700);
  const plan=planFlyover(path.length,[14000,18000,22000]);
  const bearing=createFlyoverBearing(path,plan);
  const angle=(t:number)=>{const h=bearing(t);return Math.atan2(h.x,h.z);};
  const delta=(a:number,b:number)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
  it('follows the route with bounded yaw speed and acceleration, including arrivals',()=>{
    let previousSpeed=0;
    for(let i=1;i<=Math.ceil(plan.duration*60);i++){
      const speed=delta(angle((i-1)/60),angle(i/60))*60;
      expect(Math.abs(speed)).toBeLessThanOrEqual(Math.PI/10+1e-8);
      expect(Math.abs(speed-previousSpeed)*60).toBeLessThanOrEqual(.65+1e-7);
      previousSpeed=speed;
    }
    expect(Math.abs(angle(0)-angle(plan.duration))).toBeGreaterThan(.05);
  });
  it('gives identical orientations when seeking backwards or exporting at a different frame rate',()=>{
    const expected=bearing(7.25);
    bearing(19);bearing(2);
    expect(bearing(7.25)).toEqual(expected);
    expect(Math.hypot(expected.x,expected.z)).toBeCloseTo(1,12);
    expect(bearing(-1)).toEqual(bearing(0));
    expect(bearing(100)).toEqual(bearing(plan.duration));
  });
});
