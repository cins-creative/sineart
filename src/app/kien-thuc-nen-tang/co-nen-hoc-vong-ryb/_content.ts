// Nội dung Thư viện — RYB vs hệ màu hiện đại (theo video Đồ họa Sine Art).

export const CONTENT_HTML = `
<p class="intro">Video kênh <strong>Đồ họa Sine Art</strong> thảo luận: <em>có nên bám vòng hòa sắc truyền thống Đỏ–Vàng–Xanh (RYB)</em> hay mở sang tư duy màu gần với khoa học hiện đại? Bài viết tóm tắt luận điểm chính — xem khối nhúng video phía trên để nghe trọn phân tích.</p>

<div class="stats break-half">
  <div class="stat"><div class="stat-num">RYB</div><div class="stat-label">Ba màu bậc một</div><div class="stat-sub">Đỏ · Vàng · Xanh lam</div></div>
  <div class="stat"><div class="stat-num">2D</div><div class="stat-label">Hạn chế</div><div class="stat-sub">Vòng trên mặt phẳng</div></div>
  <div class="stat"><div class="stat-num">↗</div><div class="stat-label">Gợi ý</div><div class="stat-sub">Munsell &amp; không gian 3D</div></div>
</div>

<div class="div-sec">
  <div class="div-num"><em>01</em></div>
  <div class="div-meta">
    <p class="div-kicker">Bối cảnh</p>
    <h2 class="div-title">Vòng RYB trong lò luyện thi và mỹ thuật phổ thông</h2>
  </div>
</div>

<p><strong>RYB</strong> là hệ quen thuộc ở nhiều lớp chuẩn bị thi khối H, V tại Việt Nam: ba màu “gốc” <strong>Đỏ, Vàng, Xanh lam</strong> để pha các màu thứ cấp và tam cấp. Ưu điểm rõ nhất là giúp người mới <strong>có cảm nhận ban đầu</strong> về pha trộn, tương phản và quan hệ màu — một lớp ngôn ngữ dễ vào.</p>

<div class="div-sec">
  <div class="div-num"><em>02</em></div>
  <div class="div-meta">
    <p class="div-kicker">Hạn chế</p>
    <h2 class="div-title">Khi so sánh với khoa học màu hiện đại</h2>
  </div>
</div>

<p>Video chỉ ra vài điểm khiến RYB <em>không đủ</em> nếu ta chỉ dừng ở vòng hai chiều:</p>

<div class="gls">
  <p class="gls-head">A — Ba nhóm vấn đề</p>
  <div class="gls-body">
    <div class="gls-item"><p class="gls-term">Không gian màu<small>2D vs 3D</small></p><p class="gls-def">Vòng RYB thể hiện tốt trên mặt phẳng “sắc”, trong khi các hệ như RGB/CMYK và mô hình 3 chiều (hue–value–chroma) mô tả đầy đủ sắc thái hơn — gần với cách thiết bị và in ấn thực sự hoạt động.</p></div>
    <div class="gls-item"><p class="gls-term">Gamut<small>Phạm vi pha được</small></p><p class="gls-def">Pha RYB với nhau dễ cho màu <strong>tối, đục</strong> hơn so với kết quả tương ứng trong không gian hiện đại — ví dụ đỏ pha xanh lam ra tím thường không “tươi” như magenta trên hệ cộng/trừ sắc kỹ thuật số.</p></div>
    <div class="gls-item"><p class="gls-term">Logic pha trộn</p><p class="gls-def">RYB không luôn giải thích được vì sao một số hỗn hợp ra <strong>xám bẩn</strong>; người học dễ phải nhớ “công thức” hoặc dựa <strong>cảm tính</strong> thay vì hiểu nguyên lý chung về sắc độ, độ bão hoà và không gian màu.</p></div>
  </div>
</div>

<div class="mosaic">
  <div class="mosaic-big">
    <img src="/img/co-nen-hoc-vong-ryb/hero-cover.png" alt="So sánh tư duy RYB và hệ màu hiện đại" />
  </div>
  <div class="mosaic-small">
    <img src="/img/co-nen-hoc-vong-ryb/thumbnail.jpg" alt="Vòng màu" />
  </div>
  <div class="mosaic-small">
    <img src="/img/co-nen-hoc-vong-ryb/hero-cover.png" alt="Pha màu thực hành" />
  </div>
</div>

<div class="pq">
  <p class="pq-text">Màu nào cũng có thể đi với nhau nếu bạn nắm <em>sắc độ, cường độ và không gian màu</em> — không nhất thiết một “cặp thần thánh” cố định.</p>
  <span class="pq-cite">— Ý chính trong video</span>
</div>

<div class="div-sec">
  <div class="div-num"><em>03</em></div>
  <div class="div-meta">
    <p class="div-kicker">Đề xuất</p>
    <h2 class="div-title">Munsell, logic và cảm nhận</h2>
  </div>
</div>

<p>Video gợi ý tìm hiểu <strong>hệ thống màu Munsell</strong> — có nền tảng rõ ràng hơn và tiệm cận khoa học màu hiện đại (hue, value, chroma). Đồng thời, dù học hệ nào, <strong>mục tiêu cuối</strong> vẫn là <em>cảm nhận (feel)</em> màu; song với người mới, hiểu đúng nguyên lý giúp học <strong>ít gò bó máy móc</strong> hơn là chỉ thuộc công thức pha ở lò luyện thi.</p>

<div class="cmp break-half">
  <div class="cmp-col l">
    <p class="cmp-lbl">Giữ giá trị RYB</p>
    <p class="cmp-title">Nền lịch sử</p>
    <ul class="cmp-list">
      <li>Nhiều họa sĩ lớn xuất phát từ quan sát &amp; pha pigment truyền thống</li>
      <li>Phù hợp giai đoạn làm quen cọ và màu vật lý</li>
    </ul>
  </div>
  <div class="cmp-col r">
    <p class="cmp-lbl">Nâng cấp tư duy</p>
    <p class="cmp-title">Kỷ nguyên đồ họa</p>
    <ul class="cmp-list">
      <li>Digital, in, màn hình — cần RGB/CMYK và không gian 3D</li>
      <li>Tránh rào cản kỹ thuật nếu chỉ bám vòng phẳng</li>
    </ul>
  </div>
</div>

<div class="tips">
  <div class="tip"><span class="tip-n">01</span><div class="tip-c"><p class="tip-t">Học song song</p><p class="tip-d">Vừa luyện RYB trên giấy, vừa đọc thêm Không gian màu &amp; Munsell trong Thư viện.</p></div></div>
  <div class="tip"><span class="tip-n">02</span><div class="tip-c"><p class="tip-t">Hỏi “vì sao xám”</p><p class="tip-d">Khi pha bẩn, tra value/chroma thay vì chỉ đổi tỉ lệ đỏ–vàng.</p></div></div>
  <div class="tip"><span class="tip-n">03</span><div class="tip-c"><p class="tip-t">Khối H</p><p class="tip-d">Bài hữu ích nếu bạn đang luyện thi hoặc mới vào thiết kế — tránh kẹt trong quy tắc “màu này mới hợp màu kia”.</p></div></div>
</div>

<div class="div-sec">
  <div class="div-num"><em>04</em></div>
  <div class="div-meta">
    <p class="div-kicker">Liên hệ</p>
    <h2 class="div-title">Bài trong Thư viện nên đọc thêm</h2>
  </div>
</div>

<p>Kết nối trực tiếp: <strong>Lý thuyết hòa sắc</strong>, <strong>Hệ thống màu Munsell</strong>, <strong>Không gian màu</strong>, <strong>Mô hình Cộng–Trừ màu</strong>, <strong>Thuộc tính màu</strong>.</p>

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
  <p class="key-lbl">⭐ Kết luận</p>
  <p class="key-t">Video <strong>không phủ nhận</strong> RYB — mà khuyên <em>nâng tầm tư duy</em> màu theo hướng khoa học.</p>
  <p class="key-d">Giữ lợi thế cảm nhận từ luyện thi truyền thống, đồng thời mở sang không gian màu và hệ thống như Munsell để làm chủ màu chủ động hơn, phù hợp cả hội hoạ và đồ họa hiện đại.</p>
</div>

<div class="faq">
  <details open>
    <summary>Có phải bỏ hẳn vòng RYB?<span class="faq-icon">−</span></summary>
    <p>Không bắt buộc. Quan trọng là biết <strong>giới hạn</strong> của nó và bổ sung kiến thức RGB/CMYK, value/chroma, gamut.</p>
  </details>
  <details>
    <summary>Vì sao nhắc Munsell?<span class="faq-icon">+</span></summary>
    <p>Munsell tách rõ <strong>sắc – độ sáng – độ bão hoà</strong>, giúp giải thích pha màu và độ “đục–tươi” rõ hơn vòng phẳng RYB.</p>
  </details>
</div>
`;

export const VIDEO_URL = "https://youtu.be/Vmn-ioN3VUM";

export const VIDEO_REF_URL = "";
