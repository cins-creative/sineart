// Nội dung Thư viện — chỉnh sửa trực tiếp; có thể thay bằng block components sau.

export const CONTENT_HTML = `
<p class="intro">Trong mỹ thuật, đặc biệt <strong>Trang trí màu</strong>, <em>cách điệu</em> là kỹ năng biến hình ảnh thực thành hình mang phong cách rõ ràng mà vẫn <strong>đọc được đối tượng gốc</strong>. Bài viết tóm tắt chuỗi khái niệm và bốn bước cốt lõi (đồng bộ với video bài giảng phía trên).</p>

<div class="stats break-half">
  <div class="stat"><div class="stat-num">5</div><div class="stat-label">Khái niệm</div><div class="stat-sub">Ý tưởng → Họa tiết</div></div>
  <div class="stat"><div class="stat-num">1</div><div class="stat-label">Nguyên tắc vàng</div><div class="stat-sub">Giữ đặc trưng</div></div>
  <div class="stat"><div class="stat-num">4</div><div class="stat-label">Bước thực hành</div><div class="stat-sub">Silhouette → Chi tiết</div></div>
</div>

<div class="div-sec">
  <div class="div-num"><em>01</em></div>
  <div class="div-meta">
    <p class="div-kicker">Chuỗi hình thành tác phẩm</p>
    <h2 class="div-title">Phân biệt Ý tưởng, Concept, Cách điệu, Trang trí và Họa tiết</h2>
  </div>
</div>

<p>Trước khi vẽ chi tiết, cần nắm <strong>thứ tự</strong> các lớp nghĩa — video nhấn mạnh ranh giới giữa các giai đoạn.</p>

<div class="gls">
  <p class="gls-head">A — Năm khái niệm</p>
  <div class="gls-body">
    <div class="gls-item"><p class="gls-term">Ý tưởng <small>Idea</small></p><p class="gls-def">Suy nghĩ sơ khai, mơ hồ trong đầu — ví dụ “vẽ một con cú đang cưỡi chổi bay”.</p></div>
    <div class="gls-item"><p class="gls-term">Concept</p><p class="gls-def">Cụ thể hóa ý tưởng qua nhiều phương án phác; chọn hình mẫu phù hợp nhất trước khi đi sâu.</p></div>
    <div class="gls-item"><p class="gls-term">Cách điệu <small>Stylize</small></p><p class="gls-def">Từ hình concept đã chốt, biến đổi tỷ lệ, thêm phụ kiện, làm mới dáng nhưng vẫn nhận ra đối tượng.</p></div>
    <div class="gls-item"><p class="gls-term">Trang trí <small>Decoration</small></p><p class="gls-def">Đưa đối tượng đã cách điệu vào ứng dụng: tường, lồng đèn, bát đĩa, sản phẩm…</p></div>
    <div class="gls-item"><p class="gls-term">Họa tiết <small>Pattern</small></p><p class="gls-def">Các hoa văn theo chủ đề (máy móc, kỷ hà, thực vật…) dùng để lấp và nhấn bề mặt — khác với “trang trí” là bối cảnh sử dụng.</p></div>
  </div>
</div>

<div class="mosaic">
  <div class="mosaic-big">
    <img src="/img/cach-dieu/hero-cover.png" alt="Minh họa quy trình cách điệu" />
  </div>
  <div class="mosaic-small">
    <img src="/img/cach-dieu/thumbnail.jpg" alt="Phác concept nhiều phương án" />
  </div>
  <div class="mosaic-small">
    <img src="/img/cach-dieu/hero-cover.png" alt="Ứng dụng trang trí" />
  </div>
</div>

<div class="div-sec">
  <div class="div-num"><em>02</em></div>
  <div class="div-meta">
    <p class="div-kicker">Nguyên tắc cốt lõi</p>
    <h2 class="div-title">“Bất di bất dịch”: luôn giữ đặc trưng nhận diện</h2>
  </div>
</div>

<p>Dù biến đổi hình dáng hay tỷ lệ theo phong cách hoạt hình hay hình học, người vẽ <strong>bắt buộc</strong> giữ được dấu hiệu nhận biết của loài / đối tượng.</p>

<div class="cmp break-half">
  <div class="cmp-col l">
    <p class="cmp-lbl">Giữ đặc trưng</p>
    <p class="cmp-title">Đọc đúng loài</p>
    <ul class="cmp-list">
      <li>Cú: mắt to, “chân mày” / lông mặt đặc trưng</li>
      <li>Gà trống: mào, tư thế oai phong</li>
      <li>Nai: sừng — nếu mất sẽ thành loài khác</li>
    </ul>
  </div>
  <div class="cmp-col r">
    <p class="cmp-lbl">Phá đặc trưng</p>
    <p class="cmp-title">Mất nhận diện</p>
    <ul class="cmp-list">
      <li>Cách điệu quá đà khiến con chó “đọc” như con heo</li>
      <li>Chi tiết trang trí che mất silhouette gốc</li>
    </ul>
  </div>
</div>

<div class="pq">
  <p class="pq-text">Cách điệu là <em>phóng đại có kiểm soát</em>, không phải xóa dấu hiệu sinh học.</p>
  <span class="pq-cite">— Nguyên tắc nhận diện hình tượng</span>
</div>

<div class="div-sec">
  <div class="div-num"><em>03</em></div>
  <div class="div-meta">
    <p class="div-kicker">Bốn bước cốt lõi</p>
    <h2 class="div-title">Từ silhouette đến họa tiết đồng bộ</h2>
  </div>
</div>

<div class="el-intro">
  <div class="el-intro-n">4</div>
  <p class="el-intro-t">Thứ tự giúp không sa đà vào hoa văn quá sớm.</p>
</div>

<div class="el-list">
  <div class="el-item">
    <div class="el-item-text">
      <span class="el-n">01</span>
      <p class="el-name">Silhouette</p>
      <p class="el-desc">Tối ưu <strong>hình bóng viền ngoài</strong>: chỉ nhìn khối đặc cũng đoán được đối tượng. Tránh các phần dính vào nhau (đuôi dính chân, cánh dính thân) làm mất đọc hình.</p>
    </div>
  </div>
  <div class="el-item">
    <div class="el-item-text">
      <span class="el-n">02</span>
      <p class="el-name">Action line</p>
      <p class="el-desc">Xác định <strong>hướng chuyển động</strong> — đường dẫn mắt uyển chuyển, tránh nét gãy khúc khiến thị giác “khựng”. Tạo sức sống và liên kết với các yếu tố trong bố cục.</p>
    </div>
  </div>
  <div class="el-item">
    <div class="el-item-text">
      <span class="el-n">03</span>
      <p class="el-name">Cấu trúc lớn</p>
      <p class="el-desc">Chia rõ các phần (ví dụ cú: chân mày, mắt, mỏ, lông cổ, cánh, chân, đuôi). Giữ <strong>tỷ lệ sinh học cơ bản</strong> giữa các cụm — tránh cánh quá nhỏ so với thân bầu, v.v.</p>
    </div>
  </div>
  <div class="el-item">
    <div class="el-item-text">
      <span class="el-n">04</span>
      <p class="el-name">Chính — phụ &amp; họa tiết</p>
      <p class="el-desc">Chọn <strong>một điểm nhấn</strong> (sừng nai, lưng cá voi…) để trang trí mạnh; phần còn lại tối giản. Họa tiết phải <strong>đồng nhất chủ đề</strong> — ví dụ chủ đề cơ khí thì dùng bánh răng, vi mạch, góc cạnh; tránh trộn ngẫu hứng gây rối.</p>
    </div>
  </div>
</div>

<div class="div-sec">
  <div class="div-num"><em>04</em></div>
  <div class="div-meta">
    <p class="div-kicker">Thực hành</p>
    <h2 class="div-title">Phân tích thực → thư viện họa tiết → cách điệu</h2>
  </div>
</div>

<p>Quy trình đề xuất: (1) Phân tích kỹ <strong>cấu trúc thật</strong> của đối tượng; (2) Sưu tầm và tự xây <strong>bộ họa tiết</strong> theo chủ đề; (3) Chỉ sau đó mới tiến hành cách điệu — như vậy chi tiết có “ngôn ngữ” thống nhất và không phá silhouette/cấu trúc đã khóa.</p>

<div class="tips">
  <div class="tip"><span class="tip-n">01</span><div class="tip-c"><p class="tip-t">Bảng đặc trưng</p><p class="tip-d">Liệt kê 3–5 dấu hiệu không thể bỏ với mỗi loài — kiểm tra trước khi thêm pattern.</p></div></div>
  <div class="tip"><span class="tip-n">02</span><div class="tip-c"><p class="tip-t">Thumbnail chỉ bóng</p><p class="tip-d">Thu nhỏ bài hoặc nhìn xa: silhouette còn đọc thì mới đi tiếp.</p></div></div>
  <div class="tip"><span class="tip-n">03</span><div class="tip-c"><p class="tip-t">Một chủ đề pattern</p><p class="tip-d">Mỗi phương án cách điệu gắn một họ thị giác (thiên nhiên, cơ khí, dân gian…).</p></div></div>
  <div class="tip"><span class="tip-n">04</span><div class="tip-c"><p class="tip-t">Chính rõ — phụ nhạt</p><p class="tip-d">Điểm nhấn nhận phần lớn thời gian trang trí; phụ chỉ gợi ý.</p></div></div>
</div>

<div class="div-sec" id="sec-5">
  <div class="div-num"><em>05</em></div>
  <div class="div-meta">
    <p class="div-kicker">Liên hệ môn học</p>
    <h2 class="div-title">Ba môn thực hành</h2>
  </div>
</div>

<p>Cách điệu là cầu nối trực tiếp cho khối H — đặc biệt <strong>Trang trí màu</strong> và bố cục đề có giới hạn thời gian.</p>

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
  <p class="key-t">Cách điệu là <em>chắt lọc có chủ đích từ thực tế</em>, không phải ngẫu hứng nét đẹp.</p>
  <p class="key-d">Khóa silhouette → action line → cấu trúc → chính phụ &amp; họa tiết đồng bộ, song song với việc giữ đặc trưng nhận diện, bạn có thể tạo hình tượng vừa mới lạ vừa “đúng linh hồn” đối tượng gốc.</p>
</div>

<div class="div-sec">
  <div class="div-num"><em>06</em></div>
  <div class="div-meta">
    <p class="div-kicker">FAQ</p>
    <h2 class="div-title">Câu hỏi thường gặp</h2>
  </div>
</div>

<div class="faq">
  <details open>
    <summary>Trang trí và họa tiết khác nhau thế nào?<span class="faq-icon">−</span></summary>
    <p><strong>Trang trí</strong> là đặt hình đã cách điệu vào bối cảnh dùng (vật phẩm, không gian). <strong>Họa tiết</strong> là các mảng hoa văn lặp theo chủ đề trên bề mặt — thường dùng sau khi đã có silhouette và cấu trúc ổn.</p>
  </details>
  <details>
    <summary>Có nhảy thẳng từ ý tưởng sang họa tiết được không?<span class="faq-icon">+</span></summary>
    <p>Rất dễ sai tỉ lệ và mất đặc trưng. Nên đi qua concept (chọn phương án) và khóa cấu trúc trước khi nhồi pattern.</p>
  </details>
  <details>
    <summary>Nên xem video trước hay đọc bài trước?<span class="faq-icon">+</span></summary>
    <p>Có thể xem video bài giảng để nắm trình tự và ví dụ trực quan, rồi dùng bài viết này như sổ tay ôn nhanh các khái niệm và bốn bước.</p>
  </details>
</div>
`;

export const VIDEO_URL = "https://youtu.be/9p1EV_Ro4yY";

export const VIDEO_REF_URL = "";
