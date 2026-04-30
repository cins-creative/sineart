// Bài "Nghệ thuật chữ — Typography" — Thư viện Sine Art.

export const CONTENT_HTML = String.raw`
<p class="intro"><strong>Typography</strong> (nghệ thuật sắp chữ) không chỉ là chọn font đẹp — đó là cách bạn dùng <strong>chữ như một lớp hình</strong> trong bố cục: tạo cấp bậc thị giác, dẫn mắt người xem, và truyền tải tông cảm (từ tối giản đến sôi nổi) mà không cần thêm một nét vẽ nào.</p>

<div class="stats break-half">
  <div class="stat"><div class="stat-num">3</div><div class="stat-label">Cấp chữ</div><div class="stat-sub">Tiêu đề — phụ — nội dung</div></div>
  <div class="stat"><div class="stat-num">1.4–1.6</div><div class="stat-label">Leading gợi ý</div><div class="stat-sub">Body text web / in</div></div>
  <div class="stat"><div class="stat-num">2</div><div class="stat-label">Font chính + phụ</div><div class="stat-sub">Đủ cho đa số dự án</div></div>
</div>

<div class="div-sec">
  <div class="div-num"><em>01</em></div>
  <div class="div-meta">
    <p class="div-kicker">Khái niệm</p>
    <h2 class="div-title">Typography là gì trong mỹ thuật &amp; thiết kế?</h2>
  </div>
</div>

<p>Khi bạn vẽ tranh, chữ thường là phần “đi kèm” — tiêu đề poster, chữ ký, comment trong sketchbook. Nhưng trong <strong>thiết kế đồ hoạ, poster, portfolio và editorial</strong>, chữ chiếm một diện tích lớn và có vai trò như <em>hình khối âm dương</em>: cụm chữ đậm tạo một khối đen; khoảng trắng (negative space) giữa dòng, chữ cái và lề tạo nhịp thở cho bài.</p>

<p>Typography gặp gỡ trực tiếp với bài <a href="/kien-thuc-nen-tang/co-so-tao-hinh">Cơ sở tạo hình</a>: trên trang in hoặc màn hình, chữ cũng hành xử như <strong>điểm, đường, khối và không gian âm</strong> — “chất liệu” của bạn là glyph và khoảng cách, không chỉ nét vẽ tự do.</p>

<p>Hiểu typography giúp bạn <strong>không lạc</strong> giữa hàng nghìn font trên mạng: bạn chọn theo <em>chức năng</em> (đọc lâu / bắt mắt tức thì) và theo <em>context</em> (sách, web, tường triển lãm).</p>

<div class="gallery gallery-3">
  <figure class="gallery-box">
    <img src="/img/nghe-thuat-chu-typography/gallery-01-grid.png" alt="Lưới và cột typographic — căn chỉnh khối chữ" loading="lazy" decoding="async" />
    <figcaption class="gallery-cap"><span class="gallery-num">01</span> Grid — chữ bám cột</figcaption>
  </figure>
  <figure class="gallery-box">
    <img src="/img/nghe-thuat-chu-typography/gallery-02-grid.png" alt="Khoảng gutter và margin trong layout chữ" loading="lazy" decoding="async" />
    <figcaption class="gallery-cap"><span class="gallery-num">02</span> Khoảng lề &amp; nhịp lặp</figcaption>
  </figure>
  <figure class="gallery-box">
    <img src="/img/nghe-thuat-chu-typography/gallery-03-layout.png" alt="Cụm tiêu đề và khối thân bài trong một spread" loading="lazy" decoding="async" />
    <figcaption class="gallery-cap"><span class="gallery-num">03</span> Khối tiêu đề vs khối đọc</figcaption>
  </figure>
</div>

<div class="gls">
  <p class="gls-head">A — Thuật ngữ cơ bản</p>
  <div class="gls-body">
    <div class="gls-item"><p class="gls-term">Typeface / Font<small>Họ chữ / Bộ font</small></p><p class="gls-def">Typeface là thiết kế (vd: Helvetica); font là file cụ thể (Regular, Bold…).</p></div>
    <div class="gls-item"><p class="gls-term">Hierarchy<small>Cấp bậc</small></p><p class="gls-def">Khác biệt cỡ, đậm nhạt, màu để mắt biết đọc gì trước, gì sau.</p></div>
    <div class="gls-item"><p class="gls-term">Leading<small>Khoảng dòng</small></p><p class="gls-def">Khoảng cách giữa các dòng cơ sở — ảnh hưởng khả đọc và cảm giác sang/trật.</p></div>
    <div class="gls-item"><p class="gls-term">Tracking / Kerning<small>Khoảng cách chữ</small></p><p class="gls-def">Tracking: toàn cụm; kerning: từng cặp chữ cái — quan trọng với chữ in lớn, logo.</p></div>
  </div>
</div>

<div class="bleed-dual">
  <div class="bleed-box variant-a">
    <span class="bleed-vs">A</span>
    <img src="/img/nghe-thuat-chu-typography/bleed-a-poster.png" alt="Bố cục poster — chữ lớn, tương phản mạnh, ít dòng" loading="lazy" />
    <p class="bleed-note">Poster / Key visual — chữ lớn, ít dòng, đọc xa</p>
  </div>
  <div class="bleed-box variant-b">
    <span class="bleed-vs">B</span>
    <img src="/img/nghe-thuat-chu-typography/bleed-b-editorial.png" alt="Trang editorial — nhiều cấp chữ và khối đọc dài" loading="lazy" />
    <p class="bleed-note">Editorial / portfolio — nhiều cấp chữ, khối đọc dài</p>
  </div>
</div>

<div class="div-sec">
  <div class="div-num"><em>02</em></div>
  <div class="div-meta">
    <p class="div-kicker">Đọc &amp; nhìn</p>
    <h2 class="div-title">Ba lớp người xem cần nhận ra</h2>
  </div>
</div>

<p>Một bố cục chữ tốt cho người xem <strong>3 tầng</strong>: (1) nhận ra chủ đề trong vài giây đầu — (2) hiểu phụ đề hoặc thông tin phụ — (3) đọc chi tiết nếu họ muốn. Nếu mọi thứ cùng một cỡ và độ đậm, mắt không có điểm neo.</p>

<div class="pr-table">
  <div class="pr-row"><span class="pr-i">i</span><div class="pr-n">Tiêu đề<small>Display / H1</small></div><div class="pr-d">Lớn nhất, có thể serif/display đặc trưng hoặc sans mạnh — thể hiện cảm xúc thương hiệu hoặc chủ đề.</div></div>
  <div class="pr-row"><span class="pr-i">ii</span><div class="pr-n">Phụ đề / nhóm<small>Subhead</small></div><div class="pr-d">Trung gian: nhận diện mục con, không tranh với tiêu đề nhưng rõ hơn đoạn văn.</div></div>
  <div class="pr-row"><span class="pr-i">iii</span><div class="pr-n">Nội dung<small>Body</small></div><div class="pr-d">Font dễ đọc, leading đủ, độ dài dòng hợp lý (khoảng 45–75 ký tự/ dòng thường dùng cho sách/báo).</div></div>
</div>

<div class="spread break-half">
  <div class="spread-text">
    <p class="spread-kicker">Minh hoạ</p>
    <h3 class="spread-title">Cấp bậc nhìn từ xa</h3>
    <p>Khi nheo mắt, tiêu đề vẫn phải là khối <strong>đậm nhất</strong>; phụ đề tách bậc rõ với đoạn văn. Đây chính là cách kiểm tra hierarchy trước khi in poster hay xuất PDF portfolio.</p>
    <p>Cùng tinh thần với nguyên lý <em>nhấn mạnh</em> và <em>tương phản</em> trong <a href="/kien-thuc-nen-tang/co-so-tao-hinh">Cơ sở tạo hình</a> — chỉ áp dụng lên chữ và khoảng trắng.</p>
  </div>
  <div class="spread-img" data-img="typography-hierarchy">
    <img src="/img/nghe-thuat-chu-typography/spread-hierarchy.png" alt="Ví dụ trang có tiêu đề lớn, phụ đề và khối body" loading="lazy" decoding="async" />
  </div>
</div>

<div class="pq">
  <p class="pq-text">Chữ đẹp là chữ <em>đúng vai</em> trong bố cục — không nhất thiết là chữ hoa mỹ nhất.</p>
  <span class="pq-cite">— Quan điểm editorial</span>
</div>

<div class="div-sec">
  <div class="div-num"><em>03</em></div>
  <div class="div-meta">
    <p class="div-kicker">Đối thoại giữa các font</p>
    <h2 class="div-title">Ghép font và giữ nhất quán</h2>
  </div>
</div>

<p>Nguyên tắc an toàn: <strong>một font cho nội dung dài</strong> + <strong> một font cho tiêu đề / nhấn mạnh</strong> (có thể cùng họ với nhiều trọng lượng, hoặc sans + serif bổ trợ). Thêm font thứ ba chỉ khi bạn đã thành thạo cấp bậc và khoảng cách lề.</p>

<p>Trong <strong>poster mỹ thuật</strong>, chữ thường ngắn — có thể dùng display có cá tính mạnh; trong <strong>portfolio PDF</strong>, ưu tiên khả đọc và spacing đều đặn để giảng viên đọc không mỏi.</p>

<div class="gallery gallery-4">
  <figure class="gallery-box">
    <img src="/img/nghe-thuat-chu-typography/pair-01.png" alt="Cặp font sans — tiêu đề và trích dẫn" loading="lazy" decoding="async" />
    <figcaption class="gallery-cap"><span class="gallery-num">i</span> Cặp sans — gọn, hiện đại</figcaption>
  </figure>
  <figure class="gallery-box">
    <img src="/img/nghe-thuat-chu-typography/pair-02.png" alt="Phối serif tiêu đề và sans body" loading="lazy" decoding="async" />
    <figcaption class="gallery-cap"><span class="gallery-num">ii</span> Serif + sans cổ điển</figcaption>
  </figure>
  <figure class="gallery-box">
    <img src="/img/nghe-thuat-chu-typography/pair-03.png" alt="Nhiều cấp cỡ chữ trên một trục" loading="lazy" decoding="async" />
    <figcaption class="gallery-cap"><span class="gallery-num">iii</span> Nhiều weight trong một họ</figcaption>
  </figure>
  <figure class="gallery-box">
    <img src="/img/nghe-thuat-chu-typography/pair-04-cover.png" alt="Trang bìa — display type và khối phụ" loading="lazy" decoding="async" />
    <figcaption class="gallery-cap"><span class="gallery-num">iv</span> Display + khối phụ</figcaption>
  </figure>
</div>

<div class="tips">
  <div class="tip"><span class="tip-n">01</span><div class="tip-c"><p class="tip-t">Contrast cỡ</p><p class="tip-d">Ít nhất 1.5–2 bậc giữa tiêu đề và body (vd body 11–12pt → tiêu đề 24–36pt).</p></div></div>
  <div class="tip"><span class="tip-n">02</span><div class="tip-c"><p class="tip-t">Giới hạn độ rộng dòng</p><p class="tip-d">Block text quá ngang khiến mắt mệt — chia cột hoặc thu nhỏ khối.</p></div></div>
  <div class="tip"><span class="tip-n">03</span><div class="tip-c"><p class="tip-t">Canh lề có chủ đích</p><p class="tip-d">Canh trái thân thuộc cho tiếng Việt dài; canh đều chỉ khi dòng đủ ít từ và bạn kiểm tra rivers.</p></div></div>
  <div class="tip"><span class="tip-n">04</span><div class="tip-c"><p class="tip-t">Squint test</p><p class="tip-d">Nheo mắt: tiêu đề vẫn nhô ra nhất? Nếu không, tăng độ tương phản cỡ hoặc đậm nhạt.</p></div></div>
</div>

<div class="cmp break-half">
  <div class="cmp-col l">
    <p class="cmp-lbl">Tốt cho khả đọc</p>
    <p class="cmp-title">Ưu tiên</p>
    <ul class="cmp-list">
      <li>Khoảng dòng (leading) đủ cho đoạn văn</li>
      <li>Tương phản màu chữ — nền đạt WCAG khi là UI</li>
      <li>Cấp bậc rõ bằng cỡ + weight</li>
      <li>Ít font, nhất quán margin/gutter</li>
    </ul>
  </div>
  <div class="cmp-col r">
    <p class="cmp-lbl">Dễ gây mệt</p>
    <p class="cmp-title">Tránh</p>
    <ul class="cmp-list">
      <li>Quá nhiều font decorative trong một trang</li>
      <li>Chữ quá nhỏ trên poster treo xa</li>
      <li>ALL CAPS cho đoạn văn dài</li>
      <li>Tracking âm quá mức trên chữ nhỏ</li>
    </ul>
  </div>
</div>

<div class="div-sec">
  <div class="div-num"><em>04</em></div>
  <div class="div-meta">
    <p class="div-kicker">Tiếng Việt</p>
    <h2 class="div-title">Dấu, độ cao chữ và chọn font</h2>
  </div>
</div>

<p>Tiếng Việt có dấu và thanh — font kém thiết kế sẽ làm dấu chồng hoặc vỡ rhythm. Khi chọn font cho dự án song ngữ hoặc chỉ tiếng Việt, nên <strong>kiểm tra đủ bộ ký tự</strong> và thử đoạn văn thật trước khi lock font.</p>

<p>Trên <strong>poster triển lãm</strong>, test in hoặc xem mockup kích thước thật: chữ nhỏ trong file có thể mất khả đọc khi in A2/A0.</p>

<div class="dd break-half">
  <div class="dd-col good">
    <div class="dd-head"><span class="dd-badge">+</span><span class="dd-title">Nên làm</span></div>
    <ul class="dd-list">
      <li>Lập style sheet: cỡ H1/H2/body cho cả dự án</li>
      <li>Dùng grid hoặc baseline để các khối chữ căng hàng</li>
      <li>Tham chiếu poster / book design bạn thích và đếm bậc chữ</li>
      <li>Export PDF/embed font khi gửi file in ấn</li>
    </ul>
  </div>
  <div class="dd-col bad">
    <div class="dd-head"><span class="dd-badge">−</span><span class="dd-title">Nên tránh</span></div>
    <ul class="dd-list">
      <li>Kéo dãn font (scale không đồng tỉ lệ) trừ khi chủ đích méo thị giác</li>
      <li>Dùng outline quá mỏng trên nền họa tiết</li>
      <li>Nhồi quá nhiều dòng slogan trong một khối hẹp</li>
      <li>Copy font trend mà không khớp nội dung</li>
    </ul>
  </div>
</div>

<div class="key break">
  <p class="key-lbl">⭐ Điểm mấu chốt</p>
  <p class="key-t">Typography là <em>bố cục của ngôn ngữ hiển thị.</em></p>
  <p class="key-d">Nắm hierarchy, spacing và khả đọc, bạn có thêm một lớp công cụ để hoàn thiện poster, portfolio và nhận diện cá nhân — song song với hình vẽ và màu sắc.</p>
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
    <summary>Serif hay sans cho portfolio nghệ thuật?<span class="faq-icon">−</span></summary>
    <p>Cả hai đều được. Sans thường cảm giác hiện đại, sạch; serif mang cảm giác editorial, cổ điển. Quan trọng là đồng nhất trong toàn bộ file và đủ khả đọc khi chữ nhỏ.</p>
  </details>
  <details>
    <summary>Có cần mua font không?<span class="faq-icon">+</span></summary>
    <p>Nhiều font Google Fonts / Adobe Fonts đủ cho học tập và portfolio cá nhân; dự án thương mại cần đọc license. Font trả phí thường có đầy đủ weight và kerning tốt hơn.</p>
  </details>
  <details>
    <summary>Typography có liên quan bài Bố cục không?<span class="faq-icon">+</span></summary>
    <p>Rất liên quan: chữ là các khối hình trong grid — xem thêm các bài nhóm Bố cục trong Thư viện để ghép hierarchy không gian và hierarchy chữ.</p>
  </details>
  <details>
    <summary>Làm sao luyện nhanh?<span class="faq-icon">+</span></summary>
    <p>Sắp lại layout một poster có sẵn chỉ bằng cách đổi cỡ và weight chữ; hoặc tái thiết kế typography cho một trang sách / ảnh bìa album.</p>
  </details>
</div>
`.trim();

export const VIDEO_URL = "";
export const VIDEO_REF_URL = "";
