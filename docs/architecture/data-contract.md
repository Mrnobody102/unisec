# Đặc tả dữ liệu

> Trạng thái: Triển khai từng phần · Phụ trách: SW / AI / RS · Cập nhật: 2026-10-02

Đã có [manifest v0.1](../../DEM_to_3D/viewer/public/scenarios/che-tao/v0.1/manifest.json) cho địa hình và lệnh `npm run validate:dataset` kiểm tra file, kích thước, SHA-256, CRS. Dữ liệu Incident/Community/Road/Hazard/Route/Evidence vẫn nằm trong TypeScript; phần schema nghiệp vụ bên dưới chưa triển khai đầy đủ. Tên trường kỹ thuật nằm trong [danh mục trường](data-fields.md).

## Gói dữ liệu bàn giao

Mỗi tình huống có một thư mục `<scenario>/<version>/`. File `manifest` liệt kê các file trong gói; app đọc danh mục này để tải đúng phiên bản.

| Thành phần | Nội dung |
|---|---|
| Manifest | Mã tình huống/phiên bản, khu vực, trạng thái duyệt, danh sách file, chức năng dùng được |
| Lớp địa lý | Ảnh, đường, cộng đồng, vùng tác động, điểm ứng phó |
| Bằng chứng và nhận định | Ảnh/báo cáo, nguồn/ngày; nội dung nhận định và mức kiểm chứng |
| Hai tuyến | Hình tuyến, đoạn đường, độ dài, biểu đồ độ cao, giả định ETA |
| Hồ sơ kiểm tra | Người/ngày kiểm tra, hạn chế còn lại, quyền dùng và checksum của file |

Mối liên hệ cần truy được: **cộng đồng/đường/tuyến → nhận định → bằng chứng → nguồn**.

| Quy ước | Giá trị |
|---|---|
| Tọa độ | GeoJSON WGS84: `[longitude, latitude]`; bbox: `[west, south, east, north]` |
| Đơn vị | Độ dài/độ cao: m; ETA: giây; độ dốc dọc tuyến: %; góc dốc: độ |
| Thời gian | ISO 8601 có múi giờ; nếu chỉ biết ngày thì ghi rõ độ chính xác |
| Giá trị thiếu | `null` và `missingReason`; không dùng 0 để thay dữ liệu chưa biết |
| Phiên bản | `schemaVersion` là định dạng; `datasetVersion` là nội dung; không trộn hai phiên bản dữ liệu trong một phiên app |
| Loại dữ liệu | `synthetic`: giả lập; `historical`: sự kiện quá khứ; `operational`: phục vụ vận hành |
| Chức năng chưa có | Khai `unavailable` và lý do cho so ảnh, 3D hoặc 2D offline |

## Nhận định và bằng chứng

| Trường | Giá trị và ý nghĩa |
|---|---|
| `basis` | `observed`: quan sát; `inferred`: suy luận; `reported`: báo cáo; `field_verified`: xác minh thực địa |
| `reviewStatus` | `draft`: chưa duyệt; `reviewed`: đã duyệt; `rejected`: không chấp nhận |
| `confidence` | `low / medium / high / unknown`; luôn có lý do, không thay thế bằng chứng |
| `temporalRole` của lớp | `baseline`: dữ liệu nền; `post_event`: sau sự kiện; `forecast`: dự báo |

**Đã duyệt không đồng nghĩa đã xác minh thực địa.** Người duyệt có thể chấp nhận một suy luận nếu nguồn và giới hạn được ghi đúng.

| Tình trạng đường | Điều kiện dùng |
|---|---|
| `unknown` | Chưa đủ thông tin |
| `suspected_affected` | Có dấu hiệu ảnh hưởng; ví dụ đường giao vùng nghi sạt lở |
| `verified_restricted` | Có xác nhận hạn chế đi lại |
| `verified_blocked` | Có xác nhận không đi qua được |
| `verified_passable` | Có xác nhận đi qua được, cho loại phương tiện cụ thể |

Ba trạng thái `verified_*` cần kiểm tra thực địa hoặc báo cáo chính thức xác nhận trực tiếp đoạn đường, kèm thời gian, phương tiện và người duyệt. Báo cáo chưa kiểm chứng hoặc hết hiệu lực không đủ xác nhận hiện trạng.

