import Link from "next/link";
import {
  ArrowRight,
  Edit3,
  ExternalLink,
  Feather,
  ImageIcon,
  Mail,
  MapPin,
  MessageCircle,
  Paintbrush,
  Phone,
  Shield,
  User,
} from "lucide-react";

import { HomeMockupCareerTicker } from "@/app/_components/home-mockup/HomeMockupCareerTicker";
import { HomeMockupMarquee } from "@/app/_components/home-mockup/HomeMockupMarquee";
import { HomeMockupMatcher } from "@/app/_components/home-mockup/HomeMockupMatcher";
import { HomeMockupReviewsSection } from "@/app/_components/home-mockup/HomeMockupReviewsSection";
import { HomeMockupClassroomPhotosSection } from "@/app/_components/home-mockup/HomeMockupClassroomPhotosSection";
import { HomeMockupTeachersSection } from "@/app/_components/home-mockup/HomeMockupTeachersSection";
import { HomeMockupVideo } from "@/app/_components/home-mockup/HomeMockupVideo";
import { HomeMockupHero } from "@/app/_components/home-mockup/HomeMockupHero";
import { getHomeMockupPayload } from "@/lib/data/home-mockup";

function GalleryArt({ photo, grad, label }: { photo: string | null | undefined; grad: string; label: string }) {
  if (photo) {
    return (
      <div className="ph" style={{ background: grad, padding: 0 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo} alt={label} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
    );
  }
  return (
    <div className="ph" style={{ background: grad }}>
      <ImageIcon className="feather" aria-hidden />
      <span className="ph-label">{label}</span>
    </div>
  );
}

export async function HomeMockupPage() {
  const data = await getHomeMockupPayload();

  const pillarIcon = {
    hh: Edit3,
    tt: Paintbrush,
    bc: Paintbrush,
  } as const;

  return (
    <>
      <HomeMockupMarquee items={data.marquee} />
      <HomeMockupHero {...data.hero} slides={data.slides} />

      <section className="section section--stats">
        <div className="wrap stats">
          {data.stats.map((s) => (
            <div key={s.label} className="stat">
              <div className="num grad-text">{s.value}</div>
              <div className="lbl">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="section section--exam">
        <div className="wrap">
          <div className="results">
            <div className="results-grid">
              <div>
                <h2>
                  Học để <em>đậu</em> — không chỉ học để biết vẽ.
                </h2>
                <p className="rsub">{data.exam.subtitle}</p>
              </div>
              <div className="results-nums">
                {data.exam.stats.map((s) => (
                  <div key={s.label} className="rnum">
                    <div className="n">{s.value}</div>
                    <div className="t">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section kieng-sec" id="kieng">
        <div className="wrap">
          <div className="sec-head">
            <span className="eyebrow">Cấu trúc nền tảng</span>
            <h2>
              Kiềng 3 chân của <span className="grad-text">Mỹ thuật nền tảng</span>
            </h2>
            <p>Ba môn nâng đỡ nhau tạo nên nền tảng vững. Đây cũng chính là 3 môn thi năng khiếu vào đại học.</p>
          </div>
          <div className="kieng-stage">
          <div className="kieng">
            <div className="kieng-hub">
              <div className="fa">Fine Arts</div>
              <div className="mt">
                Mỹ thuật
                <br />
                nền tảng
              </div>
              <div className="exam">= 3 môn thi năng khiếu vào ĐH</div>
            </div>
            <svg className="kieng-fan" viewBox="0 0 1080 42" preserveAspectRatio="none" aria-hidden>
              <line x1="540" y1="0" x2="172" y2="42" stroke="#cba300" strokeWidth="2" strokeDasharray="6 6" opacity=".5" />
              <line x1="540" y1="0" x2="540" y2="42" stroke="#bb89f8" strokeWidth="2" strokeDasharray="6 6" opacity=".5" />
              <line x1="540" y1="0" x2="908" y2="42" stroke="#1aa377" strokeWidth="2" strokeDasharray="6 6" opacity=".5" />
            </svg>
            <div className="kieng-row">
              {data.kieng.pillars.map((p) => {
                const Icon = pillarIcon[p.key];
                return (
                  <Link key={p.key} href={`/khoa-hoc/${p.slug}`} className={`pillar p-${p.key}`}>
                    <div className="thumb ph" style={{ background: p.thumbGrad, padding: p.samplePhoto ? 0 : undefined }}>
                      {p.samplePhoto ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.samplePhoto} alt={p.title} />
                      ) : (
                        <>
                          <ImageIcon className="feather" aria-hidden />
                          <span className="ph-label">Bài {p.title}</span>
                        </>
                      )}
                    </div>
                    <div className="pbody">
                      <div className="pic">
                        <Icon className="feather" aria-hidden />
                      </div>
                      <h3>{p.title}</h3>
                      <div className="role">{p.role}</div>
                      <p>{p.text}</p>
                      <span className="more">
                        Xem giáo trình <ArrowRight className="feather" aria-hidden />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section ba-sec" id="bai-hv">
        <div className="wrap">
          <div className="sec-head">
            <span className="eyebrow">Bài học viên · không chỉnh sửa</span>
            <h2>
              Từ buổi đầu đến <span className="grad-text">bài đạt chuẩn thi</span>
            </h2>
            <p>Cùng một học viên, cùng một phương pháp. Nền tảng dùng được cho người mới, không chỉ người có năng khiếu.</p>
          </div>
          <div className="ba-grid">
            <div className="ba-col">
              <div className="ba-art">
                <GalleryArt photo={data.beforeAfter.before?.photo} grad="var(--cream)" label="Bài buổi 1" />
              </div>
              <div className="cap">
                <span className="tag t1">Buổi 1</span>
                <span>
                  {data.beforeAfter.before?.studentName
                    ? `Bài đầu · ${data.beforeAfter.before.studentName}`
                    : "Bài vẽ đầu tiên"}
                </span>
              </div>
            </div>
            <div className="ba-col">
              <div className="ba-art">
                <GalleryArt
                  photo={data.beforeAfter.after?.photo}
                  grad="linear-gradient(135deg,#fef0e4,#fde7f1)"
                  label="Bài buổi 15"
                />
              </div>
              <div className="cap">
                <span className="tag t2">Buổi 15</span>
                <span>
                  {data.beforeAfter.after?.studentName
                    ? `Bài đạt chuẩn · ${data.beforeAfter.after.studentName}`
                    : "Bài đạt chuẩn nộp thi"}
                </span>
              </div>
            </div>
            <div className="ba-arrow" aria-hidden>
              <ArrowRight className="feather" />
            </div>
          </div>
        </div>
      </section>

      <HomeMockupVideo {...data.video} />

      <section className="section hm-teachers-slot" style={{ background: "#fff" }}>
        <div className="wrap">
          <div className="sec-head">
            <span className="eyebrow">Giáo viên</span>
            <h2>
              Họa sĩ <span className="grad-text">đang hành nghề</span> dạy bạn
            </h2>
            <p>Không phải giảng viên thuần lý thuyết — thầy cô là họa sĩ đang đi làm thật trong ngành sáng tạo.</p>
          </div>
          <div className="sa-root hm-teachers-slot__root">
            <HomeMockupTeachersSection />
          </div>
          <div className="teach-grid">
            {data.teachers.map((t) => (
              <article key={t.id} className="teach-card">
                <div className="teach-art ph" style={{ background: t.thumbGrad, padding: t.avatar ? 0 : undefined }}>
                  {t.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={t.avatar} alt={t.fullName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <>
                      <User className="feather" aria-hidden />
                      <span className="ph-label">Ảnh GV</span>
                    </>
                  )}
                </div>
                <div className="teach-body">
                  <h4>{t.fullName}</h4>
                  <div className="sch">{t.school}</div>
                  <div className="work">{t.work}</div>
                </div>
              </article>
            ))}
          </div>
          <div className="sa-root hm-classroom-slot__root">
            <HomeMockupClassroomPhotosSection />
          </div>
        </div>
      </section>

      <section className="section career-sec" id="huong-nghiep">
        <div className="wrap">
          <div className="sec-head">
            <span className="eyebrow career-eyebrow">Powered by CINS.vn</span>
            <h2>
              Nền tảng hôm nay — <span className="career-highlight">bàn đạp nghề nghiệp</span> mai sau
            </h2>
            <p>Mỹ thuật nền tảng không dừng ở kỳ thi. Nó là gốc rễ cho mọi ngành sáng tạo bạn theo đuổi.</p>
          </div>
          <div className="career-flow">
            <div className="flow-node flow-node--sine">
              <span className="flow-node__title">Mỹ thuật nền tảng</span>
              <span className="flow-node__brand">Sine Art</span>
            </div>
            <div className="flow-arrow">
              <ArrowRight className="feather" aria-hidden />
            </div>
            <div className="flow-node flow-node--cins">Đậu ngành đại học</div>
            <div className="flow-arrow">
              <ArrowRight className="feather" aria-hidden />
            </div>
            <div className="flow-node">Nghề creative industry</div>
          </div>
          <HomeMockupCareerTicker careers={data.careers} />
          <div className="cins-cta">
            <a href="https://cins.vn" target="_blank" rel="noopener noreferrer">
              Khám phá ngành nghề tại CINS.vn <ExternalLink className="feather" aria-hidden />
            </a>
          </div>
        </div>
      </section>

      <HomeMockupMatcher {...data.matcher} />

      <section className="section hm-reviews-slot">
        <div className="wrap hm-reviews-slot__wrap">
          <div className="sa-root hm-reviews-slot__root">
            <div className="page-inner hm-reviews-slot__inner">
              <HomeMockupReviewsSection />
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="dang-ky">
        <div className="wrap">
          <div className="final">
            <h2>
              {data.cta.titleBefore}
              <span className="grad-text">{data.cta.titleEmphasis}</span>
            </h2>
            <p>{data.cta.text}</p>
            <div className="final-actions">
              <Link
                href={data.cta.ctaPrimary.href}
                className="btn btn-primary"
                target={data.cta.ctaPrimary.href.startsWith("http") ? "_blank" : undefined}
                rel={data.cta.ctaPrimary.href.startsWith("http") ? "noopener noreferrer" : undefined}
              >
                {data.cta.ctaPrimary.label} <ArrowRight className="feather" aria-hidden />
              </Link>
              <Link
                href={data.cta.ctaGhost.href}
                className="btn btn-ghost"
                target={data.cta.ctaGhost.href.startsWith("http") ? "_blank" : undefined}
                rel={data.cta.ctaGhost.href.startsWith("http") ? "noopener noreferrer" : undefined}
              >
                <MessageCircle className="feather" aria-hidden /> {data.cta.ctaGhost.label}
              </Link>
            </div>
            <div className="final-mini">
              {data.cta.sticks.map((s) => (
                <div key={s.n} className="m">
                  <b>{s.n}</b>
                  <span>{s.l}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="wrap">
          <div className="foot-grid">
            <div>
              <Link href="/" className="logo">
                <span className="dot" aria-hidden />
                Sine Art
              </Link>
              <p>{data.footer.tagline}</p>
            </div>
            <div>
              <h4>Cơ sở</h4>
              {data.footer.branches.map((b) => (
                <div key={b.label} className="branch">
                  <MapPin className="feather" aria-hidden />
                  <p style={{ margin: 0 }}>{b.label}</p>
                </div>
              ))}
            </div>
            <div>
              <h4>Liên hệ</h4>
              <a href={`tel:${data.footer.phone.replace(/\s/g, "")}`}>
                <Phone
                  className="feather"
                  style={{ width: 14, height: 14, display: "inline", verticalAlign: "-2px", color: "#ee5b9f" }}
                  aria-hidden
                />{" "}
                {data.footer.phone}
              </a>
              <a href={`mailto:${data.footer.email}`}>
                <Mail
                  className="feather"
                  style={{ width: 14, height: 14, display: "inline", verticalAlign: "-2px", color: "#ee5b9f" }}
                  aria-hidden
                />{" "}
                {data.footer.email}
              </a>
              <Link href="#dang-ky">Đăng ký nhận lộ trình luyện thi vẽ</Link>
              <Link href="/privacy" className="foot-privacy-btn">
                <Shield
                  className="feather"
                  style={{ width: 14, height: 14, display: "inline", verticalAlign: "-2px" }}
                  aria-hidden
                />{" "}
                Privacy Policy
              </Link>
            </div>
          </div>
          <div className="foot-bottom">
            © {new Date().getFullYear()} Sine Art · Trường vẽ mỹ thuật nền tảng tại TP.HCM
          </div>
        </div>
      </footer>
    </>
  );
}
