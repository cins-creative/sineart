// Nội dung Thư viện — phối cảnh mắt cá (fisheye).

export const CONTENT_HTML = `
<p class="intro"><strong>Phối cảnh mắt cá</strong> là loại <em>phối cảnh cong</em>: đường thẳng trong không gian không còn là đường thẳng trên ảnh mà uốn theo tâm ống kính — góc nhìn cực rộng, đường chân trời và mép khung biến dạng đặc trưng.</p>

<div class="stats break-half">
  <div class="stat"><div class="stat-num">180°</div><div class="stat-label">Góc</div><div class="stat-sub">Ống góc siêu rộng</div></div>
  <div class="stat"><div class="stat-num">◎</div><div class="stat-label">Đối xứng</div><div class="stat-sub">Quanh tâm hình</div></div>
  <div class="stat"><div class="stat-num">∿</div><div class="stat-label">Chân trời</div><div class="stat-sub">Có thể cong</div></div>
</div>

<div class="div-sec">
  <div class="div-num"><em>01</em></div>
  <div class="div-meta">
    <p class="div-kicker">Cơ chế</p>
    <h2 class="div-title">Vì sao đường thẳng thành cong?</h2>
  </div>
</div>

<p>Ống <strong>fisheye</strong> chiếu bán cầu nhìn (hoặc gần như vậy) lên mặt phẳng cảm biến. Các mô hình (equidistant, equisolid, stereographic…) quy định <strong>mức độ cong</strong> khác nhau. Điểm chung: càng xa tâm ảnh, biến dạng càng mạnh — lên đến <strong>đường chân trời cong</strong> khi ngửa hoặc chụp siêu rộng.</p>

<div class="gls">
  <p class="gls-head">A — Từ khoá</p>
  <div class="gls-body">
    <div class="gls-item"><p class="gls-term">Curvilinear<small>Phối cảnh cong</small></p><p class="gls-def">Khác phối cảnh tuyến tính “thẳng nét” trong khung hình thông thường.</p></div>
    <div class="gls-item"><p class="gls-term">Barrel distortion<small>Phiếm</small></p><p class="gls-def">Mép lõm — hay liên hệ trực giác với mắt cá, dù kỹ thuật có khác nhẹ.</p></div>
    <div class="gls-item"><p class="gls-term">Circle / Full frame</p><p class="gls-def">Một số ống cho hình tròn trong khung chữ nhật — thiết kế trần–tường cần chừa “vùng đen”.</p></div>
    <div class="gls-item"><p class="gls-term">Center</p><p class="gls-def">Thường ít méo nhất gần tâm — đặt nhân vật quan trọng ở giữa nếu muốn ít biến dạng.</p></div>
  </div>
</div>

<div class="mosaic">
  <div class="mosaic-big">
    <img src="/img/phoi-canh-mat-ca/hero-cover.png" alt="Phối cảnh mắt cá" />
  </div>
  <div class="mosaic-small">
    <img src="/img/phoi-canh-mat-ca/thumbnail.jpg" alt="Đường chân trời cong" />
  </div>
  <div class="mosaic-small">
    <img src="/img/phoi-canh-mat-ca/hero-cover.png" alt="Góc siêu rộng" />
  </div>
</div>

<div class="div-sec">
  <div class="div-num"><em>02</em></div>
  <div class="div-meta">
    <p class="div-kicker">Vẽ &amp; minh họa</p>
    <h2 class="div-title">Khi nào dùng “mắt cá” trong tranh?</h2>
  </div>
</div>

<p>Phù hợp khi storyboard hoặc key art cần <strong>cảm giác ống kính cực rộng</strong>, trong xe hầm, hang, cabin, hoặc hiệu ứng “nhìn toàn cảnh” méo có chủ đích. Khi vẽ tay: phác <strong>lưới tròn đồng tâm</strong> hoặc grid cong từ tâm giúp đặt khối; nhớ rằng <strong>tỉ lệ người</strong> bị kéo dọc theo bán kính.</p>

<div class="dd break-half">
  <div class="dd-col good">
    <div class="dd-head"><span class="dd-badge">+</span><span class="dd-title">Nên</span></div>
    <ul class="dd-list">
      <li>Dùng ref ảnh cùng tiêu cự để khớp độ cong</li>
      <li>Giữ một tâm thị giác rõ ràng</li>
    </ul>
  </div>
  <div class="dd-col bad">
    <div class="dd-head"><span class="dd-badge">−</span><span class="dd-title">Tránh</span></div>
    <ul class="dd-list">
      <li>Trộn nét thẳng phối cảnh tuyến tính cùng khối mắt cá không có quy tắc</li>
      <li>Quên méo cơ thể người ở mép khung</li>
    </ul>
  </div>
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
  <p class="key-t">Mắt cá là <em>phối cảnh cong</em> — đọc qua tâm và bán kính, không qua điểm tụ phẳng.</p>
  <p class="key-d">Quan sát ref thật hoặc ảnh ống cố định sẽ ổn định hơn thuần tưởng tượng.</p>
</div>

<div class="faq">
  <details open>
    <summary>Mắt cá giống panorama?<span class="faq-icon">−</span></summary>
    <p>Cùng họ góc rộng nhưng <strong>mắt cá</strong> nhấn biến dạng hình học mạnh quanh tâm; <strong>panorama</strong> thường ghép nhiều khung hoặc equirectangular — xem bài Phối cảnh Panorama 360°.</p>
  </details>
</div>
`;

export const VIDEO_URL = "";

export const VIDEO_REF_URL = "";
