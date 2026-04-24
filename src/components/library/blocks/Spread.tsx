interface SpreadProps {
  src: string;
  alt?: string;
  cap?: string;
}

export function Spread({ src, alt, cap }: SpreadProps) {
  return (
    <div className="spread">
      <img src={src} alt={alt ?? ""} loading="lazy" />
      {cap && <p className="cap">{cap}</p>}
    </div>
  );
}
