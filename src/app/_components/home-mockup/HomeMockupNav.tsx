"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";

import type { NavKhoaHocGroup } from "@/constants/navigation";

type Props = {
  khoaHocGroups?: NavKhoaHocGroup[];
};

function sectionHref(pathname: string | null, id: string): string {
  return pathname === "/new" ? `/new#${id}` : `#${id}`;
}

export function HomeMockupNav({ khoaHocGroups: _groups }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const kieng = sectionHref(pathname, "kieng");
  const baiHv = sectionHref(pathname, "bai-hv");
  const huongNghiep = sectionHref(pathname, "huong-nghiep");
  const dangKy = sectionHref(pathname, "dang-ky");

  return (
    <>
      <nav className="nav">
        <div className="wrap nav-inner">
          <Link href="/" className="logo">
            <span className="dot" aria-hidden />
            Sine Art
          </Link>
          <div className={`nav-links${open ? " nav-links--open" : ""}`}>
            <Link href="/khoa-hoc" onClick={() => setOpen(false)}>
              Khóa học
            </Link>
            <Link href={kieng} onClick={() => setOpen(false)}>
              Mỹ thuật nền tảng
            </Link>
            <Link href={baiHv} onClick={() => setOpen(false)}>
              Bài học viên
            </Link>
            <Link href={huongNghiep} onClick={() => setOpen(false)}>
              Hướng nghiệp
            </Link>
            <Link href="/gallery" onClick={() => setOpen(false)}>
              Thư viện
            </Link>
          </div>
          <div className="nav-cta">
            <Link href="/phong-hoc" className="nav-login">
              Đăng nhập
            </Link>
            <Link href={dangKy} className="btn btn-primary">
              Vào học
            </Link>
            <button
              type="button"
              className="burger"
              aria-label={open ? "Đóng menu" : "Mở menu"}
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <X className="feather" /> : <Menu className="feather" />}
            </button>
          </div>
        </div>
      </nav>
      {open ? (
        <div className="nav-mobile-sheet" role="dialog" aria-modal="true">
          <Link href="/khoa-hoc" onClick={() => setOpen(false)}>
            Khóa học
          </Link>
          <Link href={kieng} onClick={() => setOpen(false)}>
            Mỹ thuật nền tảng
          </Link>
          <Link href={baiHv} onClick={() => setOpen(false)}>
            Bài học viên
          </Link>
          <Link href={huongNghiep} onClick={() => setOpen(false)}>
            Hướng nghiệp
          </Link>
          <Link href="/gallery" onClick={() => setOpen(false)}>
            Thư viện
          </Link>
          <Link href="/phong-hoc" onClick={() => setOpen(false)}>
            Đăng nhập
          </Link>
        </div>
      ) : null}
    </>
  );
}
