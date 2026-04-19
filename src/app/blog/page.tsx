"use client";

import Link from "next/link";

const CARDS = [
  { title: "Mache là gì và ứng dụng trong trang trí màu?", cat: "Trang trí màu", time: "6 phút", thumb: "tt", av: "T", avClass: "lilac", date: "8 thg 2" },
  { title: "Vòng tròn màu và nguyên lý bổ túc cho người mới học vẽ", cat: "Bố cục màu", time: "10 phút", thumb: "bc", av: "M", avClass: "mint", date: "5 thg 2" },
  { title: "Thiết lập Clip Studio Paint cho người mới bắt đầu", cat: "Digital", time: "12 phút", thumb: "dg", av: "H", avClass: "", date: "3 thg 2" },
  { title: "5 phương thức xét tuyển của ĐH Hoa Sen năm 2026", cat: "Tin ĐH", time: "5 phút", thumb: "tin-hsu", av: "HSU", avClass: "partner", date: "1 thg 2" },
  { title: "Dấu ấn Văn Lang tại Bangkok Design Week 2026", cat: "Tin ĐH", time: "4 phút", thumb: "tin-vlu", av: "VLU", avClass: "partner", date: "30 thg 1" },
  { title: "[Hướng nghiệp 2026] Digital Marketing tại HUTECH", cat: "Tin ĐH", time: "6 phút", thumb: "tin-htc", av: "HTC", avClass: "partner", date: "28 thg 1" },
  { title: "Tỉ lệ cơ thể người trong vẽ tượng cổ điển", cat: "Hình họa", time: "7 phút", thumb: "hh", av: "L", avClass: "yel", date: "26 thg 1" },
  { title: "RMIT khai giảng ngành Digital Film-making 2026", cat: "Tin ĐH", time: "5 phút", thumb: "tin-rmit", av: "RMIT", avClass: "partner", date: "24 thg 1" },
  { title: "ĐH FPT mở chương trình học bổng 70% cho khối Mỹ thuật", cat: "Tin ĐH", time: "8 phút", thumb: "tin-fpt", av: "FPT", avClass: "partner", date: "22 thg 1" },
] as const;

