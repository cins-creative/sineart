// Nội dung Thư viện — phối cảnh song song / hình chiếu song song.

export const CONTENT_HTML = `
<p class="intro"><strong>Phối cảnh song song</strong> là hệ hình học trong đó các <em>cạnh song song trong thực tế</em> vẫn được biểu diễn song song trên mặt phẳng — <strong>không hội tụ</strong> về một hay hai điểm tụ cổ điển. Đây là nền của hình chiếu kiến trúc, minh họa kỹ thuật và nhiều bản vẽ concept “sạch số đo”.</p>

<div class="stats break-half">
  <div class="stat"><div class="stat-num">∥</div><div class="stat-label">Song song</div><div class="stat-sub">Hướng giữ nguyên</div></div>
  <div class="stat"><div class="stat-num">3</div><div class="stat-label">Axonometric</div><div class="stat-sub">Iso · Di · Tri</div></div>
  <div class="stat"><div class="stat-num">≠</div><div class="stat-label">Khác</div><div class="stat-sub">Phối cảnh tụ điểm</div></div>
</div>

<div class="div-sec">
  <div class="div-num"><em>01</em></div>
  <div class="div-meta">
    <p class="div-kicker">Định nghĩa</p>
    <h2 class="div-title">Tại sao không có điểm tụ?</h2>
  </div>
</div>

<p>Trong <strong>phối cảnh tuyến tính</strong>, các đường song song theo chiều sâu hội tụ — mô phỏng mắt nhìn một điểm. Trong <strong>chiếu song song</strong>, ta “nhìn từ xa” đến mức các tia gần như song song; đường thẳng song song trên vật thể <strong>vẫn song song</strong> sau khi chiếu. Đổi lại, ta không còn độ méo “tự nhiên” của camera — kích thước và góc phải đọc bằng tỉ lệ và ký hiệu.</p>

<div class="gls">
  <p class="gls-head">A — Biến thể hay gặp</p>
  <div class="gls-body">
    <div class="gls-item"><p class="gls-term">Isometric<small>Cân</small></p><p class="gls-def">Ba trục đều một góc (thường 120° trên mặt phẳng); tỉ lệ dọc thường không co — game 2.5D hay minh họa “khối”.</p></div>
    <div class="gls-item"><p class="gls-term">Dimetric / Trimetric</p><p class="gls-def">Hai hoặc ba tỉ lệ trục khác nhau — linh hoạt hơn cho sketch kiến trúc.</p></div>
    <div class="gls-item"><p class="gls-term">Elevation</p><p class="gls-def">Mặt đứng / mặt bằng thuần — đặc biệt trong bản vẽ kỹ thuật.</p></div>
    <div class="gls-item"><p class="gls-term">Oblique</p><p class="gls-def">Một mặt phẳng giữ hình thật, chiều sâu xiên — lai giữa minh họa và đọc nhanh.</p></div>
  </div>
</div>

<div class="mosaic mosaic--image">
  <div class="mosaic-big">
    <img src="/img/phoi-canh-song-song/mosaic-main.png" alt="Nhân vật dựng từ khối hộp trên lưới isometric — tỉ lệ và tư thế" loading="lazy" decoding="async" />
  </div>
  <div class="mosaic-small">
    <img src="/img/phoi-canh-song-song/thumbnail.png" alt="So sánh perspective, isometric và axonometric — từ khối cơ bản tới tòa nhà" loading="lazy" decoding="async" />
  </div>
  <div class="mosaic-small">
    <img src="/img/phoi-canh-song-song/mosaic-small-2.png" alt="Minh họa isometric phức tạp — không gian nhiều tầng, đường song song" loading="lazy" decoding="async" />
  </div>
</div>

<div class="div-sec">
  <div class="div-num"><em>02</em></div>
  <div class="div-meta">
    <p class="div-kicker">Ứng dụng</p>
    <h2 class="div-title">Kiến trúc, game và storyboard kỹ thuật</h2>
  </div>
</div>

<p>Dùng song song khi cần <strong>so sánh kích thước</strong>, đọc quan hệ khối rõ ràng, hoặc giữ nhất quán tile/map. Không dùng khi mục tiêu là <em>cảm giác nhìn thật</em> trong một khung hình máy ảnh — khi đó phối cảnh tụ điểm hoặc góc ảnh phù hợp hơn.</p>

<div class="tips">
  <div class="tip"><span class="tip-n">01</span><div class="tip-c"><p class="tip-t">Grid cố định</p><p class="tip-d">Vẽ lưới trục trước — mọi cạnh song song với một trong ba hướng chuẩn.</p></div></div>
  <div class="tip"><span class="tip-n">02</span><div class="tip-c"><p class="tip-t">Đừng trộn tụ điểm</p><p class="tip-d">Cùng một bài: hoặc song song hoặc tuyến tính — tránh hai hệ trong một lớp nền.</p></div></div>
  <div class="tip"><span class="tip-n">03</span><div class="tip-c"><p class="tip-t">Liên hệ</p><p class="tip-d">Ôn <em>Lý thuyết phối cảnh</em> để phân biệt “điểm tụ” và “đường song song”.</p></div></div>
</div>

<div class="div-sec">
  <div class="div-num"><em>03</em></div>
  <div class="div-meta">
    <p class="div-kicker">Liên hệ</p>
    <h2 class="div-title">Ba môn thực hành</h2>
  </div>
</div>

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
  <p class="key-t">Song song = <em>giữ hướng</em>, đổi lại <em>không giả lập ống kính</em> một điểm nhìn.</p>
  <p class="key-d">Chọn đúng hệ khi brief yêu cầu “đọc khối” hay “cảm giác máy ảnh” — hai nhu cầu khác nhau.</p>
</div>

<div class="faq">
  <details open>
    <summary>Isometric có phải “phối cảnh” không?<span class="faq-icon">−</span></summary>
    <p>Có — là dạng <strong>axonometric</strong> phổ biến; thuộc họ chiếu song song, không dùng điểm tụ như phối cảnh một/two-point cổ điển.</p>
  </details>
  <details>
    <summary>Có thể pha trộn với phối cảnh tụ trong một tranh?<span class="faq-icon">+</span></summary>
    <p>Có chủ đích (ví dụ khối kỹ thuật nổi trên nền đường phố tụ điểm) — cần phân lớp rõ để khán giả không lẫn hệ.</p>
  </details>
</div>
`;

export const VIDEO_URL = "";

export const VIDEO_REF_URL = "";
