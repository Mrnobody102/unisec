# Yêu cầu sản phẩm

> Trạng thái: Đích bàn giao SIC ngày 20/10, chưa nghiệm thu · Phụ trách: PO · Cập nhật: 2026-10-02

## Mục tiêu demo

DEAR hỗ trợ cán bộ ứng phó và chính quyền địa phương đánh giá tác động sau lũ quét/sạt lở miền núi. Bản SIC dùng **một sự kiện, một khu vực, một cộng đồng trọng tâm và hai tuyến tiếp cận**, với dữ liệu chuẩn bị trước. Đây là **đích bàn giao**, không phải danh sách chức năng đã chạy. [Bản demo 03/10](../operations/demo.md) và [tiến độ hiện tại](../tasks/sic-2026.md) ghi rõ phần đã có và còn thiếu.

| Bước | Câu hỏi cần trả lời | Kết quả người xem nhận được |
|---|---|---|
| Sự kiện | Điều gì xảy ra, ở đâu, khi nào? | Bản đồ, thời điểm và phạm vi theo dõi |
| Đường sá | Đoạn nào bị chặn, đoạn nào chưa rõ? | Trạng thái từng đoạn và căn cứ khi mở chi tiết |
| Địa bàn | Nơi nào cần chú ý trước, vì sao? | Lý do ưu tiên, dân số tham chiếu và khả năng tiếp cận |
| Tuyến trong chi tiết địa bàn | Đường chính và đường vòng khác nhau thế nào? | Tình trạng từng đoạn, điểm cần xác minh và nguồn khi cần |

Định hướng theo [proposal, trang 1–3](../../references/SIC2026/VinSpace_SIC2026_proposal.pdf). QTT là đối tác/nhà tài trợ tiềm năng; vai trò cụ thể nằm trong [kế hoạch sau SIC](../plans/pilot.md).

## Chức năng cần bàn giao

| ID | Chức năng | Người dùng làm được |
|---|---|---|
| P01 | Mở tình huống | Xem tên sự kiện, ngày, ranh giới khu vực; đưa bản đồ về vị trí ban đầu |
| P02 | Bản đồ 2D/3D | Xem ảnh và địa hình; có chế độ 2D dùng được khi 3D/WebGL gặp lỗi |
| P03 | Lớp dữ liệu | Bật/tắt nguy cơ, tác động, cộng đồng, đường, điểm ứng phó; xem chú giải và nguồn/ngày |
| P04 | Bằng chứng tác động | So ảnh trước/sau đủ chất lượng; mở bằng chứng của một nhận định |
| P05 | Thông tin cộng đồng | Xem lý do cần ưu tiên, tình trạng tiếp cận, dân số có nguồn hoặc nhãn thiếu dữ liệu |
| P06 | So hai tuyến | Xem cùng điểm đầu/cuối; so chiều dài, ETA, tình trạng đường và biểu đồ độ cao |
| P07 | Xuất bản tóm tắt | Xem trước và lưu PNG cùng dữ liệu JSON khớp bản đồ, tuyến chọn, bằng chứng, nguồn/ngày và điểm chưa xác minh |

Phạm vi theo [S02](../../references/SIC2026/DEAR_SIC2026.docx) và [S03](../../references/SIC2026/DEAR_SIC2026_WebApp.pdf). Cách kiểm tra từng chức năng: [A01–A10](../quality/acceptance.md). Bố cục màn hình: [thiết kế giao diện](interface.md).

**Bản chạy 03/10:** đã có bản đồ địa hình, danh sách đường/địa bàn, hai tuyến cho Nậm Khắt, nguồn và thời điểm của bộ dữ liệu mô phỏng. Chưa có ảnh trước/sau để so sánh, ETA có căn cứ, PNG/JSON hay chế độ 2D độc lập WebGL. Không giới thiệu các mục này như chức năng đang hoạt động.

| Phạm vi | Quyết định |
|---|---|
| Phải có | Luồng 2D đầy đủ, bằng chứng, hai tuyến đã kiểm tra, xuất PNG |
| Chốt tại G2 | 3D và so ảnh trước/sau; nếu không đạt chất lượng thì ghi rõ phần rút gọn |
| Làm thêm khi luồng chính ổn định | Xuất PDF |
| Sau SIC | Nhận/xử lý ảnh tự động, điểm cô lập tự động, tự tìm tuyến, vùng đáp trực thăng, dự báo ngập, GeoPackage, nhiều sự kiện/tài khoản |

## Chọn dữ liệu và diễn giải kết quả

Chọn một sự kiện lịch sử miền núi và một tình huống dự phòng. RS/PO kiểm tra bốn điều kiện:

- Có bằng chứng liên hệ **tác động thiên tai → đường/cộng đồng → phương án tiếp cận**.
- Có ảnh, dữ liệu độ cao, đường/cộng đồng và hai tuyến cùng điểm đầu/cuối; xác định người kiểm tra nội dung.
- Có quyền trình diễn, xuất ảnh và lưu bộ dữ liệu trên máy demo.
- Biết nguồn, ngày và chất lượng dữ liệu; dùng ranh giới hành chính phù hợp thời điểm sự kiện.

App phân biệt **quan sát, suy luận, báo cáo và xác minh thực địa**. Đường giao vùng nghi tác động chưa đủ kết luận bị chặn; độ cao địa hình chưa đủ kết luận xe đi được. Quy tắc tính và gắn nhãn nằm trong [đặc tả dữ liệu](../architecture/data-contract.md).

Mục tiêu tạo bản đồ trong 3–6 giờ của proposal cần đo trên quy trình thực. Bản demo dùng dữ liệu chuẩn bị trước chưa chứng minh được mục tiêu này.
