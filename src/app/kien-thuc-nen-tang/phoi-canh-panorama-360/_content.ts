// Nội dung Thư viện — panorama / toàn cảnh 360°.

export const CONTENT_HTML = `
<p class="intro"><strong>Phối cảnh Panorama (360°)</strong> mô tả không gian <em>bọc quanh người quan sát</em> — không chỉ một khung hình chữ nhật trước mắt. Trong đồ họa, người ta thường gặp dạng <strong>equirectangular</strong> (ảnh tỉ lệ 2:1) để map lên cầu hoặc cube cho VR và tour ảo.</p>

<div class="stats break-half">
  <div class="stat"><div class="stat-num">360°</div><div class="stat-label">Ngang</div><div class="stat-sub">Tròn đầy đủ</div></div>
  <div class="stat"><div class="stat-num">2:1</div><div class="stat-label">Equirect</div><div class="stat-sub">Ảnh phổ biến</div></div>
  <div class="stat"><div class="stat-num">∞</div><div class="stat-label">Chân trời</div><div class="stat-sub">Hai mép dính</div></div>
</div>

<div class="div-sec">
  <div class="div-num"><em>01</em></div>
  <div class="div-meta">
    <p class="div-kicker">Bản đồ phẳng</p>
    <h2 class="div-title">Equirectangular là gì?</h2>
  </div>
</div>

<p>Ảnh panorama “dẹt” phổ biến có tỉ lệ khoảng <strong>2:1</strong>: chiều ngang = vòng đầy đủ 360°, chiều dọc = từ cực trên xuống cực dưới (180°). <strong>Đường chân trời</strong> nằm ở giữa theo chiều dọc (nếu camera ngang). Hai mép trái–phải của ảnh <strong>nối liền</strong> trong không gian — khi vẽ hoặc paint texture phải khớp seam.</p>

<div class="gls">
  <p class="gls-head">A — Khái niệm</p>
  <div class="gls-body">
    <div class="gls-item"><p class="gls-term">Cube map<small>Sáu mặt</small></p><p class="gls-def">Biến thể chia không gian thành 6 mặt vuông — ít méo ở giữa mỗi mặt, dễ vẽ một phần scene.</p></div>
    <div class="gls-item"><p class="gls-term">Nadir / Zenith</p><p class="gls-def">Điểm trực dưới chân / trực trên đầu — thường bị kéo giãn trong equirect.</p></div>
    <div class="gls-item"><p class="gls-term">VR</p><p class="gls-def">Người xem xoay đầu = pan ảnh; concept art 360 phải đọc đúng mọi hướng.</p></div>
    <div class="gls-item"><p class="gls-term">Khác panorama “chụp”</p><p class="gls-def">Panorama chữ nhật siêu rộng vẫn là <strong>một hướng nhìn</strong>; 360 là <strong>bọc kín</strong> trục ngang.</p></div>
  </div>
</div>

<div class="mosaic">
  <div class="mosaic-big">
    <img src="/img/phoi-canh-panorama-360/hero-cover.png" alt="Panorama 360 concept" />
  </div>
  <div class="mosaic-small">
    <img src="/img/phoi-canh-panorama-360/thumbnail.jpg" alt="Tỉ lệ 2:1" />
  </div>
  <div class="mosaic-small">
    <img src="/img/phoi-canh-panorama-360/hero-cover.png" alt="Khớp seam" />
  </div>
</div>

<div class="div-sec">
  <div class="div-num"><em>02</em></div>
  <div class="div-meta">
    <p class="div-kicker">Thực hành</p>
    <h2 class="div-title">Vẽ và matte painting 360</h2>
  </div>
</div>

<p>Khi dựng khung cảnh: xác định <strong>mặt phẳng chân trời</strong> là một đường ngang ở giữa (camera level). Mọi đối tượng đứng phải <strong>lặp liền mạch</strong> khi cắt dọc hai mép ảnh. Khi thêm nhân vật, nhớ họ sẽ xuất hiện lại nếu người xem xoay — hoặc chỉ xuất hiện trong một góc nếu là scene có “chỗ đứng” cố định trong VR.</p>

<div class="tips">
  <div class="tip"><span class="tip-n">01</span><div class="tip-c"><p class="tip-t">Grid lat–long</p><p class="tip-d">Phủ lưới kinh tuyến / vĩ tuyến khi paint để giữ tỉ lệ khối.</p></div></div>
  <div class="tip"><span class="tip-n">02</span><div class="tip-c"><p class="tip-t">Kiểm tra seam</p><p class="tip-d">Luôn xem preview trên globe hoặc trong viewer VR.</p></div></div>
  <div class="tip"><span class="tip-n">03</span><div class="tip-c"><p class="tip-t">So với mắt cá</p><p class="tip-d">Mắt cá = một tâm nhìn cong; 360 equirect = toàn cảnh bọc — khác bài toán biến dạng.</p></div></div>
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
  <p class="key-t">360° = <em>liên tục trên vòng</em> — mép trái và mép phải là cùng một hướng nhìn.</p>
  <p class="key-d">Làm quen equirectangular hoặc cube map giúp concept environment và matte không bị vỡ khi render VR.</p>
</div>

<div class="faq">
  <details open>
    <summary>Panorama siêu rộng trên điện thoại có phải 360?<span class="faq-icon">−</span></summary>
    <p>Chưa chắc — nhiều chế độ chỉ ghép <strong>góc ngang lớn</strong> (vd. 120–180°). 360 thật sự bọc kín trục ngang hoặc đủ cầu.</p>
  </details>
</div>
`;

export const VIDEO_URL = "";

export const VIDEO_REF_URL = "";
