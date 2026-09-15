// news-samples.mjs — the three sample articles the team can practise on. They are drafts: visitors never see them.
// Content is plain HTML limited to the tags the editor produces (paragraphs, h2/h3, lists, tables, gift code, note).

export const SAMPLE_POSTS = [
  {
    id: 1,
    slug: 'mo-dang-ky-truoc-3q-dai-chien',
    title: 'Mở đăng ký trước 3Q Đại Chiến — nhận quà Tân Thủ ngày ra mắt',
    category: 'thong-bao',
    cover: '/3qdc-vi/home/anh-nen-slogan-vi.webp',
    summary: 'Đăng ký trước bằng số điện thoại để nhận bộ quà Tân Thủ và mở khoá mốc thưởng chung cho cả cộng đồng khi game chính thức ra mắt.',
    content: `<p>3Q Đại Chiến chính thức mở đăng ký trước từ hôm nay. Chủ công đăng ký sớm sẽ nhận bộ quà Tân Thủ ngay khi đăng nhập lần đầu, đồng thời góp phần mở khoá các mốc thưởng chung cho toàn máy chủ.</p>
<h2>Cách đăng ký trước</h2>
<ol><li>Vào trang chủ, bấm nút <strong>Đăng ký nhanh</strong>.</li><li>Nhập số điện thoại và mã xác nhận gửi qua SMS.</li><li>Nhận mã quà trong tin nhắn khi game ra mắt.</li></ol>
<h2>Mốc thưởng cộng đồng</h2>
<p>Quà được mở theo tổng số lượt đăng ký của cả cộng đồng. Mỗi mốc đạt được, mọi người đăng ký đều nhận.</p>
<div class="tbl"><table><thead><tr><th>Mốc đăng ký</th><th>Phần thưởng</th><th>Số lượng</th></tr></thead><tbody>
<tr><td>50.000</td><td>Nguyên Bảo</td><td>500</td></tr><tr><td>100.000</td><td>Thẻ chiêu mộ tướng</td><td>10</td></tr><tr><td>200.000</td><td>Tướng Triệu Vân (bản giới hạn)</td><td>1</td></tr><tr><td>300.000</td><td>Khung ảnh đại diện Ngũ Hổ Tướng</td><td>1</td></tr></tbody></table></div>
<h2>Mã quà Tân Thủ</h2>
<p>Mã dùng được một lần cho mỗi tài khoản, nhập trong mục <strong>Cài đặt → Nhập mã quà</strong>.</p>
<div class="gift"><div><small>Giftcode</small><code>3QDAICHIEN</code></div></div>
<div class="note"><strong>Lưu ý:</strong> 3Q Đại Chiến không bao giờ hỏi mật khẩu hay mã OTP qua tin nhắn. Hãy báo cho fanpage chính thức nếu nhận được yêu cầu như vậy.</div>`,
  },
  {
    id: 2,
    slug: 'su-kien-ket-nghia-dao-vien',
    title: 'Sự kiện Kết Nghĩa Đào Viên: mời bạn bè, nhận thẻ tướng Lưu Bị',
    category: 'su-kien',
    cover: '/3qdc-vi/home/tinh-nang-1-vi.webp',
    summary: 'Lập nhóm ba người trước ngày ra mắt để cùng nhận thẻ tướng Lưu Bị, Quan Vũ, Trương Phi và danh hiệu Huynh Đệ Đào Viên.',
    content: `<p>Ba người một lòng, chia ngọt sẻ bùi. Lập nhóm Kết Nghĩa trước ngày ra mắt để cùng nhận quà khởi đầu.</p>
<h2>Thể lệ</h2>
<ul><li>Mỗi nhóm tối đa 3 người đã đăng ký trước.</li><li>Trưởng nhóm gửi mã mời cho 2 bạn còn lại.</li><li>Nhóm đủ 3 người trước 23:59 ngày ra mắt được tính thưởng.</li></ul>
<h2>Phần thưởng</h2>
<div class="tbl"><table><thead><tr><th>Vai trò</th><th>Thẻ tướng</th></tr></thead><tbody><tr><td>Trưởng nhóm</td><td>Lưu Bị</td></tr><tr><td>Thành viên 2</td><td>Quan Vũ</td></tr><tr><td>Thành viên 3</td><td>Trương Phi</td></tr></tbody></table></div>`,
  },
  {
    id: 3,
    slug: 'cam-nang-tan-thu-doi-hinh-dau-tien',
    title: 'Cẩm nang tân thủ: 5 bước xây đội hình đầu tiên',
    category: 'cam-nang',
    cover: '/3qdc-vi/home/tinh-nang-3-vi.webp',
    summary: 'Chọn tướng chủ lực, cân bằng hàng trước hàng sau và tận dụng kỹ năng phe — những điều nên làm trong 3 ngày đầu chơi.',
    content: `<p>Đội hình tốt không cần toàn tướng hiếm. Năm bước dưới đây giúp bạn vượt ải cốt truyện nhanh trong những ngày đầu.</p>
<h2>1. Chọn một tướng chủ lực</h2><p>Dồn tài nguyên cho một tướng sát thương thay vì chia đều cho cả đội.</p>
<h2>2. Hai tướng hàng trước</h2><p>Tướng phòng thủ giữ vị trí, bảo vệ chủ lực khỏi đợt tấn công đầu.</p>
<h2>3. Ưu tiên cùng phe</h2><p>Ba tướng cùng phe mở hiệu ứng liên kết, tăng chỉ số cho cả đội.</p>
<h2>4. Nâng kỹ năng Nộ công</h2><p>Kỹ năng Nộ công quyết định trận đấu nhiều hơn chỉ số cơ bản.</p>
<h2>5. Đừng bỏ qua nhiệm vụ ngày</h2><p>Nhiệm vụ ngày cho đủ nguyên liệu nâng cấp trong tuần đầu.</p>`,
  },
];
