// Nội dung Thư viện — chỉnh sửa trực tiếp; có thể thay bằng block components sau.

export const CONTENT_HTML = `
<p class="intro">Khi nhìn một mẫu, đôi khi chi tiết là kẻ thù của tỉ lệ. <strong>Phương pháp vẽ Silhouette</strong> yêu cầu bạn đọc <em>hình dáng tổng thể</em> — phần đặc và phần trống — trước khi đụng đến đường nét bên trong. Đây là cách nhanh nhất để “bắt dáng” đúng.</p>

<div class="stats break-half">
  <div class="stat"><div class="stat-num">2D</div><div class="stat-label">Ưu tiên</div><div class="stat-sub">Hình phẳng trước khối</div></div>
  <div class="stat"><div class="stat-num">±</div><div class="stat-label">Không gian âm</div><div class="stat-sub">Quan trọng như vật</div></div>
  <div class="stat"><div class="stat-num">Notan</div><div class="stat-label">Sáng — tối</div><div class="stat-sub">Phân mảng đơn giản</div></div>
</div>

<div class="div-sec">
  <div class="div-num"><em>01</em></div>
  <div class="div-meta">
    <p class="div-kicker">Định nghĩa</p>
    <h2 class="div-title">Silhouette là gì?</h2>
  </div>
</div>

<p><strong>Silhouette</strong> là <em>hình bìa</em> của đối tượng: ranh giới giữa vùng đặc (vật) và nền, nhìn như một khối đen liền (hoặc một mảng sáng trên nền tối). Trong thực hành, bạn thường bắt đầu bằng một khối đơn giản hoặc hai mức sáng-tối (notan) để kiểm tra xem người xem có nhận ra <strong>chủ đề</strong> ngay từ xa không.</p>

<p>Silhouette khác <strong>contour</strong> ở chỗ: contour đi theo biên; silhouette nhấn <strong>toàn bộ khối nhận diện</strong> — kể cả khi bạn chưa vẽ đường nét chi tiết bên trong.</p>

<div class="gls">
  <p class="gls-head">A — Thuật ngữ</p>
  <div class="gls-body">
    <div class="gls-item"><p class="gls-term">Negative space<small>Không gian âm</small></p><p class="gls-def">Hình dạng của khoảng trống quanh vật — dùng để đo và chỉnh tỉ lệ.</p></div>
    <div class="gls-item"><p class="gls-term">Notan<small>Nhị phân sáng-tối</small></p><p class="gls-def">Chia bài thành 2–3 mức để thấy mảng lớn trước khi vào nửa tông.</p></div>
    <div class="gls-item"><p class="gls-term">Graphic read<small>Đọc hình</small></p><p class="gls-def">Khả năng nhận ra đối tượng chỉ qua dáng tổng thể.</p></div>
    <div class="gls-item"><p class="gls-term">Silhouette test<small>Thử dáng</small></p><p class="gls-def">Thu nhỏ màn hình hoặc nhìn từ xa — nếu mất nhận diện, bài chưa rõ dáng.</p></div>
  </div>
</div>

<div class="mosaic">
  <div class="mosaic-big">
    <img src="/img/phuong-phap-ve-silhouette/hero-cover.png" alt="Ví dụ đọc silhouette và khối sáng tối" />
  </div>
  <div class="mosaic-small">
    <img src="/img/phuong-phap-ve-silhouette/thumbnail.jpg" alt="Phác silhouette nhanh" />
  </div>
  <div class="mosaic-small">
    <img src="/img/phuong-phap-ve-silhouette/hero-cover.png" alt="So sánh không gian âm" />
  </div>
</div>

<div class="div-sec">
  <div class="div-num"><em>02</em></div>
  <div class="div-meta">
    <p class="div-kicker">Quy trình</p>
    <h2 class="div-title">Từ khối đến ranh giới</h2>
  </div>
</div>

<p>Một lộ trình ngắn gọn cho buổi tập 15–30 phút:</p>

<div class="el-intro">
  <div class="el-intro-n">4</div>
  <p class="el-intro-t">Nhanh — nhưng có thứ tự.</p>
</div>

<div class="el-list">
  <div class="el-item">
    <div class="el-item-text">
      <span class="el-n">01</span>
      <p class="el-name">Nhìn mờ <em>Squint</em></p>
      <p class="el-desc">Híp mắt để gom chi tiết thành mảng lớn. Xác định điểm sáng nhất và tối nhất.</p>
    </div>
  </div>
  <div class="el-item">
    <div class="el-item-text">
      <span class="el-n">02</span>
      <p class="el-name">Khối nền <em>Mass-in</em></p>
      <p class="el-desc">Phủ một lớp nhẹ (hoặc tô đặc) theo dáng tổng — chưa vẽ chi tiết.</p>
    </div>
  </div>
  <div class="el-item">
    <div class="el-item-text">
      <span class="el-n">03</span>
      <p class="el-name">Đo không gian âm</p>
      <p class="el-desc">So sánh khoảng trống giữa tay và thân, giữa đầu và khung — lỗi tỉ lệ thường nằm ở đây.</p>
    </div>
  </div>
  <div class="el-item">
    <div class="el-item-text">
      <span class="el-n">04</span>
      <p class="el-name">Silhouette test</p>
      <p class="el-desc">Chụp ảnh thu nhỏ bài: nếu vẫn đọc được hành động/chủ đề, mới đi sâu vào đường bao và chi tiết.</p>
    </div>
  </div>
</div>

<div class="pq">
  <p class="pq-text">Nếu hình bìa không “đứng”, <em>mọi chi tiết bên trong chỉ làm sai rõ hơn.</em></p>
  <span class="pq-cite">— Nguyên tắc thiết kế hình</span>
</div>

<div class="div-sec">
  <div class="div-num"><em>03</em></div>
  <div class="div-meta">
    <p class="div-kicker">Thực hành</p>
    <h2 class="div-title">Bài tập gợi ý</h2>
  </div>
</div>

<div class="tips">
  <div class="tip"><span class="tip-n">01</span><div class="tip-c"><p class="tip-t">Chỉ tô silhouette</p><p class="tip-d">5 phút: chỉ một màu đặc + nền, không đường viền chi tiết.</p></div></div>
  <div class="tip"><span class="tip-n">02</span><div class="tip-c"><p class="tip-t">Đổi nền</p><p class="tip-d">Vẽ vật sáng trên nền tối (hoặc ngược lại) để thấy ranh giới rõ.</p></div></div>
  <div class="tip"><span class="tip-n">03</span><div class="tip-c"><p class="tip-t">Trừ đất</p><p class="tip-d">Với chì than: tô nền trước, chùi sáng để tạo silhouette — luyện nhận diện mép sáng.</p></div></div>
  <div class="tip"><span class="tip-n">04</span><div class="tip-c"><p class="tip-t">So khung</p><p class="tip-d">Kẻ khung chữ nhật quanh mẫu và quanh bài; so chiều ngang/dọc từng phần.</p></div></div>
</div>

<div class="dd break-half">
  <div class="dd-col good">
    <div class="dd-head"><span class="dd-badge">+</span><span class="dd-title">Nên làm</span></div>
    <ul class="dd-list">
      <li>Ưu tiên nhận diện từ xa trước khi zoom vào chi tiết</li>
      <li>Dùng không gian âm như “thước đo” thứ hai</li>
      <li>Giữ notan đơn giản (2–3 mức) ở phác đầu</li>
    </ul>
  </div>
  <div class="dd-col bad">
    <div class="dd-head"><span class="dd-badge">−</span><span class="dd-title">Nên tránh</span></div>
    <ul class="dd-list">
      <li>Vẽ mắt/mũi ngay khi dáng chưa khóa</li>
      <li>Quá nhiều đường nét nhỏ khiến mất khối</li>
      <li>Bỏ qua thử silhouette vì “nhìn là biết”</li>
    </ul>
  </div>
</div>

<div class="div-sec" id="sec-5">
  <div class="div-num"><em>04</em></div>
  <div class="div-meta">
    <p class="div-kicker">Liên hệ</p>
    <h2 class="div-title">Ba môn thực hành</h2>
  </div>
</div>

<p>Kỹ năng đọc silhouette hỗ trợ trực tiếp các môn nền tảng:</p>

<div class="subj-row break-half">
  <div class="subj hh" style="background-image:url(/img/co-so-tao-hinh/subj-01-hh.jpg);background-size:cover;background-position:center">
    <span class="subj-tag">Khối V</span>
    <h4>Hình họa</h4>
  </div>
  <div class="subj tt" style="background-image:url(/img/co-so-tao-hinh/subj-02-bc.png);background-size:cover;background-position:center">
    <span class="subj-tag">Khối H</span>
    <h4>Bố cục màu</h4>
  </div>
  <div class="subj tt" style="background-image:url(/img/co-so-tao-hinh/subj-03-tt.jpg);background-size:cover;background-position:center">
    <span class="subj-tag">Nền tảng</span>
    <h4>Trang trí màu</h4>
  </div>
</div>

<div class="key break">
  <p class="key-lbl">⭐ Điểm mấu chốt</p>
  <p class="key-t">Silhouette là <em>bài kiểm tra thiết kế hình</em> cho mọi thể loại.</p>
  <p class="key-d">Khóa được dáng tổng thể và không gian âm, bạn giảm hàng loạt lỗi tỉ lệ trước khi đầu tư vào khối và chi tiết.</p>
</div>

<div class="div-sec">
  <div class="div-num"><em>05</em></div>
  <div class="div-meta">
    <p class="div-kicker">FAQ</p>
    <h2 class="div-title">Câu hỏi thường gặp</h2>
  </div>
</div>

<div class="faq">
  <details open>
    <summary>Silhouette có phải chỉ dùng cho nhân vật?<span class="faq-icon">−</span></summary>
    <p>Không — tĩnh vật, kiến trúc, cảnh đều cần đọc dáng tổng. Nguyên lý “graphic read” áp dụng cho mọi chủ đề.</p>
  </details>
  <details>
    <summary>Khác gì với vẽ giới hạn (contour)?<span class="faq-icon">+</span></summary>
    <p>Contour nhấn đường biên; silhouette nhấn khối nhận diện và đối lập sáng-tối. Hai phương pháp bổ sung: có thể contour sau khi silhouette đã trôi chảy.</p>
  </details>
  <details>
    <summary>Cần bao lâu để quen?<span class="faq-icon">+</span></summary>
    <p>Vài tuần với 20–30 phút mỗi ngày: mắt sẽ tự gom chi tiết thành mảng. Hãy đánh giá bài bằng ảnh thu nhỏ thay vì chỉ nhìn sát.</p>
  </details>
</div>
`;

export const VIDEO_URL = "";

export const VIDEO_REF_URL = "";
