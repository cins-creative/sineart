import EbookListClient from "../EbookListClient";
import { extractEbookCategories, fetchAllEbooks } from "@/lib/data/ebook";
import { buildEbookCatalogJsonLd } from "@/lib/seo/ebook-jsonld";

export async function EbookCatalogSection() {
  const items = await fetchAllEbooks();
  const categories = extractEbookCategories(items);
  const featuredCount = items.filter((i) => i.featured).length;
  const catalogJsonLd = buildEbookCatalogJsonLd(items);

  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(catalogJsonLd) }}
      />
      {/* HERO */}
      <section className="page-hero">
        <div className="page-hero-bg" />
        <span className="blob blob-a" />
        <span className="blob blob-b" />
        <span className="blob blob-c" />
        <div className="page-hero-inner">
          <div>
            <div className="ph-eyebrow">
              <span className="dot">≡</span>
              Sine Art Library · {items.length > 0 ? `${items.length} ebook` : "Free ebook"}
            </div>
            <h1>
              Thư viện <em>ebook</em>
              <br />
              mỹ thuật miễn phí.
            </h1>
            <p className="lead">
              Lịch sử mỹ thuật, giải phẫu, phối cảnh, trang trí, hoạt hình… tuyển chọn và biên soạn từ giáo viên Sine
              Art. Đọc online hoặc xem từng trang sách trên thiết bị của bạn.
            </p>
          </div>
          <div className="ph-side">
            <div className="ph-stat">
              <div className="n">
                <em>{items.length > 0 ? `${items.length}+` : "—"}</em>
              </div>
              <div className="l">
                Ebook đã phát hành
                <br />
                <span>Được cập nhật thường xuyên</span>
              </div>
            </div>
            <div className="ph-stat">
              <div className="n">{categories.length || "—"}</div>
              <div className="l">
                Chủ đề & thể loại
                <br />
                <span>Mỹ thuật cơ bản → nâng cao</span>
              </div>
            </div>
            <div className="ph-stat">
              <div className="n">{featuredCount || "—"}</div>
              <div className="l">
                Ebook nổi bật tuyển chọn
                <br />
                <span>Giá trị cao, đọc trước</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <EbookListClient items={items} categories={categories} />
    </>
  );
}
