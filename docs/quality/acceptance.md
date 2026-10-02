# Tiêu chí nghiệm thu

> Trạng thái: Tiêu chí cho đích bàn giao SIC, chưa nghiệm thu · Phụ trách: PO / SW / RS · Cập nhật: 2026-10-02

Chưa có kết quả nghiệm thu. SW kiểm tra phần mềm, RS kiểm tra dữ liệu, PO xác nhận bàn giao. Phần rút gọn phải có quyết định và lý do.

## Kiểm tra chức năng

| ID | Yêu cầu | Cách xác định đạt |
|---|---|---|
| A01 | Sự kiện và khu vực (P01) | Mở đúng sự kiện/khu vực, đặt lại về trạng thái ban đầu |
| A02 | Bản đồ 2D/3D (P02) | Xem được 3D nếu giữ chức năng này, chuyển về 2D vẫn giữ đối tượng đã chọn |
| A03 | Lớp và chú giải (P03) | Mỗi lớp dùng trong demo có chú giải, nguồn/ngày hoặc lý do thiếu |
| A04 | Bằng chứng (P04) | Mở được bằng chứng của ít nhất một nhận định. Cặp ảnh so sánh, nếu có, đã được RS kiểm tra |
| A05 | Ưu tiên cộng đồng (P05) | Lý do ưu tiên có căn cứ, dân số có nguồn hoặc ghi chưa biết |
| A06 | Tuyến và địa hình (P06) | Hai tuyến cùng đầu/cuối. Độ cao ghi DSM/DTM, độ dốc có căn cứ hoặc lý do thiếu. Tình trạng đường/ETA đúng chứng cứ và giả định |
| A07 | Bản xuất (P07) | PNG/JSON khớp tuyến và phiên bản. Đủ bản đồ, nguồn/ngày, giới hạn. Thử với cả hai tuyến |
| A08 | Toàn luồng | Đổi bước giữ cộng đồng/lớp/tuyến/vùng nhìn; chữ/nút dùng được ở 1366×768 và 1920×1080 |
| A09 | Offline | Tắt Internet, dùng trình duyệt sạch, mở bản local từ đầu; xem bằng chứng/độ cao, so tuyến và xuất ảnh được |
| A10 | Bàn giao | Người trình bày tự khởi động, chạy kịch bản sáu phút và đặt lại theo hướng dẫn |

G3 cần bằng chứng và hai tuyến đã duyệt. Ảnh/video quay sẵn không thay kết quả A07/A09. Nguồn, ngày và mức xác minh phải khớp giữa app, bản xuất và lời trình bày.

## Mục tiêu tốc độ

Các ngưỡng dưới đây là **đề xuất**, cần đo và chốt trên máy trình chiếu tại G2.

| Thao tác | Mục tiêu |
|---|---|
| Mở local 2D từ đầu, không dùng cache | ≤5 giây đến lúc dùng được bản đồ/lớp chính |
| Mở bản HTTPS lần đầu | ≤10 giây trên mạng thử đã ghi nhận |
| Đổi bước/chọn đối tượng đã tải | ≤200 ms |
| Mở 3D | ≤10 giây; mục tiêu ≥25 khung hình/giây trong cảnh thử |
| Xuất PNG | ≤5 giây khi file đã tải đủ; đo riêng thời gian tải |
| Đặt lại/khôi phục | ≤30 giây |
| Chạy liên tục | Ba lượt sáu phút và một phiên 30 phút, không lỗi chặn |

## Cách kiểm tra và ghi kết quả

| Nhóm | Kiểm tra |
|---|---|
| Dữ liệu/tính toán | Schema, ID, đơn vị, thời gian, dữ liệu thiếu; đối chiếu độ dài/dốc/ETA với ví dụ tính tay |
| Thao tác | Mở sự kiện → chọn cộng đồng → bằng chứng → so tuyến → xuất PNG → đặt lại |
| Địa lý | Đối chiếu vị trí, căn chỉnh ảnh, chất lượng độ cao và căn cứ nhận định |
| Giao diện | Không cắt chữ/nút; đúng màu/nhãn/đơn vị; dùng bàn phím chọn cộng đồng/tuyến và mở/đóng cửa sổ |
| Khi lỗi | 3D hỏng, thiếu tile, CORS, sai phiên bản, vị trí ngoài khu vực, nhận định thiếu nguồn |
| Offline | Ngắt Internet nhưng giữ localhost; không dựa vào cache; kiểm tra trực tiếp file xuất |

Theo [đặc tả dữ liệu](../architecture/data-contract.md) và [thiết kế giao diện](../product/interface.md). Nếu so ảnh chụp màn hình tự động, cố định môi trường vì cách render phụ thuộc máy/browser. [Playwright](https://playwright.dev/docs/test-snapshots).

Biên bản ghi: **ID Axx · phiên bản app/dữ liệu · máy/OS/browser/GPU · độ phân giải/mạng/cache · người/ngày kiểm tra · đạt/chưa đạt · link log/ảnh/video**. Lỗi chưa đạt cần có công việc xử lý trước khi xác nhận bàn giao.
