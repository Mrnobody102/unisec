import type { GeometryRole } from '../../geo/vector/types';
import type { Locale } from '../../types/dear';

export const roleColors = {reference:'#b7791f',aoi:'#258b70',footprint:'#378ecc'};
export const roleLabel = (role: GeometryRole, locale: Locale) => ({
  reference:['Tham chiếu','Reference'], aoi:['Vùng quan tâm (AOI)','Area of interest (AOI)'], footprint:['Phạm vi ảnh','Image footprint']
}[role][locale === 'vi' ? 0 : 1]);
export function formatArea(value: number, locale: Locale): string {
  const [size, unit] = value < 10_000 ? [value, 'm²'] : value < 1_000_000 ? [value / 10_000, 'ha'] : [value / 1e6, 'km²'];
  return `${new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-GB', { maximumFractionDigits: 2 }).format(size)} ${unit}`;
}
