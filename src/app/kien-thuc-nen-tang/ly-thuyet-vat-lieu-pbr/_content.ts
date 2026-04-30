// Nội dung Thư viện — PBR (Physically Based Rendering) cho họa sĩ 2D/3D.

export const CONTENT_HTML = `
<p class="intro"><strong>PBR</strong> (Physically Based Rendering) là cách mô tả vật liệu sao cho <em>phản ứng với ánh sáng</em> bám theo mô hình vật lý gần đúng — giúp kim loại, nhựa, vải, da… trông nhất quán dưới nhiều nguồn sáng và trong pipeline game / render 3D. Bài viết bổ sung cho <strong>Lý thuyết vật liệu cơ bản</strong> với ngôn ngữ map và thông số hay gặp.</p>

<div class="stats break-half">
  <div class="stat"><div class="stat-num">PBR</div><div class="stat-label">Mục tiêu</div><div class="stat-sub">Năng lượng &amp; đo nhất quán</div></div>
  <div class="stat"><div class="stat-num">MR</div><div class="stat-label">Workflow phổ biến</div><div class="stat-sub">Metallic / Roughness</div></div>
  <div class="stat"><div class="stat-num">F0</div><div class="stat-label">Phản xạ góc hẹp</div><div class="stat-sub">Dielectric ~4%, kim loại cao</div></div>
</div>

<div class="div-sec">
  <div class="div-num"><em>01</em></div>
  <div class="div-meta">
    <p class="div-kicker">Tại sao cần PBR</p>
    <h2 class="div-title">Từ “giả vật liệu” đến tham số vật lý</h2>
  </div>
</div>

<p>Trước đây nhiều pipeline dùng <strong>diffuse + specular</strong> tách riêng với gloss riêng cho từng đèn — khó đồng bộ khi đổi môi trường. PBR gom về các đại lượng có ý nghĩa vật lý (albedo, độ nhám, kim loại…) để <strong>bảo toàn năng lượng</strong> và cho kết quả dự đoán được khi thay đổi ánh sáng hoặc exposure.</p>

<div class="gls">
  <p class="gls-head">A — Thuật ngữ lõi</p>
  <div class="gls-body">
    <div class="gls-item"><p class="gls-term">Albedo / Base color<small>Màu nền</small></p><p class="gls-def">Màu khuếch tán của bề mặt — <strong>không</strong> chứa đ shading hay highlight; thường chuẩn hoá trong không gian màu (sRGB cho preview, linear trong tính toán).</p></div>
    <div class="gls-item"><p class="gls-term">Roughness<small>Độ nhám</small></p><p class="gls-def">Đảo của độ bóng: roughness cao → highlight rộng, mờ; thấp → bóng gắt, “gương nhẹ”.</p></div>
    <div class="gls-item"><p class="gls-term">Metallic<small>Kim loại</small></p><p class="gls-def">Kênh 0–1: dielectric (gỗ, nhựa…) vs conductor (kim loại). Kim loại thường không có diffuse riêng như chất dẻo.</p></div>
    <div class="gls-item"><p class="gls-term">Normal / AO</p><p class="gls-def"><strong>Normal map</strong> giả lập chi tiết bề mặt nhỏ; <strong>Ambient occlusion</strong> làm tối khe hở — bổ sung cho geometry yếu.</p></div>
  </div>
</div>

<div class="mosaic">
  <div class="mosaic-big">
    <img src="/img/ly-thuyet-vat-lieu-pbr/hero-cover.png" alt="Minh hoạ workflow map PBR" />
  </div>
  <div class="mosaic-small">
    <img src="/img/ly-thuyet-vat-lieu-pbr/thumbnail.jpg" alt="Roughness và metallic" />
  </div>
  <div class="mosaic-small">
    <img src="/img/ly-thuyet-vat-lieu-pbr/hero-cover.png" alt="Albedo tách sáng" />
  </div>
</div>

<div class="div-sec">
  <div class="div-num"><em>02</em></div>
  <div class="div-meta">
    <p class="div-kicker">Hai họ workflow</p>
    <h2 class="div-title">Metallic/Roughness và Specular/Glossiness</h2>
  </div>
</div>

<p><strong>Metallic–Roughness (MR)</strong> là workflow phổ biến trong game (Unity URP/HDRP, Unreal, Blender): ít map hơn, dễ tránh lỗi năng lượng. <strong>Specular–Glossiness</strong> tách specular màu và gloss — vẫn dùng trong một số DCC và tài sản cũ; khi chuyển đổi cần kiểm tra gamma và độ năng lượng diffuse/specular.</p>

<div class="cmp break-half">
  <div class="cmp-col l">
    <p class="cmp-lbl">Dielectric</p>
    <p class="cmp-title">Chất không kim loại</p>
    <ul class="cmp-list">
      <li>Metallic = 0</li>
      <li>Albedo là màu “thật” của lớp sơn / vải</li>
      <li>Phản xạ góc hẹp (F0) thường ~2–5% — không tự ý tăng spec “trắng toát”</li>
    </ul>
  </div>
  <div class="cmp-col r">
    <p class="cmp-lbl">Conductor</p>
    <p class="cmp-title">Kim loại</p>
    <ul class="cmp-list">
      <li>Metallic → 1</li>
      <li>Màu phản xạ gắn với albedo (đồng, vàng, thép…)</li>
      <li>Diffuse gần như không tách riêng trong MR đúng chuẩn</li>
    </ul>
  </div>
</div>

<div class="pq">
  <p class="pq-text">PBR không phải “một nút là đẹp” — mà là <em>cùng một bộ map đọc đúng</em> dưới mọi ánh sáng.</p>
  <span class="pq-cite">— Tinh thần làm tài sản 3D</span>
</div>

<div class="div-sec">
  <div class="div-num"><em>03</em></div>
  <div class="div-meta">
    <p class="div-kicker">Ánh sáng &amp; vi mặt</p>
    <h2 class="div-title">Fresnel, microfacet và IBL</h2>
  </div>
</div>

<p>Ở góc nhìn gần trực diện, mọi vật phản xạ yếu; ở góc xiên, phản xạ mạnh hơn — đó là <strong>hiệu ứng Fresnel</strong>. Mô hình <strong>microfacet</strong> giả định bề mặt là tập hợp các mặt nhỏ: roughness mô tả độ hỗn loạn hướng của chúng. <strong>IBL</strong> (Image Based Lighting) dùng ảnh môi trường để chiếu sáng — PBR phát huy tối đa khi có HDRI nhất quán.</p>

<div class="el-list">
  <div class="el-item">
    <div class="el-item-text">
      <span class="el-n">01</span>
      <p class="el-name">Chuẩn hoá map</p>
      <p class="el-desc">Roughness/metallic thường là <strong>linear</strong>; base color preview <strong>sRGB</strong>. Sai gamma làm vật bóng nhầm hoặc “bụi”.</p>
    </div>
  </div>
  <div class="el-item">
    <div class="el-item-text">
      <span class="el-n">02</span>
      <p class="el-name">Không “vẽ sáng” vào albedo</p>
      <p class="el-desc">Highlight phải đến từ shader và ánh sáng — albedo chỉ màu chất liệu thuần.</p>
    </div>
  </div>
  <div class="el-item">
    <div class="el-item-text">
      <span class="el-n">03</span>
      <p class="el-name">Họa sĩ 2D</p>
      <p class="el-desc">Khi texturing cho 3D: nghĩ theo <strong>lớp</strong> — base → chi tiết nhỏ (normal) → hao mòn (roughness biến thiên).</p>
    </div>
  </div>
</div>

<div class="tips">
  <div class="tip"><span class="tip-n">01</span><div class="tip-c"><p class="tip-t">Tham chiếu quả cầu</p><p class="tip-d">Render ball chrome + diffuse trong studio HDRI để kiểm tra roughness/metallic.</p></div></div>
  <div class="tip"><span class="tip-n">02</span><div class="tip-c"><p class="tip-t">Thư viện F0</p><p class="tip-d">Tra bảng IOR/F0 cho nhựa, kính, da — tránh spec quá mạnh trên chất dẻo.</p></div></div>
  <div class="tip"><span class="tip-n">03</span><div class="tip-c"><p class="tip-t">Subsurface</p><p class="tip-d">Da, sáp, cao su cần thêm mô hình dưới bề mặt (SSS) — nằm ngoài PBR “đơn giản” nhưng hay đi kèm.</p></div></div>
</div>

<div class="div-sec">
  <div class="div-num"><em>04</em></div>
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
  <p class="key-t">PBR là <em>chung một hệ quy chiếu</em> cho vật liệu và ánh sáng.</p>
  <p class="key-d">Nắm albedo–roughness–metallic và ý Fresnel, bạn làm texture 3D hoặc đọc render preview ít bị “sai chất” khi đổi scene — đồng thời hiểu sâu hơn bài <strong>Shading</strong> và <strong>Vật liệu cơ bản</strong> trên mặt phẳng 2D.</p>
</div>

<div class="faq">
  <details open>
    <summary>PBR có bắt buộc cho minh họa 2D không?<span class="faq-icon">−</span></summary>
    <p>Không — tranh truyền thống không cần map. Nhưng nếu bạn làm <strong>texture game</strong> hoặc overpaint trên render 3D, PBR là ngôn ngữ chung.</p>
  </details>
  <details>
    <summary>Tại sao kim loại trông “đen” ở giữa?<span class="faq-icon">+</span></summary>
    <p>Ở góc nhìn trực diện Fresnel yếu; phản xạ mạnh ở mép — đó là hành vi đúng. Nếu cả mặt kim loại sáng đều, kiểm tra metallic và môi trường.</p>
  </details>
  <details>
    <summary>Nên học song song bài nào?<span class="faq-icon">+</span></summary>
    <p><em>Lý thuyết vật liệu cơ bản</em>, <em>Shading là gì?</em>, và (nếu làm digital) không gian màu / gamma.</p>
  </details>
</div>
`;

export const VIDEO_URL = "";

export const VIDEO_REF_URL = "";
