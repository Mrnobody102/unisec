/** Shared by 2D/WebGL road strokes and their HTML legend swatches. */
export const roadColors = {
  networkImagery: '#eee9dc',
  networkTerrain: '#76857e',
  selected: '#5d9ca8',
  blocked: '#d96552',
  uncertain: '#d7a34c',
  selectedCasing: '#274b55',
  inspectedCasing: '#ffffff',
  neutralCasing: '#283a33'
} as const;

/** Screen pixels; wider transparent hit targets are defined independently. */
export const roadStroke = { normal: 2.2, emphasis: 3.2, casing: 1.4, inspectedCasing: 3.2 } as const;
