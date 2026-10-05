# Đánh giá GIS và viễn thám

Cập nhật: 2026-10-05. Phạm vi: web DEAR và proposal SIC, trang 2–3. Đây là rà soát sản phẩm và tài liệu, chưa thử với người trực hoặc nghiệm thu dữ liệu.

## Kết luận

Web đủ để trình diễn sự kiện → ảnh hưởng → địa bàn ưu tiên → phương án tiếp cận → căn cứ. Chưa đủ để vận hành phân tích viễn thám: nhận định đang dùng dữ liệu mô phỏng, chưa có chuỗi xử lý SAR/AI và kiểm chứng hiện trường.

Ưu tiên được tính bằng quy tắc, tuyến bằng Dijkstra. LLM không quyết định thứ tự cứu hộ. Xem [phương pháp hiện tại](../architecture/response-analysis.md) và [kết quả kiểm tra](workspace-review.md).

## Thứ tự cải thiện

| Ưu tiên | Vấn đề | Kết quả cần có |
|---|---|---|
| 1. Thao tác | Khóa bộ chọn, panel dịch vị trí, khó kết thúc/chỉnh hình | Đổi công cụ được, giữ kết quả hợp lệ, header đứng yên. Click/Enter/nhấp đúp có hành vi thống nhất |
| 2. Đọc tình huống | Nhiều khối giải thích cạnh tranh với quyết định chính | Màn đầu giữ sự kiện, giờ cập nhật, địa bàn ưu tiên và đường cản trở. Chi tiết địa bàn giữ phương án và việc cần kiểm tra. Phương pháp/metadata mở khi cần |
| 3. Căn cứ | Bản ghi văn bản chưa thay thế bằng chứng ảnh | Từ đoạn đường/điểm ảnh hưởng mở đúng ảnh hoặc báo cáo gốc, vị trí, giờ quan sát và kết luận. Phân biệt dữ liệu thiếu với nhận định chưa chắc chắn |
| 4. Sản phẩm bản đồ | Proposal có vùng sạt lở/ngập, khu cô lập và H. Hiện chủ yếu có điểm ảnh hưởng và H đề xuất | Polygon có nguồn, ngày và mức xác minh. Chỉ vẽ phạm vi khi có dữ liệu. Kết luận cô lập cần mạng tiếp cận đủ vùng. H cần khảo sát khả năng sử dụng |
| 5. Dữ liệu ảnh | Có so GeoTIFF nhưng chưa có cặp ảnh được RS duyệt | Ngày thu nhận, cảm biến, độ phân giải, mức xử lý, vùng dữ liệu hợp lệ và mask chất lượng. Nền Sentinel 2016 chỉ làm bối cảnh |
| 6. Đọc bản đồ theo tỷ lệ | Đã có gom điểm và tránh chồng nhãn, cần kiểm trên dữ liệu thực | Nhãn ít khi zoom xa, giữ đối tượng đang chọn và ưu tiên. Nền giảm tương phản, lớp tình huống nổi bật. Ký hiệu có hình/nét bổ sung màu |
| 7. Bối cảnh khu vực | Khi mất mạng, ngoài ảnh địa hình còn trống | Chuẩn bị nền khu vực có quyền sử dụng cho gói demo. Giữ rõ phạm vi DEM, AOI và vùng đã phân tích |

Hai mục đầu phục vụ demo ngay. Dữ liệu ảnh và sản phẩm phân tích cần phối hợp RS/AI/BA. Skill và cải thiện CSS không thay thế dữ liệu đã kiểm chứng.

## Quy tắc giao diện

