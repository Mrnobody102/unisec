# Phương án hiển thị bản đồ 3D và phân tích lát cắt địa hình

## 1. Mục tiêu

Xây dựng ứng dụng hiển thị mô hình địa hình 3D từ dữ liệu DEM, hỗ trợ:

- Di chuyển chuột trên bản đồ 3D để xem tọa độ và cao độ.
- Chọn hai điểm và vẽ một đường thẳng trên địa hình.
- Tạo biểu đồ lát cắt địa hình theo đường thẳng đó.
- Đánh dấu các đỉnh, đáy và tính độ dốc tại các vị trí này.

Mỗi vertex của mesh được liên kết với pixel DEM tương ứng. Vì vậy có thể truy ngược tọa độ địa lý và cao độ thực từ vertex hoặc từ grid DEM sau khi downsample.

## 2. Kiến trúc tổng thể

```text
DEM + Shapefile
      │
      ▼
dem_to_3d.py
      │
      ├── terrain.glb
      ├── terrain.terrain.json
      └── terrain.grid.bin
                │
                ▼
        Web 3D Viewer
                │
       ┌────────┴────────┐
       │                 │
  Hover map        Vẽ tuyến đo
       │                 │
 Tọa độ + cao độ    Profile terrain
                         │
                Đỉnh / đáy / độ dốc
```

Phương án công nghệ:

- Backend/tiền xử lý: giữ pipeline Python hiện tại trong `DEM_to_3D/dem_to_3d.py`.
- Frontend: React + TypeScript + Three.js.
- Biểu đồ lát cắt: Plotly.js hoặc ECharts; ưu tiên Plotly.js cho tooltip và marker tương tác.
- Chuyển hệ tọa độ: `proj4js`, dùng định nghĩa Proj4 được nhúng trong metadata.
- Raycast: `three-mesh-bvh` ngay từ giai đoạn viewer cơ bản.

## 3. Asset contract phiên bản 1

GLB chỉ đảm nhiệm render mesh. Thông tin địa lý và dữ liệu cao độ phải nằm trong metadata/grid đi kèm:

```text
terrain.glb
terrain.terrain.json
terrain.grid.bin
```

Các file phải được tạo trong cùng một lần export. Metadata có `schema_version` và thông tin kích thước để viewer phát hiện trường hợp GLB, JSON và BIN không cùng phiên bản.

### 3.1. Metadata `terrain.terrain.json`

Schema tối thiểu đề xuất:

```json
{
  "schema_version": 1,
  "asset_id": "sapa-2026-09-23",
  "crs": {
    "authority": "EPSG",
    "code": 32648,
    "proj4": "+proj=utm +zone=48 +datum=WGS84 +units=m +no_defs +type=crs",
    "linear_unit": "metre"
  },
  "scene_axes": {"x": "east", "y": "up", "z": "negative_north"},
  "world_origin": {"x": 412000.0, "y": 2498000.0},
  "grid": {
    "file": "terrain.grid.bin",
    "shape": [1200, 1500],
    "shape_order": "rows_cols",
    "dtype": "float32",
    "byte_order": "little_endian",
    "layout": "row_major",
    "nodata_encoding": "nan",
    "elevation_unit": "metre",
    "sampling_method": "nearest_subsample",
    "source_step": 2,
    "byte_length": 7200000
  },
  "grid_transform": {
    "a": 60.0, "b": 0.0, "c": 411970.0,
    "d": 0.0, "e": -60.0, "f": 2498030.0,
    "convention": "rasterio_affine",
    "pixel_reference": "center"
  },
  "elevation": {
    "base_elevation": 120.5,
    "exaggeration": 1.5,
    "normalize_base": true,
    "min": 120.5,
    "max": 1842.7
  },
  "analysis_supported": true
}
```

Các trường quan trọng:

- `shape` luôn có dạng `[rows, cols]`, theo thứ tự mảng NumPy.
- `grid_transform` là transform cuối cùng của đúng grid được ghi trong `terrain.grid.bin`.
- `world_origin` chỉ dùng để recenter hai trục ngang; không dùng `origin_z`.
- Cao độ render được xác định duy nhất bởi `base_elevation` và `exaggeration`.
- `analysis_supported` chỉ là `true` khi CRS là projected và đơn vị tuyến tính là mét.

### 3.2. Định nghĩa affine transform

`grid_transform` dùng thứ tự Rasterio/Affine:

```text
x = a * col_center + b * row_center + c
y = d * col_center + e * row_center + f
```

Trong đó `col_center = col + 0.5` và `row_center = row + 0.5` nếu sample đại diện cho tâm pixel. Không dùng convention GDAL `[c, a, b, f, d, e]` trong trường này.

