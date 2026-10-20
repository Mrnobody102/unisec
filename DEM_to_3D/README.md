# Công cụ DEM và asset địa hình

Chạy các lệnh exporter tại thư mục `DEM_to_3D/` sau khi cài các thư viện Python mà exporter sử dụng. Hướng dẫn chạy web ở [README demo](../README.md).

```powershell
# Cơ bản: xuất obj/stl/ply/glb
python dem_to_3d.py --input dem.tif --output terrain

# Tô màu theo cao độ, chỉ xuất glb
python dem_to_3d.py --input dem.tif --output terrain --colormap terrain --formats glb
```

## Asset contract v1 và viewer

Exporter hiện tạo đồng bộ ba file cho viewer: `terrain.glb`,
`terrain.terrain.json` và `terrain.grid.bin`. GLB dùng trục `X=east, Y=up,
Z=-north` và được recenter trước khi ghi; grid là Float32 little-endian,
row-major, `NaN` là nodata.

```powershell
# Kiểm tra metadata + byte length của grid
python terrain_contract.py che_tao_v2_tex.terrain.json

# Chạy viewer từ DEM_to_3D (sau khi npm ci trong viewer)
cd viewer
npm run dev
```

Viewer React/Vite kiểm tra metadata, tải GLB/BIN, kiểm tra schema/shape/byte
length và dựng MapControls + BVH raycast. Web DEAR hiển thị địa hình, đường,
địa bàn và tuyến trên bản đồ; thông tin chi tiết mở khi chọn đối tượng. Xem contract tại
[`DEM_to_3D/docs/terrain-asset-contract-v1.md`](docs/terrain-asset-contract-v1.md).

### Upload và ghép nhiều mảnh terrain

Viewer hỗ trợ hai chế độ trong panel `Upload terrain models`: `Single model`
và `Merge models`. Có thể chọn `.glb`/`.gltf` cùng các tài nguyên `.bin`,
texture và sidecar `.terrain.json`. Để ghép đúng các mảnh DEM, giữ cùng basename:

```text
tile-a.glb
tile-a.terrain.json
tile-a.grid.bin
```

Bật `Auto-place by geographic coordinates` để viewer dùng `crs`,
`world_origin`, `elevation.base_elevation` và `elevation.exaggeration` từ từng
sidecar. Các model phải dùng cùng CRS projected và đơn vị mét; viewer từ chối
ghép nếu CRS khác nhau hoặc thiếu metadata thay vì đặt cạnh theo thứ tự file.
GLB/GLTF không có sidecar vẫn xem được ở chế độ visual-only; phân tích profile
chỉ bật khi có đủ metadata và grid.

## Cắt theo địa giới hành chính xã/phường

`split_dem_by_commune.py --dem dem.tif --shp communes.shp --output-dir commune_dem`
cắt một GeoTIFF theo từng xã, giữ CRS, NoData và mã nguồn. Dùng `--code` hoặc
`--name "Tên xã|Tên tỉnh"` để chọn; mặc định giữ tệp đầu ra đã tồn tại. Shapefile
phải có `.prj` và các trường `ma_xa`, `ten_xa`, `ten_tinh`; dữ liệu huyện không
được diễn giải thành xã. Exporter GLB có thể giữ thuộc tính xã/trụ sở/dân số trong
`administrative`; viewer trình bày tại **Nguồn và thời điểm dữ liệu**.

## Ảnh địa hình dạng tile cục bộ

Tạo pyramid từ raster hiển thị RGB 8-bit có CRS và metadata địa hình north-up:

```powershell
python tools/tile_texture.py --input imagery.tif --terrain-json model.terrain.json --output model_tiles
python tools/tiled_texture_benchmark.py --input imagery.tif --terrain-json model.terrain.json --output model_tiles_benchmark
```

Thư mục đầu ra phải trống. Công cụ giữ phạm vi tọa độ ở mọi mức, lưu NoData thành
alpha trong WebP và ghi `model.tiles.json` cạnh metadata địa hình. Mỗi tile có
gutter 2 pixel; mặc định 512 pixel nội dung. Đây là ảnh hiển thị, không phải bộ
chuyển đổi raster SAR/DEM thô sang RGB.

Trong **Cài đặt hiển thị → Phiên làm việc → Mô hình địa hình**, chọn thư mục chứa
`model.glb`, `model.terrain.json`, tùy chọn `model.grid.bin`, `model.tiles.json`
và `model_tiles/zN/cột_hàng.webp`. Viewer kiểm tra đủ tile, mã asset và CRS trước
khi thay mô hình. Tile dùng tọa độ địa hình nên không yêu cầu UV trong GLB. Cửa
sổ ảnh phủ toàn bộ phần mô hình nhìn thấy, tự chọn mức phù hợp giới hạn texture;
giữ ảnh hoàn chỉnh trước trong khi tải mức mới. Tổng ngân sách hai atlas đang
đổi tối đa 64 MiB cho các mô hình; ảnh trực tuyến của các DEM có sẵn vẫn dùng
pipeline hiện tại.

## Lớp địa hình trong workspace

Ở **Lớp bản đồ → Lớp địa hình 3D**, bật đồng mức và chọn khoảng cao độ 20–500 m.
Đường dùng cao độ thực của lưới DEM, cùng phép chia tam giác với mesh, bỏ ô có
NoData; nhãn có lọc che khuất và va chạm. Mô hình thiếu lưới mét không được dùng
để suy ra đường đồng mức. Tạo đường có giới hạn công việc và có thể hủy khi đổi
dữ liệu hoặc tắt lớp.

