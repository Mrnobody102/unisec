# Kiểm tra workspace

Mốc đối chiếu: 12/10/2026; GIS/catalog prepared và dữ liệu ứng phó mô phỏng Chế Tạo v0.2. Đây là kết quả kiểm tra phần mềm, chưa phải nghiệm thu dữ liệu hoặc thử với cán bộ trực.

## Phạm vi đã kiểm

| Nhóm | Phạm vi |
|---|---|
| Nghiệp vụ | Sự kiện → địa bàn → tuyến/căn cứ → áp dụng tin → bản xuất; cùng snapshot giữa map, panel và file |
| Công cụ | Đo, tọa độ, mặt cắt, lớp/nguồn, tổng quan, so ảnh; nhập/xuất GIS, vẽ/chỉnh AOI theo bản nháp, bắt đỉnh/hoàn tác; catalog prepared, metadata, bộ chọn và độ phủ |
| Giao diện | Sáng/tối, Việt/Anh, các bộ chữ, desktop/mobile, bàn phím, giữ lựa chọn và vị trí panel |
| Khi lỗi | Thiếu dữ liệu, API/file/GPU lỗi, khôi phục 2D, gói offline giải nén sạch |
| Phát hành | Cài sạch, unit/Python/browser tests, audit, build và đóng gói đạt trên Linux/Node 22 |