Với affine tổng quát có rotation/shear, inverse transform phải dùng ma trận nghịch đảo. Chỉ dùng công thức rút gọn cho raster north-up (`b = 0`, `d = 0`).

### 3.3. Binary elevation grid

`terrain.grid.bin` là dãy `Float32` little-endian, row-major, không có header. Kích thước kỳ vọng là `rows * cols * 4` byte. Giá trị `NaN` biểu diễn nodata; viewer phải kiểm tra file, kích thước và metadata trước nội suy.

Nếu sau này cần phân biệt nodata gốc, vùng ngoài ranh giới, pixel bị loại và pixel nội suy, có thể bổ sung `terrain.mask.bin` dạng `Uint8`.

## 4. Chuẩn hóa exporter Python

### 4.1. Recenter trước khi xuất GLB

Không xuất trực tiếp tọa độ UTM lớn vào GLB. Trong Python, sau khi có tọa độ thế giới:

```text
scene_x = world_x - world_origin.x
scene_y = (elevation - base_elevation) * exaggeration
scene_z = -(world_y - world_origin.y)
```

Chỉ các tọa độ scene được đưa vào mesh xuất ra. Phép trừ origin phải xảy ra trước `mesh.export()`.

Phép nghịch đảo:

```text
world_x = scene_x + world_origin.x
world_y = -scene_z + world_origin.y
elevation = scene_y / exaggeration + base_elevation
```

`scene_z = -northing` là quy ước asset v1. Tất cả hover, marker, line và profile dùng chung module chuyển đổi.

### 4.2. Pixel-center convention

Mesh, mask xã/phường, hover và profile phải dùng cùng quy ước tâm pixel:

```python
col_center = col_idx + 0.5
row_center = row_idx + 0.5
xs = transform.c + transform.a * col_center + transform.b * row_center
ys = transform.f + transform.d * col_center + transform.e * row_center
```

### 4.3. Downsample MVP: nearest subsampling đã hiệu chỉnh

MVP dùng `array[::step, ::step]` để giữ mesh và grid nhất quán, nhưng phải sửa transform. Đây là nearest subsampling, không phải average/bilinear resampling:

```python
array_ds = array[::step, ::step]
mask_ds = nodata_mask[::step, ::step]
shift = Affine.translation(-(step - 1) / 2.0, -(step - 1) / 2.0)
transform_ds = transform * shift * Affine.scale(step, step)
```

Khi đó:

```text
transform_ds * (col + 0.5, row + 0.5)
= transform * (col * step + 0.5, row * step + 0.5)
```

Grid này có thể bỏ qua địa hình nhỏ hơn khoảng `step × GSD`; nó không phải giá trị trung bình của block. Giai đoạn sau có thể bổ sung resample hoặc profile full-resolution bằng grid/transform riêng.

### 4.4. Transform cuối pipeline

Transform phải được serialize sau reprojection, crop xã/phường và downsample, ngay trước khi tạo mesh/grid. Nếu có grid mesh và profile riêng, mỗi grid phải có transform riêng.

### 4.5. Base elevation

`build_mesh()` cần trả hoặc truyền `base_elevation` để ghi metadata. Với `--no-normalize-base`, ghi `base_elevation: 0` và `normalize_base: false`. Với `--hole-mode fill`, grid/metadata phải phản ánh dữ liệu sau nội suy.

## 5. CRS và đơn vị đo

Asset phân tích bắt buộc là projected CRS có đơn vị mét. `--keep-geographic` chỉ tạo asset visual-only (`analysis_supported: false`) hoặc bị từ chối khi yêu cầu asset phân tích; không được coi độ là mét. Proj4/WKT đầy đủ phải được nhúng trong metadata.

## 6. Hiển thị mô hình 3D

Frontend dùng `GLTFLoader`, `OrbitControls` và `Raycaster`.

### 6.1. Quy ước trục

Mesh Python hiện tại có dạng:

```text
x = easting
y = northing
z = elevation
```

Asset v1 dùng quy ước:

```text
Three.js X = projected X
Three.js Y = elevation
Three.js Z = negative projected Y
```

Phần tính toán địa lý vẫn dùng `(projected_x, projected_y, elevation)`; không để từng component tự đổi trục.

### 6.2. Raycast và recenter

Tọa độ UTM chỉ được recenter trong Python trước khi export. Viewer dùng `three-mesh-bvh` và `requestAnimationFrame` để raycast mesh lớn hiệu quả.

```text
scene_x = world_x - world_origin.x
scene_y = (elevation - base_elevation) * exaggeration
scene_z = -(world_y - world_origin.y)
```