SIC dùng lý do ưu tiên cộng đồng có bằng chứng, chưa tự tính điểm cô lập. Dân số nền không phải số người bị ảnh hưởng; chỉ ước lượng người trong vùng nguy cơ khi đã có ranh giới vùng và dữ liệu dân cư phù hợp. Không có ranh giới thì để trống ước lượng.

## Ảnh, độ cao và ETA

| Dữ liệu | Quy tắc |
|---|---|
| Ảnh | Giữ sensor, thời điểm chụp, mức xử lý, phạm vi, mây/nodata và cách căn chỉnh |
| Kích thước pixel và độ phân giải | Ghi riêng `pixelSpacing` và `spatialResolution`, mỗi trường có `{x, y, unit}`; không suy cái này từ cái kia |
| DEM — dữ liệu độ cao | Ghi nguồn, CRS, hệ độ cao và loại `DSM / DTM / unknown` |
| DSM / DTM | DSM thể hiện bề mặt, có cây/công trình; DTM thể hiện địa hình mặt đất |
| Biểu đồ dọc tuyến | Tính trước; ghi khoảng lấy mẫu, cách làm mượt, phiên bản xử lý và tỷ lệ thiếu dữ liệu |
| ETA | Ghi phương tiện, khoảng tốc độ, chậm trễ giả định và khoảng thời gian ước tính |
| So tuyến | Cùng điểm đầu/cuối; ưu tiên cùng loại phương tiện |

Quy tắc tính cho AI/SW:

1. Tính chiều dài bằng geodesic hoặc hệ tọa độ mét phù hợp. Chuyển tọa độ sang CRS của DEM trước khi lấy mẫu. [Rasterio](https://rasterio.readthedocs.io/en/stable/api/rasterio.sample.html).
2. Khoảng lấy mẫu/làm mượt phù hợp độ phân giải; vùng thiếu dữ liệu giữ null.
3. `gradePct = 100 × ΔelevationM / horizontalDistanceM`; bỏ mẫu có khoảng cách 0. Trung bình độ dốc tuyệt đối tính theo trọng số chiều dài; RS chọn ngưỡng đoạn dốc.
4. AW3D30 là DSM. Profile từ nguồn chưa đủ chất lượng chỉ hiển thị **Surface elevation along route**; grade giữ null và lý do. Ngay cả DTM cũng có thể không phản ánh cầu/hầm hoặc dốc đường ngắn. [JAXA](https://www.eorc.jaxa.jp/ALOS/en/dataset/aw3d30/aw3d30_e.htm).
5. Đường chưa rõ: ETA phải ghi “giả định thông tuyến”. Đường đã xác nhận bị chặn: ETA thực thi là null. Không tự đặt tốc độ để lấp dữ liệu thiếu.

## Duyệt và công bố

`draft` — tạo dữ liệu → `validated` — qua kiểm tra kỹ thuật → `reviewed` — duyệt nội dung → `published` — app sử dụng.

| Người kiểm tra | Nội dung |
|---|---|
| SW / AI | Đúng schema, ID tham chiếu, file/checksum, đơn vị và thứ tự thời gian |
| AI / RS | Vị trí, đầu/cuối tuyến, thứ tự mẫu độ cao, nodata và cách tính ETA |
| RS / AI | Chất lượng/căn chỉnh ảnh, phương pháp và quyền sử dụng |
| RS / PO | Nhận định, tình trạng đường và điểm chưa xác minh |

- RS xác định ngưỡng sai lệch vị trí theo nguồn và khu vực.
- File đã công bố không sửa đè; thay đổi thì tạo phiên bản mới. Checksum không bao gồm hash của chính file chứa nó.
- G3 dùng dữ liệu thực đã duyệt; dữ liệu giả lập chỉ dùng phát triển giao diện.
- Khi đo mục tiêu 3–6 giờ, lưu riêng mốc chờ ảnh, xử lý và duyệt/công bố. Trường đo thời gian nằm trong [danh mục trường](data-fields.md); chưa có định nghĩa phép đo được chốt.
