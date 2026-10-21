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