Khi hiển thị thông tin, dùng phép nghịch đảo trong §4.1 để trả về tọa độ thực.

## 7. Hover và thông tin tọa độ

Quy trình khi di chuyển chuột:

1. Lấy vị trí chuột trong canvas.
2. Raycast vào mesh.
3. Lấy điểm giao trên bề mặt.
4. Đổi scene về projected bằng world origin và scene axes.
5. Dùng inverse affine tìm row/column dạng số thực.
6. Nội suy cao độ từ grid hoặc barycentric interpolation.
7. Đổi projected CRS sang WGS84 và hiển thị tooltip.

Tooltip nên có:

```text
X UTM:       412345.20 m
Y UTM:      2498123.40 m
Kinh độ:       103.812345
Vĩ độ:          22.345678
Cao độ:          842.6 m
Hàng pixel:        524
Cột pixel:        781
```

Mesh đang dùng công thức:

```text
z_mesh = (elevation - base_elevation) * exaggeration
```

Vì vậy cao độ thực phải khôi phục bằng:

```text
elevation = z_mesh / exaggeration + base_elevation
```

Đồ thị lát cắt phải sử dụng cao độ thực; `exaggeration` chỉ phục vụ trực quan hóa 3D. Không snap điểm raycast về vertex gần nhất.

## 8. Đo tuyến trên địa hình

Nên có chế độ đo riêng để tránh xung đột với thao tác xoay camera.

### Cách chọn hai đầu mút

1. Bật chế độ `Measure profile`.
2. Click điểm đầu.
3. Di chuyển chuột để xem đường preview.
4. Click điểm cuối.
5. Khóa tuyến và tạo biểu đồ.

Có thể thay bằng thao tác kéo chuột, nhưng chọn hai đầu mút thường dễ kiểm soát hơn.

Đường đo nên được đặt bám theo mặt địa hình hoặc đặt cao hơn bề mặt một khoảng nhỏ để tránh z-fighting.

Thông tin tuyến:

- tọa độ và cao độ điểm A;
- tọa độ và cao độ điểm B;
- chiều dài tuyến;
- phương vị.

Phương vị tính trong hệ projected trước khi đổi sang scene:

```text
azimuth = atan2(delta_easting, delta_northing)
```

Chuẩn hóa về `[0, 360)` độ, tính từ Bắc theo chiều kim đồng hồ. Đường hiển thị phải là polyline bám địa hình, tạo từ các sample profile; nếu gặp nodata thì tách segment.

## 9. Profile: surface sampling là nguồn chính

### 9.1. Surface profile MVP

Profile chính được tạo bằng các sample cách đều trên đoạn AB:

1. Chọn `sample_interval_m`, mặc định 10 m hoặc không nhỏ hơn một phần hai GSD phù hợp.
2. Sinh điểm theo khoảng cách từ 0 đến chiều dài tuyến.
3. Đổi điểm projected sang row/column bằng inverse affine.
4. Nội suy bilinear từ elevation grid.
5. Nếu pixel tham gia nội suy là `NaN`, đánh dấu sample là nodata.
6. Tách profile thành các segment liên tục, không nối qua nodata.

Surface profile là nguồn cho chart, slope, extrema và polyline bám địa hình.

### 9.2. Vertex profile bổ sung

Với đường thẳng có hai đầu mút `P0 = (x0, y0)` và `P1 = (x1, y1)`, đặt:

```text
d = P1 - P0
t = dot(P - P0, d) / dot(d, d)
```

Khoảng cách vuông góc của vertex `P = (x, y)` tới đường:

```text
distance = abs(cross(d, P - P0)) / length(d)
```

Vertex nằm trên đoạn nếu:

```text
0 <= t <= 1
distance <= tolerance
```

`tolerance` phải dựa trên kích thước cell sau downsample:

```text
tolerance ≈ 0.5 * sqrt(pixel_width² + pixel_height²)
```

Không dùng cố định 20–25 m cho mọi `step`.

Các bước tiếp theo:

1. Lọc vertex hợp lệ.
2. Sắp xếp theo `t`.
3. Tính khoảng cách dọc tuyến:

```text
distance_along_line = t * line_length
```

4. Gộp hoặc loại điểm trùng, bỏ segment có `delta_s <= epsilon`.
5. Lấy cao độ vertex làm dữ liệu vertex profile; không dùng vertex profile không đều làm nguồn duy nhất cho slope/extrema.

MVP có thể map vertex về pixel bằng tọa độ projected + inverse affine. Không dựa vào thứ tự vertex trong GLB vì mesh đã compact qua `used`.

