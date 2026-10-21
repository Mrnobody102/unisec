import {afterEach,describe,expect,it,vi} from 'vitest';
import * as THREE from 'three';
import {createFlyoverController} from './flyoverController';
import type {FlyoverInput} from '../../features/flyover/flyoverInput';

afterEach(()=>vi.unstubAllGlobals());
describe('pending flyover lifecycle',()=>{
  it('does not start a cancelled launch after terrain preparation finishes and releases its cached trail',async()=>{
    const context={createLinearGradient:()=>({addColorStop:vi.fn()}),fillRect:vi.fn()};
    vi.stubGlobal('document',{documentElement:{},createElement:()=>({getContext:()=>context,setAttribute:vi.fn(),remove:vi.fn()}),fonts:{ready:Promise.resolve()}});
    vi.stubGlobal('getComputedStyle',()=>({getPropertyValue:()=> 'Roboto, Arial, sans-serif'}));
    let ready!:()=>void;
    const scene=new THREE.Scene(),enter=vi.fn(),onState=vi.fn(),cancelPreparation=vi.fn();
    const controller=createFlyoverController({host:{append:vi.fn()} as unknown as HTMLElement,
      renderer:{domElement:{width:1280,height:720}} as THREE.WebGLRenderer,scene,camera:new THREE.PerspectiveCamera(45,16/9),terrainMeshes:[],
      surfaceWorld:p=>new THREE.Vector3(p.x,100,p.y),groundAt:()=>100,setDrape:vi.fn(),ready:()=>new Promise<void>(resolve=>{ready=resolve;}),
      maxTextureSize:4096,cancelPreparation,enter,leave:vi.fn(),render:vi.fn(),invalidate:vi.fn(),restoreViewport:vi.fn(),locale:()=> 'vi',onState});
    const input:FlyoverInput={key:'test',route:[{x:0,y:0},{x:500,y:0}],stops:[],areas:[],start:['A','A'],end:['B','B'],imagery:[],imageryOpacity:1,imageryLabel:['','']};
    controller.setInput(input);
    const playing=controller.controls.play();expect(onState.mock.lastCall?.[0].status).toBe('loading');
    controller.controls.exit();expect(onState.mock.lastCall?.[0].status).toBe('idle');expect(cancelPreparation).toHaveBeenCalledOnce();
    ready();await playing;
    expect(enter).not.toHaveBeenCalled();expect(controller.active).toBe(false);expect(onState.mock.lastCall?.[0].status).toBe('idle');
    const trails=scene.children.filter(object=>object.type==='Line2');expect(trails).toHaveLength(3);
    const disposed=trails.map(object=>{const mesh=object as THREE.Mesh;return vi.spyOn(mesh.geometry,'dispose');});
    controller.dispose();expect(scene.children).toHaveLength(0);disposed.forEach(spy=>expect(spy).toHaveBeenCalledOnce());
  });
});


it('advances the film clock at the selected rate independently of render cadence',async()=>{
  let now=1000;
  const context=new Proxy({createLinearGradient:()=>({addColorStop:vi.fn()})} as Record<string,unknown>,{
    get:(target,key)=>target[String(key)]??vi.fn()
  });
  vi.stubGlobal('document',{documentElement:{},createElement:()=>({width:0,height:0,getContext:()=>context,setAttribute:vi.fn(),remove:vi.fn()}),fonts:{ready:Promise.resolve()}});
  vi.stubGlobal('getComputedStyle',()=>({getPropertyValue:()=> 'Roboto, Arial, sans-serif'}));
  vi.stubGlobal('performance',{now:()=>now});
  const onState=vi.fn();
  const controller=createFlyoverController({host:{append:vi.fn(),clientWidth:1280,clientHeight:720} as unknown as HTMLElement,
    renderer:{domElement:{width:1280,height:720},getPixelRatio:()=>1} as THREE.WebGLRenderer,
    scene:new THREE.Scene(),camera:new THREE.PerspectiveCamera(45,16/9),terrainMeshes:[],
    surfaceWorld:p=>new THREE.Vector3(p.x,100,-p.y),groundAt:()=>100,setDrape:vi.fn(),ready:async()=>{},
    maxTextureSize:4096,enter:vi.fn(),leave:vi.fn(),render:vi.fn(),invalidate:vi.fn(),restoreViewport:vi.fn(),locale:()=> 'vi',onState});
  controller.setInput({key:'clock',route:[{x:0,y:0},{x:500,y:0}],stops:[],areas:[],start:['A','A'],end:['B','B'],imagery:[],imageryOpacity:1,imageryLabel:['','']});
  try {
    await controller.controls.play();
    controller.controls.setPlaybackRate(1.5);
    now=1500;controller.frame(now);controller.controls.pause();
    expect(onState.mock.lastCall?.[0].time).toBeCloseTo(.75);
    controller.controls.resume();
    now=2000;controller.frame(now);controller.controls.pause();
    expect(onState.mock.lastCall?.[0].time).toBeCloseTo(1.5);
    controller.controls.setPlaybackRate(1);controller.controls.resume();
    now=2500;controller.frame(now);controller.controls.pause();
    expect(onState.mock.lastCall?.[0].time).toBeCloseTo(2);
  } finally {controller.dispose();}
});
