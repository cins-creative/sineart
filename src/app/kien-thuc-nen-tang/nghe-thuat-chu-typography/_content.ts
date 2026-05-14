// Bài "Nghệ thuật chữ — Typography" — Thư viện Sine Art.

export const CONTENT_HTML = String.raw`
<p class="intro"><strong>Typography</strong> (nghệ thuật sắp chữ) không chỉ là chọn font đẹp — đó là cách bạn dùng <strong>chữ như một lớp hình</strong> trong bố cục: tạo cấp bậc thị giác, dẫn mắt người xem, và truyền tải tông cảm (từ tối giản đến sôi nổi) mà không cần thêm một nét vẽ tự do. Cùng tinh thần với <a href="/kien-thuc-nen-tang/co-so-tao-hinh">Cơ sở tạo hình</a>, chữ trên trang là <em>điểm, đường, khối và không gian âm</em>; cùng tinh thần với <a href="/kien-thuc-nen-tang/diem-tap-trung">Điểm tập trung</a>, tiêu đề là nam châm đầu tiên trong hierarchy.</p>

<div class="stats break-half">
  <div class="stat"><div class="stat-num">3+</div><div class="stat-label">Cấp chữ</div><div class="stat-sub">Display — phụ — body</div></div>
  <div class="stat"><div class="stat-num">1.4–1.65</div><div class="stat-label">Leading body</div><div class="stat-sub">In / màn hình</div></div>
  <div class="stat"><div class="stat-num">2</div><div class="stat-label">Font tối đa</div><div class="stat-sub">Chính + phụ</div></div>
</div>

<div class="div-sec">
  <div class="div-num"><em>01</em></div>
  <div class="div-meta">
    <p class="div-kicker">Khái niệm</p>
    <h2 class="div-title">Typography là gì trong mỹ thuật &amp; thiết kế?</h2>
  </div>
</div>

<p>Khi bạn vẽ tranh, chữ thường là phần “đi kèm” — tiêu đề poster, chữ ký, ghi chú trong sketchbook. Nhưng trong <strong>thiết kế đồ họa, poster, portfolio và editorial</strong>, chữ chiếm diện tích lớn và có vai trò như <em>hình khối âm dương</em>: cụm chữ đậm tạo một khối đậm; khoảng trắng (negative space) giữa dòng, chữ cái và lề tạo nhịp thở. Macro typography là <strong>bố cục cột, lề, đối xứng</strong>; micro typography là <strong>kerning từng cặp, rag hợp lý, tránh góa quả</strong> — hai tầng cùng quyết định cảm giác “sạch” hay “trật”.</p>

<p>Hiểu typography giúp bạn <strong>không lạc</strong> giữa hàng nghìn font trên mạng: bạn chọn theo <em>chức năng</em> (đọc lâu / bắt mắt tức thì), theo <em>độ tương phản</em> với nền (liên hệ <a href="/kien-thuc-nen-tang/bo-cuc-sac-do">Bố cục sắc độ</a> khi chữ cần nổi trên nền phức tạp), và theo <em>bối cảnh</em> (sách, web, tường triển lãm).</p>

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
  <p class="gls-head">A — Thuật ngữ cốt lõi</p>
  <div class="gls-body">
    <div class="gls-item"><p class="gls-term">Typeface / Font<small>Họ chữ / Bộ file</small></p><p class="gls-def">Typeface là thiết kế glyph; font là file cụ thể (Regular, Bold, Italic). License khác nhau cho web, app, in ấn.</p></div>
    <div class="gls-item"><p class="gls-term">Hierarchy<small>Cấp bậc</small></p><p class="gls-def">Cỡ, đậm nhạt, màu, vị trí — mắt biết đọc gì trước. Thiếu hierarchy là thiếu “đạo diễn” cho trang.</p></div>
    <div class="gls-item"><p class="gls-term">Leading / Line height</p><p class="gls-def">Khoảng cách dòng; body tiếng Việt thường cần nhích cao hơn tiếng Anh thuần vì dấu cao.</p></div>
    <div class="gls-item"><p class="gls-term">Tracking / Kerning</p><p class="gls-def">Tracking: cả cụm; kerning: từng cặp (AV, To…) — cực quan trọng với chữ in lớn, logo, và chữ nghiêng.</p></div>
    <div class="gls-item"><p class="gls-term">Rag &amp; rivers</p><p class="gls-def">Cạnh canh trái tự nhiên tạo “rag”; canh đều hai bên dễ sinh khe sáng dọc (rivers) nếu không chỉnh từ ngắt dòng.</p></div>
    <div class="gls-item"><p class="gls-term">Optical size</p><p class="gls-def">Một số họ có cut riêng cho cỡ nhỏ (caption) vs display — dùng đúng cut giúp nét thanh mảnh ở body và nét đậm ở poster.</p></div>
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

<p>Một bố cục chữ tốt cho người xem <strong>ba tầng</strong>: (1) nhận ra chủ đề trong vài giây đầu — (2) đọc phụ đề, nhãn nhóm, metadata — (3) đọc thân bài nếu họ muốn đào sâu. Nếu mọi thứ cùng cỡ và cùng độ đậm, mắt không có điểm neo; nếu chỉ có tiêu đề to mà thân bài quá chật, người xem cảm giác “hét vào tai rồi thì thầm khó nghe”.</p>

<p>Kiểm tra nhanh: <strong>squint test</strong> (nheo mắt) — khối tiêu đề vẫn phải là vùng <em>tương phản mạnh nhất</em> về mật độ; phụ đề tách bậc rõ với đoạn văn. Cách này giống kiểm tra focal point trong tranh, chỉ áp dụng lên typographic massing.</p>

<div class="pr-table">
  <div class="pr-row"><span class="pr-i">i.</span><div class="pr-n">Tiêu đề<small>Display / H1</small></div><div class="pr-d">Lớn nhất; có thể serif/display đặc trưng hoặc sans mạnh — mang cảm xúc thương hiệu hoặc chủ đề. Giữ dòng ngắn hoặc cho phép ngắt có chủ đích.</div></div>
  <div class="pr-row"><span class="pr-i">ii.</span><div class="pr-n">Phụ đề / nhóm<small>Subhead</small></div><div class="pr-d">Trung gian: mục con, chú thích section; không tranh cỡ với H1 nhưng phải rõ hơn body (cỡ hoặc weight hoặc màu phụ).</div></div>
  <div class="pr-row"><span class="pr-i">iii.</span><div class="pr-n">Nội dung<small>Body</small></div><div class="pr-d">Ưu tiên khả đọc: x-height cao vừa phải, leading đủ, độ dài dòng khoảng 45–75 ký tự cho văn bản Latin; tiếng Việt có thể thử nghiệm hẹp hơn nếu dấu cao.</div></div>
</div>

<div class="spread break-half">
  <div class="spread-text">
    <p class="spread-kicker">Minh họa</p>
    <h3 class="spread-title">Cấp bậc nhìn từ xa</h3>
    <p>Khi nheo mắt, tiêu đề vẫn phải là khối <strong>đậm nhất</strong>; phụ đề tách bậc rõ với đoạn văn. Đây là cách kiểm tra hierarchy trước khi in poster hay xuất PDF portfolio.</p>
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

<p>Nguyên tắc an toàn: <strong>một font cho nội dung dài</strong> + <strong>một font cho tiêu đề / nhấn mạnh</strong> (có thể cùng họ với nhiều trọng lượng, hoặc sans + serif bổ trợ). Thêm font thứ ba chỉ khi bạn đã thành thạo cấp bậc, margin và luật nhịp. Với biến thể <em>variable font</em>, một file có thể phủ nhiều trục (weight, width) — vẫn nên giữ ít “giọng điệu” hình học trên một trang.</p>

<p>Trong <strong>poster mỹ thuật</strong>, chữ thường ngắn — có thể dùng display có cá tính mạnh; trong <strong>portfolio PDF</strong>, ưu tiên khả đọc và spacing đều đặn để giảng viên đọc không mỏi. Khi ghép serif + sans, thường chọn <em>cùng thời đại cảm giác</em> (cùng “kỷ nguyên” thiết kế) để tránh cảm giác ghép ngẫu nhiên.</p>

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
  <div class="tip"><span class="tip-n">01</span><div class="tip-c"><p class="tip-t">Contrast cỡ</p><p class="tip-d">Ít nhất ~1.5–2 bậc giữa tiêu đề và body (vd body 11–12pt → tiêu đề 24–36pt) trừ khi brief tối giản cực đoan.</p></div></div>
  <div class="tip"><span class="tip-n">02</span><div class="tip-c"><p class="tip-t">Giới hạn độ rộng dòng</p><p class="tip-d">Block text quá ngang khiến mắt mệt — chia cột, thu cột, hoặc tăng cỡ nhẹ thay vì kéo ngang full bleed.</p></div></div>
  <div class="tip"><span class="tip-n">03</span><div class="tip-c"><p class="tip-t">Canh lề có chủ đích</p><p class="tip-d">Canh trái thân thuộc cho tiếng Việt dài; canh đều hai bên chỉ khi dòng đủ ít từ và bạn kiểm tra rivers.</p></div></div>
  <div class="tip"><span class="tip-n">04</span><div class="tip-c"><p class="tip-t">Squint test</p><p class="tip-d">Nheo mắt: tiêu đề vẫn nhô ra nhất? Nếu không, tăng tương phản cỡ, weight, hoặc nền block.</p></div></div>
  <div class="tip"><span class="tip-n">05</span><div class="tip-c"><p class="tip-t">Modular scale</p><p class="tip-d">Chọn một tỉ lệ (vd 1.25, 1.333) nhân từ cỡ cơ sở để sinh H1/H2/body/caption — ít quyết định tùy hứng hơn.</p></div></div>
  <div class="tip"><span class="tip-n">06</span><div class="tip-c"><p class="tip-t">Baseline khi mix ảnh + chữ</p><p class="tip-d">Căn đáy dòng đầu tiên của đoạn với grid ảnh giúp spread editorial “đứng” dù có nhiều khối.</p></div></div>
</div>

<div class="div-sec">
  <div class="div-num"><em>04</em></div>
  <div class="div-meta">
    <p class="div-kicker">Lưới &amp; nhịp</p>
    <h2 class="div-title">Modular scale và baseline</h2>
  </div>
</div>

<p><strong>Modular scale</strong> là chuỗi cỡ chữ lấy từ một số cơ sở nhân theo tỉ lệ cố định — giúp các cấp H1, H2, quote, caption “bắt sóng” nhau thay vì mỗi khối một cỡ tùy hứng. Kết hợp với <strong>lưới cột và baseline</strong> (đường căn đáy chữ theo nhịp dọc), bạn kiểm soát được cảm giác editorial: các khối chữ và ảnh cùng “nhịp thở” dọc trang.</p>

<p>Trên web, baseline cứng toàn trang đôi khi xung đột với component động — khi đó hãy nhất quán ít nhất <strong>nhịp dọc theo section</strong> (padding section là bội số của 4px/8px) và giữ scale cỡ trong design token. Mục tiêu không phải ôm cứng luật sách in, mà là <em>giảm entropy</em> để người xem không bị mỏi.</p>

<div class="cmp break-half">
  <div class="cmp-col l">
    <p class="cmp-lbl">Tốt cho khả đọc</p>
    <p class="cmp-title">Ưu tiên</p>
    <ul class="cmp-list">
      <li>Leading đủ; tăng nhẹ cho tiếng Việt nhiều dấu</li>
      <li>Tương phản chữ — nền đạt WCAG khi là UI / web</li>
      <li>Hierarchy rõ bằng cỡ + weight + ít màu nhấn</li>
      <li>Ít font; margin/gutter đồng nhất theo grid</li>
      <li>Test đoạn văn thật thay vì chỉ “Lorem ipsum”</li>
    </ul>
  </div>
  <div class="cmp-col r">
    <p class="cmp-lbl">Dễ gây mệt</p>
    <p class="cmp-title">Tránh</p>
    <ul class="cmp-list">
      <li>Quá nhiều decorative trong một spread</li>
      <li>Chữ nhỏ trên poster treo xa người xem</li>
      <li>ALL CAPS cho đoạn văn dài (mất hình dạng từ)</li>
      <li>Tracking âm quá mức trên body nhỏ</li>
      <li>Kéo dãn font không đồng tỉ lệ (trừ khi méo có chủ đích)</li>
    </ul>
  </div>
</div>

<div class="div-sec">
  <div class="div-num"><em>05</em></div>
  <div class="div-meta">
    <p class="div-kicker">Tiếng Việt</p>
    <h2 class="div-title">Dấu, độ cao chữ và chọn font</h2>
  </div>
</div>

<p>Tiếng Việt có dấu và thanh — font kém thiết kế làm dấu chồng, sát ascender, hoặc vỡ rhythm dòng. Khi chọn font, hãy <strong>kiểm tra đủ bộ ký tự</strong> và dán một đoạn văn thật (có ơ, ư, ă, dấu kép) ở mọi cỡ bạn dùng. Lưu ý chuẩn hoá Unicode (NFC vs NFD) có thể làm kerning khác nhau giữa app — nếu file in lệch dấu, thử chuẩn hoá trước khi gửi xưởng.</p>

<p>Trên <strong>poster triển lãm</strong>, test in hoặc mockup kích thước thật: chữ nhỏ trong file có thể mất khả đọc khi in A2/A0. Với <strong>chữ trên nền họa tiết</strong>, dùng nền tối/sáng tạm (knockout), viền mảnh, hoặc shadow có chủ đích — liên hệ trắng đen trước màu trong <a href="/kien-thuc-nen-tang/bo-cuc-sac-do">Bố cục sắc độ</a> khi cần.</p>

<div class="dd break-half">
  <div class="dd-col good">
    <div class="dd-head"><span class="dd-badge">+</span><span class="dd-title">Nên làm</span></div>
    <ul class="dd-list">
      <li>Lập style sheet: H1/H2/body/caption + leading cho cả dự án</li>
      <li>Dùng grid hoặc baseline để các khối chữ căng hàng</li>
      <li>Tham chiếu poster / sách yêu thích và đếm bậc chữ + khoảng lề</li>
      <li>Embed / subset font khi gửi file in hoặc PDF portfolio</li>
      <li>Lưu master có layer “chỉ typography” để chỉnh nhanh khi đổi copy</li>
    </ul>
  </div>
  <div class="dd-col bad">
    <div class="dd-head"><span class="dd-badge">−</span><span class="dd-title">Nên tránh</span></div>
    <ul class="dd-list">
      <li>Kéo dãn font (scale không đồng tỉ lệ) trừ khi méo có chủ đích</li>
      <li>Outline quá mỏng trên nền họa tiết phức tạp</li>
      <li>Nhồi slogan dài trong khối hẹp — hãy rút copy hoặc tách cột</li>
      <li>Copy font trend không khớp nội dung / thương hiệu</li>
      <li>Quên kiểm tra dòng cuối trang (orphan) khi in multi-page</li>
    </ul>
  </div>
</div>

<div class="div-sec">
  <div class="div-num"><em>06</em></div>
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
  <p class="key-t">Typography là <em>bố cục của ngôn ngữ hiển thị</em> — macro (lưới) + micro (kerning, rag).</p>
  <p class="key-d">Nắm hierarchy, spacing, scale và khả đọc tiếng Việt, bạn có thêm một lớp công cụ cho poster, portfolio và nhận diện cá nhân — song song với hình vẽ và màu.</p>
</div>

<div class="div-sec">
  <div class="div-num"><em>07</em></div>
  <div class="div-meta">
    <p class="div-kicker">FAQ</p>
    <h2 class="div-title">Câu hỏi thường gặp</h2>
  </div>
</div>

<div class="faq">
  <details open>
    <summary>Serif hay sans cho portfolio nghệ thuật?<span class="faq-icon">−</span></summary>
    <p>Cả hai đều được. Sans thường hiện đại, sạch; serif mang cảm giác editorial. Quan trọng là đồng nhất trong toàn file và đủ khả đọc khi chữ nhỏ; có thể dùng sans cho body + serif chỉ cho tiêu đề.</p>
  </details>
  <details>
    <summary>Có cần mua font không?<span class="faq-icon">+</span></summary>
    <p>Nhiều font Google Fonts / Adobe Fonts đủ cho học tập và portfolio cá nhân; dự án thương mại cần đọc license (web embedding, app, broadcast). Font trả phí thường có đủ weight, kerning và hỗ trợ ngôn ngữ tốt hơn.</p>
  </details>
  <details>
    <summary>Typography liên quan các bài Bố cục thế nào?<span class="faq-icon">+</span></summary>
    <p>Chữ là các khối trong grid — xem thêm <a href="/kien-thuc-nen-tang/diem-tap-trung">Điểm tập trung</a>, <a href="/kien-thuc-nen-tang/bo-cuc-sac-do">Bố cục sắc độ</a> và các bài nhóm Bố cục trong Thư viện để ghép hierarchy không gian với hierarchy chữ.</p>
  </details>
  <details>
    <summary>Luyện nhanh như thế nào?<span class="faq-icon">+</span></summary>
    <p>Tái sắp layout một poster có sẵn chỉ bằng cỡ và weight; hoặc redesign typography cho một trang sách / bìa album; hoặc lấy một trang web và chỉ sửa type scale + leading, giữ nguyên nội dung.</p>
  </details>
  <details>
    <summary>Line height trên web có giống in không?<span class="faq-icon">+</span></summary>
    <p>Gần như luôn cần <strong>lớn hơn một chút</strong> trên màn hình vì độ phân giải và khoảng cách mắt–màn; test trên điện thoại và desktop. Đo bằng cảm giác đọc 3 đoạn liên tiếp, không chỉ một dòng.</p>
  </details>
  <details>
    <summary>Có nên dùng nhiều style ALL CAPS?<span class="faq-icon">+</span></summary>
    <p>ALL CAPS phù hợp nhãn ngắn, số hiệu, hoặc display; tránh cho đoạn dài vì mất hình dạng từ và khó đọc tiếng Việt có dấu. Nếu cần nhấn mạnh, dùng weight hoặc màu thay vì caps lock toàn khối.</p>
  </details>
</div>
`.trim();

export const VIDEO_URL = "";
export const VIDEO_REF_URL = "";
