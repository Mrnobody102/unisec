import type { FlyoverPlan, PathSampler } from './flyoverPlan';

/** Bake a restrained camera bearing once. It follows the valley, rather than each
 * switchback, with bounded yaw speed/acceleration. A time-indexed track gives
 * playback, seeking and MP4 export the exact same orientation. */
export function createFlyoverBearing(path: PathSampler, plan: FlyoverPlan) {
  const fps=60, dt=1/fps, maxSpeed=Math.PI/10, maxAcceleration=.65;
  const first=path.headingAt(0), angles=[Math.atan2(first.x,first.z)];
  let angle=angles[0], velocity=0;
  for(let i=1;i<=Math.ceil(plan.duration*fps);i++) {
    const heading=path.headingAt(plan.at(i/fps).distance);
    const raw=Math.atan2(heading.x,heading.z);
    const error=Math.atan2(Math.sin(raw-angle),Math.cos(raw-angle));
    const acceleration=Math.max(-maxAcceleration,Math.min(maxAcceleration,error*5-velocity*4));
    velocity=Math.max(-maxSpeed,Math.min(maxSpeed,velocity+acceleration*dt));
    angle+=velocity*dt;angles.push(angle);
  }
  return (time: number) => {
    const t=Math.max(0,Math.min(plan.duration,time)*fps);
    const i=Math.min(angles.length-2,Math.floor(t)), f=t-i;
    const a=angles[i]+(angles[i+1]-angles[i])*f;
    return {x:Math.sin(a),z:Math.cos(a)};
  };
}