Lệnh và môi trường kiểm tra lấy từ [workflow](../../.github/workflows/dear-web.yml), không chép số lượng test hoặc phiên bản dependency vào tài liệu. Kết quả GitHub nằm ở [Actions](https://github.com/hoxuanphu/UNISEC_Demo/actions/workflows/dear-web.yml); chạy cục bộ không thay xác nhận trên GitHub.

## Đối chiếu viễn thám và proposal

Đọc lại S01 (proposal, tr. 1–5), S02 (phạm vi phần mềm) và S03 (WebApp direction, tr. 1–12) tại [nguồn gốc](../sources.md#tài-liệu-gốc). Chuỗi nghiệp vụ được đối chiếu tại [walkthrough](../operations/walkthrough.md#đối-chiếu-proposal); không đưa toàn bộ mục tiêu nghiên cứu của S01 vào phạm vi demo SIC.

| Phần | Kết luận |
|---|---|
| Điểm nhập | Hiển thị vị trí tham chiếu là phù hợp; chưa có căn cứ để gọi là sạt lở, đường bị chặn hay điểm đã khảo sát. Đã sửa polygon style ghi đè CircleMarker gây vòng rỗng, thêm chú giải và nhãn trục tọa độ |
| KML | Đã sửa mất mô tả/thuộc tính khi xuất và mất altitudeMode khi nhập. Giữ mode riêng từng hình học, kể cả MultiGeometry có nhiều mode. Map là 2D; giới hạn Style/Folder và điểm chồng ở [GIS](../product/geodata-workspace.md#giới-hạn) |
| AOI/cảnh ảnh | Hợp footprint trước khi tính giao, không đếm trùng. Ghi rõ độ phủ hình học; footprint, mây toàn cảnh và ảnh nền cũ không chứng minh chất lượng ảnh trong AOI hoặc hiện trạng thiên tai |
| Ứng phó | Giữ địa bàn–tuyến–đoạn–căn cứ trong cùng snapshot; tin mới chỉ áp dụng khi người dùng chọn. Không suy đường đi được từ trạng thái chưa có báo cáo hoặc từ KML giao với đường |
| Phân tích tự động | Chưa có chuỗi SAR trước/sau → QA → phát hiện → duyệt sản phẩm; chưa có GPM/DMC, CIS hoặc GeoPackage. Không tuyên bố đạt xử lý 3–6 giờ |
| Kiểm chứng | Unit/build và E2E GIS, AOI/catalog, ứng phó, công việc đạt cục bộ trên Windows/Node 22. Kiểm tra trực tiếp SVG và vòng KML có thuộc tính/Z/mode. Chưa có tệp 081026.kml gốc để đối chiếu từng điểm với nguồn |

Ưu tiên cho SIC là duyệt bộ dữ liệu, bằng chứng và hai tuyến theo [G3](../tasks/sic-2026.md), rồi tập toàn luồng trên máy trình chiếu. Những phần xử lý EO và quản lý sản phẩm tiếp tục ở platform. Khi hiệu chỉnh proposal, giữ riêng pixel spacing và độ phân giải SAR; mốc 3–6 giờ phải tách chờ thu nhận/cấp ảnh, xử lý, kiểm tra và công bố theo [đối chiếu nguồn kỹ thuật](../sources.md#đối-chiếu-nguồn-kỹ-thuật).

## Giới hạn còn lại

| Nội dung | Chưa xác nhận |
|---|---|
| Dữ liệu và phương pháp | Nguồn/quyền dùng ảnh và DEM, bằng chứng gốc, tuyến và chính sách được duyệt |
| Phạm vi GIS | Fixture thứ hai dùng lại địa hình Chế Tạo; chưa kiểm khu vực thực hoặc nhiều CRS |
| Vận hành | Feed, xử lý SAR/AI, công bố dùng chung và backend mới ở mức kế hoạch |
| Bàn giao | URL Vercel, tốc độ/GPU, bản in PDF và thao tác trên máy trình chiếu |

Việc còn làm ở [công việc SIC](../tasks/sic-2026.md), điều kiện bàn giao ở [nghiệm thu](acceptance.md). Thiết kế và cách sử dụng ở [giao diện](../product/interface.md), [design system](../product/design-system.md), [công cụ GIS](../product/geodata-workspace.md).

## Tham chiếu

[Tiếp cận](assets/workspace-summary.png), [mặt cắt](assets/workspace-profile.png), [đo](assets/workspace-measurement.png) và [PNG xuất](assets/decision-map.png) là ảnh của bản trước, không phải bộ ảnh cần cập nhật sau mỗi lần sửa UI.

[Log phiên 30 phút](assets/session-30min.json) giữ browser, hash build, lỗi và số liệu của lần đo đó. Cách chạy lại ở [nghiệm thu](acceptance.md).

Chỉ cập nhật mốc kiểm tra khi chốt bản demo/phát hành hoặc có thay đổi đáng kể về phạm vi kiểm chứng. Lịch sử sửa lỗi và log từng lần chạy nằm trong Git/CI.

## Hồ sơ thực địa và vùng khoanh vẽ

Các kiểm tra mới nằm tại `scripts/check_field_observations.py` và `scripts/check_field_areas.py`: EXIF giờ chụp/GPS, ảnh lớn và Escape, lưu lỗi không mất hồ sơ, file timestamp, vùng gắn điểm, sửa/hủy/hoàn tác, AOI giữ nguyên, vòng KML đổi ID, bản nháp giữ khi vẽ, sáng/tối và 320–1440 px, hướng dẫn và trả focus. Kiểm tra GIS cũ mở hồ sơ bằng lựa chọn rõ ràng, phù hợp bố cục danh sách–hồ sơ mới.

Ảnh fixture có nhãn TEST PHOTO và metadata tự dựng để kiểm phần mềm. Polygon fixture không phải sản phẩm giải đoán hoặc đo đạc hiện trường. Chưa có kiểm chứng ảnh gốc 081026.kml hoặc đồng bộ nhiều thiết bị. Luồng hai vai trò trong cùng trình duyệt được kiểm tại `check_resident_workflow.py`; GIS hàng loạt và ranh giới tại `check_simplified_gis.py`. HEIC kiểm bằng tệp mẫu libheif, không phải ảnh hiện trường đã xác minh.

Kiểm tra gom cụm ở `check_point_groups.py` bao gồm chọn từng điểm cùng vị trí, ảnh lớn, chuyển ảnh bằng bàn phím, Escape, bảng thuộc tính không chồng thẻ nhóm và quay lại nhóm từ bản đồ ứng phó. Kiểm tra trên các chiều rộng 320–1440 px. Luồng cư dân kiểm việc gửi ảnh có EXIF/GPS khi phần thông tin bổ sung vẫn đóng. Phiên rà soát 12/10/2026: typecheck, 266 unit tests (53 files) và production build đã đạt; nguồn nền EOX vẫn có giới hạn 10 m và việc gửi ghi nhận chỉ lưu tại trình duyệt.

`check_basemap_recovery.py` mô phỏng một ô ảnh lỗi hai lần trước khi tải được, kiểm tra cảnh báo được gỡ và ảnh trực tuyến thay lớp dự phòng. Tiến trình tải đếm theo từng ô, loại ô đã rời khung nhìn, tránh giữ lớp ảnh mờ sau khi đổi zoom hoặc tải lại thành công.

Dropdown được kiểm bằng `check_select_controls.py`: đo vị trí chữ thực trong trình duyệt, font của ô và danh sách mở, khoảng chừa biểu tượng, tên địa bàn dài, ba bộ chữ, sáng/tối, Việt/Anh và 320–1440 px. Escape đóng danh sách trước khi đóng GIS hoặc cài đặt, không hủy thao tác vẽ đang làm. Thiết bị cảm ứng và chế độ tương phản cao giữ bộ chọn gốc của trình duyệt. Kiểm tra này chạy cùng luồng browser trong CI.
