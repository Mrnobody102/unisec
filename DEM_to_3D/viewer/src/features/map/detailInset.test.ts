import {describe,expect,it} from 'vitest';
import {detailInset} from './detailInset';

const rect=(left:number,top:number,width:number,height:number)=>({left,top,width,height,right:left+width,bottom:top+height});
const host=(map:ReturnType<typeof rect>,dock?:ReturnType<typeof rect>)=>({
  getBoundingClientRect:()=>map,
  closest:()=>({querySelector:()=>dock?{getBoundingClientRect:()=>dock}:null})
}) as unknown as HTMLElement;

describe('framing beside a detail dock',()=>{
  it('reserves its actual overlap in a wide map',()=>{
    expect(detailInset(host(rect(384,96,1056,800),rect(1048,112,376,760)))).toEqual({right:408});
  });
  it('does not offset a point for a detail shown beside the map in the information pane',()=>{
    expect(detailInset(host(rect(384,96,640,800),rect(0,96,384,800)))).toEqual({right:0});
  });
  it('ignores a hidden dock, a full-width mobile sheet and a missing dock',()=>{
    const map=rect(0,96,390,800);
    expect(detailInset(host(map,rect(0,0,0,0)))).toEqual({right:0});
    expect(detailInset(host(map,rect(0,96,390,800)))).toEqual({right:0});
    expect(detailInset(host(map))).toEqual({right:0});
  });
});
