# Terrain asset contract v1

Mỗi lần export tạo một bộ asset đồng bộ:

```text
terrain.glb          # mesh, scene X=east Y=up Z=-north, đã recenter
terrain.terrain.json # metadata và transform của grid
terrain.grid.bin     # Float32 little-endian, row-major, không có header
```

`grid.shape` luôn là `[rows, cols]`. Mỗi sample đại diện cho tâm pixel và
được đổi qua affine Rasterio:

```text
x = a * (col + 0.5) + b * (row + 0.5) + c
y = d * (col + 0.5) + e * (row + 0.5) + f
```

`NaN` là nodata. `world_origin` chỉ có `x` và `y`; nó được trừ trước khi
ghi GLB. Cao độ thực khôi phục từ mesh bằng
`elevation = scene_y / exaggeration + base_elevation`.

Validator Python không cần thư viện JSON Schema:

```powershell
python terrain_contract.py terrain.terrain.json --grid terrain.grid.bin
```

Asset có `analysis_supported: true` phải dùng projected CRS với đơn vị mét.
`--keep-geographic` tạo asset visual-only (`analysis_supported: false`).
