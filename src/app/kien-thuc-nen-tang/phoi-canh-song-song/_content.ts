// Nội dung Thư viện — phối cảnh song song / hình chiếu song song (parallel projection).

export const CONTENT_HTML = `
<p class="intro"><strong>Phối cảnh song song</strong> là họ các phép chiếu trong đó mọi tia chiếu <em>song song với nhau</em> và không hội tụ về một điểm tụ trên mặt phẳng tranh. Kết quả: các cạnh song song trong thực tế vẫn <strong>song song trên giấy</strong> — rất hữu ích khi bạn cần đọc <em>kích thước tương đối</em>, dựng khối kiến trúc, tile map hay bản vẽ kỹ thuật “sạch” méo ống kính. Để hiểu đối lập rõ nhất, nên đọc kèm bài <a href="/kien-thuc-nen-tang/ly-thuyet-phoi-canh">Lý thuyết phối cảnh</a> (phối cảnh tuyến tính với điểm tụ).</p>

<div class="stats break-half">
  <div class="stat"><div class="stat-num">∥</div><div class="stat-label">Tia chiếu</div><div class="stat-sub">Song song, không tụ</div></div>
  <div class="stat"><div class="stat-num">⊿</div><div class="stat-label">Axonometric</div><div class="stat-sub">Iso · Di · Tri</div></div>
  <div class="stat"><div class="stat-num">□</div><div class="stat-label">Orthographic</div><div class="stat-sub">Đúng mặt phẳng</div></div>
</div>

<div class="div-sec">
  <div class="div-num"><em>01</em></div>
  <div class="div-meta">
    <p class="div-kicker">Định nghĩa</p>
    <h2 class="div-title">Tại sao không có “điểm tụ” cổ điển?</h2>
  </div>
</div>

<p>Trong <strong>phối cảnh tuyến tính</strong> (một / hai / ba điểm tụ), mắt người được mô hình hoá như một <em>camera</em>: các đường song song theo chiều sâu sẽ hội tụ về một hoặc hai điểm trên đường chân trời — đó là cách mô phỏng <strong>khoảng cách</strong> và góc nhìn tự nhiên. Trong <strong>chiếu song song</strong>, ta giả định người quan sát ở “vô cực xa” theo một hướng cố định: các tia chiếu không còn chụm lại, nên <strong>đường song song vẫn song song</strong> sau khi vẽ xuống mặt phẳng.</p>

<p>Đổi lại, bạn <strong>không còn</strong> cảm giác “ống kính” hay foreshortening tự nhiên như ảnh chụp — mọi thứ trông “phẳng” hơn về mặt không gian, nhưng lại <strong>dễ đo, dễ lặp module</strong> và dễ ghép lưới. Đây chính là lý do isometric / axonometric chiếm ưu thế trong bản vẽ kỹ thuật, mô hình exploded view, và nhiều game 2.5D.</p>

<div class="gls">
  <p class="gls-head">A — Thuật ngữ hay gặp</p>
  <div class="gls-body">
    <div class="gls-item"><p class="gls-term">Parallel projection<small>Chiếu song song</small></p><p class="gls-def">Họ lớn gồm orthographic (mặt đứng / mặt bằng) và axonometric (xoay khối rồi chiếu). Điểm chung: không dùng điểm tụ hữu hạn như phối cảnh tuyến tính.</p></div>
    <div class="gls-item"><p class="gls-term">Orthographic<small>Vuông góc</small></p><p class="gls-def">Một mặt phẳng của vật song song với mặt phẳng tranh → hình chiếu giữ đúng tỉ lệ trong mặt đó (front / top / side elevation).</p></div>
    <div class="gls-item"><p class="gls-term">Isometric<small>Cân</small></p><p class="gls-def">Ba trục đều một góc trên mặt phẳng (thường 120°); tỉ lệ dọc thường không bị nén — “khối game” quen thuộc.</p></div>
    <div class="gls-item"><p class="gls-term">Dimetric / Trimetric</p><p class="gls-def">Hai hoặc ba tỉ lệ trục khác nhau — linh hoạt hơn cho sketch kiến trúc; military dimetric là biến thể phổ biến trong CAD kiểu cũ.</p></div>
    <div class="gls-item"><p class="gls-term">Cabinet / Cavalier<small>Oblique</small></p><p class="gls-def">Một mặt phẳng giữ hình thật, chiều sâu xiên theo một hệ số — lai giữa “đọc nhanh” và “giữ mặt phẳng chuẩn”.</p></div>
    <div class="gls-item"><p class="gls-term">Affine vs lens</p><p class="gls-def">Song song ≈ biến đổi affine trên hình chiếu; phối cảnh tụ ≈ mô hình camera / mắt — hai brief khác nhau, hai cách đọc khác nhau.</p></div>
  </div>
</div>

<div class="pr-table">
  <div class="pr-row"><span class="pr-i">i.</span><div class="pr-n">Phối cảnh tuyến tính<small>Linear perspective</small></div><div class="pr-d">Có điểm tụ; kích thước xa nhỏ dần; phù hợp tranh kể chuyện, phong cảnh “như ảnh”, cảm giác đứng trong không gian.</div></div>
  <div class="pr-row"><span class="pr-i">ii.</span><div class="pr-n">Chiếu song song<small>Parallel</small></div><div class="pr-d">Không có điểm tụ hữu hạn; đường song song giữ song song; phù hợp đọc khối, lưới module, bản vẽ lắp ráp, boardgame tile.</div></div>
  <div class="pr-row"><span class="pr-i">iii.</span><div class="pr-n">Khi nào chọn cái nào?</div><div class="pr-d">Brief “cảm giác nhìn thật / khung hình” → tuyến tính. Brief “đo được / so sánh kích thước / lặp pattern” → song song hoặc orthographic.</div></div>
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
    <p class="div-kicker">Thực hành</p>
    <h2 class="div-title">Dựng lưới và giữ “ba hướng chuẩn”</h2>
  </div>
</div>

<p>Trên giấy hoặc tablet, cách ổn định nhất là <strong>vẽ ba trục</strong> (hoặc ba họ đường thẳng) trước khi vào chi tiết. Với isometric thuần, bạn thường có <strong>hai trục xiên 30°</strong> so với đường ngang và <strong>một trục đứng</strong> — mọi cạnh của khối hộp phải song song với một trong ba hướng đó. Khi phá vỡ quy tắc (ví dụ thêm đường xiên tự do), khán giả sẽ đọc nhầm là <em>phối cảnh tụ</em> hoặc nghĩ khối bị “vặn” sai.</p>

<p>Nếu bạn đang dựng <strong>nhân vật từ khối</strong>, hãy nghĩ theo bài <a href="/kien-thuc-nen-tang/phuong-phap-ve-cau-truc">Phương pháp vẽ cấu trúc</a>: hộp ngực – hộp chậu – chốt trục xoay — rồi mới bọc cơ và quần áo. Trên lưới song song, lỗi tỉ lệ thường đến từ việc <strong>trượt một phần khối</strong> ra khỏi ba hướng chuẩn, chứ không phải từ “điểm tụ lệch” như phối cảnh tuyến tính.</p>

<div class="tips">
  <div class="tip"><span class="tip-n">01</span><div class="tip-c"><p class="tip-t">Khóa lưới trước</p><p class="tip-d">Vẽ trục + tick chia độ dài trên một cạnh hộp chuẩn — sau đó nhân bản theo module (cửa sổ, gạch, bậc thang).</p></div></div>
  <div class="tip"><span class="tip-n">02</span><div class="tip-c"><p class="tip-t">Một hệ cho một lớp nền</p><p class="tip-d">Tránh trộn đường tụ điểm và đường song song trên cùng một mặt phẳng nền — nếu cần mix, tách lớp foreground/background rõ ràng.</p></div></div>
  <div class="tip"><span class="tip-n">03</span><div class="tip-c"><p class="tip-t">Đọc ellipse cổng</p><p class="tip-d">Tròn nằm nghiêng trong isometric thành ellipse cùng nhịp — lệch trục ellipse = lệch cảm giác “sàn” và “tường”.</p></div></div>
  <div class="tip"><span class="tip-n">04</span><div class="tip-c"><p class="tip-t">Chừa seam cho tile</p><p class="tip-d">Khi vẽ map lặp, cạnh ô phải khớp vector — kiểm tra bằng cách copy ngang 3 ô liên tiếp xem có “răng cưa” không.</p></div></div>
  <div class="tip"><span class="tip-n">05</span><div class="tip-c"><p class="tip-t">Soi lại phối cảnh tụ</p><p class="tip-d">Đặt một phác thảo camera nhanh bên cạnh để nhớ: cùng một cảnh, hai hệ cho hai nhu cầu đọc khác nhau.</p></div></div>
</div>

<div class="div-sec">
  <div class="div-num"><em>03</em></div>
  <div class="div-meta">
    <p class="div-kicker">Ứng dụng</p>
    <h2 class="div-title">Kiến trúc, game, storyboard và sản phẩm</h2>
  </div>
</div>

<p><strong>Kiến trúc &amp; kỹ thuật:</strong> bản vẽ mặt bằng – mặt đứng, mặt cắt, exploded diagram đều dựa trên orthographic hoặc axonometric để người đọc <em>đo và chế tạo</em> được. <strong>Game &amp; pixel art:</strong> isometric giúp “đọc tầng” rõ mà không cần engine 3D đầy đủ. <strong>Storyboard kỹ thuật:</strong> song song giữ icon máy, mũi tên luồng dữ liệu và khối thiết bị cùng một hệ — dễ trình bày slide hơn là phối cảnh máy ảnh.</p>

<p>Khi brief yêu cầu <strong>cảm giác ống kính</strong> (góc rộng, méo cạnh, chân trời cong), đó là lúc nhảy sang hệ khác: xem thêm <a href="/kien-thuc-nen-tang/phoi-canh-mat-ca">Phối cảnh mắt cá</a> hoặc <a href="/kien-thuc-nen-tang/phoi-canh-panorama-360">Panorama 360°</a>. Không có hệ nào “hơn” hệ nào — chỉ có <em>đúng công cụ cho đúng câu hỏi thị giác</em>.</p>

<div class="div-sec">
  <div class="div-num"><em>04</em></div>
  <div class="div-meta">
    <p class="div-kicker">Cạm bẫy</p>
    <h2 class="div-title">Lỗi thường gặp khi tập</h2>
  </div>
</div>

<div class="dd break-half">
  <div class="dd-col good">
    <div class="dd-head"><span class="dd-badge">+</span><span class="dd-title">Nên</span></div>
    <ul class="dd-list">
      <li>Ghi chú rõ hệ đang dùng (iso 30° / military / cabinet…) ở margin trang</li>
      <li>Dùng một khối thử (hộp 2×2×2) làm thước neo trước khi nhân đôi công trình</li>
      <li>Khi ghép nhân vật vào nền iso, khóa chân theo đường lưới sàn</li>
      <li>Giữ bóng đổ cùng hướng sáng “ảo” với trục lưới — dù không có điểm tụ, vẫn cần nhất quán ánh sáng</li>
    </ul>
  </div>
  <div class="dd-col bad">
    <div class="dd-head"><span class="dd-badge">−</span><span class="dd-title">Tránh</span></div>
    <ul class="dd-list">
      <li>Vẽ tường xiên một góc “cảm tính” không thuộc ba hướng chuẩn</li>
      <li>Trộn nền tụ điểm với đồ vật iso mà không có lớp phân tách</li>
      <li>Quên rằng isometric không bảo toàn tỉ lệ thực theo mọi hướng — vẫn là phép chiếu, không phải mô hình 3D đo được tuyệt đối</li>
      <li>Dùng ellipse khác tỉ lệ cho hai đầu trụ tròn — sẽ “vỡ” khối trụ ngay</li>
    </ul>
  </div>
</div>

<div class="pq">
  <p class="pq-text">Song song không “giả lập mắt người” — nó <em>giả lập bản đồ</em> của không gian: rõ ràng, lặp được, và trung thành với hướng.</p>
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
  <p class="key-t">Phối cảnh song song = <em>giữ song song</em> — đổi lại không mô phỏng camera một điểm nhìn.</p>
  <p class="key-d">Chọn hệ theo brief: “đọc khối &amp; module” hay “cảm giác ống kính” — hai nhu cầu khác nhau; thành thạo cả hai giúp bạn chuyển đổi có chủ đích giữa bản vẽ kỹ thuật và tranh kể chuyện.</p>
</div>

<div class="faq">
  <details open>
    <summary>Isometric có phải “phối cảnh” không?<span class="faq-icon">−</span></summary>
    <p>Có — theo nghĩa rộng (hệ quy chiếu lên mặt phẳng). Nhưng khác <strong>phối cảnh tuyến tính</strong> cổ điển: không dùng điểm tụ hữu hạn; thuộc nhóm <strong>axonometric</strong> / chiếu song song.</p>
  </details>
  <details>
    <summary>Có thể trộn song song và tụ điểm trong một tranh?<span class="faq-icon">+</span></summary>
    <p>Có, khi <strong>phân lớp rõ</strong> — ví dụ nền phố đường phố tụ điểm, khối thiết bị nổi minh họa bằng iso. Cần viền, đổ bóng hoặc desaturation để người xem không lẫn hai hệ.</p>
  </details>
  <details>
    <summary>Isometric có bảo toàn mọi kích thước thật không?<span class="faq-icon">+</span></summary>
    <p><strong>Không hoàn toàn.</strong> Độ dài đoạn thẳng song song với các trục chuẩn thường theo một tỉ lệ nhất quán, nhưng độ dài “chéo” trong không gian 3D vẫn phải quy đổi theo hệ số chiếu — đừng nhầm với thước đo CAD 3D thực.</p>
  </details>
  <details>
    <summary>Tôi nên luyện song song trước hay phối cảnh tụ trước?<span class="faq-icon">+</span></summary>
    <p>Nếu mục tiêu là <strong>thi khối H / phác thảo kiến trúc</strong>, chiếu song song và khối hộp giúp ổn định nhanh. Nếu mục tiêu là <strong>minh họa đường phố / phong cảnh</strong>, ưu tiên phối cảnh tuyến tính — rồi quay lại lưới iso khi cần board kỹ thuật. Hai kỹ năng bổ trợ, không loại trừ.</p>
  </details>
</div>
`;

export const VIDEO_URL = "";

export const VIDEO_REF_URL = "";
