# Design system DEAR

Hiện hành, cập nhật 2026-10-02. Web React là bản triển khai chuẩn. Catalog HTML trong `references/` là bản tham khảo, chưa đồng bộ hoàn toàn.

## Nền tảng

| Thành phần | Quy tắc |
|---|---|
| Bố cục | Desktop trên 900 px: panel trái 384 px, giảm còn 344 px ở 901–1150 px. Bản đồ dùng phần còn lại. Mobile có hai chế độ Thông tin và Bản đồ |
| Chữ | Inter mặc định. Cài đặt có IBM Plex Sans và Space Grotesk/Be Vietnam Pro. Nội dung 13–14 px, tiêu đề panel 23 px. Dùng font mono cho tọa độ hoặc mã cần đối chiếu |
| Khoảng cách | Thang 4, 8, 12, 16, 20, 24, 32 px. Căn theo khối nội dung, không chèn khoảng trắng để căn nút |
| Màu | Mặc định sáng, header tối. Bề mặt trung tính. Màu chọn giao diện tách khỏi màu tình trạng đường |
| Icon và nút | SVG từ `UiIcon`, thường 18 px. Nút bản đồ 40 × 40 px, nút đóng 36 × 36 px. Có tên truy cập và focus rõ |

Giá trị dùng chung nằm trong [tokens.css](../../DEM_to_3D/viewer/src/styles/tokens.css). Bố cục nằm trong [workspace.css](../../DEM_to_3D/viewer/src/styles/workspace.css).

## Quy tắc thành phần

| Thành phần | Quy tắc |
|---|---|
| Tab | Chữ đậm và gạch chân cho lựa chọn. Không dùng badge làm tab |
| Trạng thái | `StatusText`: chữ và ký hiệu nhỏ. Không chỉ dựa vào màu, không đóng hộp mọi trạng thái |
| Hàng danh sách | Tên trước, dữ kiện sau. Tên dài xuống dòng, trạng thái không chen giữa tên |
| Panel chi tiết | Một tiêu đề, một trạng thái, các dữ kiện phục vụ xử lý. X đóng chi tiết. Chỉ có lối về mang tên địa bàn khi mở đối tượng từ địa bàn |
| Phương án tuyến | Dùng `RouteOption`. Dấu chọn biểu thị lựa chọn, không biểu thị an toàn |
| Hộp xem nhanh | Nội dung ngắn và hành động xem chi tiết. Không khóa bản đồ |
| Hộp thoại | Focus vào khi mở. Tab giữ bên trong, Escape đóng và trả focus về nút mở |
| Câu chữ | Tên cụ thể, trạng thái nhất quán, câu ngắn. Không dùng chấm phẩy để ghép nhiều ý, mũi tên trang trí hoặc dấu gạch dài để ngăn dữ kiện |
| Dữ liệu chưa có | Ghi ở nơi liên quan đến quyết định hoặc phân tích. Không rải ghi chú kỹ thuật trên mọi nhãn. Không dùng số 0 thay cho chưa xác định |
| Mã tham chiếu | Mã đoạn và mã mô phỏng nằm trong thông tin tham chiếu. Số hiệu đường chính thức chỉ hiện khi có nguồn xác nhận |

Bản đồ dùng chung [ký hiệu SVG](../../DEM_to_3D/viewer/src/terrain/mapSymbols.ts) và [màu đường](../../DEM_to_3D/viewer/src/terrain/roadStyle.ts). Quy tắc chuyên môn nằm tại [hiển thị bản đồ](cartography.md), luồng tại [thiết kế giao diện](interface.md).

## Kiểm soát thay đổi

| Thay đổi | Cập nhật cùng nhau | Kiểm tra |
|---|---|---|
| Màu, chữ, khoảng cách | Token và component sử dụng | Sáng/tối, Việt/Anh |
| Thành phần hoặc tương tác | Component và quy tắc hiện hành | Desktop 1440/1024 px, mobile 390/320 px, bàn phím |
| Bản đồ và dữ kiện phân tích | Renderer, chú giải, tài liệu chuyên môn | Zoom, chọn đối tượng, bật lớp, đổi tuyến, thiếu dữ liệu |

PR cập nhật quy tắc cần kèm ảnh liên quan. Dùng lại component trước khi tạo thành phần mới. Chạy `npm run typecheck`, `npm test`, `npm run build` trong `DEM_to_3D/viewer`.
