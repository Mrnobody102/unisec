# Kế hoạch thử nghiệm sau SIC

Trạng thái: Đề xuất. Phụ trách: PO. Cập nhật: 2026-10-05.

## Mục tiêu và đối tác

Đưa DEAR vào thử nghiệm tại **một địa bàn, với một đơn vị nghiệp vụ**. Kết quả cần chứng minh: người dùng kiểm tra dữ liệu, so phương án tiếp cận và bàn giao bản tóm tắt được trong công việc thực.

| Bên liên quan | Vai trò dự kiến | Cần xác nhận |
|---|---|---|
| Cơ quan ứng phó/chính quyền địa phương | Người dùng và kiểm tra nghiệp vụ | Đơn vị, người phụ trách, quy trình hiện tại |
| Quỹ Thiện Tâm — QTT | Đối tác/nhà tài trợ tiềm năng | Đầu mối, mục tiêu hợp tác, đơn vị vận hành |
| Nhóm DEAR | Cung cấp phần mềm, xử lý dữ liệu, hỗ trợ thử nghiệm | Phạm vi, nguồn dữ liệu, trách nhiệm cập nhật |

QTT có hoạt động cứu trợ thiên tai theo [Vingroup](https://vingroup.net/vi/linh-vuc-hoat-dong/thien-nguyen-br-xa-hoi/2476/quy-thien-tam). Hai ảnh [QTT1](../../references/QTT/QTT1.png), [QTT2](../../references/QTT/QTT2.png) chưa rõ đơn vị ban hành; chưa xem là yêu cầu đối tác đã giao.

## Phạm vi đề xuất

| Hợp phần trong ảnh QTT | DEAR có thể dùng lại | Cần bổ sung |
|---|---|---|
| HP1.2.5 — Phương án ứng phó cấp xã | Bản đồ, so tuyến, điểm ứng phó, bản tóm tắt | Khảo sát tuyến/điểm trú, phê duyệt phương án, diễn tập |
| HP1.1.6 — Cảnh báo lũ quét/sạt lở | Hiển thị nguy cơ, cộng đồng, nguồn/ngày | Mô hình địa phương, quy trình cảnh báo, kết nối PDMS/app |
| HP1.2.4 — Ngập hạ lưu Kẻ Gỗ/Cẩm Duệ | Hiển thị kết quả ngập trên bản đồ | Mô hình thủy văn/thủy lực, dữ liệu hồ/trạm và kiểm định |

**Bắt đầu với công việc gần HP1.2.5** tại địa bàn miền núi: kiểm tra phương án tiếp cận và bàn giao thông tin. Sản phẩm nguy cơ có thể làm đầu vào; cảnh báo và dự báo ngập cần kế hoạch chuyên môn riêng.

S04 nêu 5 tỉnh cho HP1.1.6 và 02 xã/tỉnh cho HP1.2.5; chưa phải phạm vi DEAR đã nhận. Yêu cầu bản đồ 1:10.000 cần kiểm tra chất lượng dữ liệu, không chỉ mức phóng to trên web.

## Lộ trình dự kiến

| Thời gian | Đầu ra | Điều kiện kết thúc |
|---|---|---|
| 2026-10-27–2026-11-09 | Chọn địa bàn/người dùng; mô tả quy trình hiện tại; thống nhất tiêu chí | Có đầu mối, quyền dữ liệu và phạm vi thử nghiệm |
| 2026-11-10–2026-12-07 | Nhập, kiểm tra, công bố dữ liệu; tài khoản và lịch sử bản tóm tắt | Người dùng hoàn thành một bài tập trên dữ liệu thực |
| 2026-12-08–2027-01-18 | Cập nhật dữ liệu nhiều lần, diễn tập, thử khôi phục bản sao lưu | Có kết quả đo và đơn vị nhận vận hành |
| Sau thử nghiệm | Mở rộng địa bàn hoặc tích hợp mô hình | Có nhu cầu, ngân sách và kết quả thử nghiệm |

Lịch phụ thuộc việc có đối tác và dữ liệu. Đo: thời gian từ nhận dữ liệu đã duyệt đến bản tóm tắt, tỷ lệ nhận định có nguồn, số đoạn đường chưa rõ và khả năng người dùng tự thao tác. So với quy trình hiện tại, chưa suy ra mức giảm thiệt hại.

## Năng lực phát triển tiếp

| Năng lực | Điều kiện bắt đầu |
|---|---|
| Nhận dữ liệu mưa GPM và yêu cầu ảnh qua DMC | Xác định sản phẩm, đầu mối, quyền truy cập và quy tắc kích hoạt |
| Phát hiện tác động bằng SAR, tính điểm cô lập cộng đồng | Có dữ liệu kiểm chứng, phương pháp/version và người kiểm tra kết quả |
| Tính tuyến trên mạng thực, xuất GeoPackage | Tính tuyến và PDF đã có trong bản mẫu. Cần mạng đủ vùng, điều kiện phương tiện và yêu cầu GeoPackage đã xác nhận |
| Đề xuất vùng đáp trực thăng | Có tiêu chí và chuyên gia thẩm định |
| Chứng minh mục tiêu 3–6 giờ | Chốt điểm đầu/cuối phép đo; đo riêng chờ ảnh, xử lý và duyệt |

Backend bổ sung theo [kiến trúc](../architecture/overview.md), dùng tiếp [định dạng dữ liệu](../architecture/data-contract.md) của SIC.

| Thứ tự backend | Đầu ra |
|---|---|
| 1. Nhập và duyệt | FastAPI, PostGIS và kho file. Nhập bộ dữ liệu, kiểm nguồn/CRS, lưu người duyệt, công bố snapshot có phiên bản |
| 2. Đồng bộ và quyền truy cập | Web đọc snapshot qua API, đăng nhập, quyền xem/duyệt, lịch sử cập nhật và khôi phục bản trước |
| 3. Xử lý ảnh | Worker Python nhận job, tạo lớp tác động, ghi phương pháp/version và thời gian. Công bố sau kiểm tra chất lượng |
| 4. Vận hành | Sao lưu, giám sát job/API, diễn tập trên dữ liệu thực và đo thời gian toàn luồng |

Giữ pipeline và API tách khỏi giao diện. Đợt đầu ưu tiên công bố dữ liệu đã kiểm tra; chỉ tự động hóa bước phân tích khi phương pháp và đầu vào đủ điều kiện.