| Câu hỏi | Quyết định cho DEAR | Căn cứ |
|---|---|---|
| Dấu cộng để mở rộng có sai chuẩn GIS? | Không. Dùng chevron nét mảnh để phân biệt mở nội dung với zoom/thêm hình | [Calcite Accordion](https://developers.arcgis.com/calcite-design-system/components/accordion/) hỗ trợ chevron, caret và plus-minus. [W3C Disclosure](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/) quy định hành vi và trạng thái, không bắt buộc một hình icon |
| Cái gì được thu gọn? | Từng đoạn đo, nguồn và tùy chọn. Kết quả, trạng thái đường và hành động tiếp theo luôn thấy | [Calcite Block](https://developers.arcgis.com/calcite-design-system/components/block/) tổ chức nhóm điều khiển trong panel và khuyến cáo không giấu thông tin thiết yếu |
| Kết thúc phép đo thế nào? | Nhấp đúp, Enter hoặc nút Kết thúc. Kéo bản đồ không kết thúc phép đo | [ArcGIS Map Viewer](https://doc.arcgis.com/en/arcgis-online/get-started/measure-mv.htm) dùng click để thêm đỉnh, nhấp đúp để kết thúc và vẫn cho pan |
| Có cần ghi mọi giới hạn trên bản đồ? | Chỉ hiện cảnh báo ảnh hưởng trực tiếp tới thao tác/kết luận. CRS, cách tính và nguồn ở thông tin công cụ/lớp | Quyết định thiết kế của DEAR. Không xóa nguồn hoặc giới hạn khỏi metadata/bản xuất |

UNOSAT là tham chiếu về thứ bậc bản đồ, lớp ảnh hưởng, nguồn và ngày. [PDF Nepal 2024](https://unosat.org/static/unosat_filesystem/3990/UNOSAT_A3_Natural_Protrait_FL20240928NPL_01Oct2024.pdf) tách vùng phân tích, nước thường xuyên và phạm vi nước theo ngày, đồng thời ghi hạn chế phân tích radar. Không cần đưa toàn bộ ghi chú lên bản đồ web, nhưng nguồn và giới hạn phải đọc được khi mở lớp/bản xuất. Đây là sự kiện khác với [web Nepal 2026](https://unosat.org/products/4256), chưa kiểm tra đầy đủ tương tác trực tiếp trong lượt này.

## Skill đã khảo sát

Danh mục curated của OpenAI chưa có skill chuyên GIS. Các nguồn dưới đây đã đọc nội dung, chưa cài vào môi trường.

| Skill và nguồn | Dùng để làm gì | Mức phù hợp |
|---|---|---|
| [mapbox-cartography](https://github.com/mapbox/mapbox-agent-skills/blob/main/skills/mapbox-cartography/SKILL.md), Mapbox | Thứ bậc lớp, màu nền, nhãn theo tỷ lệ, ký hiệu dễ phân biệt | Ưu tiên tham khảo ngay. Áp dụng nguyên tắc cho Leaflet/Three, không chép API Mapbox |
| [web-design-guidelines](https://github.com/vercel-labs/agent-skills/blob/main/skills/web-design-guidelines/SKILL.md), Vercel Labs | Rà spacing, focus, điều khiển biểu mẫu, phản hồi trạng thái và accessibility | Phù hợp cho toàn bộ panel/công cụ. Checklist không tự tạo ra thiết kế đẹp |
| [playwright](https://github.com/openai/skills/tree/main/skills/.curated/playwright), OpenAI | Kiểm tương tác thật, chụp màn hình, desktop/mobile | Phù hợp ngay. Dự án đã có bộ kiểm tra Playwright, bổ sung các lỗi người dùng gặp |
| [remote-sensing-analysis](https://github.com/muend/geoai-skills/blob/main/skills/remote-sensing-analysis/SKILL.md), cộng đồng | Chuẩn bị ảnh, calibration, mask, chỉ số và kiểm chứng phân loại | Dùng làm checklist trao đổi với RS. Không phải tiêu chuẩn hoặc quy trình SAR đã được nghiệm thu. Đối chiếu tài liệu cảm biến trước khi thực thi |
| [MapLibre Agent Skills](https://github.com/maplibre/maplibre-agent-skills), MapLibre | Cartography, terrain, tile sources, glyphs và PMTiles | Hữu ích khi nghiên cứu nền bản đồ về sau. Không cần đổi engine cho demo chỉ để dùng skill |

Nên bắt đầu với cartography, web-design-guidelines và Playwright. Khi có ảnh thật, chọn thêm skill viễn thám theo bài toán cụ thể và để RS duyệt quy trình.
