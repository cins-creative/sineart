// Nội dung bài Gam màu — chỉnh trực tiếp file này.

export const CONTENT_HTML = `
<p class="intro">Gam màu là <strong>ngôn ngữ cảm xúc</strong> của một tác phẩm — bộ màu chủ đạo quyết định cảm giác lạnh hay ấm, buồn hay vui, bình yên hay kịch tính. Nắm được gam màu, bạn kiểm soát được tông cảm xúc của toàn bộ bài.</p>

<div class="stats break-half">
  <div class="stat"><div class="stat-num">∞</div><div class="stat-label">Gam màu</div><div class="stat-sub">Vô số kết hợp có thể</div></div>
  <div class="stat"><div class="stat-num">3</div><div class="stat-label">Yếu tố</div><div class="stat-sub">Hue · Value · Chroma</div></div>
  <div class="stat"><div class="stat-num">100%</div><div class="stat-label">Tác phẩm</div><div class="stat-sub">Đều có gam màu riêng</div></div>
</div>

<div class="div-sec" id="sec-1">
  <div class="div-num"><em>01</em></div>
  <div class="div-meta">
    <p class="div-kicker">Định nghĩa</p>
    <h2 class="div-title">Gam màu là gì?</h2>
  </div>
</div>

<p><strong>Gam màu</strong> <em>(Color Palette / Color Gamut)</em> là tập hợp các màu được sử dụng có chủ đích trong một tác phẩm, tạo nên <em>tông màu thống nhất</em>. Không phải mọi màu đều có mặt — gam màu là về <strong>sự lựa chọn và giới hạn</strong>.</p>

<p>Khác với "màu sắc ngẫu nhiên", gam màu có sự liên kết nội tại: các màu trong cùng gam thường có chung nhiệt độ (ấm/lạnh), chung độ bão hòa, hoặc có quan hệ hài hòa trên bánh xe màu.</p>

<div class="gls">
  <p class="gls-head">A — Thuật ngữ gam màu</p>
  <div class="gls-body">
    <div class="gls-item"><p class="gls-term">Color Palette<small>Bảng màu</small></p><p class="gls-def">Tập hợp màu cụ thể được chọn sử dụng trong một tác phẩm hoặc dự án.</p></div>
    <div class="gls-item"><p class="gls-term">Dominant Color<small>Màu chủ đạo</small></p><p class="gls-def">Màu chiếm diện tích lớn nhất, quyết định tông màu tổng thể.</p></div>
    <div class="gls-item"><p class="gls-term">Accent Color<small>Màu điểm nhấn</small></p><p class="gls-def">Màu xuất hiện ít nhưng tạo điểm nhấn và tương phản quan trọng.</p></div>
    <div class="gls-item"><p class="gls-term">Neutral<small>Màu trung tính</small></p><p class="gls-def">Trắng, đen, xám, nâu đất — nền để các màu khác nổi bật.</p></div>
  </div>
</div>

<div class="div-sec" id="sec-2">
  <div class="div-num"><em>02</em></div>
  <div class="div-meta">
    <p class="div-kicker">Phân loại</p>
    <h2 class="div-title">Các loại gam màu</h2>
  </div>
</div>

<p>Gam màu được chia theo nhiệt độ màu và cấu trúc quan hệ giữa các màu:</p>

<div class="pr-table">
  <div class="pr-row"><span class="pr-i">i.</span><div class="pr-n">Gam nóng<small>Warm palette</small></div><div class="pr-d">Đỏ, cam, vàng, nâu — tạo cảm giác ấm áp, năng lượng, mạnh mẽ.</div></div>
  <div class="pr-row"><span class="pr-i">ii.</span><div class="pr-n">Gam lạnh<small>Cool palette</small></div><div class="pr-d">Xanh lam, tím, xanh lục lạnh — gợi cảm giác bình yên, xa cách, sâu lắng.</div></div>
  <div class="pr-row"><span class="pr-i">iii.</span><div class="pr-n">Gam trung tính<small>Neutral palette</small></div><div class="pr-d">Xám, be, nâu đất — tinh tế, thời thượng, dễ phối hợp.</div></div>
  <div class="pr-row"><span class="pr-i">iv.</span><div class="pr-n">Gam đơn sắc<small>Monochromatic</small></div><div class="pr-d">Chỉ một màu gốc, biến tấu qua nhiều sắc độ và độ bão hòa.</div></div>
  <div class="pr-row"><span class="pr-i">v.</span><div class="pr-n">Gam bổ túc<small>Complementary</small></div><div class="pr-d">Hai màu đối diện trên bánh xe màu — tương phản mạnh, kịch tính.</div></div>
</div>

<div class="pq">
  <p class="pq-text">Gam màu không chỉ là màu đẹp — nó là <em>cảm xúc được quy hoạch.</em></p>
  <span class="pq-cite">— Nguyên tắc hòa sắc ứng dụng</span>
</div>

<div class="div-sec" id="sec-3">
  <div class="div-num"><em>03</em></div>
  <div class="div-meta">
    <p class="div-kicker">Vai trò</p>
    <h2 class="div-title">Vai trò trong tác phẩm</h2>
  </div>
</div>

<p>Gam màu không chỉ là thẩm mỹ — nó thực hiện chức năng kể chuyện quan trọng:</p>

<div class="el-intro">
  <div class="el-intro-n">4</div>
  <p class="el-intro-t">Bốn chức năng chính của gam màu trong một tác phẩm.</p>
</div>

<div class="el-list">
  <div class="el-item">
    <span class="el-n">01</span>
    <p class="el-name">Truyền cảm xúc <em>Emotion</em></p>
    <p class="el-desc">Gam vàng-cam tạo cảm giác ấm áp hoài niệm. Gam lam-tím gợi cô đơn hay huyền bí.</p>
  </div>
  <div class="el-item">
    <span class="el-n">02</span>
    <p class="el-name">Thống nhất bài <em>Cohesion</em></p>
    <p class="el-desc">Gam màu nhất quán làm bài trông chỉn chu, có chủ đích — dù vẽ nhiều chi tiết khác nhau.</p>
  </div>
  <div class="el-item">
    <span class="el-n">03</span>
    <p class="el-name">Tạo chiều sâu <em>Depth</em></p>
    <p class="el-desc">Kết hợp gam nóng ở tiền cảnh và gam lạnh ở hậu cảnh tạo ảo giác chiều sâu không gian.</p>
  </div>
  <div class="el-item">
    <span class="el-n">04</span>
    <p class="el-name">Nhận diện thương hiệu <em>Brand</em></p>
    <p class="el-desc">Trong thiết kế, gam màu là bộ nhận diện — màu xanh của Facebook, đỏ của Coca-Cola.</p>
  </div>
</div>

<div class="div-sec" id="sec-4">
  <div class="div-num"><em>04</em></div>
  <div class="div-meta">
    <p class="div-kicker">Thực hành</p>
    <h2 class="div-title">Cách chọn gam màu</h2>
  </div>
</div>

<p>Chọn gam màu hiệu quả không phải ngẫu nhiên — nó là quy trình có thứ tự:</p>

<div class="tips">
  <div class="tip"><span class="tip-n">01</span><div class="tip-c"><p class="tip-t">Bắt đầu từ cảm xúc muốn truyền</p><p class="tip-d">Hỏi: bài này muốn người xem cảm thấy gì? Ấm áp → gam nóng. Bí ẩn → gam lạnh tối.</p></div></div>
  <div class="tip"><span class="tip-n">02</span><div class="tip-c"><p class="tip-t">Chọn 3–5 màu làm core</p><p class="tip-d">Một màu chủ đạo (60%), một màu phụ (30%), một màu điểm nhấn (10%). Không cần nhiều hơn.</p></div></div>
  <div class="tip"><span class="tip-n">03</span><div class="tip-c"><p class="tip-t">Kiểm tra hài hòa trên bánh xe</p><p class="tip-d">Các màu trong gam nên có quan hệ hài hòa: analogous, complementary, hoặc triadic.</p></div></div>
  <div class="tip"><span class="tip-n">04</span><div class="tip-c"><p class="tip-t">Thử gam màu trên thumbnail</p><p class="tip-d">Tô gam màu thô lên bản phác thảo nhỏ. Nếu thumbnail nhìn ổn, gam màu đang đúng hướng.</p></div></div>
</div>

<div class="dd break-half">
  <div class="dd-col good">
    <div class="dd-head"><span class="dd-badge">+</span><span class="dd-title">Nên làm</span></div>
    <ul class="dd-list">
      <li>Quyết định gam màu trước khi vẽ chi tiết</li>
      <li>Nghiên cứu gam màu của họa sĩ bạn ngưỡng mộ</li>
      <li>Giữ số màu tối thiểu cần thiết</li>
      <li>Dùng màu trung tính để làm nền cho gam nổi bật</li>
    </ul>
  </div>
  <div class="dd-col bad">
    <div class="dd-head"><span class="dd-badge">−</span><span class="dd-title">Nên tránh</span></div>
    <ul class="dd-list">
      <li>Dùng quá nhiều màu không liên quan</li>
      <li>Chọn màu vì "thích" mà không nghĩ đến tông tổng thể</li>
      <li>Để gam nóng và lạnh cạnh tranh ngang nhau</li>
      <li>Bỏ qua vai trò của màu trung tính</li>
    </ul>
  </div>
</div>

<div class="key break">
  <p class="key-lbl">⭐ Điểm mấu chốt</p>
  <p class="key-t">Gam màu là <em>quyết định đầu tiên,</em> không phải cuối cùng.</p>
  <p class="key-d">Hầu hết họa sĩ mới chọn màu khi bài đã gần xong — đó là lý do gam màu thường không thống nhất. Gam màu phải được quyết định ngay từ bước phác thảo thumbnail, trước khi bất kỳ chi tiết nào được vẽ.</p>
</div>

<div class="div-sec" id="sec-5">
  <div class="div-num"><em>05</em></div>
  <div class="div-meta">
    <p class="div-kicker">FAQ</p>
    <h2 class="div-title">Câu hỏi thường gặp</h2>
  </div>
</div>

<div class="faq">
  <details open>
    <summary>Gam màu và hòa sắc khác nhau thế nào?<span class="faq-icon">−</span></summary>
    <p>Hòa sắc là <em>quy luật</em> phối màu hài hòa. Gam màu là <em>kết quả</em> của việc áp dụng hòa sắc — bộ màu cụ thể được chọn cho một tác phẩm.</p>
  </details>
  <details>
    <summary>Có thể dùng nhiều hơn 5 màu không?<span class="faq-icon">+</span></summary>
    <p>Được, nhưng cần có hệ thống. Khi số màu tăng, cần rõ ràng hơn về vai trò từng màu (chủ đạo, phụ, điểm nhấn) và đảm bảo chúng có quan hệ hài hòa.</p>
  </details>
  <details>
    <summary>Gam màu có thể thay đổi trong một bộ tranh không?<span class="faq-icon">+</span></summary>
    <p>Có thể thay đổi về màu cụ thể, nhưng nên giữ nguyên <em>tính cách</em> gam — ví dụ cả bộ đều dùng gam muted, hoặc cả bộ đều có điểm nhấn tương phản.</p>
  </details>
  <details>
    <summary>Làm sao phân tích gam màu của họa sĩ khác?<span class="faq-icon">+</span></summary>
    <p>Dùng color picker để lấy 5-6 màu chủ đạo từ tác phẩm, xếp chúng cạnh nhau, quan sát nhiệt độ và quan hệ trên bánh xe. Phân tích 10 bài của 1 họa sĩ để thấy pattern.</p>
  </details>
</div>
`;

export const VIDEO_URL = "https://youtu.be/3KiDAx5hwkE";

export const VIDEO_REF_URL = "";
