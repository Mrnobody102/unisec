# Phân tích ứng phó

Cập nhật: 2026-10-02. Quy tắc thử nghiệm cho gói dữ liệu mô phỏng Chế Tạo, đối chiếu proposal trang 2–3.

## Đầu vào và kết quả

| Đầu vào | Phép xử lý | Kết quả trên màn hình |
|---|---|---|
| Báo cáo ảnh hưởng và đoạn đường liên quan | Đối chiếu ID, nguồn, thời điểm và trạng thái | Đoạn bị chặn hoặc cần xác minh |
| Mạng đường, điểm tập kết và địa bàn | Dijkstra theo chiều dài, loại đoạn bị chặn | Phương án tiếp cận và khoảng cách |
| Các tuyến đã biết | Tổng hợp trạng thái đoạn | Chưa rõ, có tuyến bị chặn hoặc chưa đủ dữ liệu |
| Tiếp cận, liên lạc, yêu cầu hỗ trợ | Quy tắc `access-v1` | Mức ưu tiên, lý do và việc cần xử lý |
| Hình tuyến, DEM | Lấy mẫu độ cao theo chiều dài | Mặt cắt, độ dốc DEM và khoảng thiếu |
| Tốc độ giả định trong gói | Cộng thời gian từng đoạn | Khoảng thời gian nếu thông tuyến |

Nhận diện sạt lở bằng AI là bước xử lý ảnh **chưa tích hợp**. Các điểm ảnh hưởng hiện có là đầu vào mô phỏng. Mức ưu tiên và tuyến do hàm có quy tắc tính, không do LLM tạo.

## Quy tắc hiện hành

| Kết quả | Điều kiện |
|---|---|
| Ưu tiên cao | Có yêu cầu khẩn cấp, báo cáo ảnh hưởng trên đường tiếp cận, hoặc mất liên lạc kèm đoạn bị ảnh hưởng |
| Theo dõi | Dữ liệu chưa đủ, đoạn chưa rõ hoặc chưa xác minh khả năng đi qua |
| Mức thấp trong mô hình | Liên lạc được và chưa ghi nhận chặn trên tuyến đã biết. Không đồng nghĩa an toàn |
| Chưa đủ dữ liệu tuyến | Không có kết nối hình học từ điểm tập kết đến địa bàn |
| Các tuyến đã biết bị chặn | Có đoạn bị chặn trên mọi phương án tìm thấy. Không kết luận hoàn toàn cô lập |

Mạng đường mẫu là đồ thị hai chiều nối tại đầu mút trùng tọa độ. Không tự nối đường chỉ vì hai nét giao nhau. Tuyến gợi ý loại đoạn bị chặn, nhân chi phí đoạn chưa rõ với 3. Đây là giả định thử nghiệm, cần RS/PO duyệt. Đường chính hoặc đường vòng bị chặn vẫn có thể hiển thị để kiểm tra, không phải tuyến được khuyến nghị sử dụng.

Tìm đường có trọng số tham khảo [NetworkX: shortest paths](https://networkx.org/documentation/stable/reference/algorithms/generated/networkx.algorithms.shortest_paths.generic.shortest_path.html). Hệ số chi phí và quy tắc ưu tiên là chính sách của bản thử nghiệm, không lấy từ tiêu chuẩn này.

## Ước tính di chuyển

| Loại đường | Giả định trong gói mô phỏng |
|---|---|
| Đường chính | Xe bán tải 4x4, 15 đến 25 km/h |
| Đường phụ | Xe bán tải 4x4, 8 đến 15 km/h |
| Tuyến có đường mòn | Đi bộ toàn tuyến, 3 đến 5 km/h |

Khoảng thời gian làm tròn ra ngoài theo 5 phút. Chưa tính dừng kiểm tra, thông đường hoặc tập kết. Tuyến bị chặn không có ETA. Thông số này chỉ phục vụ trình diễn, không phải tốc độ được khảo sát.

## Ví dụ Nậm Khắt

| Snapshot | Căn cứ | Kết quả |
|---|---|---|
| 09:31 | Đường chính bị chặn, mất liên lạc, đường vòng có điểm vượt khe chưa rõ | Ưu tiên cao. Xem đường vòng và kiểm tra điểm vượt khe |
| 09:45 sau khi áp dụng tin | Đất đá được báo chặn đoạn vượt khe | Hai tuyến đã biết đều có đoạn bị chặn. Xác minh phương án khác, không hiển thị ETA thực thi |

RS/PO cần duyệt quy tắc, dữ liệu đầu vào và điều kiện phương tiện trước sử dụng thực tế. Community Isolation Score trong proposal còn cần mạng đường đủ vùng và mô hình nghiệp vụ được kiểm chứng.
