// Nội dung Thư viện — phối cảnh panorama / toàn cảnh 360° (equirectangular, cube, VR).

export const CONTENT_HTML = `
<p class="intro"><strong>Phối cảnh Panorama (360°)</strong> mô tả không gian <em>bọc quanh trục quan sát</em> — không giới hạn ở một khung chữ nhật “phía trước mắt” như phối cảnh tuyến tính cổ điển. Trên máy tính, dạng phổ biến nhất là ảnh <strong>equirectangular</strong> (thường tỉ lệ <strong>2:1</strong>) để map lên cầu cho VR, tour ảo, và environment matte. Để đối chiếu với một khung méo mạnh quanh tâm, xem <a href="/kien-thuc-nen-tang/phoi-canh-mat-ca">Phối cảnh mắt cá</a>; với hệ “thẳng nét” một hướng nhìn, xem <a href="/kien-thuc-nen-tang/ly-thuyet-phoi-canh">Lý thuyết phối cảnh</a>.</p>

<div class="stats break-half">
  <div class="stat"><div class="stat-num">360°</div><div class="stat-label">Trục ngang</div><div class="stat-sub">Hai mép nối vòng</div></div>
  <div class="stat"><div class="stat-num">2:1</div><div class="stat-label">Equirect</div><div class="stat-sub">Bản đồ phẳng phổ biến</div></div>
  <div class="stat"><div class="stat-num">180°</div><div class="stat-label">Trục dọc</div><div class="stat-sub">Cực trên — cực dưới</div></div>
</div>

<div class="div-sec">
  <div class="div-num"><em>01</em></div>
  <div class="div-meta">
    <p class="div-kicker">Bản đồ phẳng</p>
    <h2 class="div-title">Equirectangular: vì sao lại là 2:1?</h2>
  </div>
</div>

<p>Trong tọa độ <strong>kinh độ – vĩ độ</strong> (longitude / latitude), một vòng quanh người là 360° ngang; từ cực trên xuống cực dưới của “cầu nhìn” là 180° dọc. Khi “mở phẳng” cầu thành hình chữ nhật, tỉ lệ cạnh gần với <strong>2:1</strong> — đó là lý do hầu hết HDRi và texture môi trường VR dùng khung này. Trục ngang của ảnh là <strong>hướng nhìn quay vòng</strong>; trục dọc là <strong>ngẩng — cúi</strong>.</p>

<p>Điểm then chốt cho họa sĩ: <strong>hai mép trái và phải</strong> của bức equirect là <em>cùng một hướng nhìn</em> trong không gian — mọi đường thẳng xuyên qua cảnh (vd. rìa tường, ray tàu) phải <strong>khớp liền mạch</strong> khi ghép seam. Nếu vẽ nhân vật đứng ở “rìa trái”, khi người xem xoay 180° họ có thể thấy <strong>mặt sau</strong> của nhân vật đó từ mép phải — cần thiết kế silhouette đọc được từ nhiều góc.</p>

<div class="gls">
  <p class="gls-head">A — Khái niệm &amp; biến thể</p>
  <div class="gls-body">
    <div class="gls-item"><p class="gls-term">Equirectangular<small>Lat–long map</small></p><p class="gls-def">Một texture cho toàn cầu; cực (zenith / nadir) bị kéo giãn — khó vẽ chi tiết ở đỉnh/đáy nếu không đổi workspace.</p></div>
    <div class="gls-item"><p class="gls-term">Cube map<small>Sáu mặt</small></p><p class="gls-def">Chia cầu thành 6 mặt vuông ±X ±Y ±Z — ít méo ở tâm mỗi mặt, thuận cho paint tay và game engine.</p></div>
    <div class="gls-item"><p class="gls-term">Cross / horizontal strip</p><p class="gls-def">Bố trí 6 mặt cube trên một atlas — cần padding và mip rule riêng khi xuất cho realtime.</p></div>
    <div class="gls-item"><p class="gls-term">Spherical harmonics<small>SH · IBL</small></p><p class="gls-def">Tách ánh sáng môi trường thành hệ số mịn — dùng kết hợp với ảnh 360 để chiếu sáng PBR.</p></div>
    <div class="gls-item"><p class="gls-term">Partial panorama</p><p class="gls-def">Chỉ 120–240° ngang — vẫn là panorama “dẹt” nhưng <strong>không</strong> bọc kín 360; đừng nhầm với brief VR đầy đủ.</p></div>
    <div class="gls-item"><p class="gls-term">Monoscopic vs stereo</p><p class="gls-def">Một cầu cho mỗi mắt hoặc hai lớp offset — ảnh hưởng trực tiếp pipeline dựng và kiểm tra seam.</p></div>
  </div>
</div>

<div class="pr-table">
  <div class="pr-row"><span class="pr-i">i.</span><div class="pr-n">Equirect 2:1</div><div class="pr-d">Một file, dễ paint lat–long; cực dễ lỗi; seam trái–phải phải khớp tuyệt đối khi duyệt vòng.</div></div>
  <div class="pr-row"><span class="pr-i">ii.</span><div class="pr-n">Cube map</div><div class="pr-d">Sáu mặt vuông — thuận cho chi tiết kiến trúc và kiểm tra góc tường; cần chú ý biên giữa các mặt.</div></div>
  <div class="pr-row"><span class="pr-i">iii.</span><div class="pr-n">360 vs mắt cá một khung</div><div class="pr-d">360 = <strong>bọc kín</strong> trục ngang (và thường đủ cầu); mắt cá là <strong>một khung</strong> méo mạnh — xem <a href="/kien-thuc-nen-tang/phoi-canh-mat-ca">Phối cảnh mắt cá</a>.</div></div>
</div>

<div class="mosaic mosaic--image">
  <div class="mosaic-big">
    <img src="/img/phoi-canh-panorama-360/hero-cover.png" alt="Panorama 360 — concept environment equirectangular" loading="lazy" decoding="async" />
  </div>
  <div class="mosaic-small">
    <img src="/img/phoi-canh-panorama-360/thumbnail.jpg" alt="Tỉ lệ equirectangular 2:1 trên timeline" loading="lazy" decoding="async" />
  </div>
  <div class="mosaic-small">
    <img src="/img/phoi-canh-panorama-360/hero-cover.png" alt="Kiểm tra seam hai mép trên globe preview" loading="lazy" decoding="async" />
  </div>
</div>

<div class="div-sec">
  <div class="div-num"><em>02</em></div>
  <div class="div-meta">
    <p class="div-kicker">Thực hành</p>
    <h2 class="div-title">Seam, cực và matte painting</h2>
  </div>
</div>

<p>Quy trình an toàn: <strong>(1)</strong> phác silhouette toàn cảnh trên lat–long thấp; <strong>(2)</strong> xem trên <em>globe</em> hoặc viewer VR để bắt seam; <strong>(3)</strong> tách sang cube hoặc <strong>local patch</strong> khi cần vẽ gạch, chữ, cửa sổ thẳng; <strong>(4)</strong> merge về equirect và kiểm tra lại vòng. Ở <strong>cực</strong> (trần nhà trực tiếp / sàn dưới chân), nên dùng brush theo vòng tròn đồng tâm hoặc chuyển sang mặt phẳng vuông góc tạm thời để tránh “quạt” nét.</p>

<p>Nếu bạn quen <a href="/kien-thuc-nen-tang/phoi-canh-song-song">lưới song song / isometric</a>, hãy nhớ 360 không bảo toàn “đường thẳng song song trên giấy” theo cùng một nghĩa — mỗi điểm trên equirect là một <em>hướng</em>, không phải một mặt phẳng tọa độ Descartes phẳng. Đọc khối trong VR thường dựa vào <strong>chân trời</strong> (đường ngang giữa ảnh khi camera level) và <strong>vạch dọc qua cực</strong> để neo kiến trúc.</p>

<div class="tips">
  <div class="tip"><span class="tip-n">01</span><div class="tip-c"><p class="tip-t">Grid lat–long</p><p class="tip-d">Bật overlay kinh/vĩ khi paint — giúp giữ tỉ lệ tường và cửa khi quấn quanh cầu.</p></div></div>
  <div class="tip"><span class="tip-n">02</span><div class="tip-c"><p class="tip-t">Offset seam có chủ đích</p><p class="tip-d">Đôi khi dời seam ra vùng ít chi tiết (vách phẳng, sương mù) thay vì cắt qua nhân vật.</p></div></div>
  <div class="tip"><span class="tip-n">03</span><div class="tip-c"><p class="tip-t">Kiểm tra ở 90° / 180°</p><p class="tip-d">Xoay preview từng bước — lỗi nhỏ ở mép chỉ hiện khi quay lưng lại cảnh.</p></div></div>
  <div class="tip"><span class="tip-n">04</span><div class="tip-c"><p class="tip-t">Chữ &amp; logo</p><p class="tip-d">Chữ phẳng sẽ cong trên cầu — hoặc paint riêng một patch phẳng rồi blend, hoặc chấp nhận cong có chủ đích.</p></div></div>
  <div class="tip"><span class="tip-n">05</span><div class="tip-c"><p class="tip-t">Xuất đa định dạng</p><p class="tip-d">Giữ master 16-bit + seam fix layer trước khi nén cho web hoặc game.</p></div></div>
</div>

<div class="div-sec">
  <div class="div-num"><em>03</em></div>
  <div class="div-meta">
    <p class="div-kicker">Ứng dụng</p>
    <h2 class="div-title">VR, game, film và ảnh thực tế</h2>
  </div>
</div>

<p><strong>VR &amp; tour:</strong> equirect là đầu vào cho skybox / video 360 trên headset và mobile. <strong>Game &amp; realtime:</strong> cube + mip + filtering (trilinear / anisotropic) quyết định độ sạch rìa khi nhìn xiên. <strong>Film / VFX:</strong> HDRI 360 để match lighting và reflection cho CG xen kẻ live-action. <strong>Ảnh chụp:</strong> nhiều máy ghép panorama <em>chưa</em> đủ 360 — cần đọc metadata góc quét trước khi gọi là “360 thật”.</p>

<p>Khi brief chỉ cần <strong>minh họa một hướng nhìn</strong> (poster, khung truyện), đừng ép thành 360 — tốn thời gian seam và cực. Khi brief cần <strong>ánh sáng môi trường</strong> nhưng không VR, đôi khi chỉ cần <strong>hemisphere</strong> hoặc strip pano đã đủ cho IBL.</p>

<div class="div-sec">
  <div class="div-num"><em>04</em></div>
  <div class="div-meta">
    <p class="div-kicker">Cạm bẫy</p>
    <h2 class="div-title">Nên và tránh</h2>
  </div>
</div>

<div class="dd break-half">
  <div class="dd-col good">
    <div class="dd-head"><span class="dd-badge">+</span><span class="dd-title">Nên</span></div>
    <ul class="dd-list">
      <li>Luôn có bước preview globe / cube trước khi duyệt “xong”</li>
      <li>Giữ chân trời thẳng ở giữa theo chiều dọc khi camera level — trừ khi brief cố tình nghiêng</li>
      <li>Đặt điểm nhấn quan trọng xa seam và xa cực nếu cần đọc rõ</li>
      <li>Lưu bản master có layer seam-fix để sửa sau khi đổi crop</li>
    </ul>
  </div>
  <div class="dd-col bad">
    <div class="dd-head"><span class="dd-badge">−</span><span class="dd-title">Tránh</span></div>
    <ul class="dd-list">
      <li>Vẽ chi tiết nhỏ ngay tại cực trên equirect mà không đổi workspace</li>
      <li>Quên kiểm tra nhân vật “xuất hiện lại” sau nửa vòng xoay</li>
      <li>Nhầm panorama siêu rộng một hướng với 360 bọc kín</li>
      <li>Ép chữ đọc được như poster phẳng trên toàn bộ cầu mà không thiết kế lại</li>
    </ul>
  </div>
</div>

<div class="pq">
  <p class="pq-text">360° không phải “một bức tranh rộng” — nó là <em>một bề mặt khép kín</em> mà mắt có thể đi vòng quanh.</p>
  <span class="pq-cite">— Ghi chú lớp bố cục · Sine Art</span>
</div>

<div class="div-sec">
  <div class="div-num"><em>05</em></div>
  <div class="div-meta">
    <p class="div-kicker">Liên hệ</p>
    <h2 class="div-title">Ba hướng luyện thi &amp; studio</h2>
  </div>
</div>

<div class="subj-row break-half">
  <div class="subj hh" style="background-image:url(/img/co-so-tao-hinh/subj-01-hh.jpg);background-size:cover;background-position:center">
    <span class="subj-tag">Khối V</span>
    <h4>Hình họa</h4>
  </div>
  <div class="subj bc" style="background-image:url(/img/co-so-tao-hinh/subj-02-bc.png);background-size:cover;background-position:center">
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
  <p class="key-t">Panorama 360 = <em>liên tục trên vòng</em> — mép trái và mép phải là cùng một hướng nhìn.</p>
  <p class="key-d">Equirect tiện cho một file duy nhất; cube thuận cho vẽ tay và engine — chọn workspace theo giai đoạn, luôn kiểm seam và cực trước khi bàn giao.</p>
</div>

<div class="faq">
  <details open>
    <summary>Panorama siêu rộng trên điện thoại có phải 360?<span class="faq-icon">−</span></summary>
    <p>Chưa chắc — nhiều chế độ chỉ ghép <strong>góc ngang lớn</strong> (vd. 120–240°). 360 thật sự <strong>bọc kín</strong> trục ngang (và thường đủ 180° dọc cho cầu đầy đủ).</p>
  </details>
  <details>
    <summary>Tại sao cực trên equirect hay “vỡ” chi tiết?<span class="faq-icon">+</span></summary>
    <p>Vì bản đồ lat–long <strong>kéo giãn</strong> vùng gần cực — nên paint cực trên mặt phẳng vuông góc tạm hoặc dùng cube face cho zenith / nadir.</p>
  </details>
  <details>
    <summary>Cube map có thay thế hoàn toàn equirect không?<span class="faq-icon">+</span></summary>
    <p>Trong pipeline thường <strong>chuyển đổi hai chiều</strong> — master có thể là một trong hai; engine và VR player thường nhận equirect hoặc cube tùy nền tảng.</p>
  </details>
  <details>
    <summary>Học 360 trước hay phối cảnh một điểm tụ trước?<span class="faq-icon">+</span></summary>
    <p>Nên có nền <a href="/kien-thuc-nen-tang/ly-thuyet-phoi-canh">phối cảnh tuyến tính</a> và khối hộp — để đọc được chân trời và tỉ lệ trước khi “gập” không gian quanh người xem.</p>
  </details>
</div>
`;

export const VIDEO_URL = "";

export const VIDEO_REF_URL = "";
