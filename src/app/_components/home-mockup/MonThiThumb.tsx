import Image from "next/image";

import { nextImageShouldUnoptimize } from "@/lib/nextImageRemote";
import type { CinsMatcherThumb } from "@/lib/data/cins-matcher";

type Props = {
  thumb: CinsMatcherThumb;
  size?: number;
  title?: string;
};

export function MonThiThumb({ thumb, size = 72, title }: Props) {
  const label = title ?? thumb.ten;

  if (!thumb.placeholder && thumb.imageUrl) {
    return (
      <div
        className="match-mon-thumb match-mon-thumb--img"
        style={{ width: size, height: size }}
        title={label}
      >
        <Image
          src={thumb.imageUrl}
          alt={label}
          width={size}
          height={size}
          className="match-mon-thumb-img"
          unoptimized={nextImageShouldUnoptimize(thumb.imageUrl)}
        />
      </div>
    );
  }

  return (
    <div
      className="match-mon-thumb match-mon-thumb--plh"
      style={{ width: size, height: size, background: thumb.placeholderGrad }}
      title={label}
      aria-hidden={!label}
    >
      <span>{thumb.placeholderLabel}</span>
    </div>
  );
}
