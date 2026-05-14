// Nội dung Thư viện — phối cảnh mắt cá (fisheye / curvilinear perspective).

export const CONTENT_HTML = `
<p class="intro"><strong>Phối cảnh mắt cá</strong> thuộc họ <em>phối cảnh cong</em> (curvilinear): thay vì các đường thẳng trong thực tế hội tụ về điểm tụ trên một mặt phẳng “phẳng” như phối cảnh tuyến tính cổ điển, ống mắt cá chiếu một vùng nhìn <strong>rất rộng</strong> lên cảm biến phẳng — khiến đường thẳng trở thành <strong>đường cong</strong> quanh tâm, chân trời uốn, và mép khung biến dạng rõ. Để đối chiếu với hệ “thẳng nét”, xem <a href="/kien-thuc-nen-tang/ly-thuyet-phoi-canh">Lý thuyết phối cảnh</a>; với hệ không dùng điểm tụ cổ điển, xem <a href="/kien-thuc-nen-tang/phoi-canh-song-song">Phối cảnh song song</a>.</p>

<div class="stats break-half">
  <div class="stat"><div class="stat-num">180°</div><div class="stat-label">Góc mở</div><div class="stat-sub">Ống toàn phần điển hình</div></div>
  <div class="stat"><div class="stat-num">◎</div><div class="stat-label">Đối xứng</div><div class="stat-sub">Quanh tâm ống</div></div>
  <div class="stat"><div class="stat-num">∿</div><div class="stat-label">Chân trời</div><div class="stat-sub">Có thể cong</div></div>
</div>

<div class="div-sec">
  <div class="div-num"><em>01</em></div>
  <div class="div-meta">
    <p class="div-kicker">Cơ chế</p>
    <h2 class="div-title">Vì sao đường thẳng lại thành cong?</h2>
  </div>
</div>

<p>Ống <strong>fisheye</strong> không cố “là phẳng” bán cầu nhìn như ống tiêu chuẩn; nó chấp nhận <em>biến dạng có quy luật</em> để đổi lấy góc mở cực lớn. Trên mặt phẳng ảnh, mỗi điểm tương ứng một hướng nhìn trên cầu — khoảng cách từ <strong>tâm ảnh</strong> thường là hàm bán kính góc (tùy mô hình ống). Hệ quả: đường song song trong thực tế có thể <strong>cong cùng chiều</strong> về phía tâm; đường chân trời khi camera nghiêng trở thành <strong>cung</strong> thay vì một đường ngang “đơn”.</p>

<p>Các họ <strong>equidistant</strong>, <strong>equisolid angle</strong>, <strong>stereographic</strong>… khác nhau ở cách “phân bổ” góc lên bán kính pixel — méo cạnh, độ sáng theo cosin, hay bảo toàn góc nội tại (stereographic) cho cảm giác khác nhau. Khi vẽ tay, bạn không cần nhớ công thức: chỉ cần <strong>chọn một ref</strong> (ảnh chụp cùng loại ống) và bám theo độ cong đó suốt bài.</p>

<div class="gls">
  <p class="gls-head">A — Từ khoá &amp; phân biệt</p>
  <div class="gls-body">
    <div class="gls-item"><p class="gls-term">Curvilinear<small>Phối cảnh cong</small></p><p class="gls-def">Họ phối cảnh mà đường thẳng không nhất thiết thẳng trên ảnh — mắt cá là ví dụ điển hình.</p></div>
    <div class="gls-item"><p class="gls-term">Rectilinear<small>Siêu rộng “thẳng”</small></p><p class="gls-def">Ống góc rộng cố giữ đường thẳng; góc mở có giới hạn trước khi méo cực đoan — khác hoàn toàn fisheye về cảm giác mép.</p></div>
    <div class="gls-item"><p class="gls-term">Barrel / pincushion<small>Phiếm kỹ thuật</small></p><p class="gls-def">Mép lõm / bụng phình do quang học — trực giác gần mắt cá nhưng có thể sửa profile; fisheye thì méo <em>có chủ đích</em> theo thiết kế ống.</p></div>
    <div class="gls-item"><p class="gls-term">Circular vs full-frame</p><p class="gls-def">Hình tròn nằm trong khung chữ nhật (circle fisheye) hay phủ kín cảm biến — ảnh hưởng trực tiếp layout trần–tường và vùng đen.</p></div>
    <div class="gls-item"><p class="gls-term">Center weight</p><p class="gls-def">Gần tâm thường “đỡ cong” hơn — đặt mặt nhân vật ở giữa nếu muốn dễ đọc biểu cảm.</p></div>
    <div class="gls-item"><p class="gls-term">Entrance pupil</p><p class="gls-def">Tâm méo thực tế có thể lệch khỏi geometric center khi chụp cận — khi match ref cần căn theo ảnh thật.</p></div>
  </div>
</div>

<div class="pr-table">
  <div class="pr-row"><span class="pr-i">i.</span><div class="pr-n">Fisheye<small>Mắt cá</small></div><div class="pr-d">Góc rộng cực đại, đường thẳng cong theo quy luật tâm; chân trời có thể là cung; phù hợp hang, cabin, hầm, “camera an ninh”.</div></div>
  <div class="pr-row"><span class="pr-i">ii.</span><div class="pr-n">Rectilinear siêu rộng</div><div class="pr-d">Giữ đường thẳng trong khả năng ống; mép vẫn có foreshortening mạnh nhưng không “cuộn” như cầu toàn phần.</div></div>
  <div class="pr-row"><span class="pr-i">iii.</span><div class="pr-n">Panorama / 360</div><div class="pr-d">Bài toán “bọc không gian” — xem <a href="/kien-thuc-nen-tang/phoi-canh-panorama-360">Phối cảnh Panorama 360°</a>; khác mắt cá một khung tĩnh nhưng cùng họ góc rộng.</div></div>
</div>

<div class="mosaic mosaic--image">
  <div class="mosaic-big">
    <img src="/img/phoi-canh-mat-ca/mosaic-main.png" alt="Phối cảnh mắt cá trong khung tròn — tàu điện, đường lưới cong" loading="lazy" decoding="async" />
  </div>
  <div class="mosaic-small">
    <img src="/img/phoi-canh-mat-ca/thumbnail.png" alt="Lớp học méo mắt cá — phác kèm góc nhìn và sơ đồ trên" loading="lazy" decoding="async" />
  </div>
  <div class="mosaic-small">
    <img src="/img/phoi-canh-mat-ca/mosaic-small-2.png" alt="Ảnh chụp hành lang góc siêu rộng — méo thùng điển hình ống mắt cá" loading="lazy" decoding="async" />
  </div>
</div>

<div class="div-sec">
  <div class="div-num"><em>02</em></div>
  <div class="div-meta">
    <p class="div-kicker">Thực hành</p>
    <h2 class="div-title">Lưới cong, nhân vật và mép khung</h2>
  </div>
</div>

<p>Khi phác <strong>từ tâm ra</strong>, lưới đồng tâm (hoặc “spider grid”) giúp đặt khối kiến trúc và đường ray — mọi đường “thẳng trong không gian” sẽ cắt lưới theo một cung có thể dự đoán. Với <strong>nhân vật</strong>: phần cơ thể ở <em>mép</em> khung bị kéo dài theo bán kính — cần chủ động kéo dáng hoặc đổi pose nếu không muốn mặt méo. Khi storyboard cần <strong>đọc nhanh</strong>, đặt mặt và bàn tay gần tâm; để chân hoặc vũ khí ra mép nếu brief chấp nhận biến dạng kịch tính.</p>

<p>Nếu bạn đang dựng <strong>tỉ lệ người</strong>, ôn thêm bài <a href="/kien-thuc-nen-tang/ti-le-co-the-nguoi">Tỉ lệ cơ thể người</a> — fisheye làm “đo bằng mắt” khó hơn vì cùng một cánh tay có thể trông dài gấp đôi chỉ vì nằm sát viền. Cách an toàn: <strong>khóa ref</strong> một pose chụp cùng tiêu cự, vẽ contour lên ref rồi mới thoát ref.</p>

<div class="tips">
  <div class="tip"><span class="tip-n">01</span><div class="tip-c"><p class="tip-t">Một ref — một độ cong</p><p class="tip-d">Không trộn ảnh 8mm circle với full-frame diagonal fisheye trong cùng một lớp nền.</p></div></div>
  <div class="tip"><span class="tip-n">02</span><div class="tip-c"><p class="tip-t">Tâm = điểm ổn</p><p class="tip-d">Ưu tiên mắt nhìn, UI quan trọng, hoặc logo ở vùng ít cong nhất.</p></div></div>
  <div class="tip"><span class="tip-n">03</span><div class="tip-c"><p class="tip-t">Ellipse nhất quán</p><p class="tip-d">Vòng tròn nằm nghiêng trong không gian trở thành ellipse — sai trục ellipse = sai toàn bộ “sàn”.</p></div></div>
  <div class="tip"><span class="tip-n">04</span><div class="tip-c"><p class="tip-t">Chân trời là cung</p><p class="tip-d">Khi camera ngửa, vẽ chân trời cong trước — mọi tòa nhà “đứng” vuông góc với cung đó.</p></div></div>
  <div class="tip"><span class="tip-n">05</span><div class="tip-c"><p class="tip-t">Tách lớp nếu mix hệ</p><p class="tip-d">Nền mắt cá + nhân vật vẽ gần rectilinear: cần viền sáng, blur hoặc depth để khán giả chấp nhận.</p></div></div>
</div>

<div class="div-sec">
  <div class="div-num"><em>03</em></div>
  <div class="div-meta">
    <p class="div-kicker">Ứng dụng</p>
    <h2 class="div-title">Khi nào brief “xin” méo có chủ đích?</h2>
  </div>
</div>

<p><strong>Key art &amp; poster:</strong> mắt cá tạo cảm giác <em>đang bị quan sát</em> hoặc không gian kín (hầm, tàu ngầm, phòng MRI). <strong>Game &amp; UI:</strong> camera top-down giả lập camera an ninh. <strong>Truyện tranh / kinh dị:</strong> méo mép khung làm tăng lo âu mà không cần vẽ thêm chi tiết. <strong>Ảnh kiến trúc:</strong> nội thất siêu rộng khi không đủ lùi lưng — trade-off là đường thẳng cong.</p>

<p>Khi brief yêu cầu <strong>đọc kích thước tương đối</strong> hoặc <strong>lưới module</strong>, đừng chọn mắt cá — hãy quay về <a href="/kien-thuc-nen-tang/phoi-canh-song-song">song song / isometric</a>. Khi brief yêu cầu <strong>bao quanh người xem</strong>, đó là bài toán panorama — không nhầm với một khung fisheye tĩnh.</p>

<div class="div-sec">
  <div class="div-num"><em>04</em></div>
  <div class="div-meta">
    <p class="div-kicker">Cạm bẫy</p>
    <h2 class="div-title">Nên và tránh khi tập</h2>
  </div>
</div>

<div class="dd break-half">
  <div class="dd-col good">
    <div class="dd-head"><span class="dd-badge">+</span><span class="dd-title">Nên</span></div>
    <ul class="dd-list">
      <li>Dùng ref ảnh cùng tiêu cự và crop (circle / full-frame) để khớp độ cong</li>
      <li>Giữ một tâm thị giác rõ — đặc biệt với circle fisheye có viền đen</li>
      <li>Vẽ lớp “sơ đồ cong” mỏng trước, đặt khối lớn, mới vào chi tiết</li>
      <li>Kiểm tra thumbnail nhỏ: còn đọc được silhouette nhân vật không?</li>
    </ul>
  </div>
  <div class="dd-col bad">
    <div class="dd-head"><span class="dd-badge">−</span><span class="dd-title">Tránh</span></div>
    <ul class="dd-list">
      <li>Trộn nét thẳng phối cảnh tuyến tính cùng khối mắt cá không có quy tắc phân lớp</li>
      <li>Quên méo cơ thể người ở mép — đặc biệt tay đưa về phía camera</li>
      <li>Vẽ chân trời thẳng khi ref đã là cung — “sửa phẳng” vô tình làm đổ cả kiến trúc</li>
      <li>Dùng fisheye cho toàn bộ truyện dài nếu brief không yêu cầu — mắt dễ mệt</li>
    </ul>
  </div>
</div>

<div class="pq">
  <p class="pq-text">Mắt cá không “sai” phối cảnh — nó <em>đổi giả định</em> từ mặt phẳng sang một phần bán cầu nhìn.</p>
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
  <p class="key-t">Mắt cá đọc qua <em>tâm</em> và <em>bán kính</em> — không qua lưới điểm tụ phẳng.</p>
  <p class="key-d">Ref thật cùng loại ống ổn định hơn tưởng tượng thuần; chọn đúng hệ (fisheye vs rectilinear vs 360) theo brief “méo” hay “bọc không gian”.</p>
</div>

<div class="faq">
  <details open>
    <summary>Mắt cá có phải panorama không?<span class="faq-icon">−</span></summary>
    <p>Cùng họ <strong>góc rộng</strong> nhưng mắt cá thường là <strong>một khung</strong> với méo mạnh quanh tâm; panorama 360 là <strong>bọc kín</strong> trục ngang hoặc cầu — xem chi tiết ở <a href="/kien-thuc-nen-tang/phoi-canh-panorama-360">Phối cảnh Panorama 360°</a>.</p>
  </details>
  <details>
    <summary>Barrel distortion trong Lightroom có phải fisheye?<span class="faq-icon">+</span></summary>
    <p>Chưa chắc — đó thường là <strong>sửa sai số quang học nhỏ</strong> của ống thường. Fisheye là <em>thiết kế méo có quy tắc</em>; khi “sửa phẳng” fisheye bạn đang cắt góc và làm mất phần nhìn rộng.</p>
  </details>
  <details>
    <summary>Có nên học fisheye trước phối cảnh một điểm tụ?<span class="faq-icon">+</span></summary>
    <p>Nên có nền <a href="/kien-thuc-nen-tang/ly-thuyet-phoi-canh">phối cảnh tuyến tính</a> trước — fisheye dễ gây hoang mang nếu chưa đọc được đường chân trời và khối hộp chuẩn.</p>
  </details>
  <details>
    <summary>Circle fisheye khác full-frame chỗ nào khi vẽ?<span class="faq-icon">+</span></summary>
    <p><strong>Circle</strong> để lộ vùng đen quanh hình tròn — bố cục phải tính luôn “không gian âm”. <strong>Full-frame</strong> phủ kín cảm biến; méo chủ yếu ở góc. Hai loại ref không thay thế cho nhau.</p>
  </details>
</div>
`;

export const VIDEO_URL = "";

export const VIDEO_REF_URL = "";
