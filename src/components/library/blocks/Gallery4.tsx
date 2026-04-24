import type { GalleryItem } from "./Gallery3";

export function Gallery4({ items }: { items: [GalleryItem, GalleryItem, GalleryItem, GalleryItem] }) {
  return (
    <div className="gallery gallery-4">
      {items.map((item, i) => (
        <div key={i} className="gallery-box">
          {item.src ? (
            <img src={item.src} alt={item.alt ?? item.keyword ?? ""} loading="lazy" />
          ) : (
            <span className="gallery-kw">{item.keyword}</span>
          )}
          {item.cap && <span className="gallery-cap">{item.cap}</span>}
        </div>
      ))}
    </div>
  );
}