## 10. Biểu đồ lát cắt

```text
Trục X: khoảng cách dọc tuyến (m)
Trục Y: cao độ thực (m)
```

Nên hiển thị:

- đường profile;
- các điểm vertex gốc;
- marker đỉnh và đáy;
- tooltip tọa độ/cao độ;
- đường liên kết từ điểm trên chart về vị trí tương ứng trên bản đồ 3D.

Khi hover một điểm trên biểu đồ, cần đồng bộ marker trên 3D và hiển thị thông tin pixel/vertex tương ứng.

## 11. Phát hiện đỉnh và đáy

Tham số MVP tính theo mét:

```json
{
  "profile_sample_interval_m": 10,
  "smoothing_window_m": 50,
  "extrema_min_prominence_m": 8,
  "extrema_min_distance_m": 100,
  "slope_regression_window_m": 50
}
```

Không nên đánh dấu mọi cực trị cục bộ vì DEM có thể nhiễu. Quy trình đề xuất:

1. Lấy profile hợp lệ.
2. Làm mượt nhẹ bằng moving average hoặc Savitzky–Golay.
3. Tìm cực đại/cực tiểu cục bộ.
4. Lọc theo độ nổi bật tối thiểu và khoảng cách tối thiểu.
5. Tìm lại vị trí/cao độ chính xác trên profile gốc trong cửa sổ quanh ứng viên để tránh smoothing làm dịch vị trí.

Điều kiện cơ bản:

```text
Đỉnh: z[i - 1] < z[i] >= z[i + 1]
Đáy:  z[i - 1] > z[i] <= z[i + 1]
```

Nên có tham số `prominence` để loại dao động nhỏ, ví dụ chỉ đánh dấu đỉnh/đáy chênh ít nhất 5–10 m so với vùng lân cận.

Các đoạn nodata phải tách riêng; không được nội suy xuyên qua vùng lỗ do ranh giới xã/phường.

## 12. Tính độ dốc

Với hai điểm liên tiếp:

```text
delta_h = z[i + 1] - z[i]
delta_s = s[i + 1] - s[i]

slope_percent = delta_h / delta_s * 100
slope_angle = atan2(delta_h, delta_s) * 180 / pi
```

Quy ước:

- dương: đi lên;
- âm: đi xuống;
- `slope_percent`: độ dốc theo phần trăm;
- `slope_angle`: góc dốc theo độ.

Ví dụ tăng 20 m trong 100 m:

```text
slope_percent = 20%
slope_angle ≈ 11.31°
```

### Độ dốc tại đỉnh và đáy

Tại mỗi đỉnh/đáy, báo cáo độ dốc hai phía:

- độ dốc đi vào: từ trái đến điểm cực trị;
- độ dốc đi ra: từ điểm cực trị sang phải.

Dùng hồi quy tuyến tính trên cửa sổ theo mét thay vì chỉ dùng hai sample liền kề:

```text
approach_slope:  [distance - window, distance]
departure_slope: [distance, distance + window]
```

Cửa sổ không được vượt qua nodata segment; nếu không đủ sample thì trả `null`.

Ví dụ kết quả:

```text
Đỉnh:
Cao độ: 1.245 m
Vị trí trên tuyến: 680 m
Dốc phía lên: +18.4%
Dốc phía xuống: -12.7%
```

## 13. Cấu trúc frontend đề xuất

```text
viewer/
├── src/
│   ├── components/
│   │   ├── TerrainViewer.tsx
│   │   ├── HoverInfo.tsx
│   │   ├── MeasureToolbar.tsx
│   │   ├── ProfileChart.tsx
│   │   └── SlopeTable.tsx
│   ├── terrain/
│   │   ├── loadTerrain.ts
│   │   ├── metadata.ts
│   │   ├── validation.ts
│   │   ├── coordinate.ts
│   │   ├── elevationGrid.ts
│   │   ├── raycast.ts
│   │   ├── profile.ts
│   │   ├── extrema.ts
│   │   └── slope.ts
│   ├── types/
│   │   └── terrain.ts
│   ├── state/
│   │   └── measurementStore.ts
│   └── App.tsx
├── public/
│   ├── sapa.glb
│   ├── sapa.terrain.json
│   └── sapa.grid.bin
├── package.json
└── vite.config.ts
```

## 14. Lộ trình triển khai đã chốt

### Giai đoạn 1 — Asset contract

- Chốt `schema_version: 1`, pixel-center, affine convention và scene axes.
- Chốt binary grid Float32 little-endian, row-major, NaN nodata.
- Chốt ý nghĩa `world_origin`, `base_elevation`, `exaggeration` và `source_step`.
- Viết validator cho JSON/BIN.