Nhập SAR GeoTIFF có EPSG để chọn kênh theo metadata, bật/tắt và điều chỉnh độ rõ.
Giãn tương phản 2–98% chỉ phục vụ hiển thị; NoData trong suốt. Giới hạn tệp 512 MB,
ngân sách giải mã nguồn 256 MiB,
lưới hiển thị tối đa 2048 pixel mỗi chiều và giữ nguyên phạm vi địa lý khi lấy
mẫu thưa. Hỗ trợ CRS đã đăng ký trong proj4 và WGS84 UTM. Thao tác lớp không đặt
lại camera hoặc thay đổi dữ liệu gốc và không tạo kết quả phát hiện sạt lở.

Kiểm tra các tính năng này bằng `npm test`, `npm run build` trong `viewer`,
`python viewer/scripts/check_terrain_overlays.py --url <URL>` với Chromium, và
`python -m unittest discover -s tests -p test_tile_texture.py` cùng
`test_commune_tools.py` (cần numpy, rasterio, Pillow, pyshp, Affine 3).

## Chuẩn bị địa giới cho exporter

Shapefile sẵn có: `DEM_to_3D/Shapefile_PX_VN_34/` (3321 xã/phường toàn quốc, WGS84).

```powershell
# Chạy từ thư mục DEM_to_3D

# 1) Liệt kê các xã nằm trong khu vực DEM
python dem_to_3d.py --input dem.tif --output terrain `
    --commune-shp "Shapefile_PX_VN_34\Việt Nam (phường xã) - 34.shp" --commune list

# 2) Cắt theo 1 xã (khớp theo TÊN hoặc MÃ xã)
python dem_to_3d.py --input dem.tif --output tam_dao `
    --commune-shp "Shapefile_PX_VN_34\Việt Nam (phường xã) - 34.shp" `
    --commune "Tam Đảo" --colormap terrain --formats glb

# 3) Ghép nhiều xã (dấu phẩy) + đệm 200m quanh ranh giới
#    Xã trùng tên giữa các tỉnh: ghi rõ "Tên xã|Tên tỉnh"
python dem_to_3d.py --input dem.tif --output terrain `
    --commune-shp "Shapefile_PX_VN_34\Việt Nam (phường xã) - 34.shp" `
    --commune "Tân Lập|Điện Biên, Thanh Bình" --commune-buffer 200
```

Vùng **ngoài** ranh giới xã sẽ thành lỗ (hole) trên mesh — dùng `--hole-mode mask` (mặc định). Kết hợp được với `--texture`, `--colormap`, `--exaggeration` như thường lệ.

Khi xuất các xã thành các model riêng để ghép trong viewer, exporter tự giữ thêm một dải pixel overlap quanh biên. Dải này giúp các mesh kề nhau có mặt chồng tại đường ranh, tránh khe đen do hai mesh chỉ kết thúc ở tâm các pixel kế cận.

## Dữ liệu lớn không commit vào git

Repo cố tình **không track** các file dữ liệu nguồn và asset sinh ra (xem `.gitignore`).
Sau khi clone, cần đặt lại các file sau vào đúng vị trí trước khi chạy:

| File / thư mục | Vị trí | Ghi chú |
|---|---|---|
| Shapefile địa giới 34 tỉnh | `DEM_to_3D/Shapefile_PX_VN_34/` | 5 file `.shp .shx .dbf .prj .cpg` (~114 MB) — nguồn nội bộ, không phân phối lại (truy cập: https://gis.vn/ban-do-hanh-chinh-viet-nam) |
| DEM nguồn | `DEM_to_3D/*.tif` | VD `LaoCai_34Tinh_DEM_SRTM_30m.tif` (SRTM 30m, tải từ nguồn công khai) (truy cập: https://gis.vn/dem-viet-nam-srtm-30m-v3-nasa-usgs)|
| Ảnh vệ tinh texture | `DEM_to_3D/*.tif` | VD `sentinel2_..._raw_rgb321_geo.tif` (Sentinel-2) |
| Asset terrain sinh ra | `DEM_to_3D/*.glb .grid.bin .terrain.json` | Tái tạo bằng `dem_to_3d_v2.py` (lệnh mẫu bên dưới) |

Danh mục xã/phường tham chiếu: `DEM_to_3D/danh_sach_xa.csv` (đã track trong git).

### Asset mẫu chính (đã commit)

Bộ mẫu `che_tao_v2_tex` trong `DEM_to_3D/` là asset chuẩn để kiểm tra nhanh viewer
(schema v1 đầy đủ: `.glb` + `.grid.bin` + `.terrain.json`):

```text
DEM_to_3D/che_tao_v2_tex.glb            # mesh 3D xã Chế Tạo, Lào Cai (có texture)
DEM_to_3D/che_tao_v2_tex.grid.bin       # lưới cao độ Float32 LE row-major
DEM_to_3D/che_tao_v2_tex.terrain.json   # metadata: CRS, world_origin, shape grid
```

Web tự mở bộ Chế Tạo khi khởi động. Để đổi mô hình, mở **Cài đặt hiển thị**, chọn
**Mô hình địa hình**, chọn chế độ `Single model` rồi tải cả ba file của mô hình mới.

### Tái tạo asset cho xã khác

```powershell
# Chạy từ thư mục DEM_to_3D
python dem_to_3d_v2.py --input .\LaoCai_34Tinh_DEM_SRTM_30m.tif `
    --output <ten_xa>_v2_tex `
    --commune-shp "Shapefile_PX_VN_34\Việt Nam (phường xã) - 34.shp" `
    --commune "<Tên xã>|<Tỉnh>" --formats glb --step 1 `
    --texture .\sentinel2_VN15_2024-11-27_2025-07-26_raw_rgb321_geo.tif `
    --texture-crop-bbox <ten_xa>_v2_tex.texture.tif
```
