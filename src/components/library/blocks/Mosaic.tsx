interface MosaicProps {
  big: { src: string; alt?: string };
  small1: { src: string; alt?: string };
  small2: { src: string; alt?: string };
  cap?: string;
}

export function Mosaic({ big, small1, small2, cap }: MosaicProps) {
  return (
    <div className="mosaic">
      <div className="mosaic-big">
        <img src={big.src} alt={big.alt ?? ""} loading="lazy" />
      </div>
      <div className="mosaic-small">
        <img src={small1.src} alt={small1.alt ?? ""} loading="lazy" />
      </div>
      <div className="mosaic-small">
        <img src={small2.src} alt={small2.alt ?? ""} loading="lazy" />
      </div>
      {cap && <p className="mosaic-cap">{cap}</p>}
    </div>
  );
}