export default function BlogPage() {
  return (
    <div className="sa-blog">
      <nav className="nav">
        <div className="shell-wide nav-inner">
          <Link className="sa-logo" href="/">
            <span className="sa-logo-sine">Sine</span>
            <span className="sa-logo-art">Art</span>
          </Link>
          <div className="nav-links">
            <Link href="/">Trang chủ</Link>
            <Link href="/khoa-hoc">Khoá học</Link>
            <a href="#">Giáo viên</a>
            <a href="#">Bài vẽ</a>
            <a href="#">Hướng nghiệp</a>
            <a className="active" href="#">Tin tức</a>
          </div>
          <div className="nav-right">
            <button className="nav-icon-btn" aria-label="Tìm kiếm">⌕</button>
            <a className="btn-cta" href="#"><span className="play">▶</span>Vào học</a>
          </div>
        </div>
      </nav>

      <section className="page-hero">
        <div className="page-hero-bg" />
        <span className="blob blob-a" />
        <span className="blob blob-b" />
        <span className="blob blob-c" />
        <div className="shell page-hero-inner">
          <div>
            <div className="ph-eyebrow"><span className="dot">≡</span>Sine Art · 270 bài viết</div>
            <h1>Bài viết <em>mỹ thuật</em><br />nền tảng.</h1>
            <p className="lead">
              Kiến thức mỹ thuật bài bản từ giáo viên Sine Art, thông tin tuyển sinh và hoạt động nổi bật từ các
              trường đại học đối tác — cập nhật hàng tuần.
            </p>
          </div>
          <div className="ph-side">
            <div className="ph-stat"><div className="n"><em>270</em></div><div className="l">Bài viết đã xuất bản<br /><span>Từ 2018 đến nay</span></div></div>
            <div className="ph-stat"><div className="n">21</div><div className="l">Trường đại học đối tác<br /><span>Tin tuyển sinh chính thức</span></div></div>
            <div className="ph-stat"><div className="n">8</div><div className="l">Giáo viên đóng góp<br /><span>Chia sẻ kinh nghiệm thực tế</span></div></div>
          </div>
        </div>
      </section>

      <div className="filter-section">
        <div className="shell">
          <div className="filter-bar">
            <div className="search-input"><span>⌕</span><input placeholder="Tìm bài viết, chủ đề, giáo viên..." /></div>
            <div className="pill-row">
              <button className="pill active">Tất cả · 270</button>
              <button className="pill"><span className="cat-dot hh" />Hình họa · 8</button>
              <button className="pill"><span className="cat-dot bc" />Bố cục màu · 4</button>
              <button className="pill"><span className="cat-dot tt" />Trang trí · 4</button>
              <button className="pill"><span className="cat-dot dg" />Digital · 5</button>
              <button className="pill"><span className="cat-dot neutral" />Tin ĐH · 249</button>
            </div>
          </div>
        </div>
      </div>

      <div className="shell">
        <div className="list-body">
          <div>
            <div className="sec-label">Bài nổi bật tuần này</div>
            <a href="#" className="featured-card">
              <div className="featured-thumb"><span className="featured-badge">★ NỔI BẬT</span></div>
              <div className="featured-meta">
                <div className="cat-row"><span className="cat-dot hh" /><span className="cat-name">Hình họa</span><span className="cat-sep">·</span><span className="cat-time">8 phút đọc</span></div>
                <h2>Kiến thức cơ bản về phối cảnh cho người mới bắt đầu</h2>
                <p className="excerpt">Hiểu đường chân trời, điểm tụ và cách vẽ không gian ba chiều trên mặt phẳng hai chiều với Clip Studio Paint.</p>
                <div className="author-row"><span className="avatar">N</span><span className="author-name">Nadia</span><span className="cat-sep">·</span><span className="author-date">10 thg 2, 2026</span></div>
              </div>
            </a>

            <div style={{ marginTop: 40 }}>
              <div className="sec-label">Bài viết mới nhất</div>
              <div className="card-grid">
                {CARDS.map((c) => (
                  <a key={c.title} className="card" href="#">
                    <div className={`card-thumb ${c.thumb}`}><span className="thumb-badge">{c.cat}</span></div>
                    <div className="card-body">
                      <div className="cat-row"><span className={`cat-dot ${c.cat === "Tin ĐH" ? "neutral" : c.thumb}`} /><span className="cat-name">{c.cat}</span><span className="cat-sep">·</span><span className="cat-time">{c.time}</span></div>
                      <h3 className="card-title">{c.title}</h3>
                      <div className="card-footer"><span className={`avatar ${c.avClass}`}>{c.av}</span><span className="author-name">{c.av}</span><span className="cat-sep">·</span><span className="author-date">{c.date}</span></div>
                    </div>
                  </a>
                ))}
              </div>

              <div className="pagination">
                <button className="page-btn">‹</button>
                <div className="page-num-group">
                  <button className="page-num active">1</button>
                  <button className="page-num">2</button>
                  <button className="page-num">3</button>
                  <span className="page-dots">···</span>
                  <button className="page-num">23</button>
                </div>
                <button className="page-btn">›</button>
              </div>
            </div>
          </div>

          <aside className="sidebar">
            <div className="sb-cta">
              <div className="sb-cta-logo">SA</div>
              <div className="sb-cta-title">Học mỹ thuật <em>bài bản</em> tại Sine Art</div>
              <p className="sb-cta-desc">Giáo trình khoa học, đồng hành cùng 350+ học viên trên hành trình Họa sỹ công nghệ.</p>
              <button className="btn-primary">▶ Xem khoá học</button>
              <a href="#" className="sb-cta-secondary">🎨 Đăng ký học thử miễn phí →</a>
            </div>

            <div className="sb-section">
              <div className="sb-section-label">Phổ biến tuần</div>
              <div className="popular-list">
                {CARDS.slice(0, 5).map((c, idx) => (
                  <div className="popular-item" key={c.title}>
                    <div className={`popular-num ${idx === 0 ? "top1" : ""}`}>{String(idx + 1).padStart(2, "0")}</div>
                    <div>
                      <div className="popular-title">{c.title}</div>
                      <div className="popular-meta"><span className={`cat-dot ${c.cat === "Tin ĐH" ? "neutral" : c.thumb}`} />{c.cat}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>

      <footer className="footer">
        <div className="shell">
          <div className="footer-inner">
            <div className="foot-brand">
              <Link className="sa-logo" href="/">
                <span className="sa-logo-sine">Sine</span>
                <span className="sa-logo-art">Art</span>
              </Link>
              <h3>Trường mỹ thuật cho <span className="art">Họa sỹ công nghệ</span></h3>
              <p>Đào tạo bài bản và khoa học — chuẩn bị cho sự nghiệp trong Hoạt hình, Phim và Game.</p>
            </div>
            <div className="foot-col"><h4>Khoá học</h4><ul><li><a href="#">Hình họa</a></li><li><a href="#">Bố cục màu</a></li><li><a href="#">Trang trí màu</a></li></ul></div>
            <div className="foot-col"><h4>Về chúng tôi</h4><ul><li><a href="#">Giới thiệu</a></li><li><a href="#">Giáo viên</a></li><li><a href="#">Tin tức</a></li></ul></div>
            <div className="foot-col"><h4>Liên hệ</h4><ul><li><a href="#">hello@sineart.vn</a></li><li><a href="#">(028) 3812 3456</a></li></ul></div>
          </div>
        </div>
      </footer>

      <a className="nav-cta-fixed" href="#"><span className="play">▶</span>Vào học</a>

      <style jsx global>{`
        .sa-blog{--bg:#fff;--ink:#2d2020;--ink-2:rgba(45,32,32,.78);--ink-muted:rgba(45,32,32,.56);--font-display:"Be Vietnam Pro","Grandstander",system-ui,sans-serif;--font-body:"Quicksand",system-ui,sans-serif;--cat-hh:#fde859;--cat-bc:#6efec0;--cat-tt:#bb89f8;--cat-dg:#f8a668;--grad:linear-gradient(135deg,#f8a668,#ee5b9f);--grad-cta:linear-gradient(145deg,#fbc08a 0%,#f8a668 22%,#ee5b9f 78%,#d9468a 100%);background:#fff;color:var(--ink);font-family:var(--font-body)}
        .sa-blog *{box-sizing:border-box}.sa-blog a{text-decoration:none;color:inherit}.sa-blog .shell{max-width:1200px;margin:0 auto;padding:0 28px}.sa-blog .shell-wide{max-width:1340px;margin:0 auto;padding:0 28px}
        .sa-blog .sa-logo{display:inline-flex;gap:.12em;font-family:var(--font-display);font-weight:800;font-size:22px;letter-spacing:-.03em}.sa-blog .sa-logo-art{background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent}
        .sa-blog .nav{position:sticky;top:0;z-index:50;background:rgba(255,255,255,.82);backdrop-filter:blur(14px) saturate(1.1);border-bottom:1px solid rgba(45,32,32,.06)}.sa-blog .nav-inner{display:flex;justify-content:space-between;align-items:center;height:68px}.sa-blog .nav-links{display:flex;gap:2px}.sa-blog .nav-links a{padding:9px 14px;border-radius:999px;font-size:14px;font-weight:700;color:var(--ink-2)}.sa-blog .nav-links a.active{color:var(--ink)}.sa-blog .nav-links a:hover{background:rgba(45,32,32,.05)}.sa-blog .nav-right{display:flex;gap:8px;align-items:center}.sa-blog .nav-icon-btn{width:40px;height:40px;border-radius:50%;display:grid;place-items:center;color:var(--ink-2);border:0;background:none}.sa-blog .btn-cta{display:inline-flex;gap:8px;align-items:center;padding:10px 18px 10px 12px;border-radius:999px;background:var(--grad-cta);color:#fff;font-size:14px;font-weight:800;white-space:nowrap}.sa-blog .btn-cta .play{width:24px;height:24px;border-radius:50%;background:rgba(255,255,255,.22);display:grid;place-items:center}
        .sa-blog .page-hero{position:relative;padding:72px 0 48px;overflow:hidden}.sa-blog .page-hero-bg{position:absolute;inset:0;z-index:-1;background:radial-gradient(circle at 85% 10%, rgba(248,166,104,.22), transparent 45%),radial-gradient(circle at 8% 90%, rgba(187,137,248,.22), transparent 40%),#fff}.sa-blog .blob{position:absolute;border-radius:50%;z-index:-1}.sa-blog .blob-a{width:90px;height:90px;background:var(--cat-hh);top:90px;left:5%;opacity:.75}.sa-blog .blob-b{width:36px;height:36px;background:#ee5b9f;top:140px;right:8%}.sa-blog .blob-c{width:54px;height:54px;background:var(--cat-bc);bottom:40px;right:34%}.sa-blog .page-hero-inner{display:grid;grid-template-columns:1.3fr 1fr;gap:48px;align-items:end}.sa-blog .ph-eyebrow{display:inline-flex;gap:8px;align-items:center;padding:7px 14px 7px 8px;border-radius:999px;background:rgba(255,255,255,.7);border:1.5px solid rgba(45,32,32,.08);font-size:12px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;margin-bottom:20px}.sa-blog .ph-eyebrow .dot{width:20px;height:20px;border-radius:50%;background:var(--grad);color:#fff;display:grid;place-items:center}.sa-blog .page-hero h1{margin:0 0 18px;font-family:var(--font-display);font-size:clamp(40px,5vw,64px);font-weight:800;line-height:1.02;letter-spacing:-.035em}.sa-blog .page-hero h1 em{font-style:normal;background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent}.sa-blog .lead{margin:0;max-width:52ch;font-size:17px;line-height:1.6;color:var(--ink-2)}.sa-blog .ph-side{display:flex;flex-direction:column;gap:10px}.sa-blog .ph-stat{display:flex;gap:10px;align-items:baseline;padding:10px 14px;border-radius:14px;background:rgba(255,255,255,.6);border:1.5px solid rgba(45,32,32,.08)}.sa-blog .ph-stat .n{font-family:var(--font-display);font-size:28px;font-weight:800}.sa-blog .ph-stat .n em{font-style:normal;background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent}.sa-blog .ph-stat .l{font-size:13px;font-weight:600;color:var(--ink-2)}.sa-blog .ph-stat .l span{color:var(--ink-muted);font-weight:500}
        .sa-blog .filter-section{position:sticky;top:68px;z-index:20;background:rgba(255,255,255,.88);backdrop-filter:blur(14px);border-top:1px solid rgba(45,32,32,.06);border-bottom:1px solid rgba(45,32,32,.06)}.sa-blog .filter-bar{padding:16px 0;display:flex;gap:10px;flex-wrap:wrap;align-items:center}.sa-blog .search-input{display:flex;gap:10px;align-items:center;padding:10px 18px;border-radius:999px;border:1.5px solid rgba(45,32,32,.12);background:#fff;min-width:260px;flex:1;max-width:340px}.sa-blog .search-input input{border:0;outline:none;background:transparent;flex:1;min-width:0;font-size:13px}.sa-blog .pill-row{display:flex;gap:8px;flex-wrap:wrap;flex:1;justify-content:flex-end}.sa-blog .pill{padding:9px 16px;border-radius:999px;border:1.5px solid rgba(45,32,32,.12);font-size:12px;font-weight:700;background:#fff;color:var(--ink-2);display:inline-flex;gap:8px;align-items:center}.sa-blog .pill.active{background:var(--grad);color:#fff;border-color:transparent}.sa-blog .cat-dot{width:8px;height:8px;border-radius:50%;display:inline-block}.sa-blog .cat-dot.hh{background:var(--cat-hh)}.sa-blog .cat-dot.bc{background:var(--cat-bc)}.sa-blog .cat-dot.tt{background:var(--cat-tt)}.sa-blog .cat-dot.dg{background:var(--cat-dg)}.sa-blog .cat-dot.neutral{border:1px solid rgba(45,32,32,.18);background:#f0f0f0}
        .sa-blog .list-body{padding:40px 0 64px;display:grid;grid-template-columns:1fr 300px;gap:40px;align-items:start}.sa-blog .sec-label{font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-muted);display:flex;gap:10px;align-items:center;margin-bottom:16px}.sa-blog .sec-label:after{content:"";flex:1;height:1px;background:rgba(45,32,32,.1)}
        .sa-blog .featured-card{display:grid;grid-template-columns:1.1fr 1fr;background:#fff;border:1.5px solid rgba(45,32,32,.07);border-radius:20px;overflow:hidden;box-shadow:0 4px 18px rgba(45,32,32,.06)}.sa-blog .featured-thumb{aspect-ratio:4/3;background:linear-gradient(135deg,#fde859 0%,#f8a668 50%,#ee5b9f 100%);position:relative}.sa-blog .featured-badge{position:absolute;top:16px;left:16px;padding:7px 14px;border-radius:999px;background:rgba(255,255,255,.92);font-size:10px;font-weight:800;letter-spacing:.12em}.sa-blog .featured-meta{padding:32px 34px;display:flex;flex-direction:column;justify-content:center}.sa-blog .cat-row{display:flex;gap:8px;align-items:center;margin-bottom:14px;font-size:12px}.sa-blog .cat-name{font-weight:700;color:var(--ink-2)}.sa-blog .cat-sep{color:rgba(45,32,32,.2)}.sa-blog .cat-time{color:var(--ink-muted);font-weight:500}.sa-blog .featured-meta h2{margin:0 0 14px;font-family:var(--font-display);font-size:28px;font-weight:800;line-height:1.15;letter-spacing:-.025em}.sa-blog .excerpt{margin:0 0 18px;font-size:14px;line-height:1.65;color:var(--ink-2)}.sa-blog .author-row{display:flex;gap:10px;align-items:center;font-size:12px}.sa-blog .avatar{width:28px;height:28px;border-radius:50%;background:var(--grad);color:#fff;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;flex-shrink:0}.sa-blog .avatar.partner{background:rgba(45,32,32,.06);color:var(--ink-2);font-size:9px}.sa-blog .avatar.yel{background:linear-gradient(135deg,#fde859,#f8a668);color:#5a4a00}.sa-blog .avatar.mint{background:linear-gradient(135deg,#6efec0,#3dc9a3);color:#0a4a34}.sa-blog .avatar.lilac{background:linear-gradient(135deg,#bb89f8,#8a5fd8)}.sa-blog .author-name{font-weight:700}.sa-blog .author-date{color:var(--ink-muted);font-weight:500}
        .sa-blog .card-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}.sa-blog .card{display:flex;flex-direction:column;background:#fff;border:1.5px solid rgba(45,32,32,.07);border-radius:16px;overflow:hidden;box-shadow:0 2px 10px rgba(45,32,32,.04)}.sa-blog .card-thumb{aspect-ratio:4/3;position:relative}.sa-blog .thumb-badge{position:absolute;top:12px;left:12px;padding:4px 10px;border-radius:999px;background:rgba(255,255,255,.92);font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase}.sa-blog .card-thumb.hh{background:linear-gradient(135deg,#fde859,#f4d03f)}.sa-blog .card-thumb.bc{background:linear-gradient(135deg,#6efec0,#3bd99e)}.sa-blog .card-thumb.tt{background:linear-gradient(135deg,#bb89f8,#9d6df0)}.sa-blog .card-thumb.dg{background:linear-gradient(135deg,#f8a668,#ee5b9f)}.sa-blog .card-thumb.tin-hsu{background:linear-gradient(135deg,#fde859,#f8a668)}.sa-blog .card-thumb.tin-vlu{background:linear-gradient(135deg,#bb89f8,#ee5b9f)}.sa-blog .card-thumb.tin-htc{background:linear-gradient(135deg,#6efec0,#fde859)}.sa-blog .card-thumb.tin-rmit{background:linear-gradient(135deg,#2d2020,#ee5b9f)}.sa-blog .card-thumb.tin-fpt{background:linear-gradient(135deg,#f8a668,#bb89f8)}.sa-blog .card-body{padding:18px 20px 16px;display:flex;flex-direction:column;flex:1}.sa-blog .card-body .cat-row{margin-bottom:10px;font-size:11px}.sa-blog .card-title{margin:0 0 14px;font-family:var(--font-display);font-size:16px;font-weight:800;line-height:1.3;letter-spacing:-.02em;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;flex:1}.sa-blog .card-footer{display:flex;gap:8px;align-items:center;padding-top:12px;border-top:1px solid rgba(45,32,32,.07);font-size:11px}.sa-blog .card-footer .avatar{width:22px;height:22px;font-size:9px}
        .sa-blog .pagination{margin-top:36px;padding-top:28px;border-top:1px solid rgba(45,32,32,.08);display:flex;gap:12px;justify-content:center;align-items:center}.sa-blog .page-btn{width:42px;height:42px;border-radius:50%;border:1.5px solid rgba(45,32,32,.12);display:flex;justify-content:center;align-items:center;background:#fff}.sa-blog .page-num-group{display:flex;gap:4px;align-items:center}.sa-blog .page-num{min-width:38px;height:38px;padding:0 10px;border-radius:999px;font-size:13px;font-weight:700;border:0;background:transparent}.sa-blog .page-num.active{background:var(--grad);color:#fff}.sa-blog .page-dots{color:rgba(45,32,32,.25);padding:0 4px;font-size:13px;font-weight:700}
        .sa-blog .sidebar{display:flex;flex-direction:column;gap:28px;position:sticky;top:148px}.sa-blog .sb-cta{background:radial-gradient(circle at 0% 0%,rgba(248,166,104,.25),transparent 55%),radial-gradient(circle at 100% 100%,rgba(238,91,159,.22),transparent 55%),#fff;border:1.5px solid rgba(238,91,159,.2);border-radius:20px;padding:24px 22px}.sa-blog .sb-cta-logo{width:56px;height:56px;border-radius:16px;background:var(--grad);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:900;margin:0 0 14px}.sa-blog .sb-cta-title{font-family:var(--font-display);font-size:20px;font-weight:800;line-height:1.2;margin:0 0 8px}.sa-blog .sb-cta-title em{font-style:normal;background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent}.sa-blog .sb-cta-desc{margin:0 0 18px;font-size:13px;line-height:1.55;color:var(--ink-2)}.sa-blog .btn-primary{display:flex;align-items:center;justify-content:center;gap:8px;background:var(--grad-cta);color:#fff;padding:12px 16px;border-radius:999px;width:100%;font-size:13px;font-weight:800}.sa-blog .sb-cta-secondary{display:block;text-align:center;font-size:12px;font-weight:700;color:var(--ink-muted);padding:12px 8px 2px}.sa-blog .sb-section-label{font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;margin-bottom:18px;display:flex;gap:10px;align-items:center}.sa-blog .sb-section-label:after{content:"";flex:1;height:1px;background:rgba(45,32,32,.1)}.sa-blog .popular-list{display:flex;flex-direction:column;gap:16px}.sa-blog .popular-item{display:flex;gap:14px;align-items:flex-start}.sa-blog .popular-num{font-family:var(--font-display);font-size:32px;font-weight:800;line-height:.9;min-width:28px;color:rgba(45,32,32,.15)}.sa-blog .popular-num.top1{background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent}.sa-blog .popular-title{font-family:var(--font-display);font-size:13px;font-weight:800;line-height:1.3;margin:0 0 4px}.sa-blog .popular-meta{font-size:11px;color:var(--ink-muted);font-weight:600;display:inline-flex;gap:6px;align-items:center}.sa-blog .popular-meta .cat-dot{width:6px;height:6px}
        .sa-blog .footer{margin-top:80px;background:radial-gradient(circle at 0% 0%,rgba(253,232,89,.35),transparent 35%),radial-gradient(circle at 100% 10%,rgba(248,166,104,.3),transparent 40%),#fff;padding:72px 0 40px}.sa-blog .footer-inner{display:grid;grid-template-columns:1.4fr repeat(3,1fr);gap:48px}.sa-blog .foot-brand h3{font-family:var(--font-display);font-weight:800;font-size:26px;letter-spacing:-.03em;margin:16px 0 12px}.sa-blog .foot-brand h3 .art{background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent}.sa-blog .foot-brand p{font-size:14px;color:var(--ink-2);line-height:1.6;max-width:34ch;margin:0 0 16px}.sa-blog .foot-col h4{font-family:var(--font-display);font-size:14px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;margin:0 0 16px}.sa-blog .foot-col ul{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:10px}.sa-blog .foot-col a{font-size:14px;font-weight:600;color:var(--ink-2)}
        .sa-blog .nav-cta-fixed{position:fixed;bottom:24px;right:24px;z-index:60;display:inline-flex;align-items:center;gap:8px;background:var(--grad-cta);color:#fff;padding:12px 22px 12px 14px;border-radius:999px;font-weight:800;font-size:14px}.sa-blog .nav-cta-fixed .play{width:28px;height:28px;border-radius:50%;background:rgba(255,255,255,.22);display:grid;place-items:center}
        @media (max-width:1080px){.sa-blog .list-body{grid-template-columns:1fr 280px;gap:28px}.sa-blog .featured-card{grid-template-columns:1fr}.sa-blog .featured-thumb{aspect-ratio:16/9}.sa-blog .featured-meta{padding:24px}.sa-blog .featured-meta h2{font-size:24px}}
        @media (max-width:900px){.sa-blog .page-hero-inner{grid-template-columns:1fr;gap:32px}.sa-blog .list-body{grid-template-columns:1fr}.sa-blog .card-grid{grid-template-columns:1fr 1fr}.sa-blog .footer-inner{grid-template-columns:1fr 1fr;gap:32px}.sa-blog .nav-links{display:none}.sa-blog .sidebar{position:static}.sa-blog .filter-section{position:static}}
        @media (max-width:620px){.sa-blog .card-grid{grid-template-columns:1fr}.sa-blog .pill-row{justify-content:flex-start}.sa-blog .search-input{max-width:none}.sa-blog .featured-meta h2{font-size:22px}.sa-blog .page-hero h1{font-size:36px}}
      `}</style>
    </div>
  );
}

