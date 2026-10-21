type Rect = {left:number;right:number;top:number;bottom:number;width:number;height:number};

/** Fit beside a floating card, or below it when the card spans a narrow map. */
export function panelFitPadding(map: Rect, panel?: Rect): {paddingTopLeft:[number,number];paddingBottomRight:[number,number]} {
  const padding = {paddingTopLeft:[40,40] as [number,number],paddingBottomRight:[40,40] as [number,number]};
  if (!panel?.width || !panel.height || panel.right <= map.left || panel.left >= map.right || panel.bottom <= map.top || panel.top >= map.bottom) return padding;
  const spaces = [
    {edge:'right',width:panel.left-map.left,height:map.height},
    {edge:'left',width:map.right-panel.right,height:map.height},
    {edge:'top',width:map.width,height:map.bottom-panel.bottom},
    {edge:'bottom',width:map.width,height:panel.top-map.top}
  ].filter(space=>space.width>=160&&space.height>=160).sort((a,b)=>b.width*b.height-a.width*a.height);
  switch(spaces[0]?.edge) {
    case 'right': padding.paddingBottomRight[0] = map.right-panel.left+24; break;
    case 'left': padding.paddingTopLeft[0] = panel.right-map.left+24; break;
    case 'top': padding.paddingTopLeft[1] = panel.bottom-map.top+24; break;
    case 'bottom': padding.paddingBottomRight[1] = map.bottom-panel.top+24; break;
  }
  return padding;
}
