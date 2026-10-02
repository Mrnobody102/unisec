# Kịch bản demo ngày 03/10/2026

Đây là bản chạy thử bằng **dữ liệu mô phỏng Chế Tạo**. Luồng trình diễn bám câu hỏi của người trực: địa bàn nào cần chú ý, vì sao, có thể tiếp cận ra sao và cần xác minh điều gì. Bộ dữ liệu chưa có phạm vi ngập hoặc số hộ bị ảnh hưởng được kiểm chứng. Không giới thiệu kết quả như cảnh báo hoặc quyết định điều phối thực tế.

| Thời gian | Thao tác trên màn hình | Điều cần nói |
|---|---|---|
| 00:00–00:35 | Mở **Sự kiện**, nhìn vị trí và mốc thời gian | “Có tình huống sạt lở và nguy cơ lũ quét tại thung lũng Nậm Kha. Đây là bộ dữ liệu mô phỏng cho buổi trình diễn.” |
| 00:35–01:20 | Chọn **Nậm Khắt** ngay trong mục Địa bàn cần ưu tiên | Chỉ lý do ưu tiên và trạng thái tiếp cận. Dân số tham chiếu không phải số người bị nạn. |
| 01:20–02:20 | Mở **Tuyến**, so đường chính với đường vòng | “Đường chính bị chặn. Đường vòng có điểm vượt khe chưa rõ tình trạng, cần xác minh trước khi sử dụng.” |
| 02:20–03:15 | Chọn điểm vượt khe; xem thời điểm và nguồn; bấm **Nậm Khắt** hoặc X để đóng chi tiết | Trở về đúng địa bàn, tab và tuyến đang xem. Không cần mở hết nguồn của sự kiện. |
| 03:15–04:20 | Mở **Thông báo**, chọn **Xem chi tiết**, đọc tin về điểm vượt khe; chọn **Cập nhật bản đồ** | “Tin quan sát 09:40, nhận 09:45 cho biết đường vòng cũng bị chặn. Cả hai tuyến trong dữ liệu đều có đoạn bị chặn; phải xác minh phương án tiếp cận khác.” |
| 04:20–05:00 | Mở **Mặt cắt địa hình**, đọc vị trí trên biểu đồ và bản đồ. Xem 3D nếu cần | Địa hình dọc hình tuyến, độ dốc từ DEM. Không coi là số đo mặt đường. |

Nếu cần đối chiếu mã đường, mở chi tiết đoạn: **NR-18** cho đường chính và **PR-7** cho phần đường vòng qua sườn núi. Đây là mã trong bộ mô phỏng, chưa xác nhận là số hiệu đường ngoài thực địa; không cần đọc ID từng đoạn.

Không mở so ảnh, ETA hay xuất PNG: bản hiện tại chưa có những kết quả đó. Đọc thông báo không đổi bản đồ; chỉ nút **Cập nhật bản đồ** áp dụng tin từ bộ dữ liệu chuẩn bị trước. Nếu rút ngắn buổi trình diễn, giữ phần địa bàn, tuyến và tin mới; bỏ phần 3D/mặt cắt. Tab **Đường sá** dùng khi cần rà toàn mạng, không bắt buộc trong luồng này.

## Trước khi trình diễn

- Chạy `npm ci` nếu chưa cài dependency; `npm test`, `npm run test:dataset`, `npm run build` trong `DEM_to_3D/viewer`. Các lệnh tự chuẩn bị file địa hình từ bản chuẩn trong Git; `npm run validate:dataset` kiểm tra riêng bản chép. Mở thư mục `dist` qua HTTP trên máy trình chiếu theo [README](../../README.md).
- Thử luồng trên đúng trình duyệt, độ phân giải và GPU sẽ dùng. Tải lại bằng trình duyệt sạch khi ngắt Internet; nền EOX có thể thiếu nhưng địa hình và luồng chính vẫn phải mở.
- Chuẩn bị ảnh hoặc video quay từ cùng bản build để dự phòng. Nếu WebGL lỗi, dùng bản ghi; chế độ 2D hiện cũng phụ thuộc WebGL.

Các đầu ra còn thiếu và mốc hoàn thiện nằm trong [bảng công việc SIC](../tasks/sic-2026.md).