### Giai đoạn 2 — Sửa exporter Python

- Sửa tọa độ vertex về tâm pixel.
- Sửa nearest downsample bằng affine shift.
- Recenter trước khi export GLB.
- Xuất `base_elevation`, metadata và elevation grid.
- Kiểm tra CRS projected có đơn vị mét.
- Tạo asset visual-only hoặc từ chối asset phân tích khi dùng `--keep-geographic`.

### Giai đoạn 3 — Viewer cơ bản

- Load đồng thời GLB, JSON và BIN; validate schema, shape và byte length.
- Orbit/pan/zoom; BVH + throttle raycast.
- Hover projected/WGS84/elevation/pixel.

### Giai đoạn 4 — Surface profile

- Chọn hai điểm, lấy sample cách đều, nội suy bilinear.
- Tách segment qua nodata.
- Vẽ polyline bám địa hình, tính chiều dài và phương vị.

### Giai đoạn 5 — Vertex profile bổ sung

- Lọc vertex theo khoảng cách tới tuyến.
- Map vertex về grid bằng inverse affine.
- Gộp điểm trùng, sort theo khoảng cách và hiển thị trên chart.

### Giai đoạn 6 — Phân tích

- Chart raw/smoothed, prominence và minimum distance.
- Slope từng đoạn và regression slope hai phía tại cực trị.
- Đồng bộ marker chart ↔ 3D.

### Giai đoạn 7 — Kiểm thử và tối ưu

- Test DEM tổng hợp `z = a*x + b*y + c`.
- Test DEM thật, ranh giới, nodata và tuyến ngang/dọc/chéo.
- Đo asset size, load time, FPS và thời gian tạo profile.
- Chỉ thêm full-resolution profile grid, Web Worker, Meshopt hoặc Draco nếu profiling cho thấy cần.

## 15. Tiêu chí nghiệm thu định lượng

Các ngưỡng áp dụng cho asset test và cấu hình phần cứng mục tiêu được ghi trong báo cáo test:

- Round-trip projected → raster → projected: sai số dưới `0.25 pixel` trong test affine; tối đa `1 pixel` khi đi qua raycast/float32.
- Cao độ nội suy trên DEM mặt phẳng tổng hợp: sai số tuyệt đối dưới `1e-3 m` trong phép tính grid double-precision.
- Slope mặt phẳng `z = a*x + b*y + c`: sai số tuyệt đối dưới `0.1 percentage point` hoặc `0.1°` so với tham chiếu.
- Chiều dài tuyến: sai số tương đối dưới `0.1%`, với ngưỡng tuyệt đối `0.1 m` cho tuyến ngắn.
- Tuyến qua nodata không tạo sample hợp lệ hoặc line/chart nối xuyên qua nodata.
- Profile ngang, dọc và chéo dùng cùng `sample_interval_m` theo khoảng cách thực.
- Chart và polyline 3D dùng cùng sample/segment index.
- Hover đạt tối thiểu `30 FPS` trên cấu hình mục tiêu với mesh khoảng 1 triệu triangle và BVH.
- Tạo profile tuyến điển hình dưới `200 ms` trên cấu hình mục tiêu.

## 16. Các điểm không được làm mơ hồ

- Recenter trong Python trước GLB export; không trừ origin sau khi GLB đã export.
- Asset v1 chỉ dùng `base_elevation` cho cao độ, không dùng `origin_z`.
- Không dùng transform trước crop/downsample để giải mã grid.
- Không hard-code inverse north-up nếu contract hỗ trợ affine tổng quát.
- Không coi thứ tự vertex GLB là ánh xạ pixel ổn định.
- Không nội suy hoặc nối line/profile qua `NaN` nodata.
- Không coi kinh độ/vĩ độ là mét cho phép đo.
- Không dùng vertex profile không đều làm nguồn duy nhất cho slope/extrema.

## 17. Kết luận

Thiết kế v1 được chốt theo hướng:

```text
Asset contract v1
→ nearest subsampling đã hiệu chỉnh transform
→ recenter trước khi xuất GLB
→ grid Float32 little-endian, NaN nodata
→ scene: X=east, Y=up, Z=-north
→ projected CRS đơn vị mét cho asset phân tích
→ surface sampling làm profile chính
→ vertex profile là chế độ bổ sung
→ BVH + requestAnimationFrame cho hover
→ extrema/slope có tham số theo mét
→ synthetic plane test có sai số định lượng
```

Sau Giai đoạn 1 và 2, phải kiểm thử asset contract bằng DEM tổng hợp trước khi xây dựng đầy đủ frontend.
