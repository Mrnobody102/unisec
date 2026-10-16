import type { Locale } from '../../types/dear';
import type { AreaSource, LandslideArea } from './landslideAreas';
const names = {
  potential: ['Vùng có nguy cơ sạt lở', 'Potential landslide area'], occurred: ['Vết sạt lở đã xảy ra', 'Mapped landslide occurrence'],
  source: ['Vùng phát sinh trên sườn dốc', 'Source area on slope'], runout: ['Vùng lan truyền xuống dốc', 'Runout area'], deposit: ['Vùng vật liệu bồi tích', 'Deposit area'], undifferentiated: ['Chưa tách các phần', 'Undifferentiated extent'],
  unreviewed: ['Chưa rà soát', 'Unreviewed'], reviewed: ['Đã rà soát tư liệu', 'Evidence reviewed'], 'field-checked': ['Đã kiểm tra thực địa', 'Field checked'],
  field: ['Khảo sát thực địa', 'Field survey'], imagery: ['Ảnh vệ tinh / ảnh bay', 'Satellite / aerial imagery'], resident: ['Phản ánh người dân', 'Resident report'], historical: ['Hồ sơ sạt lở cũ', 'Historical inventory'], terrain: ['Địa hình / địa chất', 'Terrain / geology'],
  evidence: ['Chọn nguồn và ghi căn cứ khoanh vùng.', 'Select a source and describe the mapping basis.'],
  image: ['Ghi mã ảnh hoặc tài liệu ảnh dùng để khoanh vùng.', 'Identify the imagery used to delineate the area.'],
  review: ['Ghi người rà soát; kiểm tra thực địa cần có nguồn khảo sát.', 'Identify the reviewer; field verification requires field evidence.'],
  road: ['Kiểm tra đoạn đường và khoảng từ–đến đã liên kết.', 'Check linked road IDs and chainage intervals.']
  , network: ['Liên kết thuộc mạng đường khác. Chọn lại đoạn đường của tình huống hiện tại.', 'These links use another road network. Reassess them against the current network.']
} as const;
export function areaLabel(key: LandslideArea['state'] | LandslideArea['part'] | LandslideArea['review'] | AreaSource | 'evidence' | 'image' | 'review' | 'road' | 'network', locale: Locale): string { return names[key][locale === 'vi' ? 0 : 1]; }
