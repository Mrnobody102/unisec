import {describe,expect,it} from 'vitest';
import {featherCoverageAlpha} from './coverageFeather';

describe('display coverage edge',()=>{
  it('softens the coverage boundary while preserving RGB, cloud pixels and the opaque interior',()=>{
    const image={width:15,height:15,data:new Uint8ClampedArray(15*15*4).fill(255)};
    for(let i=0;i<225;i++){image.data[i*4]=30;image.data[i*4+1]=80;image.data[i*4+2]=45;}
    image.data.set([255,255,255,255],(7*15+7)*4);
    const original=image.data.slice();
    featherCoverageAlpha(image,3);
    expect(image.data[3]).toBeGreaterThan(0);expect(image.data[3]).toBeLessThan(255);
    expect([...image.data.slice((7*15+7)*4,(7*15+7)*4+4)]).toEqual([255,255,255,255]);
    for(let i=0;i<225;i++)expect([...image.data.slice(i*4,i*4+3)]).toEqual([...original.slice(i*4,i*4+3)]);
    expect(image.data[(4*15+4)*4+3]).toBe(255);
  });
  it('retains NoData and fades its boundary without inventing new coverage',()=>{
    const image={width:9,height:9,data:new Uint8ClampedArray(9*9*4).fill(255)};
    image.data[(4*9+4)*4+3]=0;
    featherCoverageAlpha(image,2);
    expect(image.data[(4*9+4)*4+3]).toBe(0);
    expect(image.data[(4*9+3)*4+3]).toBeLessThan(255);
    expect(image.data[(2*9+2)*4+3]).toBe(255);
  });
});
