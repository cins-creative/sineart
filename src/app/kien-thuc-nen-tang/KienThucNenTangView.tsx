"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import "./kien-thuc-library.css";

const SIDEBAR = [
  {
    id: "ly-thuyet",
    label: "Lý thuyết cơ sở",
    links: [
      { href: "/kien-thuc-nen-tang", label: "Cơ sở tạo hình", active: true },
      { href: "#", label: "Nguyên lý thị giác" },
      { href: "#", label: "Phương pháp vẽ giới hạn" },
      { href: "#", label: "Phương pháp vẽ cấu trúc" },
    ],
  },
  {
    id: "bo-cuc",
    label: "Bố cục",
    links: [
      { href: "#", label: "Lý thuyết phối cảnh" },
      { href: "#", label: "Điểm tập trung" },
      { href: "#", label: "Bố cục sắc độ" },
    ],
  },
  {
    id: "giai-phau",
    label: "Giải phẫu",
    links: [{ href: "#", label: "Tỉ lệ cơ thể" }],
  },
] as const;

export default function KienThucNenTangView() {
  const [query, setQuery] = useState("");

  const sidebarFiltered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SIDEBAR;
    return SIDEBAR.map((sec) => ({
      ...sec,
      links: sec.links.filter((l) => l.label.toLowerCase().includes(q)),
    })).filter((sec) => sec.links.length > 0);
  }, [query]);

  async function handleShare(): Promise<void> {
    const url =
      typeof window !== "undefined" ? window.location.href : "";
    const title = document.title;
    try {
      if (navigator.share) {
        await navigator.share({
          title,
          text: "Cơ sở tạo hình — Thư viện Sine Art",
          url,
        });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      }
    } catch {
      /* user cancelled or unsupported */
    }
  }

  return (
    <div className="ktn-library-page">
      <div className="ktn-lib-inner">
        <main className="library">
          <h2 className="sr-only">
            Thư viện lý thuyết — Cơ sở tạo hình
          </h2>

          <div className="layout-header">
            <div className="layout-tag">📚 Thư viện · Bài giảng</div>
            <span className="layout-breadcrumb">
              Sidebar · Article · TOC
            </span>
          </div>

          <div className="grid-3col">
            <aside className="sidebar-left" aria-label="Danh mục bài giảng">
              <input
                type="text"
                className="sidebar-search"
                placeholder="Tìm bài…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Tìm trong danh mục"
              />

              {sidebarFiltered.map((sec) => (
                <div key={sec.id} className="sidebar-section">
                  <p className="sidebar-label">{sec.label}</p>
                  {sec.links.map((item) =>
                    "active" in item && item.active ? (
                      <span
                        key={item.label}
                        className="sidebar-link active"
                        aria-current="page"
                      >
                        {item.label}
                      </span>
                    ) : item.href.startsWith("/") ? (
                      <Link
                        key={item.label}
                        href={item.href}
                        className="sidebar-link"
                      >
                        {item.label}
                      </Link>
                    ) : (
                      <a
                        key={item.label}
                        href={item.href}
                        className="sidebar-link"
                      >
                        {item.label}
                      </a>
                    )
                  )}
                </div>
              ))}
            </aside>

            <article>
              <nav className="breadcrumb" aria-label="Breadcrumb">
                <Link href="/">Trang chủ</Link>
                <span className="sep">›</span>
                <span>Thư viện</span>
                <span className="sep">›</span>
                <span>Lý thuyết cơ sở</span>
                <span className="sep">›</span>
                <span className="current">Cơ sở tạo hình</span>
              </nav>

              <h1 className="article-title">
                Cơ sở <span className="highlight">tạo hình</span> — 7 yếu tố
                nền tảng
              </h1>
              <p className="article-lede">
                Hiểu bộ ngữ pháp thị giác cấu thành mọi tác phẩm mỹ thuật:
                điểm, đường, hình, khối, không gian, màu sắc, chất cảm — và 7
                nguyên lý tổ chức chúng thành tác phẩm.
              </p>

              <div className="article-meta">
                <div className="author-chip">
                  <div className="author-avatar" aria-hidden>
                    T
                  </div>
                  <span>Thầy Tú</span>
                </div>
                <span className="meta-sep">·</span>
                <span>18.04.2026</span>
                <span className="meta-sep">·</span>
                <span>12 phút đọc</span>
                <span className="meta-sep">·</span>
                <span className="badge-level">Cơ bản</span>
              </div>

              <div className="hero-media" aria-label="Video bài giảng (placeholder)">
                <div className="play-btn" aria-hidden>
                  <svg width="20" height="20" viewBox="0 0 12 12">
                    <polygon points="3,2 3,10 10,6" fill="#ee5b9f" />
                  </svg>
                </div>
                <span className="video-duration">12:30</span>
              </div>

              <p>
                Trước khi học hình họa, trang trí màu hay bố cục màu — thậm
                chí trước cả khi cầm bút chì vẽ đường thẳng đầu tiên — người học
                mỹ thuật cần hiểu một thứ gọi là{" "}
                <strong>ngôn ngữ thị giác</strong>. Cơ sở tạo hình chính là môn
                học dạy ngôn ngữ ấy, là nền tảng lý thuyết và thực hành mà mọi
                ngành sáng tạo đều dựa vào.
              </p>

              <h2 id="dinh-nghia" className="section-h2">
                <span className="num">01</span>Cơ sở tạo hình là gì?
              </h2>
              <p>
                <strong>Cơ sở tạo hình</strong>{" "}
                <em>(Basic Visual Design / Fundamentals of Visual Art)</em> là
                môn học nền tảng trong chương trình đào tạo mỹ thuật và thiết kế.
                Môn học nghiên cứu một cách có hệ thống{" "}
                <strong>các yếu tố thị giác cơ bản</strong> — điểm, đường, hình,
                khối, không gian, màu sắc, chất cảm — cùng với{" "}
                <strong>các nguyên lý tổ chức</strong> chúng thành một tổng thể
                có giá trị thẩm mỹ.
              </p>
              <p>
                Nói đơn giản: nếu coi một tác phẩm mỹ thuật là một câu nói, thì
                cơ sở tạo hình chính là{" "}
                <strong>bảng chữ cái và ngữ pháp</strong> của ngôn ngữ thị giác.
              </p>

              <figure>
                {/* eslint-disable-next-line @next/next/no-img-element -- URL ngoài thiết kế */}
                <img
                  src="https://i.pinimg.com/originals/e7/9b/12/e79b12a5c847da61b5e3ba3d32bdf0a3.jpg"
                  alt="Sơ đồ các yếu tố và nguyên lý tạo hình cơ bản"
                  loading="lazy"
                />
                <figcaption>
                  Sơ đồ tổng quan các yếu tố và nguyên lý tạo hình
                </figcaption>
              </figure>

              <h2 id="tai-sao" className="section-h2">
                <span className="num">02</span>Tại sao phải học?
              </h2>
              <p>
                Nhiều người mới bắt đầu thường muốn nhảy thẳng vào vẽ chân dung
                hay tô màu. Điều đó giống như muốn viết tiểu thuyết khi chưa
                thuộc mặt chữ.
              </p>

              <h3 className="section-h3">
                1. Nền tảng cho mọi ngành sáng tạo
              </h3>
              <p>
                Hội họa, đồ họa, kiến trúc nội thất, thời trang, hoạt hình, thiết
                kế game — tất cả đều vận hành trên cùng một bộ nguyên lý thị giác.
              </p>

              <h3 className="section-h3">
                2. Yêu cầu bắt buộc của kỳ thi khối H, V
              </h3>
              <p>
                Các trường mỹ thuật và kiến trúc tại Việt Nam đều tổ chức thi
                năng khiếu với hai môn cốt lõi: <strong>Hình họa</strong> và{" "}
                <strong>Bố cục trang trí màu</strong> — cả hai đều là sản phẩm
                trực tiếp của cơ sở tạo hình.
              </p>

              <h3 className="section-h3">3. Rèn luyện tư duy thị giác</h3>
              <p>
                Cơ sở tạo hình không chỉ dạy vẽ — nó dạy cách <strong>nhìn</strong>
                . Một người được đào tạo bài bản sẽ nhận ra bố cục trong khung
                phim, nhịp điệu trong trang sách, tương phản trong bức ảnh.
              </p>

              <div className="pullquote">
                Học cơ sở tạo hình là học cách nhìn thế giới
                <br />
                bằng đôi mắt của một người sáng tạo.
                <cite>— Triết lý giảng dạy tại Sine Art</cite>
              </div>

              <h2 id="yeu-to" className="section-h2">
                <span className="num">03</span>7 yếu tố tạo hình
              </h2>
              <p>
                Bảy &quot;chữ cái&quot; của ngôn ngữ thị giác. Mọi hình ảnh — từ
                tranh Van Gogh đến giao diện ứng dụng — đều được cấu thành từ sự
                kết hợp của các yếu tố sau:
              </p>

              <div className="elements-grid">
                <div className="el-card">
                  <span className="el-num">01</span>
                  <h4>Điểm</h4>
                  <p>
                    Đơn vị nhỏ nhất của thị giác. Điểm đánh dấu vị trí, tạo trọng
                    tâm.
                  </p>
                </div>
                <div className="el-card">
                  <span className="el-num">02</span>
                  <h4>Đường</h4>
                  <p>
                    Chuỗi điểm liên tiếp. Thẳng gợi ổn định, cong gợi chuyển động.
                  </p>
                </div>
                <div className="el-card">
                  <span className="el-num">03</span>
                  <h4>Hình</h4>
                  <p>
                    Diện tích 2D giới hạn bởi đường viền. Hình học gợi trật tự.
                  </p>
                </div>
                <div className="el-card">
                  <span className="el-num">04</span>
                  <h4>Khối</h4>
                  <p>
                    Phiên bản 3D của hình — có khối lượng. Cơ sở của hình họa tả
                    khối.
                  </p>
                </div>
                <div className="el-card">
                  <span className="el-num">05</span>
                  <h4>Không gian</h4>
                  <p>
                    Vùng trống giữa và xung quanh đối tượng. Dương chứa hình, âm
                    tạo thở.
                  </p>
                </div>
                <div className="el-card">
                  <span className="el-num">06</span>
                  <h4>Màu sắc</h4>
                  <p>
                    Yếu tố cảm xúc mạnh nhất. Gồm tông, độ đậm nhạt, độ bão hòa.
                  </p>
                </div>
                <div className="el-card">
                  <span className="el-num">07</span>
                  <h4>Chất cảm</h4>
                  <p>
                    Cảm giác bề mặt — thô, mịn, bóng. Sờ được hoặc gợi bằng nét.
                  </p>
                </div>
              </div>

              <figure>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://i.pinimg.com/originals/2f/47/cd/2f47cdef5a8ea9daaa29d9cddf8b9e39.jpg"
                  alt="Bài tập minh họa đường, hình và khối"
                  loading="lazy"
                />
                <figcaption>
                  Bài tập thực hành yếu tố đường, hình, khối
                </figcaption>
              </figure>

              <div className="callout">
                <p className="callout-label">Ghi chú</p>
                <p>
                  Các yếu tố không tồn tại biệt lập. Một nét bút đã đồng thời chứa
                  đựng đường, chất cảm và đôi khi cả màu sắc. Người học giỏi là
                  người nhận ra sự tương tác giữa chúng.
                </p>
              </div>

              <h2 id="nguyen-ly" className="section-h2">
                <span className="num">04</span>7 nguyên lý tổ chức
              </h2>
              <p>
                Nếu yếu tố là chữ cái, nguyên lý là ngữ pháp — quy luật tổ chức
                chữ cái thành câu có nghĩa.
              </p>

              <div className="principles">
                <div className="principle-row">
                  <div className="p-idx">i</div>
                  <div className="p-name">
                    Cân bằng<small>Balance</small>
                  </div>
                  <div className="p-desc">
                    Phân bố trọng lượng thị giác. Đối xứng (tĩnh, trang nghiêm)
                    hoặc phi đối xứng (động, hiện đại).
                  </div>
                </div>
                <div className="principle-row">
                  <div className="p-idx">ii</div>
                  <div className="p-name">
                    Nhịp điệu<small>Rhythm</small>
                  </div>
                  <div className="p-desc">
                    Lặp lại có chủ ý của yếu tố, dẫn dắt mắt người xem đi qua tác
                    phẩm.
                  </div>
                </div>
                <div className="principle-row">
                  <div className="p-idx">iii</div>
                  <div className="p-name">
                    Tương phản<small>Contrast</small>
                  </div>
                  <div className="p-desc">
                    Đối lập giữa các yếu tố — sáng/tối, lớn/nhỏ. Tạo sức mạnh thị
                    giác và sự rõ ràng.
                  </div>
                </div>
                <div className="principle-row">
                  <div className="p-idx">iv</div>
                  <div className="p-name">
                    Nhấn mạnh<small>Emphasis</small>
                  </div>
                  <div className="p-desc">
                    Tạo điểm thu hút chính, nơi mắt người xem dừng lại đầu tiên.
                  </div>
                </div>
                <div className="principle-row">
                  <div className="p-idx">v</div>
                  <div className="p-name">
                    Tỉ lệ<small>Proportion</small>
                  </div>
                  <div className="p-desc">
                    Mối quan hệ kích thước giữa các thành phần. Tỉ lệ vàng, quy
                    luật 1/3, tỉ lệ cơ thể.
                  </div>
                </div>
                <div className="principle-row">
                  <div className="p-idx">vi</div>
                  <div className="p-name">
                    Hài hòa<small>Harmony</small>
                  </div>
                  <div className="p-desc">
                    Sự ăn khớp giữa các yếu tố. Làm dịu mắt và tạo cảm giác hoàn
                    chỉnh.
                  </div>
                </div>
                <div className="principle-row">
                  <div className="p-idx">vii</div>
                  <div className="p-name">
                    Thống nhất<small>Unity</small>
                  </div>
                  <div className="p-desc">
                    Nguyên lý bao trùm — mọi thành phần cùng phục vụ một ý tưởng
                    duy nhất.
                  </div>
                </div>
              </div>

              <figure>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://i.pinimg.com/originals/8d/1b/ed/8d1bed8deaca7c1c37c7bd19ba6a00eb.jpg"
                  alt="Vòng tròn màu — cơ sở hài hòa màu"
                  loading="lazy"
                />
                <figcaption>Vòng tròn màu — công cụ nền tảng để hiểu hài hòa màu</figcaption>
              </figure>

              <h2 id="ung-dung" className="section-h2">
                <span className="num">05</span>Ứng dụng thực hành
              </h2>
              <p>
                Tại các trường mỹ thuật Việt Nam, kiến thức cơ sở tạo hình được
                chuyển hóa thành ba nhóm môn thực hành chính — mỗi môn có màu đại
                diện riêng trong hệ thống Sine Art:
              </p>

              <div className="subjects">
                <div className="subj-card hh">
                  <span className="subj-label">Khối V</span>
                  <h4>Hình họa</h4>
                  <p>
                    Quan sát và tả khối bằng chì. Vẽ tĩnh vật, tượng, người mẫu.
                  </p>
                </div>
                <div className="subj-card bc">
                  <span className="subj-label">Khối H</span>
                  <h4>Bố cục màu</h4>
                  <p>Sáng tác tác phẩm có chủ đề. Môn tổng hợp cao nhất.</p>
                </div>
                <div className="subj-card tt">
                  <span className="subj-label">Nền tảng</span>
                  <h4>Trang trí màu</h4>
                  <p>
                    Ngôn ngữ màu trong trang trí 2D. Hệ phối màu, hài hòa màu.
                  </p>
                </div>
              </div>

              <figure>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://i.pinimg.com/originals/7e/68/09/7e68090a93bce7ae19cd4117b5e3dd42.jpg"
                  alt="Bài vẽ tĩnh vật bằng chì"
                  loading="lazy"
                />
                <figcaption>
                  Bài hình họa tĩnh vật bằng chì — áp dụng tả khối và tương phản
                  sáng tối
                </figcaption>
              </figure>

              <h2 id="lo-trinh" className="section-h2">
                <span className="num">06</span>Lộ trình học
              </h2>
              <p>
                Với học sinh chuẩn bị thi khối H, V, lộ trình hợp lý thường kéo
                dài <strong>12–24 tháng</strong>, chia thành ba giai đoạn:
              </p>

              <div className="timeline">
                <div className="stage">
                  <span className="duration">GĐ 1 · 3 tháng</span>
                  <h3 className="section-h3">Nhập môn</h3>
                  <p>
                    Làm quen yếu tố cơ bản qua bài tập đường nét, hình khối đơn
                    giản. Rèn thói quen cầm bút, quan sát tỉ lệ, nhìn sáng tối.
                  </p>
                </div>
                <div className="stage">
                  <span className="duration">GĐ 2 · 6–12 tháng</span>
                  <h3 className="section-h3">Chuyên sâu</h3>
                  <p>
                    Tách nhánh theo mục tiêu: khối V tập trung tĩnh vật, tượng,
                    người mẫu; khối H tập trung trang trí màu và sáng tác bố cục.
                  </p>
                </div>
                <div className="stage">
                  <span className="duration">GĐ 3 · 3–6 tháng</span>
                  <h3 className="section-h3">Luyện thi</h3>
                  <p>
                    Làm đề cấu trúc thi thật, luyện tốc độ, chấm chéo, phản biện
                    giảng viên. Giai đoạn quyết định điểm số.
                  </p>
                </div>
              </div>

              <h2 id="faq" className="section-h2">
                <span className="num">07</span>Câu hỏi thường gặp
              </h2>
              <div className="faq">
                <details>
                  <summary>Người chưa từng vẽ có học được không?</summary>
                  <p>
                    Hoàn toàn được. Cơ sở tạo hình được thiết kế cho người bắt đầu
                    từ con số không. Điều kiện duy nhất là sự kiên trì luyện tập và
                    thái độ quan sát cẩn thận.
                  </p>
                </details>
                <details>
                  <summary>Mất bao lâu để thi khối H, V?</summary>
                  <p>
                    Thông thường 12–24 tháng cho người bắt đầu. Học sinh có nền
                    tảng phổ thông có thể rút ngắn còn 6–12 tháng.
                  </p>
                </details>
                <details>
                  <summary>Có thể tự học tại nhà không?</summary>
                  <p>
                    Lý thuyết có thể tự học. Nhưng thực hành — đặc biệt bố cục và
                    màu sắc — cần người chấm sửa. Mắt người mới chưa đủ nhạy để
                    phát hiện lỗi sai của chính mình.
                  </p>
                </details>
                <details>
                  <summary>Khác gì với học vẽ thông thường?</summary>
                  <p>
                    Học vẽ dạy kỹ thuật thao tác. Cơ sở tạo hình dạy tư duy thị
                    giác — tại sao một bố cục đẹp, tại sao một màu hợp màu khác.
                  </p>
                </details>
              </div>

              <div className="related">
                <h3>Bài tập áp dụng</h3>
                <div className="related-grid">
                  <a href="#" className="related-item">
                    <div className="related-thumb c1">01</div>
                    <div>
                      <p className="ri-title">Vẽ 100 đường thẳng</p>
                      <p className="ri-sub">Bài tập · Nhập môn</p>
                    </div>
                  </a>
                  <a href="#" className="related-item">
                    <div className="related-thumb c2">02</div>
                    <div>
                      <p className="ri-title">Khối cơ bản</p>
                      <p className="ri-sub">Bài tập · Tả khối</p>
                    </div>
                  </a>
                </div>
              </div>

              <div className="prev-next">
                <div className="pn-card prev">
                  <p className="pn-label">‹ Bài trước</p>
                  <p className="pn-title">Đây là bài đầu tiên</p>
                </div>
                <a href="#" className="pn-card next">
                  <p className="pn-label">Bài tiếp theo ›</p>
                  <p className="pn-title">Nguyên lý thị giác</p>
                </a>
              </div>
            </article>

            <aside className="sidebar-right" aria-label="Mục lục bài viết">
              <div className="sidebar-right-sticky">
                <p className="right-label">Nội dung bài</p>
                <nav className="toc-links">
                  <a href="#dinh-nghia">Định nghĩa</a>
                  <a href="#tai-sao">Tại sao phải học</a>
                  <a href="#yeu-to">7 yếu tố</a>
                  <a href="#nguyen-ly">7 nguyên lý</a>
                  <a href="#ung-dung">Ứng dụng</a>
                  <a href="#lo-trinh">Lộ trình học</a>
                  <a href="#faq">Câu hỏi FAQ</a>
                </nav>

                <p className="right-label">Tags</p>
                <div className="tags">
                  <span className="tag-item">cơ-sở</span>
                  <span className="tag-item">tạo-hình</span>
                  <span className="tag-item">khối-H</span>
                  <span className="tag-item">khối-V</span>
                  <span className="tag-item">bố-cục</span>
                </div>

                <button type="button" className="btn-outline" onClick={handleShare}>
                  Chia sẻ bài viết
                </button>
                <Link href="/khoa-hoc" className="btn-primary">
                  Xem khóa học
                </Link>
              </div>
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
}
